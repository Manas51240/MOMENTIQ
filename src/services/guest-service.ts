import db, { serializeBigInts } from '@/lib/database';
import { logActivity } from '@/lib/database/audit';
import { authorizeEventAccess } from '@/lib/security/auth-middleware';
import { parseGuestListCsv } from '@/lib/guest/csv-parser';
import {
  generateInvitationCode,
  generateCreativeInvitationWording,
  evaluateInvitationDelivery,
  InvitationTone,
} from '@/lib/guest/invitation-generator';
import { z } from 'zod';

export const guestInputSchema = z.object({
  groupId: z.string().optional(),
  name: z.string().trim().min(2, 'Guest name must be at least 2 characters').max(100),
  email: z.string().trim().email().optional().or(z.literal('')),
  phone: z.string().trim().max(30).optional(),
  rsvpStatus: z.enum(['ATTENDING', 'DECLINED', 'MAYBE', 'PENDING']).default('PENDING'),
  attendingCount: z.number().int().min(1).max(20).default(1),
  dietaryRequirements: z.string().trim().max(500).optional(),
  accessibilityNotes: z.string().trim().max(500).optional().default(''),
  isPlusOne: z.boolean().default(false),
  plusOneOf: z.string().optional(),
  seatingTable: z.string().trim().max(50).optional(),
  customWording: z.string().trim().max(2000).optional().default(''),
});

export const publicRsvpSchema = z.object({
  rsvpStatus: z.enum(['ATTENDING', 'DECLINED', 'MAYBE']),
  attendingCount: z.number().int().min(1).max(20).default(1),
  dietaryRequirements: z.string().trim().max(500).optional(),
  accessibilityNotes: z.string().trim().max(500).optional(),
});

export const seatingAssignmentSchema = z.object({
  tableNumber: z.number().int().min(1),
  tableName: z.string().trim().max(50).default('Table'),
  seatNumber: z.number().int().min(1),
  guestId: z.string().min(1),
});

export class GuestService {
  /**
   * Retrieves all guests for an event with group information, seating, and metrics.
   * Enforces data minimization: masks contact PII for read-only VIEWER roles.
   */
  static async listGuests(userId: string, eventId: string) {
    const access = await authorizeEventAccess(userId, eventId, 'EVENT_VIEW');

    const [event, guests, groups, seating] = await Promise.all([
      db.event.findUnique({
        where: { id: eventId },
        select: { guestTarget: true, title: true },
      }),
      db.guest.findMany({
        where: { eventId },
        include: {
          group: true,
          seatingAssignments: true,
        },
        orderBy: { name: 'asc' },
      }),
      db.guestGroup.findMany({
        where: { eventId },
        orderBy: { name: 'asc' },
      }),
      db.seatingAssignment.findMany({
        where: { eventId },
        include: { guest: { select: { id: true, name: true } } },
      }),
    ]);

    if (!event) throw new Error('Event not found');

    const isViewerOnly = access.role === 'VIEWER';

    // Data minimization: mask PII for viewers
    const sanitizedGuests = guests.map((g) => {
      let email = g.email;
      let phone = g.phone;

      if (isViewerOnly && email) {
        const parts = email.split('@');
        email = `${parts[0].slice(0, 2)}***@${parts[1] || 'example.com'}`;
      }
      if (isViewerOnly && phone) {
        phone = `${phone.slice(0, 3)}****${phone.slice(-2)}`;
      }

      return {
        ...g,
        email,
        phone,
      };
    });

    // Compute attendance metrics
    let totalInvitedSeats = 0;
    let totalAttendingSeats = 0;
    let totalDeclined = 0;
    let totalPending = 0;
    let totalCheckedIn = 0;

    for (const g of guests) {
      totalInvitedSeats += g.attendingCount;
      if (g.rsvpStatus === 'ATTENDING') {
        totalAttendingSeats += g.attendingCount;
      } else if (g.rsvpStatus === 'DECLINED') {
        totalDeclined++;
      } else {
        totalPending++;
      }
      if (g.checkedIn) {
        totalCheckedIn += g.attendingCount;
      }
    }

    return serializeBigInts({
      guests: sanitizedGuests,
      groups,
      seating,
      metrics: {
        totalGuestRecords: guests.length,
        totalInvitedSeats,
        totalAttendingSeats,
        totalDeclined,
        totalPending,
        totalCheckedIn,
        targetCapacity: event.guestTarget,
      },
    });
  }

