import { EventRole } from '@/types';

// ==============================================================================
// CELEBRA — Role-Based Access Control (RBAC) & Governance Matrix
// ASVS Level 2: Strict Server-Side Permission Enforcement & Privilege Isolation
// Roles: Event Owner, Event Admin, Planner, Finance Manager, Guest Coordinator, Viewer
// ==============================================================================

export type EventPermission =
  | 'OWNERSHIP_TRANSFER'
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

export const ALL_EVENT_ROLES: EventRole[] = [
  'OWNER',
  'ADMIN',
  'PLANNER',
  'FINANCE_MANAGER',
  'GUEST_COORDINATOR',
  'COLLABORATOR',
  'VIEWER',
];

const ROLE_PERMISSIONS: Record<EventRole, EventPermission[]> = {
  OWNER: [
    'OWNERSHIP_TRANSFER',
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
  ADMIN: [
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
    'TIMELINE_MANAGE',
    'VENDOR_MANAGE',
    'GUEST_MANAGE',
    'RISK_MANAGE',
    'REPORT_EXPORT',
    'EVENT_VIEW',
  ],
  FINANCE_MANAGER: [
    'BUDGET_MANAGE',
    'VENDOR_MANAGE',
    'REPORT_EXPORT',
    'EVENT_VIEW',
  ],
  GUEST_COORDINATOR: [
    'GUEST_MANAGE',
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

const ROLE_HIERARCHY: Record<EventRole, number> = {
  OWNER: 6,
  ADMIN: 5,
  PLANNER: 4,
  FINANCE_MANAGER: 3,
  GUEST_COORDINATOR: 3,
  COLLABORATOR: 2,
  VIEWER: 1,
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
  return (ROLE_HIERARCHY[actualRole] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 0);
}

/**
 * Validates whether an actor can grant or update a target role.
 * Prevents privilege escalation:
 * - Only OWNER can grant ADMIN or initiate OWNERSHIP_TRANSFER.
 * - ADMIN can assign roles strictly below ADMIN (PLANNER, FINANCE_MANAGER, GUEST_COORDINATOR, COLLABORATOR, VIEWER).
 * - Non-admins cannot manage or assign roles.
 */
export function canAssignRole(actingRole: EventRole, roleToAssign: EventRole): boolean {
  if (actingRole === 'OWNER') {
    return true; // Owner can assign any role up to Admin or transfer Owner
  }
  if (actingRole === 'ADMIN') {
    return roleToAssign !== 'OWNER' && roleToAssign !== 'ADMIN';
  }
  return false;
}

/**
 * Validates whether an actor can remove a member with a given role.
 * - OWNER can remove anyone except themselves (cannot remove own event without deleting or transferring).
 * - ADMIN can only remove roles below ADMIN.
 * - Non-admins cannot remove members.
 */
export function canRemoveMember(actingRole: EventRole, targetMemberRole: EventRole): boolean {
  if (actingRole === 'OWNER') {
    return targetMemberRole !== 'OWNER';
  }
  if (actingRole === 'ADMIN') {
    return (
      targetMemberRole !== 'OWNER' &&
      targetMemberRole !== 'ADMIN'
    );
  }
  return false;
}

/**
 * Checks if actor can transfer event ownership.
 * Strict rule: ONLY Event Owner can transfer ownership.
 */
export function canTransferOwnership(actingRole: EventRole): boolean {
  return actingRole === 'OWNER';
}
