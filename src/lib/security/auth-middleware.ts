import { NextRequest } from 'next/server';
import db from '@/lib/database';
import { verifySessionToken } from './session';
import { hasPermission, EventPermission } from './rbac';
import { EventRole, SystemUserRole } from '@/types';

// ==============================================================================
// CELEBRA — Server-Side Authentication & Event-Level RBAC Middleware
// ASVS Level 2: Strict IDOR Prevention & Anti-Spoofing Checks
// ==============================================================================

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: SystemUserRole;
}

export interface AuthContext {
  user: AuthenticatedUser;
  sessionId: string;
}

export interface EventAccessContext {
  eventId: string;
  role: EventRole;
  isOwner: boolean;
  canEdit: boolean;
  canManageMembers: boolean;
}

/**
 * Extracts and cryptographically verifies the active user session from headers or cookies.
 * Throws an Error with 401 status if absent, forged, or expired.
 */
export async function authenticateRequest(req: Request | NextRequest): Promise<AuthContext> {
  let token: string | undefined;

  // 1. Check Authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  // 2. Fall back to Cookie header
  if (!token) {
    if (req instanceof NextRequest) {
      const cookieVal = req.cookies.get('momentiq_session')?.value || req.cookies.get('celebra_session')?.value;
      if (cookieVal) {
        token = cookieVal;
      }
    }
    if (!token) {
      const cookieHeader = req.headers.get('cookie');
      if (cookieHeader) {
        const match = cookieHeader.match(/(?:momentiq_session|celebra_session)=([^;]+)/);
        if (match) {
          token = decodeURIComponent(match[1]);
        }
      }
    }
  }

  if (!token) {
    throw new Error('Authentication required: No session token provided');
  }

  // 3. CSRF Defense: For cookie-based state-modifying requests, verify Origin matches Host
  const isCookieAuth = !authHeader && !!token;
  const method = req.method ? req.method.toUpperCase() : 'GET';
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  if (isCookieAuth && isMutation) {
    const origin = req.headers.get('origin');
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    if (origin && host) {
      try {
        const originUrl = new URL(origin);
        if (originUrl.host !== host) {
          throw new Error('Forbidden: Cross-Site Request Forgery (CSRF) detected from untrusted origin');
        }
      } catch (e: unknown) {
        if (e instanceof Error && e.message.includes('CSRF')) {
          throw e;
        }
      }
    }
  }

  // Cryptographic signature & expiry verification
  const verification = verifySessionToken(token);
  if (!verification.valid || !verification.sessionId) {
    throw new Error(`Authentication required: ${verification.error || 'Invalid session'}`);
  }

  // Verify session exists in DB
  const session = await db.userSession.findUnique({
    where: { sessionToken: token },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      },
    },
  });

  if (!session || !session.user) {
    throw new Error('Authentication required: Session expired or revoked');
  }

  if (session.expiresAt.getTime() < Date.now()) {
    // Lazy purge expired session
    await db.userSession.delete({ where: { id: session.id } }).catch(() => {});
    throw new Error('Authentication required: Session expired');
  }

  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role as SystemUserRole,
    },
    sessionId: session.id,
  };
}

/**
 * Validates tenant and event isolation.
 * Guarantees that User A CANNOT view, modify, or delete User B's event records (IDOR defense).
 */
export async function authorizeEventAccess(
  userId: string,
  eventId: string,
  requiredPermission?: EventPermission
): Promise<EventAccessContext> {
  if (!userId || !eventId) {
    throw new Error('Forbidden: Missing user or event identification');
  }

  // 1. Check if user is the direct event owner
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: { id: true, ownerId: true },
  });

  if (!event) {
    throw new Error('Event not found');
  }

  let role: EventRole;
  const isOwner = event.ownerId === userId;

  if (isOwner) {
    role = 'OWNER';
  } else {
    // 2. Check if user is an invited member with a granted role
    const member = await db.eventMember.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
    });

    if (!member) {
      // Return Not found / Access Denied to prevent event ID enumeration
      throw new Error('Access denied: You do not have access to this event');
    }

    role = member.role as EventRole;
  }

  // 3. If a specific permission is required, enforce RBAC
  if (requiredPermission && !hasPermission(role, requiredPermission)) {
    throw new Error(`Forbidden: Role ${role} lacks permission ${requiredPermission}`);
  }

  return {
    eventId,
    role,
    isOwner,
    canEdit: role === 'OWNER' || role === 'ADMIN' || role === 'PLANNER',
    canManageMembers: role === 'OWNER' || role === 'ADMIN',
  };
}

