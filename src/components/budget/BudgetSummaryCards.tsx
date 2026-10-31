/**
 * @fileoverview KPI summary cards for the financial ledger.
 * Shows authoritative total budget, allocated categories, actual paid, and reserves.
 * @module components/budget/BudgetSummaryCards
 */

import React from 'react';
import { BudgetMetrics } from './types';

export interface BudgetSummaryCardsProps {
  metrics: BudgetMetrics;
  currency: string;
}

export function formatMoney(minorUnits: number | string = 0, currency = 'INR'): string {
  return (Number(minorUnits) / 100).toLocaleString(currency === 'INR' ? 'en-IN' : undefined, {
    style: 'currency',
    currency,
  });
}

export function BudgetSummaryCards({ metrics, currency }: BudgetSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <div className="bg-white p-5 rounded-2xl border border-stone-300 shadow-sm">
        <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
          Total Budget
        </span>
        <span className="text-xl font-black text-stone-900 block mt-1">
          {formatMoney(metrics.totalBudgetMinor, currency)}
        </span>
        <span className="text-[11px] text-stone-500 block mt-0.5">Authoritative base</span>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-stone-300 shadow-sm">
        <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
          Allocated
        </span>
        <span className="text-xl font-black text-amber-700 block mt-1">
          {formatMoney(metrics.totalAllocatedMinor, currency)}
        </span>
        <span className="text-[11px] text-stone-500 block mt-0.5">Across planned categories</span>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-stone-300 shadow-sm">
        <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
          Actual Paid
        </span>
        <span className="text-xl font-black text-emerald-700 block mt-1">
          {formatMoney(metrics.totalActualPaidMinor, currency)}
        </span>
        <span className="text-[11px] text-stone-500 block mt-0.5">Settled transactions</span>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-stone-300 shadow-sm">
        <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
          Pending Balance
        </span>
        <span className="text-xl font-black text-indigo-700 block mt-1">
          {formatMoney(metrics.totalPendingMinor, currency)}
        </span>
        <span className="text-[11px] text-stone-500 block mt-0.5">Committed unpaid</span>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-stone-300 shadow-sm">
        <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
          Contingency Reserve
        </span>
        <span className="text-xl font-black text-stone-900 block mt-1">
          {formatMoney(metrics.remainingContingencyMinor, currency)}
        </span>
        <span className="text-[11px] text-emerald-800 font-semibold block mt-0.5">
          {metrics.utilizationPercentage}% utilized
        </span>
      </div>
    </div>
  );
}

