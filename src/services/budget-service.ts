import db, { serializeBigInts } from '@/lib/database';
import { logActivity } from '@/lib/database/audit';
import { authorizeEventAccess } from '@/lib/security/auth-middleware';
import {
  calculateBudgetMetrics,
  calculateTaxAndTotal,
  simulateGuestCountImpact,
  formatMinorUnits,
  RawCategoryData,
} from '@/lib/financial/calculator';
import { z } from 'zod';

export const expenseInputSchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  vendorId: z.string().optional(),
  title: z.string().trim().min(2).max(150),
  baseAmountMinor: z.number().int().min(1, 'Amount must be at least 1 minor unit'),
  taxRateBps: z.number().int().min(0).max(5000).default(0), // Max 50% tax
  dueDate: z.string().optional(),
  receiptUrl: z.string().url().optional().or(z.literal('')),
  notes: z.string().trim().max(1000).optional(),
});

export const paymentInputSchema = z.object({
  expenseId: z.string().min(1, 'Expense is required'),
  amountMinor: z.number().int().min(1, 'Payment amount must be at least 1 minor unit'),
  paymentMethod: z.string().trim().min(2).max(50),
  transactionRef: z.string().trim().max(100).optional(),
  isRefund: z.boolean().default(false),
  paidAt: z.string().default(() => new Date().toISOString()),
});

export const updateAllocationsSchema = z.object({
  totalBudgetMinor: z.number().int().min(10000).optional(),
  contingencyPercent: z.number().int().min(0).max(50).optional(),
  categories: z.array(
    z.object({
      categoryId: z.string().min(1),
      allocatedMinor: z.number().int().min(0),
    })
  ),
});