  /**
   * Adds an individual guest with duplicate detection and unique tokenized invite code.
   */
  static async addGuest(
    userId: string,
    eventId: string,
    data: z.input<typeof guestInputSchema>
  ) {
    await authorizeEventAccess(userId, eventId, 'GUEST_MANAGE');
    const parsed = guestInputSchema.parse(data);

    // Duplicate detection within event (by email or name)
    if (parsed.email && parsed.email.length > 0) {
      const existingEmail = await db.guest.findFirst({
        where: { eventId, email: parsed.email.toLowerCase() },
      });
      if (existingEmail) {
        throw new Error(`A guest with email "${parsed.email}" is already registered for this event`);
      }
    }

    const existingName = await db.guest.findFirst({
      where: { eventId, name: parsed.name },
    });
    if (existingName) {
      throw new Error(`A guest named "${parsed.name}" is already on this event's guest list`);
    }

    const invitationCode = generateInvitationCode();

    const guest = await db.guest.create({
      data: {
        eventId,
        groupId: parsed.groupId || null,
        name: parsed.name,
        email: parsed.email ? parsed.email.toLowerCase() : null,
        phone: parsed.phone || null,
        rsvpStatus: parsed.rsvpStatus,
        attendingCount: parsed.attendingCount,
        dietaryRequirements: parsed.dietaryRequirements || null,
        accessibilityNotes: parsed.accessibilityNotes,
        isPlusOne: parsed.isPlusOne,
        plusOneOf: parsed.plusOneOf || null,
        seatingTable: parsed.seatingTable || null,
        invitationCode,
        customWording: parsed.customWording,
      },
      include: { group: true },
    });

    await logActivity({
      eventId,
      userId,
      action: 'GUEST_ADDED',
      entityType: 'Guest',
      entityId: guest.id,
      details: { name: guest.name, attendingCount: guest.attendingCount },
    });

    return guest;
  }

  /**
   * Imports guest list from CSV with validation and duplicate exclusion.
   */
  static async importGuestsFromCsv(
    userId: string,
    eventId: string,
    csvText: string
  ) {
    await authorizeEventAccess(userId, eventId, 'GUEST_MANAGE');

    const parseResult = parseGuestListCsv(csvText);

    if (parseResult.errors.length > 0 && parseResult.validRows.length === 0) {
      return {
        importedCount: 0,
        skippedDuplicates: parseResult.duplicateCount,
        errors: parseResult.errors,
      };
    }

    // Check existing database records for collisions
    const existingGuests = await db.guest.findMany({
      where: { eventId },
      select: { email: true, name: true },
    });

    const dbEmails = new Set(existingGuests.map((g) => g.email?.toLowerCase()).filter(Boolean));
    const dbNames = new Set(existingGuests.map((g) => g.name.toLowerCase()));

    const toInsert = [];
    let skippedExisting = 0;

    for (const row of parseResult.validRows) {
      if (row.email && dbEmails.has(row.email.toLowerCase())) {
        skippedExisting++;
        continue;
      }
      if (dbNames.has(row.name.toLowerCase())) {
        skippedExisting++;
        continue;
      }

      toInsert.push({
        eventId,
        name: row.name,
        email: row.email ? row.email.toLowerCase() : null,
        phone: row.phone || null,
        rsvpStatus: 'PENDING',
        attendingCount: row.attendingCount,
        dietaryRequirements: row.dietaryRequirements || null,
        accessibilityNotes: row.accessibilityNotes || '',
        isPlusOne: row.isPlusOne,
        invitationCode: generateInvitationCode(),
      });
    }

    // Batch insert in transaction
    await db.$transaction(
      toInsert.map((item) =>
        db.guest.create({
          data: item,
        })
      )
    );

    await logActivity({
      eventId,
      userId,
      action: 'GUEST_LIST_IMPORTED_CSV',
      entityType: 'Guest',
      entityId: eventId,
      details: {
        importedCount: toInsert.length,
        skippedDuplicates: parseResult.duplicateCount + skippedExisting,
      },
    });

    return {
      importedCount: toInsert.length,
      skippedDuplicates: parseResult.duplicateCount + skippedExisting,
      errors: parseResult.errors,
    };
  }

