import db from '@/lib/database';
import { authorizeEventAccess } from '@/lib/security/auth-middleware';

export interface DashboardTelemetry {
  // 1. Active Events
  activeEventsCount: number;
  // 2. Upcoming Events
  upcomingEvents: Array<{
    id: string;
    title: string;
    eventType: string;
    startDate: string;
    endDate: string;
    venue: string;
    city: string;
    daysUntil: number;
    guestTarget: number;
    budgetMinor: string;
    currency: string;
    status: string;
    userRole: string;
  }>;
  // 3 & 4. Budget Utilization & Remaining Budget
  budgetUtilization: {
    totalPlannedMinor: string;
    totalSpentMinor: string;
    remainingBudgetMinor: string;
    utilizationPercent: number;
    totalContingencyMinor: string;
    currency: string;
  };
  // 5. Overdue Tasks
  overdueTasks: {
    count: number;
    items: Array<{
      id: string;
      eventId: string;
      eventTitle: string;
      title: string;
      dueDate: string;
      priority: string;
      status: string;
      assignedTo?: string | null;
    }>;
  };
  // 6. Upcoming Deadlines
  upcomingDeadlines: {
    count: number;
    items: Array<{
      id: string;
      eventId: string;
      eventTitle: string;
      title: string;
      dueDate: string;
      priority: string;
      category: string;
      daysRemaining: number;
    }>;
  };
  // 7. Vendor Booking Status Breakdown
  vendorBookingStatus: {
    total: number;
    confirmed: number;
    provisional: number;
    negotiating: number;
    quotationReceived: number;
    shortlisted: number;
    cancelled: number;
  };
  // 8. Guest RSVP Summary
  guestRsvpSummary: {
    totalInvited: number;
    attending: number;
    declined: number;
    pending: number;
    attendingHeads: number;
    checkedInCount: number;
    dietaryCount: number;
  };
  // 9. Pending Payments
  pendingPayments: {
    count: number;
    totalPendingMinor: string;
    currency: string;
    items: Array<{
      id: string;
      eventId: string;
      eventTitle: string;
      title: string;
      vendorName?: string | null;
      amountMinor: string;
      dueDate?: string | null;
      status: string;
    }>;
  };
  // 10. Unresolved Risks
  unresolvedRisks: {
    totalUnresolved: number;
    highHazardCount: number;
    items: Array<{
      id: string;
      eventId: string;
      eventTitle: string;
      title: string;
      category: string;
      severity: string;
      riskScore: number;
      mitigation: string;
      status: string;
    }>;
  };
  // 11. Recent Activity Feed
  recentActivity: Array<{
    id: string;
    eventId: string;
    eventTitle: string;
    userName: string;
    action: string;
    entityType: string;
    createdAt: string;
  }>;
}

