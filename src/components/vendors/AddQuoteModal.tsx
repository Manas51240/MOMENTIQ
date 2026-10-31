/**
 * @fileoverview Modal dialog for submitting a quotation for a vendor.
 * @module components/vendors/AddQuoteModal
 */

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { VendorItem } from './types';

export interface AddQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  targetVendor: VendorItem | null;
  quoteTitle: string;
  onChangeTitle: (val: string) => void;
  basePrice: number;
  onChangeBasePrice: (val: number) => void;
  additionalFees: number;
  onChangeAdditionalFees: (val: number) => void;
  servicesIncluded: string;
  onChangeServicesIncluded: (val: string) => void;
  isSubmitting: boolean;
  currency: string;
}

export function AddQuoteModal({
  isOpen,
  onClose,
  onSubmit,
  targetVendor,
  quoteTitle,
  onChangeTitle,
  basePrice,
  onChangeBasePrice,
  additionalFees,
  onChangeAdditionalFees,
  servicesIncluded,
  onChangeServicesIncluded,
  isSubmitting,
  currency,
}: AddQuoteModalProps) {
  const currencySymbol = currency === 'INR' ? '₹' : (currency === 'USD' ? '$' : currency);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Vendor Quotation"
      description={targetVendor ? `Submit quote for: ${targetVendor.name}` : ''}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="q-title" className="block text-xs font-semibold text-stone-700 mb-1">
            Package Title *
          </label>
          <input
            id="q-title"
            type="text"
            required
            value={quoteTitle}
            onChange={(e) => onChangeTitle(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7]"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="q-base" className="block text-xs font-semibold text-stone-700 mb-1">
              Base Price ({currencySymbol}) *
            </label>
            <input
              id="q-base"
              type="number"
              min="0"
              required
              value={basePrice}
              onChange={(e) => onChangeBasePrice(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7]"
            />
          </div>

          <div>
            <label htmlFor="q-extra" className="block text-xs font-semibold text-stone-700 mb-1">
              Additional Fees ({currencySymbol})
            </label>
            <input
              id="q-extra"
              type="number"
              min="0"
              value={additionalFees}
              onChange={(e) => onChangeAdditionalFees(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7]"
            />
          </div>
        </div>

        <div>
          <label htmlFor="q-serv" className="block text-xs font-semibold text-stone-700 mb-1">
            Services Included
          </label>
          <textarea
            id="q-serv"
            rows={3}
            value={servicesIncluded}
            onChange={(e) => onChangeServicesIncluded(e.target.value)}
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
            {isSubmitting ? 'Submitting...' : 'Save Quotation'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