export class BudgetService {
  /**
   * Retrieves the comprehensive financial dashboard for an event.
   */
  static async getFinancialDashboard(userId: string, eventId: string) {
    await authorizeEventAccess(userId, eventId, 'EVENT_VIEW');

    const [event, budget, categories] = await Promise.all([
      db.event.findUnique({
        where: { id: eventId },
        select: { budgetMinor: true, currency: true },
      }),
      db.eventBudget.findUnique({
        where: { eventId },
      }),
      db.budgetCategory.findMany({
        where: { eventId },
        include: {
          expenses: {
            include: {
              payments: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    if (!event) {
      throw new Error('Event not found');
    }

    const totalBudgetMinor = budget ? budget.totalBudgetMinor : event.budgetMinor;
    const contingencyPercent = budget ? budget.contingencyPercent : 10;
    const currency = budget ? budget.currency : event.currency;

    const metrics = calculateBudgetMetrics(
      totalBudgetMinor,
      contingencyPercent,
      categories as unknown as RawCategoryData[],
      currency
    );

    return serializeBigInts(metrics);
  }

  /**
   * Updates planned category allocations and overall event budget inside an atomic transaction.
   */
  static async updatePlannedAllocations(
    userId: string,
    eventId: string,
    data: z.infer<typeof updateAllocationsSchema>
  ) {
    await authorizeEventAccess(userId, eventId, 'BUDGET_MANAGE');
    const parsed = updateAllocationsSchema.parse(data);

    await db.$transaction(async (tx) => {
      // 1. Update event budget if totals supplied
      if (parsed.totalBudgetMinor !== undefined || parsed.contingencyPercent !== undefined) {
        const updateData: Record<string, unknown> = {};
        if (parsed.totalBudgetMinor !== undefined) {
          updateData.totalBudgetMinor = BigInt(parsed.totalBudgetMinor);
        }
        if (parsed.contingencyPercent !== undefined) {
          updateData.contingencyPercent = parsed.contingencyPercent;
        }

        await tx.eventBudget.update({
          where: { eventId },
          data: updateData,
        });

        if (parsed.totalBudgetMinor !== undefined) {
          await tx.event.update({
            where: { id: eventId },
            data: { budgetMinor: BigInt(parsed.totalBudgetMinor) },
          });
        }
      }

      // 2. Update category allocations
      for (const item of parsed.categories) {
        // Enforce that category belongs to this event
        const cat = await tx.budgetCategory.findFirst({
          where: { id: item.categoryId, eventId },
        });

        if (cat) {
          await tx.budgetCategory.update({
            where: { id: item.categoryId },
            data: { allocatedMinor: BigInt(item.allocatedMinor) },
          });
        }
      }
    });

    await logActivity({
      eventId,
      userId,
      action: 'BUDGET_ALLOCATIONS_UPDATED',
      entityType: 'EventBudget',
      entityId: eventId,
      details: { updatedCategoryCount: parsed.categories.length },
    });

    return this.getFinancialDashboard(userId, eventId);
  }

  /**
   * Logs a new expense with deterministic tax calculation and category linkage.
   */
  static async createExpense(
    userId: string,
    eventId: string,
    data: z.input<typeof expenseInputSchema>
  ) {
    await authorizeEventAccess(userId, eventId, 'BUDGET_MANAGE');
    const parsed = expenseInputSchema.parse(data);

    // Validate category belongs to this event
    const category = await db.budgetCategory.findFirst({
      where: { id: parsed.categoryId, eventId },
    });
    if (!category) {
      throw new Error('Selected budget category does not belong to this event');
    }

    // Deterministic tax calculation
    const { baseMinor, taxMinor, totalMinor } = calculateTaxAndTotal(
      parsed.baseAmountMinor,
      parsed.taxRateBps
    );

    const expense = await db.expense.create({
      data: {
        eventId,
        categoryId: parsed.categoryId,
        vendorId: parsed.vendorId || null,
        title: parsed.title,
        baseAmountMinor: baseMinor,
        taxAmountMinor: taxMinor,
        amountMinor: totalMinor,
        dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
        receiptUrl: parsed.receiptUrl || null,
        notes: parsed.notes || null,
        status: 'PENDING',
      },
      include: {
        category: true,
        vendor: true,
      },
    });

    await logActivity({
      eventId,
      userId,
      action: 'EXPENSE_CREATED',
      entityType: 'Expense',
      entityId: expense.id,
      details: {
        title: expense.title,
        amountMinor: Number(totalMinor),
        categoryName: category.name,
      },
    });

    return serializeBigInts(expense);
  }

  /**
   * Updates an existing expense, including category reassignment and amount adjustments.
   */
  static async updateExpense(
    userId: string,
    eventId: string,
    expenseId: string,
    data: Partial<z.input<typeof expenseInputSchema>> & { status?: string }
  ) {
    await authorizeEventAccess(userId, eventId, 'BUDGET_MANAGE');

    const existing = await db.expense.findFirst({
      where: { id: expenseId, eventId },
    });
    if (!existing) {
      throw new Error('Expense not found');
    }

    const updateData: Record<string, unknown> = {};

    if (data.categoryId && data.categoryId !== existing.categoryId) {
      const catCheck = await db.budgetCategory.findFirst({
        where: { id: data.categoryId, eventId },
      });
      if (!catCheck) {
        throw new Error('Target category does not belong to this event');
      }
      updateData.categoryId = data.categoryId;
    }

    if (data.title !== undefined) updateData.title = data.title;
    if (data.vendorId !== undefined) updateData.vendorId = data.vendorId || null;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.receiptUrl !== undefined) updateData.receiptUrl = data.receiptUrl || null;
    if (data.notes !== undefined) updateData.notes = data.notes || null;
    if (data.status !== undefined) updateData.status = data.status;

    if (data.baseAmountMinor !== undefined) {
      const taxBps = data.taxRateBps !== undefined ? data.taxRateBps : 0;
      const { baseMinor, taxMinor, totalMinor } = calculateTaxAndTotal(
        data.baseAmountMinor,
        taxBps
      );
      updateData.baseAmountMinor = baseMinor;
      updateData.taxAmountMinor = taxMinor;
      updateData.amountMinor = totalMinor;
    }

    const updated = await db.expense.update({
      where: { id: expenseId },
      data: updateData,
      include: { category: true, vendor: true, payments: true },
    });

    await logActivity({
      eventId,
      userId,
      action: 'EXPENSE_UPDATED',
      entityType: 'Expense',
      entityId: expenseId,
      details: updateData as Record<string, unknown>,
    });

    return serializeBigInts(updated);
  }

  /**
   * Deletes an expense and its associated payment logs.
   */
  static async deleteExpense(userId: string, eventId: string, expenseId: string) {
    await authorizeEventAccess(userId, eventId, 'BUDGET_MANAGE');

    const existing = await db.expense.findFirst({
      where: { id: expenseId, eventId },
    });
    if (!existing) {
      throw new Error('Expense not found');
    }

    await db.expense.delete({
      where: { id: expenseId },
    });

    await logActivity({
      eventId,
      userId,
      action: 'EXPENSE_DELETED',
      entityType: 'Expense',
      entityId: expenseId,
      details: { title: existing.title, amountMinor: Number(existing.amountMinor) },
    });

    return { success: true, message: 'Expense deleted successfully' };
  }

  /**
   * Records a payment (advance, installment, full settlement, or refund) in an atomic transaction.
   * Automatically updates parent Expense payment status.
   */
  static async recordPayment(
    userId: string,
    eventId: string,
    data: z.input<typeof paymentInputSchema>
  ) {
    await authorizeEventAccess(userId, eventId, 'BUDGET_MANAGE');
    const parsed = paymentInputSchema.parse(data);

    // Validate that expense belongs to this event
    const expense = await db.expense.findFirst({
      where: { id: parsed.expenseId, eventId },
      include: { payments: true },
    });

    if (!expense) {
      throw new Error('Expense not found on this event');
    }

    const amountMinor = BigInt(parsed.amountMinor);

    const result = await db.$transaction(async (tx) => {
      // 1. Create Payment record
      const payment = await tx.payment.create({
        data: {
          eventId,
          expenseId: parsed.expenseId,
          amountMinor,
          paymentMethod: parsed.paymentMethod,
          transactionRef: parsed.transactionRef || null,
          isRefund: parsed.isRefund,
          paidAt: new Date(parsed.paidAt),
          status: 'COMPLETED',
        },
      });

      // 2. Fetch all payments including newly created one to compute total settled
      const allPayments = await tx.payment.findMany({
        where: { expenseId: parsed.expenseId, status: 'COMPLETED' },
      });

      let netSettledMinor = BigInt(0);
      for (const p of allPayments) {
        if (p.isRefund) {
          netSettledMinor -= p.amountMinor;
        } else {
          netSettledMinor += p.amountMinor;
        }
      }

      // 3. Update expense status based on net settled
      let newExpenseStatus = 'PENDING';
      if (netSettledMinor >= expense.amountMinor) {
        newExpenseStatus = 'COMPLETED';
      } else if (netSettledMinor > BigInt(0)) {
        newExpenseStatus = 'PARTIAL';
      } else if (parsed.isRefund && netSettledMinor <= BigInt(0)) {
        newExpenseStatus = 'REFUNDED';
      }

      await tx.expense.update({
        where: { id: parsed.expenseId },
        data: { status: newExpenseStatus },
      });

      return payment;
    });

    await logActivity({
      eventId,
      userId,
      action: parsed.isRefund ? 'PAYMENT_REFUND_RECORDED' : 'PAYMENT_RECORDED',
      entityType: 'Payment',
      entityId: result.id,
      details: {
        expenseId: parsed.expenseId,
        amountMinor: parsed.amountMinor,
        isRefund: parsed.isRefund,
        paymentMethod: parsed.paymentMethod,
      },
    });

    return serializeBigInts(result);
  }

  /**
   * Compares vendor quotations across categories.
   */
  static async compareVendorQuotes(userId: string, eventId: string, categoryId?: string) {
    await authorizeEventAccess(userId, eventId, 'EVENT_VIEW');

    const whereClause: Record<string, unknown> = { eventId };
    if (categoryId) {
      whereClause.categoryId = categoryId;
    }

    const vendors = await db.vendor.findMany({
      where: whereClause,
      include: {
        category: true,
        quotes: {
          orderBy: { quoteAmountMinor: 'asc' },
        },
        bookings: true,
      },
      orderBy: { name: 'asc' },
    });

    return serializeBigInts(vendors);
  }

  /**
   * Generates a printable or downloadable CSV financial report.
   */
  static async generateFinancialReportCsv(userId: string, eventId: string): Promise<string> {
    const dashboard = await this.getFinancialDashboard(userId, eventId);

    const expenses = await db.expense.findMany({
      where: { eventId },
      include: { category: true, vendor: true, payments: true },
      orderBy: { createdAt: 'desc' },
    });

    const lines: string[] = [];
    lines.push('CELEBRA EVENT FINANCIAL REPORT');
    lines.push(`Generated At,${new Date().toISOString()}`);
    lines.push(`Total Budget,${formatMinorUnits(dashboard.totalBudgetMinor, dashboard.currency)}`);
    lines.push(`Total Spent,${formatMinorUnits(dashboard.totalSpentMinor, dashboard.currency)}`);
    lines.push(`Pending Payments,${formatMinorUnits(dashboard.totalPendingMinor, dashboard.currency)}`);
    lines.push(`Remaining Budget,${formatMinorUnits(dashboard.remainingBudgetMinor, dashboard.currency)}`);
    lines.push(`Contingency Reserve,${formatMinorUnits(dashboard.contingencyReserveMinor, dashboard.currency)}`);
    lines.push(`Budget Utilization,${dashboard.budgetUtilizationPercent}%`);
    lines.push('');
    lines.push('CATEGORY ALLOCATION BREAKDOWN');
    lines.push('Category,Allocated,Spent,Pending,Variance,Utilization Status');
    for (const c of dashboard.categories) {
      lines.push(
        `"${c.name}",${formatMinorUnits(c.allocatedMinor, dashboard.currency)},${formatMinorUnits(c.spentMinor, dashboard.currency)},${formatMinorUnits(c.pendingMinor, dashboard.currency)},${formatMinorUnits(c.varianceMinor, dashboard.currency)},${c.status}`
      );
    }
    lines.push('');
    lines.push('ITEMIZED EXPENSE LEDGER');
    lines.push('Expense Title,Category,Vendor,Base Amount,Tax Amount,Total Amount,Status,Due Date');
    for (const e of expenses) {
      const baseFormatted = formatMinorUnits(Number(e.baseAmountMinor), e.currency);
      const taxFormatted = formatMinorUnits(Number(e.taxAmountMinor), e.currency);
      const totalFormatted = formatMinorUnits(Number(e.amountMinor), e.currency);
      const dueDate = e.dueDate ? e.dueDate.toISOString().split('T')[0] : 'N/A';
      lines.push(
        `"${e.title}","${e.category.name}","${e.vendor?.name || 'Unassigned'}",${baseFormatted},${taxFormatted},${totalFormatted},${e.status},${dueDate}`
      );
    }

    return lines.join('\n');
  }

  /**
   * AI Financial Advisor: Deterministic guest-count cost simulation with advisory notes.
   */
  static async simulateGuestCountAdjustment(
    userId: string,
    eventId: string,
    newGuestCount: number
  ) {
    await authorizeEventAccess(userId, eventId, 'EVENT_VIEW');

    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { guestTarget: true, budgetMinor: true, currency: true },
    });

    if (!event) {
      throw new Error('Event not found');
    }

    const currentGuests = event.guestTarget;
    const currentBudgetMinor = event.budgetMinor;

    const simulation = simulateGuestCountImpact(
      currentGuests,
      newGuestCount,
      currentBudgetMinor,
      45 // Standard 45% catering/variable hospitality share
    );

    return {
      currentGuestCount: currentGuests,
      simulatedGuestCount: newGuestCount,
      currentBudgetMinor: Number(currentBudgetMinor),
      simulatedEstimatedTotalMinor: Number(simulation.newTotalEstimatedMinor),
      varianceMinor: Number(simulation.varianceMinor),
      perGuestAverageMinor: Number(simulation.perGuestAverageMinor),
      currency: event.currency,
      advisoryNote:
        simulation.varianceMinor < BigInt(0)
          ? `Decreasing guest count by ${currentGuests - newGuestCount} yields an estimated savings of ${formatMinorUnits(Math.abs(Number(simulation.varianceMinor)), event.currency)} across variable catering and place settings.`
          : `Increasing guest count by ${newGuestCount - currentGuests} requires an estimated budget expansion of ${formatMinorUnits(Number(simulation.varianceMinor), event.currency)} to maintain hospitality standards.`,
    };
  }
}