export class DashboardService {
  /**
   * Retrieves user-scoped events (owned or collaborated). Enforces zero IDOR.
   */
  public static async getUserAuthorizedEventIds(userId: string): Promise<string[]> {
    const ownedEvents = await db.event.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });

    const collaboratedEvents = await db.eventMember.findMany({
      where: { userId },
      select: { eventId: true },
    });

    const eventIds = Array.from(
      new Set([...ownedEvents.map((e) => e.id), ...collaboratedEvents.map((m) => m.eventId)])
    );

    return eventIds;
  }

  /**
   * Generates the complete 11-metric portfolio telemetry for the authenticated user.
   */
  public static async getUserDashboard(userId: string): Promise<DashboardTelemetry> {
    const eventIds = await this.getUserAuthorizedEventIds(userId);
    const now = new Date();
    const fourteenDaysLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    if (eventIds.length === 0) {
      return {
        activeEventsCount: 0,
        upcomingEvents: [],
        budgetUtilization: {
          totalPlannedMinor: '0',
          totalSpentMinor: '0',
          remainingBudgetMinor: '0',
          utilizationPercent: 0,
          totalContingencyMinor: '0',
          currency: 'INR',
        },
        overdueTasks: { count: 0, items: [] },
        upcomingDeadlines: { count: 0, items: [] },
        vendorBookingStatus: {
          total: 0,
          confirmed: 0,
          provisional: 0,
          negotiating: 0,
          quotationReceived: 0,
          shortlisted: 0,
          cancelled: 0,
        },
        guestRsvpSummary: {
          totalInvited: 0,
          attending: 0,
          declined: 0,
          pending: 0,
          attendingHeads: 0,
          checkedInCount: 0,
          dietaryCount: 0,
        },
        pendingPayments: {
          count: 0,
          totalPendingMinor: '0',
          currency: 'INR',
          items: [],
        },
        unresolvedRisks: {
          totalUnresolved: 0,
          highHazardCount: 0,
          items: [],
        },
        recentActivity: [],
      };
    }

    // 1 & 2. Events Query
    const events = await db.event.findMany({
      where: { id: { in: eventIds } },
      include: {
        budget: true,
        members: {
          where: { userId },
        },
      },
      orderBy: { startDate: 'asc' },
    });

    const activeEventsCount = events.filter(
      (e) => e.status === 'ACTIVE' || e.status === 'PLANNING'
    ).length;

    const upcomingEvents = events
      .filter((e) => new Date(e.startDate) >= now || e.status === 'PLANNING' || e.status === 'ACTIVE')
      .map((e) => {
        const daysUntil = Math.max(
          0,
          Math.ceil((new Date(e.startDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        );
        const userRole = e.ownerId === userId ? 'OWNER' : e.members[0]?.role || 'COLLABORATOR';
        return {
          id: e.id,
          title: e.title,
          eventType: e.eventType,
          startDate: e.startDate.toISOString(),
          endDate: e.endDate.toISOString(),
          venue: e.venue,
          city: e.city,
          daysUntil,
          guestTarget: e.guestTarget,
          budgetMinor: e.budgetMinor.toString(),
          currency: e.currency,
          status: e.status,
          userRole,
        };
      });

    // 3 & 4. Budget Utilization & Remaining Budget
    let totalPlannedMinor = BigInt(0);
    let totalContingencyMinor = BigInt(0);

    for (const e of events) {
      const budgetAmount = e.budget?.totalBudgetMinor ?? e.budgetMinor;
      totalPlannedMinor += BigInt(budgetAmount);
      if (e.budget?.contingencyPercent) {
        totalContingencyMinor += (BigInt(budgetAmount) * BigInt(e.budget.contingencyPercent)) / BigInt(100);
      }
    }

    const expenses = await db.expense.findMany({
      where: { eventId: { in: eventIds } },
      include: {
        event: { select: { title: true } },
        vendor: { select: { name: true } },
      },
    });

    let totalSpentMinor = BigInt(0);
    let pendingPaymentsMinor = BigInt(0);
    const pendingPaymentItems: DashboardTelemetry['pendingPayments']['items'] = [];

    for (const exp of expenses) {
      if (exp.status === 'COMPLETED' || exp.status === 'PARTIAL') {
        totalSpentMinor += BigInt(exp.amountMinor);
      }
      if (exp.status === 'PENDING' || exp.status === 'PARTIAL') {
        pendingPaymentsMinor += BigInt(exp.amountMinor);
        pendingPaymentItems.push({
          id: exp.id,
          eventId: exp.eventId,
          eventTitle: exp.event.title,
          title: exp.title,
          vendorName: exp.vendor?.name || null,
          amountMinor: exp.amountMinor.toString(),
          dueDate: exp.dueDate ? exp.dueDate.toISOString() : null,
          status: exp.status,
        });
      }
    }

    const remainingBudgetMinor = totalPlannedMinor - totalSpentMinor;
    const utilizationPercent =
      totalPlannedMinor > BigInt(0)
        ? Math.round((Number(totalSpentMinor) / Number(totalPlannedMinor)) * 1000) / 10
        : 0;

    // 5 & 6. Tasks & Milestones
    const tasks = await db.task.findMany({
      where: { eventId: { in: eventIds } },
      include: {
        event: { select: { title: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    const overdueTaskItems: DashboardTelemetry['overdueTasks']['items'] = [];
    const upcomingDeadlineItems: DashboardTelemetry['upcomingDeadlines']['items'] = [];

    for (const t of tasks) {
      const taskDue = new Date(t.dueDate);
      if (taskDue < now && t.status !== 'COMPLETED') {
        overdueTaskItems.push({
          id: t.id,
          eventId: t.eventId,
          eventTitle: t.event.title,
          title: t.title,
          dueDate: t.dueDate.toISOString(),
          priority: t.priority,
          status: t.status,
          assignedTo: t.assignedToId,
        });
      } else if (taskDue >= now && taskDue <= fourteenDaysLater && t.status !== 'COMPLETED') {
        const daysRemaining = Math.ceil((taskDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        upcomingDeadlineItems.push({
          id: t.id,
          eventId: t.eventId,
          eventTitle: t.event.title,
          title: t.title,
          dueDate: t.dueDate.toISOString(),
          priority: t.priority,
          category: t.category,
          daysRemaining,
        });
      }
    }

    // 7. Vendor Booking Status Breakdown
    const vendors = await db.vendor.findMany({
      where: { eventId: { in: eventIds } },
      select: { status: true },
    });

    const vendorStatusMap = {
      total: vendors.length,
      confirmed: 0,
      provisional: 0,
      negotiating: 0,
      quotationReceived: 0,
      shortlisted: 0,
      cancelled: 0,
    };

    for (const v of vendors) {
      switch (v.status) {
        case 'CONFIRMED':
        case 'COMPLETED':
          vendorStatusMap.confirmed++;
          break;
        case 'PROVISIONAL':
          vendorStatusMap.provisional++;
          break;
        case 'NEGOTIATING':
          vendorStatusMap.negotiating++;
          break;
        case 'QUOTATION_RECEIVED':
          vendorStatusMap.quotationReceived++;
          break;
        case 'SHORTLISTED':
        case 'CONTACTED':
          vendorStatusMap.shortlisted++;
          break;
        case 'REJECTED':
        case 'CANCELLED':
          vendorStatusMap.cancelled++;
          break;
      }
    }

    // 8. Guest RSVP Summary
    const guests = await db.guest.findMany({
      where: { eventId: { in: eventIds } },
      select: {
        rsvpStatus: true,
        attendingCount: true,
        checkedIn: true,
        dietaryRequirements: true,
      },
    });

    let attendingCount = 0;
    let declinedCount = 0;
    let pendingCount = 0;
    let attendingHeads = 0;
    let checkedInCount = 0;
    let dietaryCount = 0;

    for (const g of guests) {
      if (g.rsvpStatus === 'ATTENDING') {
        attendingCount++;
        attendingHeads += g.attendingCount || 1;
      } else if (g.rsvpStatus === 'DECLINED') {
        declinedCount++;
      } else {
        pendingCount++;
      }

      if (g.checkedIn) checkedInCount++;
      if (g.dietaryRequirements && g.dietaryRequirements.trim().length > 0) {
        dietaryCount++;
      }
    }

    // 10. Unresolved Risks
    const risks = await db.riskItem.findMany({
      where: {
        eventId: { in: eventIds },
        status: { in: ['IDENTIFIED', 'MITIGATED'] },
      },
      include: {
        event: { select: { title: true } },
      },
      orderBy: { riskScore: 'desc' },
    });

    const highHazardRisks = risks.filter((r) => r.riskScore >= 15 || r.severity === 'HIGH' || r.severity === 'CRITICAL');
    const unresolvedRiskItems = risks.slice(0, 10).map((r) => ({
      id: r.id,
      eventId: r.eventId,
      eventTitle: r.event.title,
      title: r.title,
      category: r.category,
      severity: r.severity,
      riskScore: r.riskScore,
      mitigation: r.mitigation,
      status: r.status,
    }));

    // 11. Recent Activity Feed
    const activities = await db.activityLog.findMany({
      where: { eventId: { in: eventIds } },
      include: {
        event: { select: { title: true } },
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 15,
    });

    const recentActivity = activities.map((a) => ({
      id: a.id,
      eventId: a.eventId,
      eventTitle: a.event.title,
      userName: a.user?.name || 'Team Member',
      action: a.action,
      entityType: a.entityType,
      createdAt: a.createdAt.toISOString(),
    }));

    return {
      activeEventsCount,
      upcomingEvents,
      budgetUtilization: {
        totalPlannedMinor: totalPlannedMinor.toString(),
        totalSpentMinor: totalSpentMinor.toString(),
        remainingBudgetMinor: remainingBudgetMinor.toString(),
        utilizationPercent,
        totalContingencyMinor: totalContingencyMinor.toString(),
        currency: events[0]?.currency || 'INR',
      },
      overdueTasks: {
        count: overdueTaskItems.length,
        items: overdueTaskItems,
      },
      upcomingDeadlines: {
        count: upcomingDeadlineItems.length,
        items: upcomingDeadlineItems,
      },
      vendorBookingStatus: vendorStatusMap,
      guestRsvpSummary: {
        totalInvited: guests.length,
        attending: attendingCount,
        declined: declinedCount,
        pending: pendingCount,
        attendingHeads,
        checkedInCount,
        dietaryCount,
      },
      pendingPayments: {
        count: pendingPaymentItems.length,
        totalPendingMinor: pendingPaymentsMinor.toString(),
        currency: events[0]?.currency || 'INR',
        items: pendingPaymentItems,
      },
      unresolvedRisks: {
        totalUnresolved: risks.length,
        highHazardCount: highHazardRisks.length,
        items: unresolvedRiskItems,
      },
      recentActivity,
    };
  }

  /**
   * Generates event-level dashboard telemetry for a single event workspace.
   */
  public static async getEventDashboard(userId: string, eventId: string) {
    await authorizeEventAccess(userId, eventId, 'EVENT_VIEW');

    const event = await db.event.findUnique({
      where: { id: eventId },
      include: {
        budget: true,
        categories: true,
        members: true,
        preferences: true,
      },
    });

    if (!event) {
      throw new Error('Celebration event not found');
    }

    const now = new Date();
    const fourteenDaysLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const [expenses, tasks, vendors, guests, risks, activities] = await Promise.all([
      db.expense.findMany({
        where: { eventId },
        include: { vendor: { select: { name: true } }, category: true },
      }),
      db.task.findMany({
        where: { eventId },
        orderBy: { dueDate: 'asc' },
      }),
      db.vendor.findMany({
        where: { eventId },
        include: { category: true, quotes: true },
      }),
      db.guest.findMany({
        where: { eventId },
      }),
      db.riskItem.findMany({
        where: { eventId },
        include: { mitigations: true },
        orderBy: { riskScore: 'desc' },
      }),
      db.activityLog.findMany({
        where: { eventId },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const budgetPlannedMinor = BigInt(event.budget?.totalBudgetMinor ?? event.budgetMinor);
    let totalSpentMinor = BigInt(0);
    let pendingAmountMinor = BigInt(0);

    for (const exp of expenses) {
      if (exp.status === 'COMPLETED' || exp.status === 'PARTIAL') {
        totalSpentMinor += BigInt(exp.amountMinor);
      }
      if (exp.status === 'PENDING' || exp.status === 'PARTIAL') {
        pendingAmountMinor += BigInt(exp.amountMinor);
      }
    }

    const remainingBudgetMinor = budgetPlannedMinor - totalSpentMinor;
    const utilizationPercent =
      budgetPlannedMinor > BigInt(0)
        ? Math.round((Number(totalSpentMinor) / Number(budgetPlannedMinor)) * 1000) / 10
        : 0;

    const overdueTasks = tasks.filter((t) => new Date(t.dueDate) < now && t.status !== 'COMPLETED');
    const upcomingDeadlines = tasks.filter(
      (t) => new Date(t.dueDate) >= now && new Date(t.dueDate) <= fourteenDaysLater && t.status !== 'COMPLETED'
    );

    const unresolvedRisks = risks.filter((r) => r.status === 'IDENTIFIED' || r.status === 'MITIGATED');
    const highHazardRisks = unresolvedRisks.filter((r) => r.riskScore >= 15);

    const attendingGuests = guests.filter((g) => g.rsvpStatus === 'ATTENDING');
    const declinedGuests = guests.filter((g) => g.rsvpStatus === 'DECLINED');
    const pendingGuests = guests.filter((g) => g.rsvpStatus === 'PENDING' || !g.rsvpStatus);
    const attendingHeads = attendingGuests.reduce((acc, g) => acc + (g.attendingCount || 1), 0);
    const checkedInCount = guests.filter((g) => g.checkedIn).length;

    return {
      eventId: event.id,
      title: event.title,
      eventType: event.eventType,
      startDate: event.startDate.toISOString(),
      endDate: event.endDate.toISOString(),
      venue: event.venue,
      city: event.city,
      status: event.status,
      currency: event.currency,
      guestTarget: event.guestTarget,
      metrics: {
        budgetPlannedMinor: budgetPlannedMinor.toString(),
        totalSpentMinor: totalSpentMinor.toString(),
        remainingBudgetMinor: remainingBudgetMinor.toString(),
        utilizationPercent,
        pendingAmountMinor: pendingAmountMinor.toString(),
        overdueTasksCount: overdueTasks.length,
        upcomingDeadlinesCount: upcomingDeadlines.length,
        totalVendorsCount: vendors.length,
        confirmedVendorsCount: vendors.filter((v) => v.status === 'CONFIRMED' || v.status === 'COMPLETED').length,
        totalGuestsCount: guests.length,
        attendingGuestsCount: attendingGuests.length,
        attendingHeads,
        declinedGuestsCount: declinedGuests.length,
        pendingGuestsCount: pendingGuests.length,
        checkedInCount,
        unresolvedRisksCount: unresolvedRisks.length,
        highHazardRisksCount: highHazardRisks.length,
      },
      recentActivity: activities.map((a) => ({
        id: a.id,
        userName: a.user?.name || 'Team Member',
        action: a.action,
        entityType: a.entityType,
        createdAt: a.createdAt.toISOString(),
      })),
    };
  }
}
