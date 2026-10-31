/**
 * @fileoverview Category allocation and variance breakdown table.
 * @module components/budget/CategoryBreakdownTable
 */

import React from 'react';
import { BudgetCategoryItem } from './types';
import { formatMoney } from './BudgetSummaryCards';

export interface CategoryBreakdownTableProps {
  categories: BudgetCategoryItem[] | undefined;
  currency: string;
}

export function CategoryBreakdownTable({ categories, currency }: CategoryBreakdownTableProps) {
  return (
    <div className="bg-white rounded-2xl border border-stone-300 shadow-sm p-6">
      <h2 className="text-lg font-bold text-stone-900 mb-4">Category Allocations</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#fbf8f3] text-stone-700 text-xs uppercase font-bold border-b border-stone-200">
            <tr>
              <th scope="col" className="py-3 px-4">Category</th>
              <th scope="col" className="py-3 px-4">Allocated</th>
              <th scope="col" className="py-3 px-4">Committed</th>
              <th scope="col" className="py-3 px-4">Actual Paid</th>
              <th scope="col" className="py-3 px-4">Variance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {categories?.map((cat) => {
              const variance = Number(cat.allocatedMinor) - Number(cat.actualSpentMinor);
              return (
                <tr key={cat.id} className="hover:bg-stone-50/50">
                  <td className="py-3 px-4 font-semibold text-stone-900">{cat.name}</td>
                  <td className="py-3 px-4 text-stone-700">{formatMoney(cat.allocatedMinor, currency)}</td>
                  <td className="py-3 px-4 text-stone-700">{formatMoney(cat.committedMinor || 0, currency)}</td>
                  <td className="py-3 px-4 text-stone-700">{formatMoney(cat.actualSpentMinor, currency)}</td>
                  <td className="py-3 px-4 font-semibold">
                    <span className={variance >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                      {formatMoney(variance, currency)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

