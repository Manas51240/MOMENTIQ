import { describe, it, expect, beforeAll } from 'vitest';
import db from '@/lib/database';
import { AuthService } from '@/services/auth-service';
import { EventService } from '@/services/event-service';
import { DashboardService } from '@/services/dashboard-service';
import { ReportingService, ReportType } from '@/services/reporting-service';
import { BudgetService } from '@/services/budget-service';
import { TimelineService } from '@/services/timeline-service';
import { VendorService } from '@/services/vendor-service';
import { GuestService } from '@/services/guest-service';
import { RiskService } from '@/services/risk-service';
import { CollaborationService } from '@/services/collaboration-service';
import { SimplePdfDocument } from '@/lib/pdf/pdf-generator';
import { escapeCsvField, formatMinorToCurrency, generateCsv } from '@/lib/csv/csv-generator';

describe('CELEBRA Dashboard & Reporting System Suite', () => {
  let userA: Awaited<ReturnType<typeof AuthService.register>>;
  let userB: Awaited<ReturnType<typeof AuthService.register>>;
  let viewerUser: Awaited<ReturnType<typeof AuthService.register>>;
  let eventA: any;
  let eventB: any;

  beforeAll(async () => {
    const timestamp = Date.now();

    // 1. Register User A (Organizer)
    userA = await AuthService.register({
      email: `organizer_${timestamp}@test.com`,
      password: 'StrongPassword123!',
      name: 'Audited Organizer A',
    });

    // 2. Register User B (Unrelated Tenant for IDOR test)
    userB = await AuthService.register({
      email: `unauthorized_${timestamp}@test.com`,
      password: 'StrongPassword123!',
      name: 'Unrelated User B',
    });

    // 3. Register Viewer User (for PII minimization test)
    viewerUser = await AuthService.register({
      email: `viewer_${timestamp}@test.com`,
      password: 'StrongPassword123!',
      name: 'Guest Coordinator Viewer',
    });

    // 4. Create Event A owned by User A
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const endDate = new Date(futureDate);
    endDate.setDate(endDate.getDate() + 1);

    eventA = await EventService.createEvent(userA.user.id, {
      title: 'Grand Gala Celebration',
      description: 'Luxury high-profile anniversary banquet',
      eventType: 'ANNIVERSARY',
      startDate: futureDate.toISOString(),
      endDate: endDate.toISOString(),
      venue: 'The Grand Ballroom',
      city: 'San Francisco',
      country: 'USA',
      guestTarget: 150,
      budgetMinor: 5000000, // $50,000.00
      currency: 'USD',
    });

    // 5. Create Event B owned by User B
    eventB = await EventService.createEvent(userB.user.id, {
      title: 'Private Isolated Party',
      description: 'Tenant B secret event',
      eventType: 'BIRTHDAY',
      startDate: futureDate.toISOString(),
      endDate: endDate.toISOString(),
      venue: 'Secret Loft',
      city: 'San Jose',
      country: 'USA',
      guestTarget: 20,
      budgetMinor: 1000000,
      currency: 'USD',
    });

    // 6. Add Viewer to Event A with role VIEWER
    await db.eventMember.create({
      data: {
        eventId: eventA.id,
        userId: viewerUser.user.id,
        role: 'VIEWER',
      },
    });

    // 7. Seed Operational Data into Event A
    // (a) Budget categories and expenses
    const cateringCat = await db.budgetCategory.create({
      data: {
        eventId: eventA.id,
        name: 'Catering & Beverages',
        allocatedMinor: BigInt(2500000), // $25,000.00
      },
    });

    const expense1 = await BudgetService.createExpense(userA.user.id, eventA.id, {
      categoryId: cateringCat.id,
      title: 'Catering Deposit & Tasting',
      baseAmountMinor: 1000000, // $10,000.00
      taxBasisPoints: 850, // 8.5%
      currency: 'USD',
      notes: 'Initial catering deposit',
    });

    // Record partial payment for expense1
    await BudgetService.recordPayment(userA.user.id, eventA.id, {
      expenseId: expense1.id,
      amountMinor: 1000000,
      paymentMethod: 'WIRE_TRANSFER',
      transactionRef: 'WIRE-2026-X19',
    });

    // Second expense pending payment
    const pendingDueDate = new Date();
    pendingDueDate.setDate(pendingDueDate.getDate() + 5);
    await BudgetService.createExpense(userA.user.id, eventA.id, {
      categoryId: cateringCat.id,
      title: 'Champagne & Specialty Bar',
      baseAmountMinor: 350000, // $3,500.00
      taxBasisPoints: 850,
      currency: 'USD',
      dueDate: pendingDueDate.toISOString(),
      notes: 'Due in 5 days',
    });

    // (b) Overdue task and upcoming deadline task
    const overdueDate = new Date();
    overdueDate.setDate(overdueDate.getDate() - 3);
    await db.task.create({
      data: {
        eventId: eventA.id,
        title: 'Sign Banquet Rental Agreement',
        category: 'Legal',
        dueDate: overdueDate,
        priority: 'CRITICAL',
        status: 'TODO',
      },
    });

    const deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() + 4);
    await db.task.create({
      data: {
        eventId: eventA.id,
        title: 'Finalize Centerpiece Floral Orders',
        category: 'Decoration',
        dueDate: deadlineDate,
        priority: 'HIGH',
        status: 'IN_PROGRESS',
      },
    });

    // (c) Vendor registration
    const vendorCat = await VendorService.listCategories();
    await VendorService.registerVendor(userA.user.id, eventA.id, {
      categoryId: vendorCat[0].id,
      name: 'Luxe Floral Artistry',
      location: 'Downtown SF',
      priceEstimateMinor: 450000,
      sourceTag: 'VERIFIED_PARTNER',
      isAvailabilityVerified: true,
    });

    // (d) Guest list
    await GuestService.addGuest(userA.user.id, eventA.id, {
      name: 'Victoria Hastings',
      email: 'victoria.hastings@example.com',
      phone: '+1-415-555-0199',
      rsvpStatus: 'ATTENDING',
      attendingCount: 2,
      dietaryRequirements: 'Gluten-Free, Pescatarian',
    });

    await GuestService.addGuest(userA.user.id, eventA.id, {
      name: 'Alexander Vance',
      email: 'alexander.vance@example.com',
      phone: '+1-415-555-0288',
      rsvpStatus: 'DECLINED',
      attendingCount: 1,
    });

    // (e) Risk item (High hazard)
    await RiskService.createRisk(userA.user.id, eventA.id, {
      title: 'Power Outage at Historic Ballroom',
      category: 'Venue',
      probability: 3,
      impact: 5, // Score = 15 -> High Hazard
      mitigation: 'Rent dual mobile generators on standby',
      contingency: 'Automatic ATS failover within 10 seconds',
      ownerName: 'Site Facility Engineer',
    });
  });

  // -------------------------------------------------------------
  // PART 1: DASHBOARD TELEMETRY & 11 MANDATORY SIGNALS
  // -------------------------------------------------------------
  describe('Part 1: 11 Mandatory Dashboard Telemetry Metrics', () => {
    it('1. Computes all 11 telemetry metrics accurately from live database records', async () => {
      const telemetry = await DashboardService.getUserDashboard(userA.user.id);

      // Signal 1: Active Events
      expect(telemetry.activeEventsCount).toBeGreaterThanOrEqual(1);

      // Signal 2: Upcoming Events
      expect(telemetry.upcomingEvents.length).toBeGreaterThanOrEqual(1);
      const targetEvt = telemetry.upcomingEvents.find((e) => e.id === eventA.id);
      expect(targetEvt).toBeDefined();
      expect(targetEvt?.title).toBe('Grand Gala Celebration');
      expect(targetEvt?.userRole).toBe('OWNER');

      // Signal 3 & 4: Budget Utilization & Remaining Budget
      expect(BigInt(telemetry.budgetUtilization.totalPlannedMinor)).toBeGreaterThan(BigInt(0));
      expect(BigInt(telemetry.budgetUtilization.totalSpentMinor)).toBeGreaterThan(BigInt(0));
      expect(BigInt(telemetry.budgetUtilization.remainingBudgetMinor)).toBe(
        BigInt(telemetry.budgetUtilization.totalPlannedMinor) - BigInt(telemetry.budgetUtilization.totalSpentMinor)
      );
      expect(telemetry.budgetUtilization.utilizationPercent).toBeGreaterThan(0);

      // Signal 5: Overdue Tasks
      expect(telemetry.overdueTasks.count).toBeGreaterThanOrEqual(1);
      const overdue = telemetry.overdueTasks.items.find((t) => t.title === 'Sign Banquet Rental Agreement');
      expect(overdue).toBeDefined();
      expect(overdue?.priority).toBe('CRITICAL');

      // Signal 6: Upcoming Deadlines (within 14 days)
      expect(telemetry.upcomingDeadlines.count).toBeGreaterThanOrEqual(1);
      const soonDue = telemetry.upcomingDeadlines.items.find((d) => d.title === 'Finalize Centerpiece Floral Orders');
      expect(soonDue).toBeDefined();
      expect(soonDue?.daysRemaining).toBeLessThanOrEqual(14);

      // Signal 7: Vendor Booking Status Breakdown
      expect(telemetry.vendorBookingStatus.total).toBeGreaterThanOrEqual(1);

      // Signal 8: Guest RSVP Summary
      expect(telemetry.guestRsvpSummary.totalInvited).toBeGreaterThanOrEqual(2);
      expect(telemetry.guestRsvpSummary.attending).toBeGreaterThanOrEqual(1);
      expect(telemetry.guestRsvpSummary.attendingHeads).toBeGreaterThanOrEqual(2); // Victoria + plus one
      expect(telemetry.guestRsvpSummary.declined).toBeGreaterThanOrEqual(1);
      expect(telemetry.guestRsvpSummary.dietaryCount).toBeGreaterThanOrEqual(1);

      // Signal 9: Pending Payments
      expect(telemetry.pendingPayments.count).toBeGreaterThanOrEqual(1);
      expect(BigInt(telemetry.pendingPayments.totalPendingMinor)).toBeGreaterThan(BigInt(0));

      // Signal 10: Unresolved Risks & High Hazard
      expect(telemetry.unresolvedRisks.totalUnresolved).toBeGreaterThanOrEqual(1);
      expect(telemetry.unresolvedRisks.highHazardCount).toBeGreaterThanOrEqual(1);
      const powerRisk = telemetry.unresolvedRisks.items.find((r) => r.title.includes('Power Outage'));
      expect(powerRisk).toBeDefined();
      expect(powerRisk?.riskScore).toBe(15);

      // Signal 11: Recent Activity Feed
      expect(telemetry.recentActivity.length).toBeGreaterThan(0);
      expect(telemetry.recentActivity[0].eventId).toBeDefined();
    });

    it('2. ENFORCES MULTI-TENANT ISOLATION: User B CANNOT see User A events in dashboard telemetry', async () => {
      const telemetryB = await DashboardService.getUserDashboard(userB.user.id);

      // User B must ONLY see their own event, never User A's
      const leakedEventA = telemetryB.upcomingEvents.find((e) => e.id === eventA.id);
      expect(leakedEventA).toBeUndefined();

      const userBEvent = telemetryB.upcomingEvents.find((e) => e.id === eventB.id);
      expect(userBEvent).toBeDefined();

      // Overdue tasks from User A must not leak to User B
      const leakedOverdue = telemetryB.overdueTasks.items.find((t) => t.eventId === eventA.id);
      expect(leakedOverdue).toBeUndefined();
    });
  });

  // -------------------------------------------------------------
  // PART 2: DEDICATED REPORT GENERATION (8 DISTINCT REPORTS)
  // -------------------------------------------------------------
  describe('Part 2: 8 Dedicated Report Generators', () => {
    it('1. Generates Complete Event Plan Report', async () => {
      const report = await ReportingService.getReportData(userA.user.id, eventA.id, 'event-plan');
      expect(report.type).toBe('event-plan');
      expect(report.event.title).toBe('Grand Gala Celebration');
      expect(report.metadata.title).toBeDefined();
    });

    it('2. Generates Budget & Expenses Financial Report with zero floating point drift', async () => {
      const report = (await ReportingService.getReportData(
        userA.user.id,
        eventA.id,
        'budget-expenses'
      )) as Awaited<ReturnType<typeof ReportingService.getBudgetExpensesReport>>;

      expect(report.type).toBe('budget-expenses');
      expect(BigInt(report.summary.totalBudgetMinor)).toBe(BigInt(5000000));
      expect(report.categories.length).toBeGreaterThanOrEqual(1);
      expect(report.expenses.length).toBeGreaterThanOrEqual(2);

      // Verify mathematical balance: totalBudget = spent + remaining
      const planned = BigInt(report.summary.totalBudgetMinor);
      const spent = BigInt(report.summary.totalSpentMinor);
      const remaining = BigInt(report.summary.remainingBudgetMinor);
      expect(planned - spent).toBe(remaining);
    });

    it('3. Generates Vendor Comparison & Quotation Report', async () => {
      const report = (await ReportingService.getReportData(
        userA.user.id,
        eventA.id,
        'vendor-comparison'
      )) as Awaited<ReturnType<typeof ReportingService.getVendorComparisonReport>>;

      expect(report.type).toBe('vendor-comparison');
      expect(report.vendors.length).toBeGreaterThanOrEqual(1);
      expect(report.vendors[0].name).toBe('Luxe Floral Artistry');
      expect(report.vendors[0].isVerified).toBe(true);
    });

    it('4. Generates Guest & RSVP Attendance Report', async () => {
      const report = (await ReportingService.getReportData(
        userA.user.id,
        eventA.id,
        'guest-rsvp'
      )) as Awaited<ReturnType<typeof ReportingService.getGuestRsvpReport>>;

      expect(report.type).toBe('guest-rsvp');
      expect(report.summary.totalInvited).toBeGreaterThanOrEqual(2);
      expect(report.summary.attendingHeads).toBeGreaterThanOrEqual(2);
      expect(report.guests.length).toBeGreaterThanOrEqual(2);
    });

    it('5. Generates Timeline & Milestones Schedule Report', async () => {
      const report = (await ReportingService.getReportData(
        userA.user.id,
        eventA.id,
        'timeline-milestones'
      )) as Awaited<ReturnType<typeof ReportingService.getTimelineMilestonesReport>>;

      expect(report.type).toBe('timeline-milestones');
      expect(report.summary.totalTasks).toBeGreaterThanOrEqual(2);
      expect(report.summary.overdueTasks).toBeGreaterThanOrEqual(1);
    });

    it('6. Generates Payment Summary & Invoices Report', async () => {
      const report = (await ReportingService.getReportData(
        userA.user.id,
        eventA.id,
        'payment-summary'
      )) as Awaited<ReturnType<typeof ReportingService.getPaymentSummaryReport>>;

      expect(report.type).toBe('payment-summary');
      expect(report.payments.length).toBeGreaterThanOrEqual(1);
      expect(report.payments[0].paymentMethod).toBe('WIRE_TRANSFER');
      expect(report.payments[0].transactionRef).toBe('WIRE-2026-X19');
    });

    it('7. Generates Risk Register & Contingency Report', async () => {
      const report = (await ReportingService.getReportData(
        userA.user.id,
        eventA.id,
        'risk-register'
      )) as Awaited<ReturnType<typeof ReportingService.getRiskRegisterReport>>;

      expect(report.type).toBe('risk-register');
      expect(report.summary.totalRisks).toBeGreaterThanOrEqual(1);
      expect(report.summary.highHazardCount).toBeGreaterThanOrEqual(1);
      expect(report.risks[0].riskScore).toBe(15);
    });

    it('8. Generates Event Completion & Debrief Report', async () => {
      const report = (await ReportingService.getReportData(
        userA.user.id,
        eventA.id,
        'event-completion'
      )) as Awaited<ReturnType<typeof ReportingService.getEventCompletionReport>>;

      expect(report.type).toBe('event-completion');
      expect(report.operationalSummary.targetGuests).toBe(150);
      expect(report.operationalSummary.plannedBudgetMinor).toBe('5000000');
    });
  });

  // -------------------------------------------------------------
  // PART 3: EXPORT FORMATS (CSV & PDF) & SECURITY
  // -------------------------------------------------------------
  describe('Part 3: Export Formats, Standards Compliance & Security', () => {
    it('1. Exports RFC 4180 compliant CSV with proper escaping and formatting', async () => {
      const csvResult = await ReportingService.exportReportCsv(userA.user.id, eventA.id, 'budget-expenses');

      expect(csvResult.mimeType).toBe('text/csv; charset=utf-8');
      expect(csvResult.filename).toContain('celebra-budget-expenses');
      expect(csvResult.content).toContain('=== Budget Overview Summary ===');
      expect(csvResult.content).toContain('Catering & Beverages');

      // Test escaping unit function with commas, quotes, and newlines
      const fieldWithComma = escapeCsvField('Apples, Bananas');
      expect(fieldWithComma).toBe('"Apples, Bananas"');

      const fieldWithQuote = escapeCsvField('John "Jack" Doe');
      expect(fieldWithQuote).toBe('"John ""Jack"" Doe"');

      // Test financial currency formatter
      expect(formatMinorToCurrency(12550, 'USD')).toBe('USD 125.50');
      expect(formatMinorToCurrency(0, 'USD')).toBe('USD 0.00');
    });

    it('2. Exports Standards-Compliant PDF 1.4 Binary Stream', async () => {
      const pdfResult = await ReportingService.exportReportPdf(userA.user.id, eventA.id, 'budget-expenses');

      expect(pdfResult.mimeType).toBe('application/pdf');
      expect(pdfResult.filename).toContain('celebra-budget-expenses');
      expect(pdfResult.buffer).toBeInstanceOf(Buffer);
      expect(pdfResult.buffer.length).toBeGreaterThan(500);

      // Verify PDF 1.4 header
      const header = pdfResult.buffer.subarray(0, 8).toString('latin1');
      expect(header).toContain('%PDF-1.4');

      // Verify PDF structure elements
      const pdfString = pdfResult.buffer.toString('latin1');
      expect(pdfString).toContain('/Type /Catalog');
      expect(pdfString).toContain('/Type /Pages');
      expect(pdfString).toContain('/Type /Font');
      expect(pdfString).toContain('xref');
      expect(pdfString).toContain('startxref');
      expect(pdfString).toContain('%%EOF');
    });

    it('3. ENFORCES PII DATA MINIMIZATION: Collaborator with VIEWER role has emails & phones redacted', async () => {
      // 1. Owner sees real PII
      const ownerReport = (await ReportingService.getReportData(
        userA.user.id,
        eventA.id,
        'guest-rsvp'
      )) as Awaited<ReturnType<typeof ReportingService.getGuestRsvpReport>>;

      const ownerVictoria = ownerReport.guests.find((g) => g.name === 'Victoria Hastings');
      expect(ownerVictoria?.email).toBe('victoria.hastings@example.com');
      expect(ownerVictoria?.phone).toBe('+1-415-555-0199');

      // 2. Viewer gets masked PII
      const viewerReport = (await ReportingService.getReportData(
        viewerUser.user.id,
        eventA.id,
        'guest-rsvp'
      )) as Awaited<ReturnType<typeof ReportingService.getGuestRsvpReport>>;

      const viewerVictoria = viewerReport.guests.find((g) => g.name === 'Victoria Hastings');
      expect(viewerVictoria?.email).toBe('[MASKED PII]');
      expect(viewerVictoria?.phone).toBe('[MASKED PII]');
    });

    it('4. ENFORCES ZERO IDOR: User B CANNOT generate or export User A reports', async () => {
      await expect(
        ReportingService.getReportData(userB.user.id, eventA.id, 'budget-expenses')
      ).rejects.toThrow(/Access denied/i);

      await expect(
        ReportingService.exportReportCsv(userB.user.id, eventA.id, 'guest-rsvp')
      ).rejects.toThrow(/Access denied/i);

      await expect(
        ReportingService.exportReportPdf(userB.user.id, eventA.id, 'risk-register')
      ).rejects.toThrow(/Access denied/i);
    });

    it('5. Handles large datasets with streaming efficiency and deterministic bounded resources', async () => {
      // Create test document with multi-page generation
      const doc = new SimplePdfDocument();
      doc.addHeader({
        title: 'Large Dataset Stress Test Report',
        eventName: 'Mega Festival Celebration',
        reportType: 'guest-rsvp',
      });

      // Add 150 rows (forces pagination)
      const rows: Array<Array<string | number>> = [];
      for (let i = 1; i <= 150; i++) {
        rows.push([`Guest ${i}`, 'VIP Group', 'ATTENDING', 1, 'Vegetarian', `Table ${Math.ceil(i / 10)}`]);
      }

      const startTime = Date.now();
      doc.addTable(
        [
          { header: 'Guest', width: 120 },
          { header: 'Group', width: 80 },
          { header: 'RSVP', width: 70, align: 'center' },
          { header: 'Heads', width: 45, align: 'center' },
          { header: 'Dietary', width: 100 },
          { header: 'Table', width: 95 },
        ],
        rows
      );

      const buffer = doc.buildPdf();
      const elapsed = Date.now() - startTime;

      expect(buffer.length).toBeGreaterThan(5000);
      expect(elapsed).toBeLessThan(500); // Must generate in < 500ms
    });
  });
});
