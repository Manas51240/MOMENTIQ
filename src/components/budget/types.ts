/**
 * @fileoverview Type definitions for the Budget & Financial Ledger domain.
 * Enforces zero floating-point drift with 64-bit integer minor currency units.
 * @module components/budget/types
 */

export interface BudgetCategoryItem {
  id: string;
  name: string;
  allocatedMinor: number | string;
  committedMinor?: number | string;
  actualSpentMinor: number | string;
}

export interface ExpenseItem {
  id: string;
  title: string;
  baseAmountMinor: number | string;
  taxAmountMinor: number | string;
  paidAmountMinor: number | string;
  taxBasisPoints: number;
  paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID' | 'CANCELLED';
  notes?: string;
  category?: {
    id: string;
    name: string;
  };
}

export interface BudgetMetrics {
  totalBudgetMinor: number | string;
  totalAllocatedMinor: number | string;
  totalActualPaidMinor: number | string;
  totalPendingMinor: number | string;
  remainingContingencyMinor: number | string;
  utilizationPercentage: number;
  alerts?: Array<{
    type: string;
    message: string;
  }>;
}

export interface GuestSimulationResult {
  baselineGuestCount: number;
  simulatedTotalMinor: number | string;
  varianceMinor: number | string;
}

export interface BudgetData {
  success: boolean;
  budget: {
    currency: string;
    totalBudgetMinor: number | string;
    contingencyReserveMinor: number | string;
  };
  metrics: BudgetMetrics;
  categories: BudgetCategoryItem[];
  expenses: ExpenseItem[];
}

