import db, { serializeBigInts } from '@/lib/database';
import { logActivity } from '@/lib/database/audit';
import { authorizeEventAccess } from '@/lib/security/auth-middleware';
import {
  createEventSchema,
  updateEventSchema,
  addCollaboratorSchema,
  paginationQuerySchema,
} from '@/lib/validation/schemas';
import { z } from 'zod';
import crypto from 'crypto';

// Standard budget allocation categories to jumpstart every new celebration
const DEFAULT_BUDGET_CATEGORIES = [
  { name: 'Venue & Catering', allocatedShare: 0.45, icon: 'Utensils', color: '#b45309' },
  { name: 'Decor, Floral & Production', allocatedShare: 0.18, icon: 'Sparkles', color: '#6b21a8' },
  { name: 'Photography & Videography', allocatedShare: 0.12, icon: 'Camera', color: '#0369a1' },
  { name: 'Entertainment & Music', allocatedShare: 0.10, icon: 'Music', color: '#be123c' },
  { name: 'Attire & Beauty', allocatedShare: 0.05, icon: 'Smile', color: '#047857' },
  { name: 'Stationery & Favors', allocatedShare: 0.04, icon: 'Mail', color: '#d97706' },
  { name: 'Buffer & Contingency', allocatedShare: 0.06, icon: 'Shield', color: '#4b5563' },
];

export class EventService {
  /**
   * Creates a new event inside an atomic database transaction.
   */
  static async createEvent(userId: string, data: z.infer<typeof createEventSchema>) {
    const parsed = createEventSchema.parse(data);

    // Slug generation with random entropy to prevent collisions
    const baseSlug = parsed.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 40);
    const slugEntropy = crypto.randomBytes(3).toString('hex');
    const slug = `${baseSlug || 'event'}-${slugEntropy}`;

    const totalBudgetMinor = BigInt(parsed.budgetMinor);

    // Atomic transaction creating Event + Owner Membership + Preference + Budget + Categories
    const result = await db.$transaction(
      async (tx) => {
        // 1. Create Event
        const event = await tx.event.create({
          data: {
            slug,
            title: parsed.title,
            description: parsed.description,
            eventType: parsed.eventType,
            startDate: new Date(parsed.startDate),
            endDate: new Date(parsed.endDate),
            venue: parsed.venue,
            city: parsed.city,
            country: parsed.country,
            guestTarget: parsed.guestTarget,
            budgetMinor: totalBudgetMinor,
            currency: parsed.currency,
            status: 'PLANNING',
            ownerId: userId,
          },
        });

        // 2. Create EventMember with OWNER role
        await tx.eventMember.create({
          data: {
            eventId: event.id,
            userId,
            role: 'OWNER',
          },
        });

        // 3. Initialize EventPreference
        await tx.eventPreference.create({
          data: {
            eventId: event.id,
            theme: 'Modern Celebration',
            colorPaletteJson: JSON.stringify(['#b45309', '#6b21a8', '#f59e0b', '#fdf4ff']),
            tone: 'Festive & Elegant',
            culturalTraditionsJson: JSON.stringify([]),
          },
        });

        // 4. Initialize EventBudget
        await tx.eventBudget.create({
          data: {
            eventId: event.id,
            totalBudgetMinor,
            currency: parsed.currency,
            contingencyPercent: 10,
          },
        });

        // 5. Seed default budget categories with proportional allocations (bulk insert)
        const categoryData = DEFAULT_BUDGET_CATEGORIES.map((cat) => ({
          eventId: event.id,
          name: cat.name,
          allocatedMinor: BigInt(Math.floor(Number(totalBudgetMinor) * cat.allocatedShare)),
          spentMinor: BigInt(0),
          icon: cat.icon,
          color: cat.color,
        }));

        await tx.budgetCategory.createMany({
          data: categoryData,
        });

        return event;
      },
      { maxWait: 15000, timeout: 30000 }
    );

    // Record Activity Log
    await logActivity({
      eventId: result.id,
      userId,
      action: 'EVENT_CREATED',
      entityType: 'Event',
      entityId: result.id,
      details: { title: result.title, eventType: result.eventType },
    });