  /**
   * Updates guest information, RSVP status, or seating.
   */
  static async updateGuest(
    userId: string,
    eventId: string,
    guestId: string,
    data: Partial<z.input<typeof guestInputSchema>>
  ) {
    await authorizeEventAccess(userId, eventId, 'GUEST_MANAGE');

    const existing = await db.guest.findFirst({
      where: { id: guestId, eventId },
    });
    if (!existing) throw new Error('Guest not found on this event');

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email ? data.email.toLowerCase() : null;
    if (data.phone !== undefined) updateData.phone = data.phone || null;
    if (data.groupId !== undefined) updateData.groupId = data.groupId || null;
    if (data.rsvpStatus !== undefined) updateData.rsvpStatus = data.rsvpStatus;
    if (data.attendingCount !== undefined) updateData.attendingCount = data.attendingCount;
    if (data.dietaryRequirements !== undefined) updateData.dietaryRequirements = data.dietaryRequirements || null;
    if (data.accessibilityNotes !== undefined) updateData.accessibilityNotes = data.accessibilityNotes;
    if (data.isPlusOne !== undefined) updateData.isPlusOne = data.isPlusOne;
    if (data.plusOneOf !== undefined) updateData.plusOneOf = data.plusOneOf || null;
    if (data.seatingTable !== undefined) updateData.seatingTable = data.seatingTable || null;
    if (data.customWording !== undefined) updateData.customWording = data.customWording;

    const updated = await db.guest.update({
      where: { id: guestId },
      data: updateData,
      include: { group: true },
    });

    await logActivity({
      eventId,
      userId,
      action: 'GUEST_UPDATED',
      entityType: 'Guest',
      entityId: guestId,
      details: updateData as Record<string, unknown>,
    });

    return updated;
  }

  /**
   * Deletes a guest.
   */
  static async deleteGuest(userId: string, eventId: string, guestId: string) {
    await authorizeEventAccess(userId, eventId, 'GUEST_MANAGE');

    const existing = await db.guest.findFirst({
      where: { id: guestId, eventId },
    });
    if (!existing) throw new Error('Guest not found');

    await db.guest.delete({ where: { id: guestId } });

    await logActivity({
      eventId,
      userId,
      action: 'GUEST_DELETED',
      entityType: 'Guest',
      entityId: guestId,
      details: { name: existing.name },
    });

    return { success: true, message: 'Guest removed successfully' };
  }

  /**
   * Public RSVP View: Retrieves public invitation view for a guest via secure invite code.
   * Completely isolated: cannot inspect other guests or event administrative details.
   */
  static async publicGetInvitation(inviteCode: string) {
    const guest = await db.guest.findUnique({
      where: { invitationCode: inviteCode },
      include: {
        event: {
          select: {
            title: true,
            eventType: true,
            startDate: true,
            venue: true,
            city: true,
            country: true,
          },
        },
      },
    });

    if (!guest) {
      throw new Error('Invalid or expired invitation link');
    }

    return {
      invitationCode: guest.invitationCode,
      guestName: guest.name,
      currentRsvpStatus: guest.rsvpStatus,
      attendingCount: guest.attendingCount,
      dietaryRequirements: guest.dietaryRequirements,
      accessibilityNotes: guest.accessibilityNotes,
      event: guest.event,
      customWording: guest.customWording,
    };
  }

  /**
   * Public RSVP Submission: Updates guest attendance status using their invite code.
   */
  static async publicSubmitRsvp(
    inviteCode: string,
    data: z.infer<typeof publicRsvpSchema>
  ) {
    const parsed = publicRsvpSchema.parse(data);

    const guest = await db.guest.findUnique({
      where: { invitationCode: inviteCode },
      include: {
        event: {
          select: {
            ownerId: true,
          },
        },
      },
    });

    if (!guest) {
      throw new Error('Invalid or expired invitation code');
    }

    const updated = await db.guest.update({
      where: { id: guest.id },
      data: {
        rsvpStatus: parsed.rsvpStatus,
        attendingCount: parsed.rsvpStatus === 'ATTENDING' ? parsed.attendingCount : 0,
        dietaryRequirements: parsed.dietaryRequirements || guest.dietaryRequirements,
        accessibilityNotes: parsed.accessibilityNotes || guest.accessibilityNotes,
        rsvpRespondedAt: new Date(),
      },
    });

    await logActivity({
      eventId: guest.eventId,
      userId: guest.event.ownerId,
      action: 'RSVP_SUBMITTED',
      entityType: 'Guest',
      entityId: guest.id,
      details: {
        guestName: guest.name,
        rsvpStatus: parsed.rsvpStatus,
        attendingCount: updated.attendingCount,
      },
    });

    return {
      success: true,
      rsvpStatus: updated.rsvpStatus,
      attendingCount: updated.attendingCount,
      message:
        parsed.rsvpStatus === 'ATTENDING'
          ? `Thank you, ${guest.name}! Your RSVP has been confirmed for ${updated.attendingCount} attendee(s).`
          : `Thank you, ${guest.name}. We have recorded that you will not be able to attend.`,
    };
  }

