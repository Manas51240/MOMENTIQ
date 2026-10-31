/**
 * @fileoverview Vendor card component rendering vendor details, ratings, quotes, and workflow buttons.
 * @module components/vendors/VendorCard
 */

import React from 'react';
import { StatusBadge, StatusVariant } from '@/components/ui/StatusBadge';
import { VendorItem } from './types';

export interface VendorCardProps {
  vendor: VendorItem;
  currency: string;
  onOpenAddQuote: (vendor: VendorItem) => void;
  onConfirmBooking: (vendor: VendorItem) => void;
  onUpdateStatus: (vendorId: string, nextStatus: string) => void;
}

export function formatMoney(minorUnits: number | string = 0, currency = 'INR'): string {
  return (Number(minorUnits) / 100).toLocaleString(currency === 'INR' ? 'en-IN' : undefined, {
    style: 'currency',
    currency,
  });
}

export function getWorkflowBadge(status: string): StatusVariant {
  switch (status) {
    case 'CONFIRMED':
    case 'COMPLETED':
      return 'SUCCESS';
    case 'QUOTATION_RECEIVED':
    case 'NEGOTIATING':
      return 'WARNING';
    case 'CONTACTED':
      return 'INFO';
    case 'SHORTLISTED':
      return 'PENDING';
    case 'REJECTED':
    case 'CANCELLED':
      return 'DANGER';
    default:
      return 'NEUTRAL';
  }
}

export const NEXT_WORKFLOW_STEP: Record<string, string> = {
  SHORTLISTED: 'CONTACTED',
  CONTACTED: 'QUOTATION_RECEIVED',
  QUOTATION_RECEIVED: 'NEGOTIATING',
  NEGOTIATING: 'CONFIRMED',
  CONFIRMED: 'COMPLETED',
};

export function VendorCard({
  vendor,
  currency,
  onOpenAddQuote,
  onConfirmBooking,
  onUpdateStatus,
}: VendorCardProps) {
  const nextStep = NEXT_WORKFLOW_STEP[vendor.bookingStatus];

  return (
    <div className="bg-white rounded-2xl border border-stone-300 shadow-sm p-6 flex flex-col justify-between hover:border-amber-400 transition-all space-y-4">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-stone-100 text-stone-800 border border-stone-200">
            {vendor.category?.name || 'General'}
          </span>
          <StatusBadge label={vendor.bookingStatus} variant={getWorkflowBadge(vendor.bookingStatus)} />
        </div>

        <div>
          <h2 className="text-xl font-bold text-stone-900">{vendor.name}</h2>
          <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded inline-block mt-1">
            {vendor.sourceTag === 'USER_ENTERED' ? 'User-Entered Record' : 'Illustrative Demo Data'}
          </span>
        </div>

        <div className="space-y-1 text-xs text-stone-600">
          {vendor.contactName && <p>👤 {vendor.contactName}</p>}
          {vendor.email && <p>✉️ {vendor.email}</p>}
          {vendor.phone && <p>📞 {vendor.phone}</p>}
          {vendor.location && <p>📍 {vendor.location}</p>}
        </div>

        <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-stone-500 block">Estimate</span>
            <span className="font-bold text-stone-900">{formatMoney(vendor.estimatedPriceMinor, currency)}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-stone-500 block">Rating</span>
            <span className="font-bold text-amber-600">★ {vendor.rating}/5</span>
          </div>
        </div>

        {/* Quotes Summary */}
        {vendor.quotes && vendor.quotes.length > 0 && (
          <div className="bg-[#fbf8f3] p-3 rounded-xl border border-stone-200 space-y-1 text-xs">
            <span className="font-bold text-stone-700 block">
              Quotes Received ({vendor.quotes.length})
            </span>
            {vendor.quotes.map((q) => (
              <div key={q.id} className="flex justify-between text-stone-600">
                <span className="truncate pr-2">{q.title}</span>
                <span className="font-bold text-stone-900 shrink-0">
                  {formatMoney(Number(q.basePriceMinor) + Number(q.additionalFeesMinor), currency)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Workflow Actions */}
      <div className="pt-3 border-t border-stone-200 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onOpenAddQuote(vendor)}
          className="text-xs font-semibold text-stone-700 hover:text-stone-900 underline"
        >
          + Add Quote
        </button>

        <div className="flex items-center gap-2">
          {vendor.bookingStatus === 'NEGOTIATING' && (
            <button
              type="button"
              onClick={() => onConfirmBooking(vendor)}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
            >
              Confirm Booking
            </button>
          )}

          {nextStep && vendor.bookingStatus !== 'NEGOTIATING' && (
            <button
              type="button"
              onClick={() => onUpdateStatus(vendor.id, nextStep)}
              className="px-3 py-1.5 rounded-lg bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold transition-colors"
            >
              Advance to {nextStep} &rarr;
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

