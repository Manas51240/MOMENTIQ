import crypto from 'crypto';
import db, { serializeBigInts } from '@/lib/database';
import { logActivity } from '@/lib/database/audit';
import { authorizeEventAccess } from '@/lib/security/auth-middleware';
import { EventRole } from '@/types';
import {
  canAssignRole,
  canRemoveMember,
  canTransferOwnership,
  hasPermission,
} from '@/lib/security/rbac';
import { z } from 'zod';

export const inviteCollaboratorSchema = z.object({
  email: z.string().trim().email('Valid email address is required').toLowerCase(),
  role: z.enum([
    'ADMIN',
    'PLANNER',
    'FINANCE_MANAGER',
    'GUEST_COORDINATOR',
    'VIEWER',
    'COLLABORATOR',
  ]),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum([
    'ADMIN',
    'PLANNER',
    'FINANCE_MANAGER',
    'GUEST_COORDINATOR',
    'VIEWER',
    'COLLABORATOR',
  ]),
});

export const transferOwnershipSchema = z.object({
  newOwnerUserId: z.string().uuid('Valid user ID is required'),
});

export class CollaborationService {
  /**
   * Invites a collaborator by email or assigns their role if already registered.
   * Strictly enforces server-side privilege escalation barriers:
   * - Only OWNER can invite or assign ADMIN.
   * - ADMIN can only invite/assign roles below ADMIN.
   * - Non-admins are blocked by MEMBER_MANAGE permission.
   */
  static async inviteCollaborator(
    userId: string,
    eventId: string,
    input: z.input<typeof inviteCollaboratorSchema>
  ) {
    const access = await authorizeEventAccess(userId, eventId, 'MEMBER_MANAGE');
    const parsed = inviteCollaboratorSchema.parse(input);

    // Enforce privilege escalation barrier
    if (!canAssignRole(access.role, parsed.role)) {
      throw new Error(
        `Privilege escalation prevented: Role ${access.role} is not permitted to assign or invite role ${parsed.role}`
      );
    }

    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { id: true, title: true, ownerId: true },
    });

    if (!event) {
      throw new Error('Event not found');
    }

    // Check if target email belongs to an existing registered user
    const existingUser = await db.user.findUnique({
      where: { email: parsed.email },
      select: { id: true, email: true, name: true },
    });

    if (existingUser) {
      if (existingUser.id === event.ownerId) {
        throw new Error('User is already the Event Owner');
      }

      // Upsert collaborator membership directly
      const member = await db.eventMember.upsert({
        where: {
          eventId_userId: {
            eventId,
            userId: existingUser.id,
          },
        },
        update: {
          role: parsed.role,
        },
        create: {
          eventId,
          userId: existingUser.id,
          role: parsed.role,
          invitedBy: userId,
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });

      // Emit in-app notification
      await db.notification.create({
        data: {
          eventId,
          userId: existingUser.id,
          title: 'Event Collaboration Invitation',
          message: `You have been added to "${event.title}" as ${parsed.role}.`,
        },
      });

      // Audit log
      await logActivity({
        eventId,
        userId,
        action: 'COLLABORATOR_ASSIGNED',
        entityType: 'EventMember',
        entityId: member.id,
        details: { collaboratorEmail: parsed.email, role: parsed.role },
      });

      return {
        type: 'MEMBER_ADDED' as const,
        member,
      };
    }

    // User is not yet registered: generate tokenized invitation
    const token = `INV-${crypto.randomBytes(16).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 7 * 86400000); // 7-day expiration

    const invitation = await db.collaboratorInvitation.create({
      data: {
        eventId,
        email: parsed.email,
        role: parsed.role,
        token,
        invitedBy: userId,
        expiresAt,
        status: 'PENDING',
      },
    });

    await logActivity({
      eventId,
      userId,
      action: 'COLLABORATOR_INVITED',
      entityType: 'CollaboratorInvitation',
      entityId: invitation.id,
      details: { email: parsed.email, role: parsed.role, token },
    });

    return {
      type: 'INVITATION_CREATED' as const,
      invitation,
    };
  }

  /**
   * Accepts a pending tokenized collaborator invitation.
   */
  static async acceptInvitation(userId: string, token: string) {
    const invite = await db.collaboratorInvitation.findUnique({
      where: { token },
      include: {
        event: { select: { id: true, title: true, ownerId: true } },
      },
    });

    if (!invite || invite.status !== 'PENDING') {
      throw new Error('Invitation is invalid or has already been redeemed');
    }

    if (new Date() > invite.expiresAt) {
      await db.collaboratorInvitation.update({
        where: { id: invite.id },
        data: { status: 'EXPIRED' },
      });
      throw new Error('This invitation has expired');
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) throw new Error('User not found');

    if (user.id === invite.event.ownerId) {
      throw new Error('You are already the Event Owner');
    }

    const member = await db.$transaction(async (tx) => {
      const m = await tx.eventMember.upsert({
        where: {
          eventId_userId: {
            eventId: invite.eventId,
            userId,
          },
        },
        update: {
          role: invite.role,
        },
        create: {
          eventId: invite.eventId,
          userId,
          role: invite.role,
          invitedBy: invite.invitedBy,
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });

      await tx.collaboratorInvitation.update({
        where: { id: invite.id },
        data: { status: 'ACCEPTED' },
      });

      return m;
    });

    await logActivity({
      eventId: invite.eventId,
      userId,
      action: 'COLLABORATOR_JOINED',
      entityType: 'EventMember',
      entityId: member.id,
      details: { role: invite.role, redeemedVia: 'INVITATION_TOKEN' },
    });

    return member;
  }

  /**
   * Updates a collaborator's assigned role with strict privilege checks.
   */
  static async updateCollaboratorRole(
    actorUserId: string,
    eventId: string,
    targetUserId: string,
    newRole: EventRole
  ) {
    const access = await authorizeEventAccess(actorUserId, eventId, 'MEMBER_MANAGE');

    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { ownerId: true, title: true },
    });

    if (!event) throw new Error('Event not found');

    if (targetUserId === event.ownerId) {
      throw new Error('Cannot modify the Event Owner role directly. Use Ownership Transfer instead.');
    }

    if (targetUserId === actorUserId) {
      throw new Error('Privilege escalation denied: You cannot modify your own role.');
    }

    const targetMember = await db.eventMember.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId: targetUserId,
        },
      },
    });

    if (!targetMember) {
      throw new Error('Collaborator member record not found');
    }

    // Check if actor has authority over target's current role
    if (access.role === 'ADMIN' && targetMember.role === 'ADMIN') {
      throw new Error('Event Admins cannot modify roles of other Event Admins. Only Event Owner can perform this.');
    }

    // Check if actor is authorized to grant newRole
    if (!canAssignRole(access.role, newRole)) {
      throw new Error(`Privilege escalation denied: Role ${access.role} cannot grant role ${newRole}.`);
    }

    const updated = await db.eventMember.update({
      where: { id: targetMember.id },
      data: { role: newRole },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    // Notify target user
    await db.notification.create({
      data: {
        eventId,
        userId: targetUserId,
        title: 'Role Updated',
        message: `Your role in "${event.title}" has been updated to ${newRole}.`,
      },
    });

    await logActivity({
      eventId,
      userId: actorUserId,
      action: 'COLLABORATOR_ROLE_UPDATED',
      entityType: 'EventMember',
      entityId: updated.id,
      details: {
        targetUserId,
        previousRole: targetMember.role,
        newRole,
      },
    });

    return updated;
  }

  /**
   * Revokes access / removes a collaborator from the event workspace.
   */
  static async revokeCollaboratorAccess(
    actorUserId: string,
    eventId: string,
    targetUserId: string
  ) {
    const access = await authorizeEventAccess(actorUserId, eventId, 'MEMBER_MANAGE');

    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { ownerId: true, title: true },
    });

    if (!event) throw new Error('Event not found');

    if (targetUserId === event.ownerId) {
      throw new Error('The Event Owner cannot be removed from their own event.');
    }

    const targetMember = await db.eventMember.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId: targetUserId,
        },
      },
    });

    if (!targetMember) {
      throw new Error('Collaborator member record not found');
    }

    if (!canRemoveMember(access.role, targetMember.role as EventRole)) {
      throw new Error(
        `Permission denied: Role ${access.role} is not permitted to remove a member with role ${targetMember.role}`
      );
    }

    await db.$transaction(async (tx) => {
      // Unassign any tasks assigned to this collaborator
      await tx.task.updateMany({
        where: { eventId, assignedToId: targetUserId },
        data: { assignedToId: null },
      });

      // Delete membership
      await tx.eventMember.delete({
        where: { id: targetMember.id },
      });
    });

    await logActivity({
      eventId,
      userId: actorUserId,
      action: 'COLLABORATOR_REVOKED',
      entityType: 'EventMember',
      entityId: targetMember.id,
      details: {
        targetUserId,
        revokedRole: targetMember.role,
      },
    });

    return { success: true, message: 'Collaborator access revoked successfully' };
  }

  /**
   * Transfers full Event Ownership to another registered user.
   * STRICT SECURITY RULE: ONLY the current Event Owner can transfer ownership.
   */
  static async transferOwnership(
    currentOwnerUserId: string,
    eventId: string,
    newOwnerUserId: string
  ) {
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { id: true, ownerId: true, title: true },
    });

    if (!event) throw new Error('Event not found');

    if (event.ownerId !== currentOwnerUserId) {
      throw new Error('Forbidden: Only the Event Owner can transfer event ownership.');
    }

    if (newOwnerUserId === currentOwnerUserId) {
      throw new Error('You are already the Event Owner.');
    }

    const newOwner = await db.user.findUnique({
      where: { id: newOwnerUserId },
      select: { id: true, name: true, email: true },
    });

    if (!newOwner) {
      throw new Error('Target new owner user not found.');
    }

    // Execute ownership transfer in a strict transaction
    await db.$transaction(async (tx) => {
      // 1. Update event ownerId
      await tx.event.update({
        where: { id: eventId },
        data: { ownerId: newOwnerUserId },
      });

      // 2. Remove new owner from EventMember if they were a member
      await tx.eventMember.deleteMany({
        where: { eventId, userId: newOwnerUserId },
      });

      // 3. Demote previous owner to ADMIN in EventMember so they retain operational access
      await tx.eventMember.upsert({
        where: {
          eventId_userId: {
            eventId,
            userId: currentOwnerUserId,
          },
        },
        update: {
          role: 'ADMIN',
        },
        create: {
          eventId,
          userId: currentOwnerUserId,
          role: 'ADMIN',
          invitedBy: newOwnerUserId,
        },
      });

      // 4. Notify both parties
      await tx.notification.create({
        data: {
          eventId,
          userId: newOwnerUserId,
          title: 'Event Ownership Transferred',
          message: `You are now the full Event Owner of "${event.title}".`,
        },
      });

      await tx.notification.create({
        data: {
          eventId,
          userId: currentOwnerUserId,
          title: 'Ownership Transferred',
          message: `You transferred ownership of "${event.title}" to ${newOwner.name}. You are now an Event Admin.`,
        },
      });
    });

    await logActivity({
      eventId,
      userId: currentOwnerUserId,
      action: 'OWNERSHIP_TRANSFERRED',
      entityType: 'Event',
      entityId: eventId,
      details: {
        previousOwnerId: currentOwnerUserId,
        newOwnerId: newOwnerUserId,
        newOwnerEmail: newOwner.email,
      },
    });

    return {
      success: true,
      message: `Ownership successfully transferred to ${newOwner.name} (${newOwner.email})`,
      newOwnerId: newOwnerUserId,
    };
  }

  /**
   * Lists all collaborators, event owner, and pending invitations.
   */
  static async listCollaboratorsAndInvites(userId: string, eventId: string) {
    const access = await authorizeEventAccess(userId, eventId, 'EVENT_VIEW');

    const [event, members, invitations] = await Promise.all([
      db.event.findUnique({
        where: { id: eventId },
        select: {
          ownerId: true,
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
      db.collaboratorInvitation.findMany({
        where: { eventId, status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      owner: event?.owner,
      callerRole: access.role,
      isOwner: access.isOwner,
      canManageMembers: access.canManageMembers,
      members,
      invitations,
    };
  }

  /**
   * Retrieves the event activity audit feed with user details and human-friendly formatting.
   */
  static async getActivityFeed(
    userId: string,
    eventId: string,
    options: { limit?: number; offset?: number; entityType?: string } = {}
  ) {
    await authorizeEventAccess(userId, eventId, 'EVENT_VIEW');

    const limit = Math.min(100, Math.max(1, options.limit || 30));
    const offset = Math.max(0, options.offset || 0);

    const logs = await db.activityLog.findMany({
      where: {
        eventId,
        ...(options.entityType ? { entityType: options.entityType } : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await db.activityLog.count({
      where: {
        eventId,
        ...(options.entityType ? { entityType: options.entityType } : {}),
      },
    });

    return {
      logs: logs.map((log) => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        details: log.detailsJson ? JSON.parse(log.detailsJson) : null,
        performedBy: log.user,
        timestamp: log.createdAt,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + logs.length < total,
      },
    };
  }

  /**
   * Retrieves user notifications for an event or globally.
   */
  static async getNotifications(userId: string, eventId?: string) {
    const notifications = await db.notification.findMany({
      where: {
        userId,
        ...(eventId ? { eventId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await db.notification.count({
      where: {
        userId,
        read: false,
        ...(eventId ? { eventId } : {}),
      },
    });

    return {
      notifications,
      unreadCount,
    };
  }

  /**
   * Marks a notification as read.
   */
  static async markNotificationRead(userId: string, notificationId: string) {
    const notification = await db.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      throw new Error('Notification not found or access denied');
    }

    const updated = await db.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });

    return updated;
  }

  /**
   * Assigns task ownership to a collaborator and emits an audit event.
   */
  static async assignTaskOwnership(
    userId: string,
    eventId: string,
    taskId: string,
    assigneeUserId: string | null
  ) {
    await authorizeEventAccess(userId, eventId, 'TIMELINE_MANAGE');

    const task = await db.task.findUnique({
      where: { id: taskId },
    });

    if (!task || task.eventId !== eventId) {
      throw new Error('Task not found on this event');
    }

    if (assigneeUserId) {
      // Verify assignee is part of event
      const isMember = await db.eventMember.findUnique({
        where: { eventId_userId: { eventId, userId: assigneeUserId } },
      });
      const event = await db.event.findUnique({
        where: { id: eventId },
        select: { ownerId: true, title: true },
      });

      if (!isMember && event?.ownerId !== assigneeUserId) {
        throw new Error('Assignee must be a member or owner of this event');
      }

      await db.notification.create({
        data: {
          eventId,
          userId: assigneeUserId,
          title: 'Task Assigned',
          message: `You were assigned task "${task.title}" in "${event?.title}".`,
        },
      });
    }

    const updated = await db.task.update({
      where: { id: taskId },
      data: { assignedToId: assigneeUserId },
    });

    await logActivity({
      eventId,
      userId,
      action: 'TASK_ASSIGNED',
      entityType: 'Task',
      entityId: taskId,
      details: { taskTitle: task.title, assigneeUserId },
    });

    return updated;
  }
}
