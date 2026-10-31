/**
 * @fileoverview Expense listing table with deterministic payment tracking.
 * @module components/budget/ExpenseTable
 */

import React from 'react';
import { StatusBadge, StatusVariant } from '@/components/ui/StatusBadge';
import { ExpenseItem } from './types';
import { formatMoney } from './BudgetSummaryCards';

export interface ExpenseTableProps {
  expenses: ExpenseItem[] | undefined;
  currency: string;
  onOpenAddModal: () => void;
  onSelectRecordPayment: (exp: ExpenseItem) => void;
}

export function getExpenseStatusVariant(status: string): StatusVariant {
  switch (status) {
    case 'PAID':
      return 'SUCCESS';
    case 'PARTIAL':
      return 'WARNING';
    case 'PENDING':
      return 'PENDING';
    case 'CANCELLED':
      return 'DANGER';
    default:
      return 'NEUTRAL';
  }
}

export function ExpenseTable({
  expenses,
  currency,
  onOpenAddModal,
  onSelectRecordPayment,
}: ExpenseTableProps) {
  return (
    <div className="bg-white rounded-2xl border border-stone-300 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-stone-900">Expenses & Invoices</h2>
        <button
          type="button"
          onClick={onOpenAddModal}
          className="text-xs font-bold text-amber-700 hover:text-amber-800"
        >
          + Add Item
        </button>
      </div>

      {!expenses || expenses.length === 0 ? (
        <p className="text-sm text-stone-500 py-6 text-center">No expenses recorded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#fbf8f3] text-stone-700 text-xs uppercase font-bold border-b border-stone-200">
              <tr>
                <th scope="col" className="py-3 px-4">Expense Title</th>
                <th scope="col" className="py-3 px-4">Category</th>
                <th scope="col" className="py-3 px-4">Total Amount</th>
                <th scope="col" className="py-3 px-4">Paid to Date</th>
                <th scope="col" className="py-3 px-4">Status</th>
                <th scope="col" className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {expenses.map((exp) => {
                const totalMinor = Number(exp.baseAmountMinor) + Number(exp.taxAmountMinor);
                const paidMinor = Number(exp.paidAmountMinor);
                return (
                  <tr key={exp.id} className="hover:bg-stone-50/50">
                    <td className="py-3 px-4 font-semibold text-stone-900">{exp.title}</td>
                    <td className="py-3 px-4 text-xs text-stone-600">{exp.category?.name || 'General'}</td>
                    <td className="py-3 px-4 font-mono font-medium">{formatMoney(totalMinor, currency)}</td>
                    <td className="py-3 px-4 font-mono text-emerald-700 font-medium">
                      {formatMoney(paidMinor, currency)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge label={exp.paymentStatus} variant={getExpenseStatusVariant(exp.paymentStatus)} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onSelectRecordPayment(exp)}
                        className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold transition-colors"
                      >
                        Record Payment
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

