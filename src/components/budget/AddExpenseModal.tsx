/**
 * @fileoverview Modal dialog for creating an expense record with deterministic integer tax computation.
 * @module components/budget/AddExpenseModal
 */

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { BudgetCategoryItem } from './types';

export interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  categories: BudgetCategoryItem[] | undefined;
  title: string;
  onChangeTitle: (val: string) => void;
  categoryId: string;
  onChangeCategoryId: (val: string) => void;
  baseAmount: number;
  onChangeBaseAmount: (val: number) => void;
  taxBasisPoints: number;
  onChangeTaxBasisPoints: (val: number) => void;
  notes: string;
  onChangeNotes: (val: string) => void;
  isSubmitting: boolean;
  currency: string;
}

export function AddExpenseModal({
  isOpen,
  onClose,
  onSubmit,
  categories,
  title,
  onChangeTitle,
  categoryId,
  onChangeCategoryId,
  baseAmount,
  onChangeBaseAmount,
  taxBasisPoints,
  onChangeTaxBasisPoints,
  notes,
  onChangeNotes,
  isSubmitting,
  currency,
}: AddExpenseModalProps) {
  const currencySymbol = currency === 'INR' ? '₹' : (currency === 'USD' ? '$' : currency);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Expense Record"
      description="Records expense with deterministic integer basis point tax computation."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="exp-title" className="block text-xs font-semibold text-stone-700 mb-1">
            Title / Vendor Description *
          </label>
          <input
            id="exp-title"
            type="text"
            required
            value={title}
            onChange={(e) => onChangeTitle(e.target.value)}
            placeholder="e.g. Floral Arch Installation"
            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7]"
          />
        </div>

        <div>
          <label htmlFor="exp-cat" className="block text-xs font-semibold text-stone-700 mb-1">
            Category *
          </label>
          <select
            id="exp-cat"
            required
            value={categoryId}
            onChange={(e) => onChangeCategoryId(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7]"
          >
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="exp-base" className="block text-xs font-semibold text-stone-700 mb-1">
              Base Amount ({currencySymbol}) *
            </label>
            <input
              id="exp-base"
              type="number"
              step="1"
              min="1"
              required
              value={baseAmount}
              onChange={(e) => onChangeBaseAmount(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7]"
            />
          </div>

          <div>
            <label htmlFor="exp-tax" className="block text-xs font-semibold text-stone-700 mb-1">
              Tax (Basis Points)
            </label>
            <input
              id="exp-tax"
              type="number"
              min="0"
              max="5000"
              value={taxBasisPoints}
              onChange={(e) => onChangeTaxBasisPoints(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7]"
            />
            <span className="text-[10px] text-stone-500">825 bps = 8.25% tax</span>
          </div>
        </div>

        <div>
          <label htmlFor="exp-notes" className="block text-xs font-semibold text-stone-700 mb-1">
            Internal Notes / Invoice #
          </label>
          <input
            id="exp-notes"
            type="text"
            value={notes}
            onChange={(e) => onChangeNotes(e.target.value)}
            placeholder="e.g. Invoice #2026-FL-08"
            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7]"
          />
        </div>

        <div className="pt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-bold rounded-lg bg-amber-800 text-white hover:bg-amber-900 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Add Expense'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