  /**
   * Assigns a seat to a guest at a specific table number.
   * Enforces unique seating constraint per table/seat.
   */
  static async assignSeating(
    userId: string,
    eventId: string,
    data: z.infer<typeof seatingAssignmentSchema>
  ) {
    await authorizeEventAccess(userId, eventId, 'GUEST_MANAGE');
    const parsed = seatingAssignmentSchema.parse(data);

    // Verify guest belongs to this event
    const guest = await db.guest.findFirst({
      where: { id: parsed.guestId, eventId },
    });
    if (!guest) throw new Error('Guest not found on this event');

    // Upsert seating assignment
    const assignment = await db.seatingAssignment.upsert({
      where: {
        eventId_tableNumber_seatNumber: {
          eventId,
          tableNumber: parsed.tableNumber,
          seatNumber: parsed.seatNumber,
        },
      },
      update: {
        guestId: parsed.guestId,
        tableName: parsed.tableName,
      },
      create: {
        eventId,
        tableNumber: parsed.tableNumber,
        tableName: parsed.tableName,
        seatNumber: parsed.seatNumber,
        guestId: parsed.guestId,
      },
    });

    // Update guest's seatingTable display field
    await db.guest.update({
      where: { id: parsed.guestId },
      data: { seatingTable: `${parsed.tableName} ${parsed.tableNumber}` },
    });

    return assignment;
  }

  /**
   * Event-Day Door Check-In: Flags guest as checked in.
   */
  static async checkInGuest(
    userId: string,
    eventId: string,
    guestId: string,
    checkedIn: boolean = true
  ) {
    await authorizeEventAccess(userId, eventId, 'GUEST_MANAGE');

    const guest = await db.guest.findFirst({
      where: { id: guestId, eventId },
    });
    if (!guest) throw new Error('Guest not found');

    const updated = await db.guest.update({
      where: { id: guestId },
      data: {
        checkedIn,
        checkedInAt: checkedIn ? new Date() : null,
      },
    });

    await logActivity({
      eventId,
      userId,
      action: checkedIn ? 'GUEST_CHECKED_IN' : 'GUEST_CHECKIN_REVERSED',
      entityType: 'Guest',
      entityId: guestId,
      details: { guestName: guest.name, checkedIn },
    });

    return updated;
  }

  /**
   * AI Creative Studio: Generates personalized invitation copy for a guest.
   */
  static async generateInvitationCopy(
    userId: string,
    eventId: string,
    guestId: string,
    tone: InvitationTone = 'CELEBRATORY'
  ) {
    await authorizeEventAccess(userId, eventId, 'EVENT_VIEW');

    const [event, guest] = await Promise.all([
      db.event.findUnique({
        where: { id: eventId },
        select: { title: true, eventType: true, startDate: true, venue: true },
      }),
      db.guest.findFirst({
        where: { id: guestId, eventId },
      }),
    ]);

    if (!event || !guest) throw new Error('Event or guest not found');

    const content = generateCreativeInvitationWording({
      guestName: guest.name,
      eventTitle: event.title,
      eventType: event.eventType,
      eventDate: event.startDate.toISOString(),
      venue: event.venue,
      tone,
    });

    // Save generated copy to guest record
    await db.guest.update({
      where: { id: guestId },
      data: { customWording: content.formattedInvitationText },
    });

    return content;
  }

  /**
   * Dispatches an invitation and verifies truth-in-delivery status.
   */
  static async dispatchInvitation(
    userId: string,
    eventId: string,
    guestId: string,
    channel: 'EMAIL' | 'SMS' | 'WHATSAPP'
  ) {
    await authorizeEventAccess(userId, eventId, 'GUEST_MANAGE');

    const guest = await db.guest.findFirst({
      where: { id: guestId, eventId },
    });
    if (!guest) throw new Error('Guest not found');

    const delivery = evaluateInvitationDelivery(channel);

    const updated = await db.guest.update({
      where: { id: guestId },
      data: {
        deliveryChannel: channel,
        deliveryStatus: delivery.status,
        invitationSentAt: delivery.status === 'SENT' ? new Date() : null,
      },
    });

    return {
      guest: updated,
      delivery,
    };
  }

  /**
   * Generates a comprehensive attendance and dietary breakdown report.
   */
  static async generateAttendanceReport(userId: string, eventId: string) {
    await authorizeEventAccess(userId, eventId, 'EVENT_VIEW');

    const guests = await db.guest.findMany({
      where: { eventId },
      include: { group: true, seatingAssignments: true },
    });

    const dietaryTally: Record<string, number> = {};
    const accessibilityRequirements: string[] = [];

    for (const g of guests) {
      if (g.rsvpStatus === 'ATTENDING' && g.dietaryRequirements) {
        const tags = g.dietaryRequirements.split(',').map((t) => t.trim());
        for (const tag of tags) {
          dietaryTally[tag] = (dietaryTally[tag] || 0) + g.attendingCount;
        }
      }
      if (g.accessibilityNotes) {
        accessibilityRequirements.push(`${g.name}: ${g.accessibilityNotes}`);
      }
    }

    return {
      totalGuests: guests.length,
      dietaryBreakdown: dietaryTally,
      accessibilityAccommodations: accessibilityRequirements,
    };
  }
}