    return serializeBigInts(result);
  }

  /**
   * Retrieves paginated events for which the user is either owner or collaborator.
   * Defends against cross-user leakage.
   */
  static async listUserEvents(
    userId: string,
    queryParams: z.input<typeof paginationQuerySchema>
  ) {
    const { page, limit, search, status } = paginationQuerySchema.parse(queryParams);
    const skip = (page - 1) * limit;

    // Filter events where user is owner OR an active member
    const whereClause: Record<string, unknown> = {
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
    };

    if (search) {
      whereClause.AND = [
        {
          OR: [
            { title: { contains: search } },
            { description: { contains: search } },
            { venue: { contains: search } },
          ],
        },
      ];
    }

    if (status) {
      whereClause.status = status;
    }

    const [events, totalCount] = await Promise.all([
      db.event.findMany({
        where: whereClause,
        include: {
          owner: {
            select: { id: true, name: true, email: true },
          },
          members: {
            where: { userId },
            select: { role: true },
          },
          _count: {
            select: {
              guests: true,
              tasks: true,
              expenses: true,
              vendors: true,
            },
          },
        },
        orderBy: { startDate: 'asc' },
        skip,
        take: limit,
      }),
      db.event.count({ where: whereClause }),
    ]);

    // Attach caller role to each event
    const formattedEvents = events.map((ev) => {
      const isOwner = ev.ownerId === userId;
      const callerRole = isOwner ? 'OWNER' : ev.members[0]?.role || 'VIEWER';
      return {
        ...ev,
        callerRole,
        isOwner,
      };
    });

    return {
      events: serializeBigInts(formattedEvents),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  /**
   * Retrieves single event details with full relational metrics.
   * Enforces server-side IDOR authorization check.
   */
  static async getEventDetails(userId: string, eventId: string) {
    const access = await authorizeEventAccess(userId, eventId, 'EVENT_VIEW');

    const event = await db.event.findUnique({
      where: { id: eventId },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        preferences: true,
        budget: true,
        categories: {
          include: {
            _count: { select: { expenses: true } },
          },
        },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        _count: {
          select: {
            guests: true,
            tasks: true,
            expenses: true,
            vendors: true,
            risks: true,
            schedules: true,
          },
        },
      },
    });

    if (!event) {
      throw new Error('Event not found');
    }

    return serializeBigInts({
      ...event,
      userRole: access.role,
      isOwner: access.isOwner,
      canEdit: access.canEdit,
      canManageMembers: access.canManageMembers,
    });
  }

  /**
   * Updates an existing event. Requires EVENT_EDIT permission.
   */
  static async updateEvent(
    userId: string,
    eventId: string,
    data: z.infer<typeof updateEventSchema>
  ) {
    await authorizeEventAccess(userId, eventId, 'EVENT_EDIT');
    const parsed = updateEventSchema.parse(data);

    const updateData: Record<string, unknown> = {};
    if (parsed.title !== undefined) updateData.title = parsed.title;
    if (parsed.description !== undefined) updateData.description = parsed.description;
    if (parsed.eventType !== undefined) updateData.eventType = parsed.eventType;
    if (parsed.startDate !== undefined) updateData.startDate = new Date(parsed.startDate);
    if (parsed.endDate !== undefined) updateData.endDate = new Date(parsed.endDate);
    if (parsed.venue !== undefined) updateData.venue = parsed.venue;
    if (parsed.city !== undefined) updateData.city = parsed.city;
    if (parsed.country !== undefined) updateData.country = parsed.country;
    if (parsed.guestTarget !== undefined) updateData.guestTarget = parsed.guestTarget;
    if (parsed.currency !== undefined) updateData.currency = parsed.currency;
    if (parsed.status !== undefined) updateData.status = parsed.status;
    if (parsed.budgetMinor !== undefined) {
      updateData.budgetMinor = BigInt(parsed.budgetMinor);
    }

    const updated = await db.event.update({
      where: { id: eventId },
      data: updateData,
    });

    await logActivity({
      eventId,
      userId,
      action: 'EVENT_UPDATED',
      entityType: 'Event',
      entityId: eventId,
      details: updateData as Record<string, unknown>,
    });

    return serializeBigInts(updated);
  }

  /**
   * Deletes an event. Strictly OWNER only.
   */
  static async deleteEvent(userId: string, eventId: string) {
    await authorizeEventAccess(userId, eventId, 'EVENT_DELETE');

    // Cascade delete deletes all child records via Prisma relational schema
    await db.event.delete({
      where: { id: eventId },
    });

    return { success: true, message: 'Event successfully deleted' };
  }

  /**
   * Adds or invites a collaborator with an assigned role. Requires MEMBER_MANAGE (Owner).
   */
  static async addCollaborator(
    userId: string,
    eventId: string,
    data: z.infer<typeof addCollaboratorSchema>
  ) {
    await authorizeEventAccess(userId, eventId, 'MEMBER_MANAGE');
    const parsed = addCollaboratorSchema.parse(data);

    // Look up target user by email
    const targetUser = await db.user.findUnique({
      where: { email: parsed.email.toLowerCase() },
    });

    if (!targetUser) {
      throw new Error(`No user found with email ${parsed.email}. User must register first.`);
    }

    if (targetUser.id === userId) {
      throw new Error('You are already the owner of this event');
    }

    // Upsert collaborator role
    const member = await db.eventMember.upsert({
      where: {
        eventId_userId: {
          eventId,
          userId: targetUser.id,
        },
      },
      update: {
        role: parsed.role,
      },
      create: {
        eventId,
        userId: targetUser.id,
        role: parsed.role,
        invitedBy: userId,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    await logActivity({
      eventId,
      userId,
      action: 'COLLABORATOR_ASSIGNED',
      entityType: 'EventMember',
      entityId: member.id,
      details: { collaboratorEmail: parsed.email, role: parsed.role },
    });

    return member;
  }

  /**
   * Removes a collaborator from an event.
   */
  static async removeCollaborator(userId: string, eventId: string, memberUserId: string) {
    const access = await authorizeEventAccess(userId, eventId, 'MEMBER_MANAGE');

    if (memberUserId === userId) {
      throw new Error('Event owner cannot remove themselves');
    }

    await db.eventMember.deleteMany({
      where: {
        eventId,
        userId: memberUserId,
      },
    });

    await logActivity({
      eventId,
      userId,
      action: 'COLLABORATOR_REMOVED',
      entityType: 'EventMember',
      entityId: memberUserId,
      details: { removedUserId: memberUserId },
    });

    return { success: true, message: 'Collaborator removed successfully' };
  }

  /**
   * Lists all collaborators and members for an event.
   */
  static async listCollaborators(userId: string, eventId: string) {
    await authorizeEventAccess(userId, eventId, 'EVENT_VIEW');

    const [event, members] = await Promise.all([
      db.event.findUnique({
        where: { id: eventId },
        select: {
          owner: { select: { id: true, name: true, email: true } },
        },
      }),
      db.eventMember.findMany({
        where: { eventId },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    return {
      owner: event?.owner,
      members,
    };
  }
}
