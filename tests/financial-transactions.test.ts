import { describe, it, expect, beforeEach } from 'vitest';
import db from '../src/lib/database';
import { AuthService } from '../src/services/auth-service';
import { EventService } from '../src/services/event-service';
import { BudgetService } from '../src/services/budget-service';
import { authRateLimiter } from '../src/lib/security/rate-limiter';

describe('Financial Transactions, Payments, Refunds & IDOR Isolation Suite', () => {
  let userA: { user: { id: string; email: string } };
  let userB: { user: { id: string; email: string } };
  let eventA: { id: string; title: string };
  let venueCategory: { id: string; name: string };
  let decorCategory: { id: string; name: string };

  beforeEach(async () => {
    authRateLimiter.reset();
    const timestamp = Date.now();
    userA = await AuthService.register({
      email: `fin_a_${timestamp}@example.com`,
      name: 'User A Finance',
      password: 'StrongPassword123!',
    });

    userB = await AuthService.register({
      email: `fin_b_${timestamp}@example.com`,
      name: 'User B Finance',
      password: 'StrongPassword123!',
    });

    // Create event with $50,000 budget (5,000,000 minor)
    eventA = await EventService.createEvent(userA.user.id, {
      title: 'Financial Testing Celebration 2026',
      description: 'Budget verification suite',
      eventType: 'ANNIVERSARY',
      startDate: new Date(Date.now() + 86400000 * 60).toISOString(),
      endDate: new Date(Date.now() + 86400000 * 61).toISOString(),
      venue: 'Starlight Ballroom',
      city: 'Chicago',
      country: 'USA',
      guestTarget: 100,
      budgetMinor: 5000000,
      currency: 'USD',
    });

    const categories = await db.budgetCategory.findMany({
      where: { eventId: eventA.id },
    });
    venueCategory = categories.find((c) => c.name.includes('Venue')) || categories[0];
    decorCategory = categories.find((c) => c.name.includes('Decor')) || categories[1];
  });

  it('creates an expense with deterministic tax calculation and links to category', async () => {
    // Base $2,000.00 (200,000 minor units) with 8% tax (800 bps)
    const expense = await BudgetService.createExpense(userA.user.id, eventA.id, {
      categoryId: venueCategory.id,
      title: 'Catering Deposit & Service Package',
      baseAmountMinor: 200000,
      taxRateBps: 800, // 8% = $160.00 tax (16,000 minor) -> total $2,160.00 (216,000 minor)
      dueDate: new Date(Date.now() + 86400000 * 14).toISOString(),
      notes: 'Initial banquet deposit',
    });

    expect(expense.id).toBeDefined();
    expect(Number(expense.baseAmountMinor)).toBe(200000);
    expect(Number(expense.taxAmountMinor)).toBe(16000);
    expect(Number(expense.amountMinor)).toBe(216000);
    expect(expense.status).toBe('PENDING');

    // Verify activity audit log was created
    const log = await db.activityLog.findFirst({
      where: { eventId: eventA.id, action: 'EXPENSE_CREATED', entityId: expense.id },
    });
    expect(log).toBeDefined();
  });

  it('records advance payments, partial settlements, full payments and refunds with state transitions', async () => {
    // 1. Create $1,000.00 expense
    const expense = await BudgetService.createExpense(userA.user.id, eventA.id, {
      categoryId: decorCategory.id,
      title: 'Floral Staging Package',
      baseAmountMinor: 100000, // $1,000.00
      taxRateBps: 0,
    });

    // 2. Record 50% advance payment ($500.00)
    const p1 = await BudgetService.recordPayment(userA.user.id, eventA.id, {
      expenseId: expense.id,
      amountMinor: 50000,
      paymentMethod: 'Credit Card / Visa',
      transactionRef: 'tx_advance_123',
    });
    expect(p1.id).toBeDefined();

    // Verify expense status is PARTIAL
    const expAfterAdvance = await db.expense.findUnique({ where: { id: expense.id } });
    expect(expAfterAdvance?.status).toBe('PARTIAL');

    // 3. Record remaining settlement payment ($500.00)
    await BudgetService.recordPayment(userA.user.id, eventA.id, {
      expenseId: expense.id,
      amountMinor: 50000,
      paymentMethod: 'Bank Wire',
      transactionRef: 'tx_settlement_456',
    });

    // Verify expense status is COMPLETED
    const expAfterSettlement = await db.expense.findUnique({ where: { id: expense.id } });
    expect(expAfterSettlement?.status).toBe('COMPLETED');

    // 4. Record a refund ($200.00 partial refund)
    const refund = await BudgetService.recordPayment(userA.user.id, eventA.id, {
      expenseId: expense.id,
      amountMinor: 20000, // $200.00 refund
      paymentMethod: 'Credit Card Refund',
      transactionRef: 'ref_789',
      isRefund: true,
    });
    expect(refund.isRefund).toBe(true);

    // Net paid is now $1,000 - $200 = $800 -> status transitions back to PARTIAL
    const expAfterRefund = await db.expense.findUnique({ where: { id: expense.id } });
    expect(expAfterRefund?.status).toBe('PARTIAL');

    // Verify dashboard reflects refund properly
    const dashboard = await BudgetService.getFinancialDashboard(userA.user.id, eventA.id);
    expect(dashboard.totalSpentMinor).toBe(80000); // $800 net spent
  });

  it('updates expense details and prevents cross-event category injection', async () => {
    const expense = await BudgetService.createExpense(userA.user.id, eventA.id, {
      categoryId: venueCategory.id,
      title: 'Initial Title',
      baseAmountMinor: 50000,
    });

    // Valid update: reassign to decorCategory
    const updated = await BudgetService.updateExpense(userA.user.id, eventA.id, expense.id, {
      title: 'Updated Lighting Rig',
      categoryId: decorCategory.id,
    });
    expect(updated.title).toBe('Updated Lighting Rig');
    expect(updated.categoryId).toBe(decorCategory.id);

    // Create User B event with their own category
    const eventB = await EventService.createEvent(userB.user.id, {
      title: 'User B Separate Event',
      description: 'Isolated event',
      eventType: 'BIRTHDAY',
      startDate: new Date(Date.now() + 86400000 * 30).toISOString(),
      endDate: new Date(Date.now() + 86400000 * 31).toISOString(),
      venue: 'Lounge B',
      city: 'Boston',
      country: 'USA',
      guestTarget: 40,
      budgetMinor: 2000000,
      currency: 'USD',
    });
    const userBCat = await db.budgetCategory.findFirst({ where: { eventId: eventB.id } });

    // Cross-event injection: User A tries to assign expense to User B's category -> MUST BE REJECTED
    await expect(
      BudgetService.updateExpense(userA.user.id, eventA.id, expense.id, {
        categoryId: userBCat!.id,
      })
    ).rejects.toThrow(/Target category does not belong to this event/);
  });

  it('exports comprehensive financial report CSV with headers and itemized records', async () => {
    await BudgetService.createExpense(userA.user.id, eventA.id, {
      categoryId: venueCategory.id,
      title: 'Ballroom Rental Deposit',
      baseAmountMinor: 300000,
      taxRateBps: 500,
    });

    const csv = await BudgetService.generateFinancialReportCsv(userA.user.id, eventA.id);

    expect(csv).toContain('CELEBRA EVENT FINANCIAL REPORT');
    expect(csv).toContain('CATEGORY ALLOCATION BREAKDOWN');
    expect(csv).toContain('ITEMIZED EXPENSE LEDGER');
    expect(csv).toContain('Ballroom Rental Deposit');
    expect(csv).toContain('USD');
  });

  it('ENFORCES IDOR DEFENSE: User B CANNOT add expenses or record payments to User A budget', async () => {
    // User B tries to add expense to User A's event
    await expect(
      BudgetService.createExpense(userB.user.id, eventA.id, {
        categoryId: venueCategory.id,
        title: 'Unauthorized User B Expense',
        baseAmountMinor: 100000,
      })
    ).rejects.toThrow(/Access denied/);

    // Create valid expense for User A
    const expA = await BudgetService.createExpense(userA.user.id, eventA.id, {
      categoryId: venueCategory.id,
      title: 'User A Confidential Bill',
      baseAmountMinor: 50000,
    });

    // User B tries to record payment for User A's expense
    await expect(
      BudgetService.recordPayment(userB.user.id, eventA.id, {
        expenseId: expA.id,
        amountMinor: 50000,
        paymentMethod: 'Cash',
      })
    ).rejects.toThrow(/Access denied/);

    // User B tries to view User A's financial dashboard
    await expect(
      BudgetService.getFinancialDashboard(userB.user.id, eventA.id)
    ).rejects.toThrow(/Access denied/);
  });
});

