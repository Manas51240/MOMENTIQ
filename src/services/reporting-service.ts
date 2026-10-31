import db from '@/lib/database';
import { authorizeEventAccess } from '@/lib/security/auth-middleware';
import { generateCsv, generateMultiSectionCsv, formatMinorToCurrency, escapeCsvField } from '@/lib/csv/csv-generator';
import { SimplePdfDocument } from '@/lib/pdf/pdf-generator';

export type ReportType =
  | 'event-plan'
  | 'budget-expenses'
  | 'vendor-comparison'
  | 'guest-rsvp'
  | 'timeline-milestones'
  | 'payment-summary'
  | 'risk-register'
  | 'event-completion';

export const REPORT_METADATA: Record<ReportType, { title: string; description: string }> = {
  'event-plan': {
    title: 'Complete Event Plan Report',
    description: 'Executive concept, themes, milestones, vendor lineup, and contingency directives',
  },
  'budget-expenses': {
    title: 'Budget & Expenses Financial Report',
    description: 'Itemized expense ledger, category allocations, variances, and pending liabilities',
  },
  'vendor-comparison': {
    title: 'Vendor Comparison & Quotation Report',
    description: 'Normalized quotation matrix, itemized fees, service inclusions, and booking states',
  },
  'guest-rsvp': {
    title: 'Guest & RSVP Attendance Report',
    description: 'Guest manifest, headcount tallies, dietary restrictions, and seating tables',
  },
  'timeline-milestones': {
    title: 'Timeline & Milestones Schedule Report',
    description: 'Chronological milestone schedule, task dependencies, assignees, and progress rates',
  },
  'payment-summary': {
    title: 'Payment Summary & Invoices Report',
    description: 'Advance payments, settlements, transaction references, refunds, and balances due',
  },
  'risk-register': {
    title: 'Risk Register & Contingency Report',
    description: 'Deterministic 5x5 RAG matrix across 11 domains, proactive mitigations, and review dates',
  },
  'event-completion': {
    title: 'Event Completion & Debrief Report',
    description: 'Post-event operational reconciliation, actual variance, final attendance, and risk audit',
  },
};

export class ReportingService {
  /**
   * Retrieves authorized event with base relationships, ensuring IDOR protection.
   */
  private static async getAuthorizedEvent(userId: string, eventId: string) {
    const member = await authorizeEventAccess(userId, eventId, 'EVENT_VIEW');

    const event = await db.event.findUnique({
      where: { id: eventId },
      include: {
        budget: true,
        preferences: true,
        categories: true,
        members: {
          include: { user: { select: { name: true, email: true } } },
        },
      },
    });

    if (!event) {
      throw new Error('Celebration event not found');
    }

    return { event, userRole: member.role };
  }

