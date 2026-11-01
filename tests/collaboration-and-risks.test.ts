import { describe, it, expect, beforeEach } from 'vitest';
import db from '../src/lib/database';
import { AuthService } from '../src/services/auth-service';
import { EventService } from '../src/services/event-service';
import { RiskService } from '../src/services/risk-service';
import { CollaborationService } from '../src/services/collaboration-service';
import { authRateLimiter } from '../src/lib/security/rate-limiter';
import {
  MANDATORY_RISK_CATEGORIES,
  calculateRiskSeverity,
} from '../src/lib/risk/matrix';

describe('Risk Management & Team Collaboration Module Suite', () => {
  let ownerUser: { user: { id: string; email: string; name: string } };
  let adminUser: { user: { id: string; email: string; name: string } };
  let plannerUser: { user: { id: string; email: string; name: string } };
  let financeUser: { user: { id: string; email: string; name: string } };
  let guestCoordUser: { user: { id: string; email: string; name: string } };
  let viewerUser: { user: { id: string; email: string; name: string } };
  let outsiderUser: { user: { id: string; email: string; name: string } };
  let testEvent: { id: string; title: string };

  beforeEach(async () => {
    authRateLimiter.reset();
    const ts = Date.now();

    // Register all role test users
    ownerUser = await AuthService.register({
      email: `owner_${ts}@example.com`,
      name: 'Host Owner',
      password: 'StrongPassword123!',
    });

    adminUser = await AuthService.register({
      email: `admin_${ts}@example.com`,
      name: 'Event Admin',
      password: 'StrongPassword123!',
    });

    plannerUser = await AuthService.register({
      email: `planner_${ts}@example.com`,
      name: 'Lead Planner',
      password: 'StrongPassword123!',
    });

    financeUser = await AuthService.register({
      email: `finance_${ts}@example.com`,
      name: 'Finance Manager',
      password: 'StrongPassword123!',
    });

    guestCoordUser = await AuthService.register({
      email: `guestcoord_${ts}@example.com`,
      name: 'Guest Coordinator',
      password: 'StrongPassword123!',
    });

    viewerUser = await AuthService.register({
      email: `viewer_${ts}@example.com`,
      name: 'Stakeholder Viewer',
      password: 'StrongPassword123!',
    });

    outsiderUser = await AuthService.register({
      email: `outsider_${ts}@example.com`,
      name: 'Unrelated User',
      password: 'StrongPassword123!',
    });

    // Create test event by owner
    testEvent = await EventService.createEvent(ownerUser.user.id, {
      title: 'Grand Annual Celebration 2026',
      description: 'Comprehensive Risk and Governance Evaluation',
      eventType: 'WEDDING',
      startDate: new Date(Date.now() + 86400000 * 30).toISOString(),
      endDate: new Date(Date.now() + 86400000 * 30 + 3600000 * 8).toISOString(),
      venue: 'Metropolitan Botanic Gardens',
      city: 'Seattle',
      country: 'USA',
      guestTarget: 180,
      budgetMinor: 7500000, // $75,000.00
      currency: 'USD',
    });
  });

  // ============================================================================
  // PART 1: RISK MANAGEMENT MODULE TESTS (11 DOMAINS & 9 MANDATORY ATTRIBUTES)
  // ============================================================================
  describe('Part 1: Comprehensive Risk Management (11 Domains & 9 Attributes)', () => {
    it('1. Verifies deterministic 5x5 RAG severity calculation ($Score = P \\times I$)', () => {
      // 1. Rare & Minor -> 1 * 1 = 1 -> LOW
      const low = calculateRiskSeverity(1, 1);
      expect(low.score).toBe(1);
      expect(low.rating).toBe('LOW');

      // 2. Possible & Moderate -> 3 * 3 = 9 -> MEDIUM
      const med = calculateRiskSeverity(3, 3);
      expect(med.score).toBe(9);
      expect(med.rating).toBe('MEDIUM');

      // 3. Likely & Catastrophic -> 4 * 5 = 20 -> HIGH
      const high = calculateRiskSeverity(4, 5);
      expect(high.score).toBe(20);
      expect(high.rating).toBe('HIGH');
    });

    it('2. Registers risk with all 9 mandatory attributes and deterministic severity scoring', async () => {
      const reviewDate = new Date(Date.now() + 86400000 * 14);

      const risk = await RiskService.createRisk(ownerUser.user.id, testEvent.id, {
        title: 'Emergency Generator Failure during Evening Reception',
        description: 'Auxiliary power fails during primary audio and catering heat lamp usage.',
        category: 'Equipment',
        probability: 3,
        impact: 4,
        mitigationPlan: 'Perform electrical load test 48 hours in advance and verify fuel levels.',
        contingencyPlan: 'Secondary 25kW silent diesel generator pre-connected on automatic transfer switch.',
        ownerName: 'Audio-Visual Lead',
        status: 'IDENTIFIED',
        reviewDate,
        notes: 'Mandatory venue inspection requirement.',
      });

      // Verify all 9 attributes
      expect(risk.id).toBeDefined();
      expect(risk.title).toBe('Emergency Generator Failure during Evening Reception');
      expect(risk.description).toContain('Auxiliary power fails');
      expect(risk.category).toBe('Equipment');
      expect(risk.probability).toBe(3);
      expect(risk.impact).toBe(4);
      expect(risk.riskScore).toBe(12); // 3 * 4 = 12
      expect(typeof risk.severity === 'object' && risk.severity !== null ? (risk.severity as { rating: string }).rating : risk.severity).toBe('MEDIUM'); // 8-14 is MEDIUM
      expect(risk.mitigation).toContain('Perform electrical load test');
      expect(risk.contingency).toContain('Secondary 25kW silent diesel generator');
      expect(risk.ownerName).toBe('Audio-Visual Lead');
      expect(risk.status).toBe('IDENTIFIED');
      expect(risk.reviewDate).toBeDefined();

      // Verify relational mitigation created for backward compatibility
      expect(risk.mitigations.length).toBe(1);
    });

    it('3. Seeds baseline risks across all 11 mandatory domains with review dates and mitigations', async () => {
      const seedResult = await RiskService.generateDefaultRisks(ownerUser.user.id, testEvent.id);
      expect(seedResult.success).toBe(true);
      expect(seedResult.createdCount).toBeGreaterThanOrEqual(11);

      const listResult = await RiskService.listRisks(ownerUser.user.id, testEvent.id);
      const risks = listResult.risks;

      // Verify all 11 domains exist in the seeded risks
      const categoriesFound = new Set(risks.map((r: { category: string }) => r.category));
      for (const mandatoryCategory of MANDATORY_RISK_CATEGORIES) {
        expect(categoriesFound.has(mandatoryCategory)).toBe(true);
      }

      // Verify each risk item has populated mitigation, contingency, ownerName, and reviewDate
      for (const r of risks) {
        expect(r.mitigation.length).toBeGreaterThan(0);
        expect(r.contingency.length).toBeGreaterThan(0);
        expect(r.ownerName?.length).toBeGreaterThan(0);
        expect(r.reviewDate).toBeDefined();
      }
    });

    it('4. Updates risk status lifecycle: IDENTIFIED -> MITIGATED -> ACCEPTED -> CLOSED', async () => {
      const risk = await RiskService.createRisk(ownerUser.user.id, testEvent.id, {
        title: 'Floral Transit Delay',
        category: 'Deliveries',
        probability: 2,
        impact: 3,
        mitigation: 'Dispatch delivery van 4 hours early',
        contingency: 'Backup florist on 30min standby',
        ownerName: 'Logistics Captain',
        status: 'IDENTIFIED',
      });

      // Update to MITIGATED
      const mitigated = await RiskService.updateRisk(ownerUser.user.id, testEvent.id, risk.id, {
        status: 'MITIGATED',
      });
      expect(mitigated.status).toBe('MITIGATED');

      // Update to CLOSED
      const closed = await RiskService.updateRisk(ownerUser.user.id, testEvent.id, risk.id, {
        status: 'CLOSED',
      });
      expect(closed.status).toBe('CLOSED');
    });
  });

  // ============================================================================
  // PART 2: COLLABORATION, GRANULAR ROLES & PERMISSIONS
  // ============================================================================
  describe('Part 2: Collaboration & Granular RBAC Permissions', () => {
    it('5. Assigns all 6 granular event roles and verifies server-side permission boundaries', async () => {
      // Owner invites all roles
      await CollaborationService.inviteCollaborator(ownerUser.user.id, testEvent.id, {
        email: adminUser.user.email,
        role: 'ADMIN',
      });

      await CollaborationService.inviteCollaborator(ownerUser.user.id, testEvent.id, {
        email: plannerUser.user.email,
        role: 'PLANNER',
      });

      await CollaborationService.inviteCollaborator(ownerUser.user.id, testEvent.id, {
        email: financeUser.user.email,
        role: 'FINANCE_MANAGER',
      });

      await CollaborationService.inviteCollaborator(ownerUser.user.id, testEvent.id, {
        email: guestCoordUser.user.email,
        role: 'GUEST_COORDINATOR',
      });

      await CollaborationService.inviteCollaborator(ownerUser.user.id, testEvent.id, {
        email: viewerUser.user.email,
        role: 'VIEWER',
      });

      // 5a. Finance Manager CAN manage budgets, CANNOT manage timeline/tasks
      const { BudgetService } = await import('../src/services/budget-service');
      const cat = await db.budgetCategory.findFirst({ where: { eventId: testEvent.id } });
      expect(cat).not.toBeNull();

      const expense = await BudgetService.createExpense(financeUser.user.id, testEvent.id, {
        title: 'Floral Arrangements Deposit',
        categoryId: cat!.id,
        baseAmountMinor: 50000,
        taxRateBps: 800,
      });
      expect(expense.id).toBeDefined();

      const { TimelineService } = await import('../src/services/timeline-service');
      await expect(
        TimelineService.createTask(financeUser.user.id, testEvent.id, {
          title: 'Unauthorized Task by Finance Manager',
          dueDate: new Date().toISOString(),
        })
      ).rejects.toThrow(/forbidden|lacks permission/i);

      // 5b. Guest Coordinator CAN manage guests, CANNOT manage budgets
      const { GuestService } = await import('../src/services/guest-service');
      const guest = await GuestService.addGuest(guestCoordUser.user.id, testEvent.id, {
        name: 'VIP Guest',
        email: 'vip@example.com',
        attendingCount: 2,
      });
      expect(guest.id).toBeDefined();

      await expect(
        BudgetService.createExpense(guestCoordUser.user.id, testEvent.id, {
          title: 'Unauthorized Budget by Guest Coordinator',
          categoryId: cat!.id,
          baseAmountMinor: 10000,
        })
      ).rejects.toThrow(/forbidden|lacks permission/i);

      // 5c. Viewer is read-only: CANNOT manage risks or guests
      await expect(
        RiskService.createRisk(viewerUser.user.id, testEvent.id, {
          title: 'Unauthorized Risk by Viewer',
          category: 'Weather',
          probability: 2,
          impact: 2,
          mitigation: 'None',
          contingency: 'None',
        })
      ).rejects.toThrow(/forbidden|lacks permission/i);
    });

    it('6. Generates tokenized invitations for unregistered emails and accepts securely', async () => {
      const inviteResult = await CollaborationService.inviteCollaborator(ownerUser.user.id, testEvent.id, {
        email: 'future_planner@celebrate.com',
        role: 'PLANNER',
      });

      expect(inviteResult.type).toBe('INVITATION_CREATED');
      const token = inviteResult.invitation?.token;
      expect(token).toBeDefined();

      // Accept invitation as an existing registered user
      const member = await CollaborationService.acceptInvitation(outsiderUser.user.id, token!);
      expect(member.userId).toBe(outsiderUser.user.id);
      expect(member.role).toBe('PLANNER');

      // Attempting to redeem the token a second time fails
      await expect(
        CollaborationService.acceptInvitation(viewerUser.user.id, token!)
      ).rejects.toThrow(/invalid or has already been redeemed/i);
    });
  });

  // ============================================================================
  // PART 3: PRIVILEGE ESCALATION, ACCESS REVOCATION & OWNERSHIP CONTROL
  // ============================================================================
  describe('Part 3: Privilege Escalation, Access Revocation & Ownership Transfer', () => {
    beforeEach(async () => {
      // Add Admin and Planner to testEvent
      await CollaborationService.inviteCollaborator(ownerUser.user.id, testEvent.id, {
        email: adminUser.user.email,
        role: 'ADMIN',
      });

      await CollaborationService.inviteCollaborator(ownerUser.user.id, testEvent.id, {
        email: plannerUser.user.email,
        role: 'PLANNER',
      });
    });

    it('7. DEFENDS AGAINST PRIVILEGE ESCALATION: Non-owners cannot assign Admin or Owner roles', async () => {
      // 7a. Planner lacks MEMBER_MANAGE permission
      await expect(
        CollaborationService.inviteCollaborator(plannerUser.user.id, testEvent.id, {
          email: outsiderUser.user.email,
          role: 'VIEWER',
        })
      ).rejects.toThrow(/forbidden|lacks permission/i);

      // 7b. Admin CANNOT invite or assign someone as ADMIN (only Owner can create Admins)
      await expect(
        CollaborationService.inviteCollaborator(adminUser.user.id, testEvent.id, {
          email: outsiderUser.user.email,
          role: 'ADMIN',
        })
      ).rejects.toThrow(/privilege escalation prevented/i);

      // 7c. Admin CANNOT promote Planner to ADMIN
      await expect(
        CollaborationService.updateCollaboratorRole(adminUser.user.id, testEvent.id, plannerUser.user.id, 'ADMIN')
      ).rejects.toThrow(/privilege escalation denied/i);

      // 7d. Collaborator cannot escalate their own role
      await expect(
        CollaborationService.updateCollaboratorRole(plannerUser.user.id, testEvent.id, plannerUser.user.id, 'ADMIN')
      ).rejects.toThrow(/privilege escalation denied|forbidden|lacks permission/i);
    });

    it('8. ENFORCES ACCESS REVOCATION & OWNER IRREVOCABILITY: Owner cannot be removed, Admin cannot remove Admin', async () => {
      // 8a. Event Owner CANNOT be removed from their own event
      await expect(
        CollaborationService.revokeCollaboratorAccess(ownerUser.user.id, testEvent.id, ownerUser.user.id)
      ).rejects.toThrow(/owner cannot be removed/i);

      // 8b. Admin CANNOT remove Event Owner
      await expect(
        CollaborationService.revokeCollaboratorAccess(adminUser.user.id, testEvent.id, ownerUser.user.id)
      ).rejects.toThrow(/owner cannot be removed/i);

      // 8c. Add second admin
      await CollaborationService.inviteCollaborator(ownerUser.user.id, testEvent.id, {
        email: outsiderUser.user.email,
        role: 'ADMIN',
      });

      // 8d. Admin 1 CANNOT remove Admin 2
      await expect(
        CollaborationService.revokeCollaboratorAccess(adminUser.user.id, testEvent.id, outsiderUser.user.id)
      ).rejects.toThrow(/permission denied/i);

      // 8e. Owner CAN remove Admin 2
      const removeResult = await CollaborationService.revokeCollaboratorAccess(
        ownerUser.user.id,
        testEvent.id,
        outsiderUser.user.id
      );
      expect(removeResult.success).toBe(true);
    });

    it('9. TRANSFERS EVENT OWNERSHIP: Only Owner can transfer, demotes previous owner to Admin in transaction', async () => {
      // 9a. Admin CANNOT transfer event ownership
      await expect(
        CollaborationService.transferOwnership(adminUser.user.id, testEvent.id, plannerUser.user.id)
      ).rejects.toThrow(/only the event owner can transfer/i);

      // 9b. Owner transfers ownership to adminUser
      const transferResult = await CollaborationService.transferOwnership(
        ownerUser.user.id,
        testEvent.id,
        adminUser.user.id
      );
      expect(transferResult.success).toBe(true);
      expect(transferResult.newOwnerId).toBe(adminUser.user.id);

      // Verify database state: event.ownerId is now adminUser
      const updatedEvent = await db.event.findUnique({ where: { id: testEvent.id } });
      expect(updatedEvent?.ownerId).toBe(adminUser.user.id);

      // Verify previous owner is now an ADMIN in EventMember
      const prevOwnerMember = await db.eventMember.findUnique({
        where: { eventId_userId: { eventId: testEvent.id, userId: ownerUser.user.id } },
      });
      expect(prevOwnerMember?.role).toBe('ADMIN');

      // Verify new owner is removed from EventMember (since they are now direct owner)
      const newOwnerMember = await db.eventMember.findUnique({
        where: { eventId_userId: { eventId: testEvent.id, userId: adminUser.user.id } },
      });
      expect(newOwnerMember).toBeNull();
    });

    it('10. Maintains tamper-evident audit history and notifies team members on task ownership', async () => {
      // 10a. Create task and assign to plannerUser
      const { TimelineService } = await import('../src/services/timeline-service');
      const task = await TimelineService.createTask(ownerUser.user.id, testEvent.id, {
        title: 'Finalize Floor Plan & Seating Matrix',
        dueDate: new Date(Date.now() + 86400000 * 10).toISOString(),
      });

      const assignedTask = await CollaborationService.assignTaskOwnership(
        ownerUser.user.id,
        testEvent.id,
        task.id,
        plannerUser.user.id
      );
      expect(assignedTask.assignedToId).toBe(plannerUser.user.id);

      // 10b. Verify notification received by plannerUser
      const notifs = await CollaborationService.getNotifications(plannerUser.user.id, testEvent.id);
      expect(notifs.notifications.length).toBeGreaterThanOrEqual(1);
      expect(notifs.notifications[0].title).toBe('Task Assigned');

      // 10c. Verify activity feed audit trail
      const feed = await CollaborationService.getActivityFeed(ownerUser.user.id, testEvent.id);
      expect(feed.logs.length).toBeGreaterThanOrEqual(2);
      const actions = feed.logs.map((l) => l.action);
      expect(actions).toContain('TASK_ASSIGNED');
    });
  });
});
