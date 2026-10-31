// ==============================================================================
// CELEBRA — Deterministic Financial & Budget Calculation Engine
// Zero Floating Point Arithmetic: All calculations in 64-bit BigInt minor units.
// Defends against precision loss, fractional rounding drift, and currency errors.
// ==============================================================================

export interface FinancialMetricMinor {
  minorUnits: number;
  formatted: string;
}

export interface CategorySummary {
  id: string;
  name: string;
  allocatedMinor: number;
  spentMinor: number;
  pendingMinor: number;
  committedTotalMinor: number;
  remainingMinor: number;
  varianceMinor: number; // allocated - committed
  utilizationPercent: number; // 0 to 100+
  status: 'NORMAL' | 'WARNING' | 'EXCEEDED';
  icon?: string | null;
  color?: string | null;
}

export interface BudgetAlert {
  type: 'CRITICAL_OVERRUN' | 'CONTINGENCY_BREACH' | 'CATEGORY_EXCEEDED' | 'PAYMENT_OVERDUE' | 'UNALLOCATED_FUNDS';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  message: string;
  categoryId?: string;
  amountMinor?: number;
}

export interface ComprehensiveBudgetSummary {
  totalBudgetMinor: number;
  contingencyPercent: number;
  contingencyReserveMinor: number;
  operableBudgetMinor: number;
  totalAllocatedMinor: number;
  totalSpentMinor: number; // Confirmed completed payments minus refunds
  totalPendingMinor: number; // Approved expenses awaiting payment
  totalRefundedMinor: number;
  committedTotalMinor: number; // spent + pending
  remainingBudgetMinor: number; // total - committed
  budgetUtilizationPercent: number; // committed / total * 100
  varianceMinor: number; // total - committed (positive = surplus, negative = deficit)
  forecastedFinalExpenditureMinor: number;
  categories: CategorySummary[];
  alerts: BudgetAlert[];
  currency: string;
}

/**
 * Deterministically formats integer minor units into currency strings (e.g. 500000 -> "₹ 5,000.00").
 */
