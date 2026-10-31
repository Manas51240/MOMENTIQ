import { EventRole } from '@/types';

// ==============================================================================
// CELEBRA — Role-Based Access Control (RBAC) & IDOR Protection Matrix
// ASVS Level 2: Strict Server-Side Permission Enforcement
// ==============================================================================

export type EventPermission =
  | 'EVENT_DELETE'
  | 'MEMBER_MANAGE'
  | 'EVENT_EDIT'
  | 'BUDGET_MANAGE'
  | 'TIMELINE_MANAGE'
  | 'VENDOR_MANAGE'
  | 'GUEST_MANAGE'
  | 'RISK_MANAGE'
  | 'REPORT_EXPORT'
  | 'EVENT_VIEW';

const ROLE_PERMISSIONS: Record<EventRole, EventPermission[]> = {
  OWNER: [
    'EVENT_DELETE',
    'MEMBER_MANAGE',
    'EVENT_EDIT',
    'BUDGET_MANAGE',
    'TIMELINE_MANAGE',
    'VENDOR_MANAGE',
    'GUEST_MANAGE',
    'RISK_MANAGE',
    'REPORT_EXPORT',
    'EVENT_VIEW',
  ],
  PLANNER: [
    'EVENT_EDIT',
    'BUDGET_MANAGE',
    'TIMELINE_MANAGE',
    'VENDOR_MANAGE',
    'GUEST_MANAGE',
    'RISK_MANAGE',
    'REPORT_EXPORT',
    'EVENT_VIEW',
  ],
  COLLABORATOR: [
    'TIMELINE_MANAGE',
    'GUEST_MANAGE',
    'REPORT_EXPORT',
    'EVENT_VIEW',
  ],
  VIEWER: [
    'REPORT_EXPORT',
    'EVENT_VIEW',
  ],
};

/**
 * Checks whether an event role has the specified permission.
 */
export function hasPermission(role: EventRole, permission: EventPermission): boolean {
  const allowed = ROLE_PERMISSIONS[role] || [];
  return allowed.includes(permission);
}

/**
 * Checks if the user's role meets or exceeds a target role requirement.
 */
export function satisfiesRoleRequirement(actualRole: EventRole, requiredRole: EventRole): boolean {
  const levels: Record<EventRole, number> = {
    OWNER: 4,
    PLANNER: 3,
    COLLABORATOR: 2,
    VIEWER: 1,
  };
  return (levels[actualRole] ?? 0) >= (levels[requiredRole] ?? 0);
}

