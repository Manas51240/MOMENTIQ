/**
 * @fileoverview Modal dialog for recording payments or refund adjustments on expenses.
 * @module components/budget/RecordPaymentModal
 */

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { ExpenseItem } from './types';

export interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  selectedExpense: ExpenseItem | null;
  isRefund: boolean;
  onChangeIsRefund: (val: boolean) => void;
  amount: number;
  onChangeAmount: (val: number) => void;
  paymentMethod: string;
  onChangePaymentMethod: (val: string) => void;
  isSubmitting: boolean;
  currency: string;
}

export function RecordPaymentModal({
  isOpen,
  onClose,
  onSubmit,
  selectedExpense,
  isRefund,
  onChangeIsRefund,
  amount,
  onChangeAmount,
  paymentMethod,
  onChangePaymentMethod,
  isSubmitting,
  currency,
}: RecordPaymentModalProps) {
  const currencySymbol = currency === 'INR' ? '₹' : (currency === 'USD' ? '$' : currency);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Payment Transaction"
      description={selectedExpense ? `Expense: ${selectedExpense.title}` : ''}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="flex items-center gap-4 p-3 bg-stone-100 rounded-lg text-xs">
          <label className="flex items-center gap-2 cursor-pointer font-semibold">
            <input
              type="radio"
              name="txType"
              checked={!isRefund}
              onChange={() => onChangeIsRefund(false)}
            />
            <span>Payment / Advance</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer font-semibold text-rose-700">
            <input
              type="radio"
              name="txType"
              checked={isRefund}
              onChange={() => onChangeIsRefund(true)}
            />
            <span>Refund Adjustment</span>
          </label>
        </div>

        <div>
          <label htmlFor="pay-amt" className="block text-xs font-semibold text-stone-700 mb-1">
            Amount ({currencySymbol}) *
          </label>
          <input
            id="pay-amt"
            type="number"
            step="1"
            min="1"
            required
            value={amount}
            onChange={(e) => onChangeAmount(Number(e.target.value))}
            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7]"
          />
        </div>

        <div>
          <label htmlFor="pay-method" className="block text-xs font-semibold text-stone-700 mb-1">
            Payment Method *
          </label>
          <select
            id="pay-method"
            value={paymentMethod}
            onChange={(e) => onChangePaymentMethod(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7]"
          >
            <option value="BANK_TRANSFER">Bank Wire / UPI / NetBanking</option>
            <option value="CREDIT_CARD">Credit / Debit Card</option>
            <option value="CHECK">Certified Cheque</option>
            <option value="CASH">Cash / Escrow</option>
          </select>
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
            {isSubmitting ? 'Processing...' : 'Record Transaction'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