  /**
   * 1. COMPLETE EVENT PLAN REPORT
   */
  public static async getEventPlanReport(userId: string, eventId: string) {
    const { event, userRole } = await this.getAuthorizedEvent(userId, eventId);

    const [milestones, tasks, schedules, vendors, risks] = await Promise.all([
      db.milestone.findMany({ where: { eventId }, orderBy: { targetDate: 'asc' } }),
      db.task.findMany({ where: { eventId }, orderBy: { dueDate: 'asc' } }),
      db.eventSchedule.findMany({ where: { eventId }, orderBy: [{ dayNumber: 'asc' }, { orderIndex: 'asc' }] }),
      db.vendor.findMany({ where: { eventId }, include: { category: true } }),
      db.riskItem.findMany({ where: { eventId }, orderBy: { riskScore: 'desc' } }),
    ]);

    return {
      type: 'event-plan' as const,
      metadata: REPORT_METADATA['event-plan'],
      event: {
        id: event.id,
        title: event.title,
        eventType: event.eventType,
        description: event.description,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString(),
        venue: event.venue,
        city: event.city,
        country: event.country,
        guestTarget: event.guestTarget,
        budgetMinor: event.budgetMinor.toString(),
        currency: event.currency,
        status: event.status,
      },
      preferences: {
        theme: event.preferences?.theme || 'Not specified',
        tone: event.preferences?.tone || 'Festive & Elegant',
        culturalTraditions: event.preferences?.culturalTraditionsJson || '[]',
        dietaryNotes: event.preferences?.dietaryNotes || 'None recorded',
      },
      milestones: milestones.map((m) => ({
        id: m.id,
        title: m.title,
        targetDate: m.targetDate.toISOString().split('T')[0],
        status: m.status,
      })),
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        category: t.category,
        dueDate: t.dueDate.toISOString().split('T')[0],
        priority: t.priority,
        status: t.status,
        progressPercent: t.progressPercent,
      })),
      schedules: schedules.map((s) => ({
        id: s.id,
        dayNumber: s.dayNumber,
        time: `${s.startTime} - ${s.endTime}`,
        title: s.title,
        location: s.location || event.venue,
        host: s.speakerOrHost || 'Event Staff',
      })),
      vendors: vendors.map((v) => ({
        id: v.id,
        name: v.name,
        category: v.category.name,
        status: v.status,
        estimatedMinor: v.priceEstimateMinor.toString(),
      })),
      team: event.members.map((m) => ({
        name: m.user.name,
        email: userRole === 'VIEWER' ? '[MASKED PII]' : m.user.email,
        role: m.role,
      })),
      risksSummary: {
        total: risks.length,
        highHazard: risks.filter((r) => r.riskScore >= 15).length,
      },
    };
  }

  /**
   * 2. BUDGET & EXPENSES REPORT
   */
  public static async getBudgetExpensesReport(userId: string, eventId: string) {
    const { event } = await this.getAuthorizedEvent(userId, eventId);

    const [categories, expenses] = await Promise.all([
      db.budgetCategory.findMany({ where: { eventId } }),
      db.expense.findMany({
        where: { eventId },
        include: {
          category: true,
          vendor: { select: { name: true } },
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const totalBudgetMinor = BigInt(event.budget?.totalBudgetMinor ?? event.budgetMinor);
    let totalSpentMinor = BigInt(0);
    let pendingLiabilitiesMinor = BigInt(0);
    let totalBaseMinor = BigInt(0);
    let totalTaxMinor = BigInt(0);

    const itemizedExpenses = expenses.map((exp) => {
      const isPaid = exp.status === 'COMPLETED';
      const isPartial = exp.status === 'PARTIAL';
      if (isPaid || isPartial) {
        totalSpentMinor += BigInt(exp.amountMinor);
      }
      if (exp.status === 'PENDING' || isPartial) {
        pendingLiabilitiesMinor += BigInt(exp.amountMinor);
      }
      totalBaseMinor += BigInt(exp.baseAmountMinor);
      totalTaxMinor += BigInt(exp.taxAmountMinor);

      return {
        id: exp.id,
        title: exp.title,
        category: exp.category.name,
        vendor: exp.vendor?.name || 'Unassigned',
        baseMinor: exp.baseAmountMinor.toString(),
        taxMinor: exp.taxAmountMinor.toString(),
        totalMinor: exp.amountMinor.toString(),
        status: exp.status,
        dueDate: exp.dueDate ? exp.dueDate.toISOString().split('T')[0] : 'N/A',
        notes: exp.notes || '',
      };
    });

    const categoryAllocations = categories.map((cat) => {
      const catExpenses = expenses.filter((e) => e.categoryId === cat.id);
      const catSpent = catExpenses.reduce((sum, e) => sum + BigInt(e.amountMinor), BigInt(0));
      const allocated = BigInt(cat.allocatedMinor);
      const variance = allocated - catSpent;
      const utilization =
        allocated > BigInt(0) ? Math.round((Number(catSpent) / Number(allocated)) * 1000) / 10 : 0;

      return {
        id: cat.id,
        name: cat.name,
        allocatedMinor: allocated.toString(),
        spentMinor: catSpent.toString(),
        varianceMinor: variance.toString(),
        utilizationPercent: utilization,
      };
    });

    const remainingBudgetMinor = totalBudgetMinor - totalSpentMinor;
    const utilizationPercent =
      totalBudgetMinor > BigInt(0)
        ? Math.round((Number(totalSpentMinor) / Number(totalBudgetMinor)) * 1000) / 10
        : 0;

    return {
      type: 'budget-expenses' as const,
      metadata: REPORT_METADATA['budget-expenses'],
      event: {
        id: event.id,
        title: event.title,
        currency: event.currency,
      },
      summary: {
        totalBudgetMinor: totalBudgetMinor.toString(),
        totalSpentMinor: totalSpentMinor.toString(),
        remainingBudgetMinor: remainingBudgetMinor.toString(),
        pendingLiabilitiesMinor: pendingLiabilitiesMinor.toString(),
        totalBaseMinor: totalBaseMinor.toString(),
        totalTaxMinor: totalTaxMinor.toString(),
        utilizationPercent,
        contingencyPercent: event.budget?.contingencyPercent ?? 10,
      },
      categories: categoryAllocations,
      expenses: itemizedExpenses,
    };
  }

  /**
   * 3. VENDOR COMPARISON REPORT
   */
  public static async getVendorComparisonReport(userId: string, eventId: string) {
    const { event } = await this.getAuthorizedEvent(userId, eventId);

    const [vendors, quotes] = await Promise.all([
      db.vendor.findMany({
        where: { eventId },
        include: {
          category: true,
          quotes: true,
          bookings: true,
        },
      }),
      db.vendorQuote.findMany({
        where: { eventId },
        include: { vendor: { include: { category: true } } },
      }),
    ]);

    const vendorItems = vendors.map((v) => {
      const activeQuote = v.quotes[0];
      const baseQuoteMinor = activeQuote ? BigInt(activeQuote.quoteAmountMinor) : BigInt(0);
      const feeMinor = activeQuote ? BigInt(activeQuote.additionalFeesMinor) : BigInt(0);
      const totalCostMinor = baseQuoteMinor + feeMinor;

      return {
        id: v.id,
        name: v.name,
        category: v.category.name,
        contactName: v.contactName || 'N/A',
        location: v.location || 'Local',
        status: v.status,
        rating: v.rating ?? 5,
        sourceTag: v.sourceTag,
        isVerified: v.isAvailabilityVerified,
        estimateMinor: v.priceEstimateMinor.toString(),
        quoteBaseMinor: baseQuoteMinor.toString(),
        quoteFeesMinor: feeMinor.toString(),
        totalQuoteCostMinor: totalCostMinor.toString(),
        servicesIncluded: activeQuote?.servicesIncluded || v.serviceDescription || 'Standard Package',
        contractConditions: activeQuote?.contractConditions || 'Standard Vendor Terms',
      };
    });

    return {
      type: 'vendor-comparison' as const,
      metadata: REPORT_METADATA['vendor-comparison'],
      event: { id: event.id, title: event.title, currency: event.currency },
      totalVendors: vendors.length,
      confirmedCount: vendors.filter((v) => v.status === 'CONFIRMED' || v.status === 'COMPLETED').length,
      vendors: vendorItems,
    };
  }

  /**
   * 4. GUEST & RSVP REPORT (With PII Minimization for VIEWERS)
   */
  public static async getGuestRsvpReport(userId: string, eventId: string) {
    const { event, userRole } = await this.getAuthorizedEvent(userId, eventId);

    const [guests, groups, seating] = await Promise.all([
      db.guest.findMany({
        where: { eventId },
        include: { group: true },
        orderBy: { name: 'asc' },
      }),
      db.guestGroup.findMany({ where: { eventId } }),
      db.seatingAssignment.findMany({ where: { eventId } }),
    ]);

    const isViewer = userRole === 'VIEWER';

    let attendingCount = 0;
    let attendingHeads = 0;
    let declinedCount = 0;
    let pendingCount = 0;
    let checkedInCount = 0;
    const dietaryMap: Record<string, number> = {};

    const guestList = guests.map((g) => {
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
        const diet = g.dietaryRequirements.trim();
        dietaryMap[diet] = (dietaryMap[diet] || 0) + 1;
      }

      const assignedSeat = seating.find((s) => s.guestId === g.id);

      return {
        id: g.id,
        name: g.name,
        group: g.group?.name || 'General',
        email: isViewer ? '[MASKED PII]' : g.email || 'N/A',
        phone: isViewer ? '[MASKED PII]' : g.phone || 'N/A',
        rsvpStatus: g.rsvpStatus,
        attendingCount: g.attendingCount || 1,
        dietary: g.dietaryRequirements || 'Standard',
        accessibility: g.accessibilityNotes || 'None',
        seatingTable: assignedSeat ? `${assignedSeat.tableName} (Seat ${assignedSeat.seatNumber})` : 'Unassigned',
        checkedIn: g.checkedIn,
      };
    });

    return {
      type: 'guest-rsvp' as const,
      metadata: REPORT_METADATA['guest-rsvp'],
      event: { id: event.id, title: event.title, guestTarget: event.guestTarget },
      summary: {
        totalInvited: guests.length,
        attendingCount,
        attendingHeads,
        declinedCount,
        pendingCount,
        checkedInCount,
        attendanceRatePercent:
          guests.length > 0 ? Math.round((attendingHeads / event.guestTarget) * 1000) / 10 : 0,
      },
      dietaryBreakdown: dietaryMap,
      guests: guestList,
    };
  }

  /**
   * 5. TIMELINE & MILESTONES REPORT
   */
  public static async getTimelineMilestonesReport(userId: string, eventId: string) {
    const { event } = await this.getAuthorizedEvent(userId, eventId);

    const [milestones, tasks] = await Promise.all([
      db.milestone.findMany({ where: { eventId }, orderBy: { targetDate: 'asc' } }),
      db.task.findMany({
        where: { eventId },
        include: {
          milestone: true,
          preceding: { include: { dependsOn: { select: { title: true } } } },
        },
        orderBy: { dueDate: 'asc' },
      }),
    ]);

    const now = new Date();
    const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;
    const overdueTasks = tasks.filter((t) => new Date(t.dueDate) < now && t.status !== 'COMPLETED').length;
    const completionPercent = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 1000) / 10 : 0;

    return {
      type: 'timeline-milestones' as const,
      metadata: REPORT_METADATA['timeline-milestones'],
      event: {
        id: event.id,
        title: event.title,
        startDate: event.startDate.toISOString().split('T')[0],
        endDate: event.endDate.toISOString().split('T')[0],
      },
      summary: {
        totalTasks: tasks.length,
        completedTasks,
        overdueTasks,
        completionPercent,
        totalMilestones: milestones.length,
      },
      milestones: milestones.map((m) => ({
        id: m.id,
        title: m.title,
        targetDate: m.targetDate.toISOString().split('T')[0],
        status: m.status,
      })),
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        category: t.category,
        milestone: t.milestone?.title || 'General Phase',
        dueDate: t.dueDate.toISOString().split('T')[0],
        priority: t.priority,
        status: t.status,
        progressPercent: t.progressPercent,
        dependencies: t.preceding.map((p) => p.dependsOn.title).join(', ') || 'None',
      })),
    };
  }

  /**
   * 6. PAYMENT SUMMARY REPORT
   */
  public static async getPaymentSummaryReport(userId: string, eventId: string) {
    const { event } = await this.getAuthorizedEvent(userId, eventId);

    const [payments, expenses] = await Promise.all([
      db.payment.findMany({
        where: { eventId },
        include: {
          expense: {
            include: { vendor: { select: { name: true } }, category: true },
          },
        },
        orderBy: { paidAt: 'desc' },
      }),
      db.expense.findMany({
        where: { eventId },
        include: { vendor: { select: { name: true } }, payments: true },
      }),
    ]);

    let totalDisbursedMinor = BigInt(0);
    let totalRefundedMinor = BigInt(0);

    const paymentRecords = payments.map((p) => {
      const amt = BigInt(p.amountMinor);
      if (p.isRefund) {
        totalRefundedMinor += amt;
      } else {
        totalDisbursedMinor += amt;
      }

      return {
        id: p.id,
        paidAt: p.paidAt.toISOString().split('T')[0],
        expenseTitle: p.expense.title,
        category: p.expense.category.name,
        vendorName: p.expense.vendor?.name || 'Unassigned',
        amountMinor: p.amountMinor.toString(),
        paymentMethod: p.paymentMethod,
        transactionRef: p.transactionRef || 'N/A',
        isRefund: p.isRefund,
        status: p.status,
      };
    });

    const netDisbursedMinor = totalDisbursedMinor - totalRefundedMinor;
    let pendingDueMinor = BigInt(0);

    const outstandingExpenses = expenses
      .filter((e) => e.status === 'PENDING' || e.status === 'PARTIAL')
      .map((e) => {
        pendingDueMinor += BigInt(e.amountMinor);
        return {
          id: e.id,
          title: e.title,
          vendor: e.vendor?.name || 'Unassigned',
          amountMinor: e.amountMinor.toString(),
          dueDate: e.dueDate ? e.dueDate.toISOString().split('T')[0] : 'Immediate',
          status: e.status,
        };
      });

    return {
      type: 'payment-summary' as const,
      metadata: REPORT_METADATA['payment-summary'],
      event: { id: event.id, title: event.title, currency: event.currency },
      summary: {
        totalDisbursedMinor: totalDisbursedMinor.toString(),
        totalRefundedMinor: totalRefundedMinor.toString(),
        netDisbursedMinor: netDisbursedMinor.toString(),
        pendingDueMinor: pendingDueMinor.toString(),
      },
      payments: paymentRecords,
      outstandingExpenses,
    };
  }

  /**
   * 7. RISK REGISTER REPORT
   */
  public static async getRiskRegisterReport(userId: string, eventId: string) {
    const { event } = await this.getAuthorizedEvent(userId, eventId);

    const risks = await db.riskItem.findMany({
      where: { eventId },
      include: { mitigations: true },
      orderBy: { riskScore: 'desc' },
    });

    const highHazardCount = risks.filter((r) => r.riskScore >= 15).length;
    const unresolvedCount = risks.filter((r) => r.status === 'IDENTIFIED' || r.status === 'MITIGATED').length;

    const riskItems = risks.map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      probability: r.probability,
      impact: r.impact,
      riskScore: r.riskScore,
      severity: r.severity,
      mitigation: r.mitigation,
      contingency: r.contingency,
      owner: r.ownerName || 'Unassigned',
      status: r.status,
      reviewDate: r.reviewDate ? r.reviewDate.toISOString().split('T')[0] : 'N/A',
    }));

    return {
      type: 'risk-register' as const,
      metadata: REPORT_METADATA['risk-register'],
      event: { id: event.id, title: event.title },
      summary: {
        totalRisks: risks.length,
        unresolvedCount,
        highHazardCount,
      },
      risks: riskItems,
    };
  }

  /**
   * 8. EVENT COMPLETION REPORT
   */
  public static async getEventCompletionReport(userId: string, eventId: string) {
    const { event } = await this.getAuthorizedEvent(userId, eventId);

    const [budgetData, guestData, timelineData, risks] = await Promise.all([
      this.getBudgetExpensesReport(userId, eventId),
      this.getGuestRsvpReport(userId, eventId),
      this.getTimelineMilestonesReport(userId, eventId),
      db.riskItem.findMany({ where: { eventId } }),
    ]);

    const allRisksResolved = risks.every((r) => r.status === 'CLOSED' || r.status === 'ACCEPTED');
    const allTasksCompleted = timelineData.summary.completedTasks === timelineData.summary.totalTasks;

    return {
      type: 'event-completion' as const,
      metadata: REPORT_METADATA['event-completion'],
      event: {
        id: event.id,
        title: event.title,
        eventType: event.eventType,
        startDate: event.startDate.toISOString().split('T')[0],
        endDate: event.endDate.toISOString().split('T')[0],
        status: event.status,
      },
      operationalSummary: {
        plannedBudgetMinor: budgetData.summary.totalBudgetMinor,
        actualSpentMinor: budgetData.summary.totalSpentMinor,
        budgetVarianceMinor: budgetData.summary.remainingBudgetMinor,
        targetGuests: guestData.event.guestTarget,
        actualAttendingHeads: guestData.summary.attendingHeads,
        actualCheckedInHeads: guestData.summary.checkedInCount,
        taskCompletionPercent: timelineData.summary.completionPercent,
        allTasksCompleted,
        allRisksResolved,
        totalRisksHandled: risks.length,
      },
      budgetBreakdown: budgetData.categories,
      keyMilestones: timelineData.milestones,
    };
  }

  /**
   * Dispatches the appropriate typed report generator.
   */
  public static async getReportData(userId: string, eventId: string, reportType: ReportType) {
    switch (reportType) {
      case 'event-plan':
        return this.getEventPlanReport(userId, eventId);
      case 'budget-expenses':
        return this.getBudgetExpensesReport(userId, eventId);
      case 'vendor-comparison':
        return this.getVendorComparisonReport(userId, eventId);
      case 'guest-rsvp':
        return this.getGuestRsvpReport(userId, eventId);
      case 'timeline-milestones':
        return this.getTimelineMilestonesReport(userId, eventId);
      case 'payment-summary':
        return this.getPaymentSummaryReport(userId, eventId);
      case 'risk-register':
        return this.getRiskRegisterReport(userId, eventId);
      case 'event-completion':
        return this.getEventCompletionReport(userId, eventId);
      default:
        throw new Error(`Invalid report type: ${reportType}`);
    }
  }

  /**
   * EXPORTS REPORT TO RFC 4180 COMPLIANT CSV
   */
  public static async exportReportCsv(userId: string, eventId: string, reportType: ReportType) {
    const data = await this.getReportData(userId, eventId, reportType);
    let csvContent = '';
    const eventSlug = ('event' in data && data.event && 'title' in data.event ? (data.event as any).title : 'event')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');
    const filename = `momentiq-${reportType}-${eventSlug}-${new Date().toISOString().split('T')[0]}.csv`;

    switch (reportType) {
      case 'budget-expenses': {
        const d = data as Awaited<ReturnType<typeof ReportingService.getBudgetExpensesReport>>;
        csvContent = generateMultiSectionCsv([
          {
            title: 'Budget Overview Summary',
            columns: [
              { header: 'Metric', accessor: (r) => r.metric },
              { header: 'Amount', accessor: (r) => r.amount },
            ],
            data: [
              { metric: 'Total Planned Budget', amount: formatMinorToCurrency(d.summary.totalBudgetMinor, d.event.currency) },
              { metric: 'Total Actual Spent', amount: formatMinorToCurrency(d.summary.totalSpentMinor, d.event.currency) },
              { metric: 'Remaining Budget', amount: formatMinorToCurrency(d.summary.remainingBudgetMinor, d.event.currency) },
              { metric: 'Pending Liabilities', amount: formatMinorToCurrency(d.summary.pendingLiabilitiesMinor, d.event.currency) },
              { metric: 'Utilization %', amount: `${d.summary.utilizationPercent}%` },
            ],
          },
          {
            title: 'Category Allocations',
            columns: [
              { header: 'Category Name', accessor: (c) => c.name },
              { header: 'Allocated', accessor: (c) => formatMinorToCurrency(c.allocatedMinor, d.event.currency) },
              { header: 'Spent', accessor: (c) => formatMinorToCurrency(c.spentMinor, d.event.currency) },
              { header: 'Variance', accessor: (c) => formatMinorToCurrency(c.varianceMinor, d.event.currency) },
              { header: 'Utilization %', accessor: (c) => `${c.utilizationPercent}%` },
            ],
            data: d.categories,
          },
          {
            title: 'Itemized Expenses',
            columns: [
              { header: 'Title', accessor: (e) => e.title },
              { header: 'Category', accessor: (e) => e.category },
              { header: 'Vendor', accessor: (e) => e.vendor },
              { header: 'Base Amount', accessor: (e) => formatMinorToCurrency(e.baseMinor, d.event.currency) },
              { header: 'Tax Amount', accessor: (e) => formatMinorToCurrency(e.taxMinor, d.event.currency) },
              { header: 'Total Amount', accessor: (e) => formatMinorToCurrency(e.totalMinor, d.event.currency) },
              { header: 'Status', accessor: (e) => e.status },
              { header: 'Due Date', accessor: (e) => e.dueDate },
              { header: 'Notes', accessor: (e) => e.notes },
            ],
            data: d.expenses,
          },
        ]);
        break;
      }

      case 'guest-rsvp': {
        const d = data as Awaited<ReturnType<typeof ReportingService.getGuestRsvpReport>>;
        csvContent = generateMultiSectionCsv([
          {
            title: 'Attendance Overview',
            columns: [
              { header: 'Metric', accessor: (r) => r.metric },
              { header: 'Value', accessor: (r) => r.value },
            ],
            data: [
              { metric: 'Total Invited', value: d.summary.totalInvited },
              { metric: 'Attending Guests', value: d.summary.attendingCount },
              { metric: 'Attending Total Heads', value: d.summary.attendingHeads },
              { metric: 'Declined', value: d.summary.declinedCount },
              { metric: 'Pending RSVP', value: d.summary.pendingCount },
              { metric: 'Checked-In Door Heads', value: d.summary.checkedInCount },
            ],
          },
          {
            title: 'Guest Manifest',
            columns: [
              { header: 'Name', accessor: (g) => g.name },
              { header: 'Group', accessor: (g) => g.group },
              { header: 'Email', accessor: (g) => g.email },
              { header: 'Phone', accessor: (g) => g.phone },
              { header: 'RSVP Status', accessor: (g) => g.rsvpStatus },
              { header: 'Attending Heads', accessor: (g) => g.attendingCount },
              { header: 'Dietary Restrictions', accessor: (g) => g.dietary },
              { header: 'Accessibility Notes', accessor: (g) => g.accessibility },
              { header: 'Seating Assignment', accessor: (g) => g.seatingTable },
              { header: 'Checked In', accessor: (g) => (g.checkedIn ? 'YES' : 'NO') },
            ],
            data: d.guests,
          },
        ]);
        break;
      }

      case 'vendor-comparison': {
        const d = data as Awaited<ReturnType<typeof ReportingService.getVendorComparisonReport>>;
        csvContent = generateCsv(d.vendors, [
          { header: 'Vendor Name', accessor: (v) => v.name },
          { header: 'Category', accessor: (v) => v.category },
          { header: 'Location', accessor: (v) => v.location },
          { header: 'Status', accessor: (v) => v.status },
          { header: 'Rating (1-5)', accessor: (v) => v.rating },
          { header: 'Source', accessor: (v) => v.sourceTag },
          { header: 'Verified', accessor: (v) => (v.isVerified ? 'VERIFIED' : 'UNVERIFIED') },
          { header: 'Price Estimate', accessor: (v) => formatMinorToCurrency(v.estimateMinor, d.event.currency) },
          { header: 'Base Quote', accessor: (v) => formatMinorToCurrency(v.quoteBaseMinor, d.event.currency) },
          { header: 'Additional Fees', accessor: (v) => formatMinorToCurrency(v.quoteFeesMinor, d.event.currency) },
          { header: 'Total Normalized Quote', accessor: (v) => formatMinorToCurrency(v.totalQuoteCostMinor, d.event.currency) },
          { header: 'Services Included', accessor: (v) => v.servicesIncluded },
          { header: 'Contract Conditions', accessor: (v) => v.contractConditions },
        ]);
        break;
      }

      case 'timeline-milestones': {
        const d = data as Awaited<ReturnType<typeof ReportingService.getTimelineMilestonesReport>>;
        csvContent = generateCsv(d.tasks, [
          { header: 'Task Title', accessor: (t) => t.title },
          { header: 'Phase / Milestone', accessor: (t) => t.milestone },
          { header: 'Category', accessor: (t) => t.category },
          { header: 'Due Date', accessor: (t) => t.dueDate },
          { header: 'Priority', accessor: (t) => t.priority },
          { header: 'Status', accessor: (t) => t.status },
          { header: 'Progress %', accessor: (t) => `${t.progressPercent}%` },
          { header: 'Dependencies', accessor: (t) => t.dependencies },
        ]);
        break;
      }

      case 'payment-summary': {
        const d = data as Awaited<ReturnType<typeof ReportingService.getPaymentSummaryReport>>;
        csvContent = generateCsv(d.payments, [
          { header: 'Payment Date', accessor: (p) => p.paidAt },
          { header: 'Expense Title', accessor: (p) => p.expenseTitle },
          { header: 'Category', accessor: (p) => p.category },
          { header: 'Vendor', accessor: (p) => p.vendorName },
          { header: 'Amount', accessor: (p) => formatMinorToCurrency(p.amountMinor, d.event.currency) },
          { header: 'Payment Method', accessor: (p) => p.paymentMethod },
          { header: 'Transaction Reference', accessor: (p) => p.transactionRef },
          { header: 'Refund', accessor: (p) => (p.isRefund ? 'YES' : 'NO') },
          { header: 'Status', accessor: (p) => p.status },
        ]);
        break;
      }

      case 'risk-register': {
        const d = data as Awaited<ReturnType<typeof ReportingService.getRiskRegisterReport>>;
        csvContent = generateCsv(d.risks, [
          { header: 'Risk Description', accessor: (r) => r.title },
          { header: 'Category / Domain', accessor: (r) => r.category },
          { header: 'Probability (1-5)', accessor: (r) => r.probability },
          { header: 'Impact (1-5)', accessor: (r) => r.impact },
          { header: 'Risk Score (1-25)', accessor: (r) => r.riskScore },
          { header: 'Severity Level', accessor: (r) => r.severity },
          { header: 'Proactive Mitigation', accessor: (r) => r.mitigation },
          { header: 'Emergency Contingency', accessor: (r) => r.contingency },
          { header: 'Owner', accessor: (r) => r.owner },
          { header: 'Status', accessor: (r) => r.status },
          { header: 'Review Date', accessor: (r) => r.reviewDate },
        ]);
        break;
      }

      default: {
        // Fallback for generic event-plan and event-completion
        csvContent = escapeCsvField(`MOMENTIQ PLATFORM OFFICIAL EXPORT: ${data.metadata.title}`) + '\r\n';
        csvContent += escapeCsvField(`Generated on: ${new Date().toISOString()}`) + '\r\n\r\n';
        csvContent += JSON.stringify(data, null, 2);
        break;
      }
    }

    return {
      filename,
      mimeType: 'text/csv; charset=utf-8',
      content: csvContent,
    };
  }

  /**
   * EXPORTS REPORT TO STANDARDS-COMPLIANT PDF
   */
  public static async exportReportPdf(userId: string, eventId: string, reportType: ReportType) {
    const data = await this.getReportData(userId, eventId, reportType);
    const doc = new SimplePdfDocument();

    const eventTitle = ('event' in data && data.event && 'title' in data.event ? (data.event as any).title : 'Event');
    const currency = ('event' in data && data.event && 'currency' in data.event ? (data.event as any).currency : 'INR');

    doc.addHeader({
      title: data.metadata.title,
      subtitle: data.metadata.description,
      eventName: eventTitle,
      reportType,
      generatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
      currency,
    });

    switch (reportType) {
      case 'budget-expenses': {
        const d = data as Awaited<ReturnType<typeof ReportingService.getBudgetExpensesReport>>;

        doc.addSectionHeading('1. Financial Health & Budget Telemetry');
        doc.addKeyMetricCards([
          { label: 'Total Budget', value: formatMinorToCurrency(d.summary.totalBudgetMinor, currency) },
          { label: 'Actual Spent', value: formatMinorToCurrency(d.summary.totalSpentMinor, currency), color: [0.8, 0.2, 0.1] },
          { label: 'Remaining', value: formatMinorToCurrency(d.summary.remainingBudgetMinor, currency), color: [0.1, 0.6, 0.2] },
          { label: 'Utilization', value: `${d.summary.utilizationPercent}%`, helper: `${d.summary.contingencyPercent}% Contingency Buffer` },
        ]);

        doc.addSectionHeading('2. Category Allocations & Variances');
        doc.addTable(
          [
            { header: 'Category', width: 140 },
            { header: 'Allocated', width: 95, align: 'right' },
            { header: 'Spent', width: 95, align: 'right' },
            { header: 'Variance', width: 95, align: 'right' },
            { header: 'Usage', width: 95, align: 'right' },
          ],
          d.categories.map((c) => [
            c.name,
            formatMinorToCurrency(c.allocatedMinor, currency),
            formatMinorToCurrency(c.spentMinor, currency),
            formatMinorToCurrency(c.varianceMinor, currency),
            `${c.utilizationPercent}%`,
          ])
        );

        doc.addSectionHeading('3. Itemized Expense Audit');
        doc.addTable(
          [
            { header: 'Expense Title', width: 150 },
            { header: 'Category', width: 90 },
            { header: 'Vendor', width: 110 },
            { header: 'Total Cost', width: 90, align: 'right' },
            { header: 'Status', width: 80, align: 'center' },
          ],
          d.expenses.map((e) => [
            e.title,
            e.category,
            e.vendor,
            formatMinorToCurrency(e.totalMinor, currency),
            e.status,
          ])
        );
        break;
      }

      case 'guest-rsvp': {
        const d = data as Awaited<ReturnType<typeof ReportingService.getGuestRsvpReport>>;

        doc.addSectionHeading('1. Guest RSVP Telemetry');
        doc.addKeyMetricCards([
          { label: 'Total Invited', value: String(d.summary.totalInvited) },
          { label: 'Attending Heads', value: String(d.summary.attendingHeads), color: [0.1, 0.6, 0.2] },
          { label: 'Declined', value: String(d.summary.declinedCount), color: [0.7, 0.2, 0.1] },
          { label: 'Pending RSVP', value: String(d.summary.pendingCount) },
        ]);

        doc.addSectionHeading('2. Guest Manifest & Seating Details');
        doc.addTable(
          [
            { header: 'Guest Name', width: 120 },
            { header: 'Group', width: 85 },
            { header: 'RSVP Status', width: 75, align: 'center' },
            { header: 'Heads', width: 45, align: 'center' },
            { header: 'Dietary Notes', width: 95 },
            { header: 'Table Assignment', width: 100 },
          ],
          d.guests.map((g) => [
            g.name,
            g.group,
            g.rsvpStatus,
            g.attendingCount,
            g.dietary,
            g.seatingTable,
          ])
        );
        break;
      }

      case 'risk-register': {
        const d = data as Awaited<ReturnType<typeof ReportingService.getRiskRegisterReport>>;

        doc.addSectionHeading('1. Risk Radar Telemetry');
        doc.addKeyMetricCards([
          { label: 'Total Identified', value: String(d.summary.totalRisks) },
          { label: 'Unresolved Risks', value: String(d.summary.unresolvedCount), color: [0.8, 0.4, 0.1] },
          { label: 'High/Critical Hazard', value: String(d.summary.highHazardCount), color: [0.8, 0.1, 0.1] },
        ]);

        doc.addSectionHeading('2. Deterministic 5x5 RAG Risk Matrix');
        doc.addTable(
          [
            { header: 'Risk Description', width: 140 },
            { header: 'Domain', width: 80 },
            { header: 'P x I', width: 45, align: 'center' },
            { header: 'Score', width: 45, align: 'center' },
            { header: 'Severity', width: 65, align: 'center' },
            { header: 'Mitigation Summary', width: 145 },
          ],
          d.risks.map((r) => [
            r.title,
            r.category,
            `${r.probability}x${r.impact}`,
            r.riskScore,
            r.severity,
            r.mitigation,
          ])
        );
        break;
      }

      case 'vendor-comparison': {
        const d = data as Awaited<ReturnType<typeof ReportingService.getVendorComparisonReport>>;

        doc.addSectionHeading('1. Vendor Lineup Overview');
        doc.addKeyMetricCards([
          { label: 'Total Vendors', value: String(d.totalVendors) },
          { label: 'Confirmed Bookings', value: String(d.confirmedCount), color: [0.1, 0.6, 0.2] },
        ]);

        doc.addSectionHeading('2. Quotation Comparison Matrix');
        doc.addTable(
          [
            { header: 'Vendor Name', width: 120 },
            { header: 'Category', width: 85 },
            { header: 'Verified', width: 60, align: 'center' },
            { header: 'Normalized Cost', width: 95, align: 'right' },
            { header: 'Booking Status', width: 80, align: 'center' },
            { header: 'Included Services', width: 80 },
          ],
          d.vendors.map((v) => [
            v.name,
            v.category,
            v.isVerified ? 'VERIFIED' : 'PENDING',
            formatMinorToCurrency(v.totalQuoteCostMinor, currency),
            v.status,
            v.servicesIncluded,
          ])
        );
        break;
      }

      case 'timeline-milestones': {
        const d = data as Awaited<ReturnType<typeof ReportingService.getTimelineMilestonesReport>>;

        doc.addSectionHeading('1. Timeline Execution Telemetry');
        doc.addKeyMetricCards([
          { label: 'Total Tasks', value: String(d.summary.totalTasks) },
          { label: 'Completed Tasks', value: String(d.summary.completedTasks), color: [0.1, 0.6, 0.2] },
          { label: 'Overdue Tasks', value: String(d.summary.overdueTasks), color: [0.8, 0.2, 0.1] },
          { label: 'Completion Rate', value: `${d.summary.completionPercent}%` },
        ]);

        doc.addSectionHeading('2. Chronological Milestones & Tasks');
        doc.addTable(
          [
            { header: 'Task Title', width: 150 },
            { header: 'Milestone Phase', width: 100 },
            { header: 'Due Date', width: 80, align: 'center' },
            { header: 'Priority', width: 65, align: 'center' },
            { header: 'Status', width: 65, align: 'center' },
            { header: 'Progress', width: 60, align: 'right' },
          ],
          d.tasks.map((t) => [
            t.title,
            t.milestone,
            t.dueDate,
            t.priority,
            t.status,
            `${t.progressPercent}%`,
          ])
        );
        break;
      }

      case 'payment-summary': {
        const d = data as Awaited<ReturnType<typeof ReportingService.getPaymentSummaryReport>>;

        doc.addSectionHeading('1. Payment Disbursements & Balances');
        doc.addKeyMetricCards([
          { label: 'Total Disbursed', value: formatMinorToCurrency(d.summary.totalDisbursedMinor, currency) },
          { label: 'Total Refunded', value: formatMinorToCurrency(d.summary.totalRefundedMinor, currency) },
          { label: 'Net Disbursed', value: formatMinorToCurrency(d.summary.netDisbursedMinor, currency), color: [0.1, 0.6, 0.2] },
          { label: 'Pending Due', value: formatMinorToCurrency(d.summary.pendingDueMinor, currency), color: [0.8, 0.3, 0.1] },
        ]);

        doc.addSectionHeading('2. Recorded Payment Transactions');
        doc.addTable(
          [
            { header: 'Date', width: 75 },
            { header: 'Expense / Vendor', width: 145 },
            { header: 'Amount', width: 95, align: 'right' },
            { header: 'Method', width: 85 },
            { header: 'Tx Ref', width: 75 },
            { header: 'Status', width: 45, align: 'center' },
          ],
          d.payments.map((p) => [
            p.paidAt,
            `${p.expenseTitle} (${p.vendorName})`,
            formatMinorToCurrency(p.amountMinor, currency),
            p.paymentMethod,
            p.transactionRef,
            p.status,
          ])
        );
        break;
      }

      case 'event-plan': {
        const d = data as Awaited<ReturnType<typeof ReportingService.getEventPlanReport>>;

        doc.addSectionHeading('1. Executive Celebration Blueprint');
        doc.addParagraph(`Title: ${d.event.title} | Category: ${d.event.eventType}`);
        doc.addParagraph(`Dates: ${d.event.startDate.split('T')[0]} to ${d.event.endDate.split('T')[0]}`);
        doc.addParagraph(`Venue: ${d.event.venue}, ${d.event.city}, ${d.event.country}`);
        doc.addParagraph(`Target Guests: ${d.event.guestTarget} | Planned Budget: ${formatMinorToCurrency(d.event.budgetMinor, currency)}`);
        doc.addParagraph(`Theme Concept: ${d.preferences.theme} (Tone: ${d.preferences.tone})`);

        doc.addSectionHeading('2. Milestones & Planning Schedule');
        doc.addTable(
          [
            { header: 'Milestone Title', width: 260 },
            { header: 'Target Date', width: 130, align: 'center' },
            { header: 'Status', width: 130, align: 'center' },
          ],
          d.milestones.map((m) => [m.title, m.targetDate, m.status])
        );

        doc.addSectionHeading('3. Event-Day Itinerary');
        doc.addTable(
          [
            { header: 'Day', width: 45, align: 'center' },
            { header: 'Time Slot', width: 110, align: 'center' },
            { header: 'Session / Activity', width: 215 },
            { header: 'Location', width: 150 },
          ],
          d.schedules.map((s) => [s.dayNumber, s.time, s.title, s.location])
        );
        break;
      }

      case 'event-completion': {
        const d = data as Awaited<ReturnType<typeof ReportingService.getEventCompletionReport>>;

        doc.addSectionHeading('1. Operational Debrief & Reconciliation');
        doc.addKeyMetricCards([
          { label: 'Final Budget', value: formatMinorToCurrency(d.operationalSummary.plannedBudgetMinor, currency) },
          { label: 'Final Spending', value: formatMinorToCurrency(d.operationalSummary.actualSpentMinor, currency) },
          { label: 'Actual Attendance', value: `${d.operationalSummary.actualAttendingHeads} / ${d.operationalSummary.targetGuests}` },
          { label: 'Task Completion', value: `${d.operationalSummary.taskCompletionPercent}%` },
        ]);

        doc.addSectionHeading('2. Operational Health Audit');
        doc.addParagraph(`All Tasks Completed: ${d.operationalSummary.allTasksCompleted ? 'YES (100% Executed)' : 'Incomplete items remaining'}`);
        doc.addParagraph(`All Risks Closed or Accepted: ${d.operationalSummary.allRisksResolved ? 'YES (Audit Passed)' : 'Open risks unresolved'}`);
        doc.addParagraph(`Total Operational Risks Handled: ${d.operationalSummary.totalRisksHandled}`);

        doc.addSectionHeading('3. Final Budget Allocation Performance');
        doc.addTable(
          [
            { header: 'Category', width: 150 },
            { header: 'Allocated', width: 120, align: 'right' },
            { header: 'Spent', width: 120, align: 'right' },
            { header: 'Variance', width: 130, align: 'right' },
          ],
          d.budgetBreakdown.map((b) => [
            b.name,
            formatMinorToCurrency(b.allocatedMinor, currency),
            formatMinorToCurrency(b.spentMinor, currency),
            formatMinorToCurrency(b.varianceMinor, currency),
          ])
        );
        break;
      }
    }

    const eventSlug = eventTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const filename = `momentiq-${reportType}-${eventSlug}-${new Date().toISOString().split('T')[0]}.pdf`;
    const buffer = doc.buildPdf();

    return {
      filename,
      mimeType: 'application/pdf',
      buffer,
    };
  }
}
