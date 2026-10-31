/**
 * @fileoverview Modal dialog for registering a new vendor profile.
 * @module components/vendors/AddVendorModal
 */

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { VendorCategoryItem } from './types';

export interface AddVendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  categories: VendorCategoryItem[] | undefined;
  vendorName: string;
  onChangeName: (val: string) => void;
  categoryId: string;
  onChangeCategory: (val: string) => void;
  contactName: string;
  onChangeContact: (val: string) => void;
  email: string;
  onChangeEmail: (val: string) => void;
  phone: string;
  onChangePhone: (val: string) => void;
  estimate: number;
  onChangeEstimate: (val: number) => void;
  rating: number;
  onChangeRating: (val: number) => void;
  isSubmitting: boolean;
  currency: string;
}

export function AddVendorModal({
  isOpen,
  onClose,
  onSubmit,
  categories,
  vendorName,
  onChangeName,
  categoryId,
  onChangeCategory,
  contactName,
  onChangeContact,
  email,
  onChangeEmail,
  phone,
  onChangePhone,
  estimate,
  onChangeEstimate,
  rating,
  onChangeRating,
  isSubmitting,
  currency,
}: AddVendorModalProps) {
  const currencySymbol = currency === 'INR' ? '₹' : (currency === 'USD' ? '$' : currency);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Register Vendor Profile"
      description="Records vendor contact details, services, and estimated price."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label htmlFor="vnd-name" className="block text-xs font-semibold text-stone-700 mb-1">
              Vendor Name *
            </label>
            <input
              id="vnd-name"
              type="text"
              required
              value={vendorName}
              onChange={(e) => onChangeName(e.target.value)}
              placeholder="e.g. Luminary Cinematography & Film"
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7]"
            />
          </div>

          <div>
            <label htmlFor="vnd-cat" className="block text-xs font-semibold text-stone-700 mb-1">
              Category *
            </label>
            <select
              id="vnd-cat"
              required
              value={categoryId}
              onChange={(e) => onChangeCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7]"
            >
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="vnd-contact" className="block text-xs font-semibold text-stone-700 mb-1">
              Contact Person
            </label>
            <input
              id="vnd-contact"
              type="text"
              value={contactName}
              onChange={(e) => onChangeContact(e.target.value)}
              placeholder="e.g. Sarah Jenkins"
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7]"
            />
          </div>

          <div>
            <label htmlFor="vnd-email" className="block text-xs font-semibold text-stone-700 mb-1">
              Email
            </label>
            <input
              id="vnd-email"
              type="email"
              value={email}
              onChange={(e) => onChangeEmail(e.target.value)}
              placeholder="sarah@luminary.com"
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7]"
            />
          </div>

          <div>
            <label htmlFor="vnd-phone" className="block text-xs font-semibold text-stone-700 mb-1">
              Phone Number
            </label>
            <input
              id="vnd-phone"
              type="tel"
              value={phone}
              onChange={(e) => onChangePhone(e.target.value)}
              placeholder="+91-98765-43210"
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7]"
            />
          </div>

          <div>
            <label htmlFor="vnd-est" className="block text-xs font-semibold text-stone-700 mb-1">
              Estimated Price ({currencySymbol})
            </label>
            <input
              id="vnd-est"
              type="number"
              min="0"
              step="500"
              value={estimate}
              onChange={(e) => onChangeEstimate(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7]"
            />
          </div>

          <div>
            <label htmlFor="vnd-rate" className="block text-xs font-semibold text-stone-700 mb-1">
              Rating (1 to 5)
            </label>
            <select
              id="vnd-rate"
              value={rating}
              onChange={(e) => onChangeRating(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7]"
            >
              <option value="5">★★★★★ (5/5)</option>
              <option value="4">★★★★☆ (4/5)</option>
              <option value="3">★★★☆☆ (3/5)</option>
            </select>
          </div>
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
            {isSubmitting ? 'Registering...' : 'Register Vendor'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