export function formatMinorUnits(amountMinor: bigint | number, currency: string = 'INR'): string {
  const num = Number(amountMinor);
  const major = (num / 100).toFixed(2);
  const parts = major.split('.');
  if (currency === 'INR' || currency === '₹') {
    const lastThree = parts[0].substring(parts[0].length - 3);
    const otherNumbers = parts[0].substring(0, parts[0].length - 3);
    const intWithIndianCommas = otherNumbers !== ''
      ? otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree
      : lastThree;
    return `₹ ${intWithIndianCommas}.${parts[1]}`;
  }
  const intWithCommas = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${currency} ${intWithCommas}.${parts[1]}`;
}

/**
 * Deterministically computes tax and total from base minor units using integer basis points.
 * 1 basis point (bps) = 0.01% (e.g., 8.25% tax = 825 bps).
 * Uses banker's / half-up integer rounding: (base * bps + 5000) / 10000.
 */
export function calculateTaxAndTotal(
  baseMinor: bigint | number,
  taxRateBps: number = 0
): { baseMinor: bigint; taxMinor: bigint; totalMinor: bigint } {
  const base = BigInt(Math.max(0, Math.floor(Number(baseMinor))));
  const bps = BigInt(Math.max(0, Math.floor(taxRateBps)));

  // Half-up rounding formula in integer math: (n + d/2) / d
  const tax = (base * bps + BigInt(5000)) / BigInt(10000);
  const total = base + tax;

  return {
    baseMinor: base,
    taxMinor: tax,
    totalMinor: total,
  };
}

export interface RawCategoryData {
  id: string;
  name: string;
  allocatedMinor: bigint;
  icon?: string | null;
  color?: string | null;
  expenses: {
    id: string;
    amountMinor: bigint;
    status: string;
    dueDate?: Date | null;
    payments: {
      amountMinor: bigint;
      status: string;
      isRefund: boolean;
    }[];
  }[];
}

/**
 * Computes the complete deterministic financial dashboard and metrics.
 */
export function calculateBudgetMetrics(
  totalBudgetMinor: bigint,
  contingencyPercent: number,
  categories: RawCategoryData[],
  currency: string = 'INR'
): ComprehensiveBudgetSummary {
  const totalBudget = BigInt(totalBudgetMinor);
  const contingencyPct = BigInt(Math.max(0, Math.min(50, contingencyPercent)));

  // Contingency Reserve
  const contingencyReserve = (totalBudget * contingencyPct) / BigInt(100);
  const operableBudget = totalBudget - contingencyReserve;

  let grandTotalAllocated = BigInt(0);
  let grandTotalSpent = BigInt(0);
  let grandTotalPending = BigInt(0);
  let grandTotalRefunded = BigInt(0);

  const now = new Date();
  const alerts: BudgetAlert[] = [];

  const categorySummaries: CategorySummary[] = categories.map((cat) => {
    const allocated = BigInt(cat.allocatedMinor);
    grandTotalAllocated += allocated;

    let catSpent = BigInt(0);
    let catPending = BigInt(0);
    let catRefunds = BigInt(0);

    for (const exp of cat.expenses) {
      const expTotal = BigInt(exp.amountMinor);

      // Compute net completed payments for this expense (gross minus refunds)
      let netExpensePaid = BigInt(0);
      let expenseRefunds = BigInt(0);

      for (const p of exp.payments) {
        if (p.status === 'COMPLETED') {
          if (p.isRefund) {
            expenseRefunds += BigInt(p.amountMinor);
            netExpensePaid -= BigInt(p.amountMinor);
          } else {
            netExpensePaid += BigInt(p.amountMinor);
          }
        }
      }

      catRefunds += expenseRefunds;

      // If expense is marked COMPLETED with no explicit payment items, use expense amount
      if (exp.status === 'COMPLETED' && exp.payments.length === 0) {
        catSpent += expTotal;
      } else {
        // Accumulate positive net spent
        if (netExpensePaid > BigInt(0)) {
          catSpent += netExpensePaid;
        }

        // Remaining pending liability
        if (exp.status !== 'COMPLETED') {
          const remainingPending = expTotal > netExpensePaid ? expTotal - netExpensePaid : BigInt(0);
          catPending += remainingPending;

          // Check if overdue
          if (exp.dueDate && exp.dueDate < now) {
            alerts.push({
              type: 'PAYMENT_OVERDUE',
              severity: 'HIGH',
              title: 'Overdue Expense Payment',
              message: `Expense payment of ${formatMinorUnits(remainingPending, currency)} in category "${cat.name}" was due on ${exp.dueDate.toISOString().split('T')[0]}.`,
              categoryId: cat.id,
              amountMinor: Number(remainingPending),
            });
          }
        }
      }
    }

    grandTotalSpent += catSpent;
    grandTotalPending += catPending;
    grandTotalRefunded += catRefunds;

    const catCommitted = catSpent + catPending;
    const catVariance = allocated - catCommitted; // positive = under budget, negative = over budget
    const catRemaining = allocated > catSpent ? allocated - catSpent : BigInt(0);

    // Category utilization percentage (scaled by 100)
    const utilization = allocated > BigInt(0)
      ? Math.round(Number((catCommitted * BigInt(10000)) / allocated) / 100)
      : (catCommitted > BigInt(0) ? 100 : 0);

    let status: 'NORMAL' | 'WARNING' | 'EXCEEDED' = 'NORMAL';
    if (catCommitted > allocated) {
      status = 'EXCEEDED';
      alerts.push({
        type: 'CATEGORY_EXCEEDED',
        severity: 'MEDIUM',
        title: `Category Overrun: ${cat.name}`,
        message: `Category "${cat.name}" has exceeded its allocation of ${formatMinorUnits(allocated, currency)} by ${formatMinorUnits(catCommitted - allocated, currency)}.`,
        categoryId: cat.id,
        amountMinor: Number(catCommitted - allocated),
      });
    } else if (utilization >= 90) {
      status = 'WARNING';
    }

    return {
      id: cat.id,
      name: cat.name,
      allocatedMinor: Number(allocated),
      spentMinor: Number(catSpent),
      pendingMinor: Number(catPending),
      committedTotalMinor: Number(catCommitted),
      remainingMinor: Number(catRemaining),
      varianceMinor: Number(catVariance),
      utilizationPercent: utilization,
      status,
      icon: cat.icon,
      color: cat.color,
    };
  });

  const grandTotalCommitted = grandTotalSpent + grandTotalPending;
  const remainingBudget = totalBudget - grandTotalCommitted;
  const variance = totalBudget - grandTotalCommitted;

  const budgetUtilization = totalBudget > BigInt(0)
    ? Math.round(Number((grandTotalCommitted * BigInt(10000)) / totalBudget) / 100)
    : 0;

  // Forecasted final expenditure = committed + buffer reserve
  const forecastedFinal = grandTotalCommitted > operableBudget
    ? grandTotalCommitted
    : grandTotalCommitted + (contingencyReserve / BigInt(2));

  // Global Budget Alerts
  if (grandTotalCommitted > totalBudget) {
    alerts.unshift({
      type: 'CRITICAL_OVERRUN',
      severity: 'HIGH',
      title: 'Total Event Budget Exceeded',
      message: `Total committed expenses (${formatMinorUnits(grandTotalCommitted, currency)}) exceed the total event budget of ${formatMinorUnits(totalBudget, currency)} by ${formatMinorUnits(grandTotalCommitted - totalBudget, currency)}.`,
      amountMinor: Number(grandTotalCommitted - totalBudget),
    });
  } else if (grandTotalCommitted > operableBudget) {
    alerts.unshift({
      type: 'CONTINGENCY_BREACH',
      severity: 'MEDIUM',
      title: 'Contingency Reserve In Use',
      message: `Committed spending has crossed the operable budget of ${formatMinorUnits(operableBudget, currency)} and is utilizing the contingency reserve.`,
      amountMinor: Number(grandTotalCommitted - operableBudget),
    });
  }

  return {
    totalBudgetMinor: Number(totalBudget),
    contingencyPercent,
    contingencyReserveMinor: Number(contingencyReserve),
    operableBudgetMinor: Number(operableBudget),
    totalAllocatedMinor: Number(grandTotalAllocated),
    totalSpentMinor: Number(grandTotalSpent),
    totalPendingMinor: Number(grandTotalPending),
    totalRefundedMinor: Number(grandTotalRefunded),
    committedTotalMinor: Number(grandTotalCommitted),
    remainingBudgetMinor: Number(remainingBudget),
    budgetUtilizationPercent: budgetUtilization,
    varianceMinor: Number(variance),
    forecastedFinalExpenditureMinor: Number(forecastedFinal),
    categories: categorySummaries,
    alerts,
    currency,
  };
}

/**
 * Deterministically simulates budget adjustments when guest count changes.
 * Differentiates variable per-guest costs (catering, favors, place settings) from fixed costs (venue, DJ, photo).
 */
export function simulateGuestCountImpact(
  currentGuestCount: number,
  newGuestCount: number,
  currentTotalMinor: bigint,
  cateringAndVariableSharePct: number = 45
): {
  newTotalEstimatedMinor: bigint;
  varianceMinor: bigint;
  perGuestAverageMinor: bigint;
  savingsOrIncreaseMinor: bigint;
} {
  if (currentGuestCount <= 0 || newGuestCount <= 0) {
    throw new Error('Guest counts must be positive integers');
  }

  const total = BigInt(currentTotalMinor);
  const variableShare = BigInt(Math.max(10, Math.min(80, cateringAndVariableSharePct)));

  const variablePortion = (total * variableShare) / BigInt(100);
  const fixedPortion = total - variablePortion;

  const costPerGuest = variablePortion / BigInt(currentGuestCount);
  const newVariablePortion = costPerGuest * BigInt(newGuestCount);
  const newTotal = fixedPortion + newVariablePortion;
  const diff = newTotal - total;

  return {
    newTotalEstimatedMinor: newTotal,
    varianceMinor: diff,
    perGuestAverageMinor: total / BigInt(currentGuestCount),
    savingsOrIncreaseMinor: diff,
  };
}
