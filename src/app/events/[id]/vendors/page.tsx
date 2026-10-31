'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/ui/Navbar';
import { SkipToContent } from '@/components/ui/SkipToContent';
import { EventNavTabs } from '@/components/ui/EventNavTabs';
import { StatusBadge, StatusVariant } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';

export default function VendorsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [alertInfo, setAlertInfo] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New Vendor Modal
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [vendorName, setVendorName] = useState('');
  const [vendorCategoryId, setVendorCategoryId] = useState('');
  const [contactName, setContactName] = useState('');
  const [vendorEmail, setVendorEmail] = useState('');
  const [vendorPhone, setVendorPhone] = useState('');
  const [vendorLocation, setVendorLocation] = useState('');
  const [vendorEstimateDollars, setVendorEstimateDollars] = useState(2500);
  const [vendorRating, setVendorRating] = useState(5);
  const [vendorNotes, setVendorNotes] = useState('');
  const [submittingVendor, setSubmittingVendor] = useState(false);

  // Add Quote Modal
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [targetVendor, setTargetVendor] = useState<any>(null);
  const [quoteTitle, setQuoteTitle] = useState('Comprehensive Service Package');
  const [quoteBaseDollars, setQuoteBaseDollars] = useState(3000);
  const [quoteAdditionalDollars, setQuoteAdditionalDollars] = useState(250);
  const [quoteServices, setQuoteServices] = useState('Full on-site staffing, setup, teardown');
  const [submittingQuote, setSubmittingQuote] = useState(false);

  const loadVendors = useCallback(async () => {
    try {
      const url = selectedCategory === 'ALL'
        ? `/api/events/${id}/vendors`
        : `/api/events/${id}/vendors?categoryId=${selectedCategory}`;

      const res = await fetch(url);
      const resData = await res.json();
      if (resData.success) {
        setData(resData);
        if (resData.categories && resData.categories.length > 0 && !vendorCategoryId) {
          setVendorCategoryId(resData.categories[0].id);
        }
      }
    } catch (err: unknown) {
      setAlertInfo({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to load vendors',
      });
    } finally {
      setLoading(false);
    }
  }, [id, selectedCategory, vendorCategoryId]);

  useEffect(() => {
    loadVendors();
  }, [loadVendors]);

  const handleRegisterVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingVendor(true);
    setAlertInfo(null);

    try {
      const estimatedPriceMinor = Math.round(Number(vendorEstimateDollars) * 100);

      const res = await fetch(`/api/events/${id}/vendors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: vendorCategoryId,
          name: vendorName,
          contactName,
          email: vendorEmail || undefined,
          phone: vendorPhone || undefined,
          location: vendorLocation,
          estimatedPriceMinor,
          rating: Number(vendorRating),
          notes: vendorNotes,
          sourceTag: 'USER_ENTERED',
        }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || 'Failed to register vendor');
      }

      setIsVendorModalOpen(false);
      setVendorName('');
      setAlertInfo({
        type: 'success',
        message: 'Vendor registered with honest ground truth label and added to procurement workflow.',
      });
      await loadVendors();
    } catch (err: unknown) {
      setAlertInfo({
        type: 'error',
        message: err instanceof Error ? err.message : 'Registration failed',
      });
    } finally {
      setSubmittingVendor(false);
    }
  };

  const handleUpdateStatus = async (vendorId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/events/${id}/vendors/${vendorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingStatus: newStatus }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || 'Illegal state machine transition');
      }

      setAlertInfo({
        type: 'success',
        message: `Vendor workflow advanced to ${newStatus}.`,
      });
      await loadVendors();
    } catch (err: unknown) {
      setAlertInfo({
        type: 'error',
        message: err instanceof Error ? err.message : 'Status update rejected',
      });
    }
  };

  const handleAddQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetVendor) return;
    setSubmittingQuote(true);
    setAlertInfo(null);

    try {
      const basePriceMinor = Math.round(Number(quoteBaseDollars) * 100);
      const additionalFeesMinor = Math.round(Number(quoteAdditionalDollars) * 100);

      const res = await fetch(`/api/events/${id}/vendors/${targetVendor.id}/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: quoteTitle,
          basePriceMinor,
          additionalFeesMinor,
          servicesIncluded: quoteServices,
        }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || 'Failed to add quotation');
      }

      setIsQuoteModalOpen(false);
      setTargetVendor(null);
      setAlertInfo({
        type: 'success',
        message: 'Quotation added to comparison matrix. Total minor units normalized.',
      });
      await loadVendors();
    } catch (err: unknown) {
      setAlertInfo({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error adding quote',
      });
    } finally {
      setSubmittingQuote(false);
    }
  };

  const handleConfirmBooking = async (vendor: any) => {
    if (!confirm(`Confirm booking for ${vendor.name}? This will synchronize with the Financial ledger by creating a corresponding Expense.`)) {
      return;
    }

    try {
      const totalCostMinor = Number(vendor.estimatedPriceMinor) || 100000;
      const res = await fetch(`/api/events/${id}/vendors/${vendor.id}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalCostMinor,
          advancePaidMinor: 0,
          notes: `Contract confirmed for ${vendor.name}`,
        }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || 'Failed to confirm booking');
      }

      setAlertInfo({
        type: 'success',
        message: `Booking confirmed! Contract synchronized and Expense created in Budget ledger.`,
      });
      await loadVendors();
    } catch (err: unknown) {
      setAlertInfo({
        type: 'error',
        message: err instanceof Error ? err.message : 'Booking confirmation failed',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#fdfbf7]">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const formatMoney = (minorUnits: number | string = 0) => {
    return (Number(minorUnits) / 100).toLocaleString(undefined, {
      style: 'currency',
      currency: 'USD',
    });
  };

  const getWorkflowBadge = (status: string): StatusVariant => {
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
  };

  const nextWorkflowStep: Record<string, string> = {
    SHORTLISTED: 'CONTACTED',
    CONTACTED: 'QUOTATION_RECEIVED',
    QUOTATION_RECEIVED: 'NEGOTIATING',
    NEGOTIATING: 'CONFIRMED',
    CONFIRMED: 'COMPLETED',
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fdfbf7] text-stone-900">
      <SkipToContent />
      <Navbar />

      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-stone-500 mb-1">
              <Link href={`/events/${id}`} className="hover:underline">
                Celebration
              </Link>
              <span>/</span>
              <span>Vendor Procurement Matrix</span>
            </div>
            <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight">
              Vendors & Quotations Matrix
            </h1>
            <p className="text-sm text-stone-600 mt-1">
              12 standard categories, 6-state workflow machine, and transparent quotation comparison
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsVendorModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 focus:ring-4 focus:ring-amber-500/40"
          >
            <span>+</span>
            <span>Register Vendor</span>
          </button>
        </div>

        <EventNavTabs eventId={id} />

        {alertInfo && (
          <div className="mt-6">
            <Alert
              type={alertInfo.type}
              message={alertInfo.message}
              onClose={() => setAlertInfo(null)}
            />
          </div>
        )}

        {/* Category Filter Pills */}
        <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === 'ALL'
                ? 'bg-stone-900 text-white'
                : 'bg-white text-stone-700 border border-stone-300 hover:bg-stone-50'
            }`}
          >
            All Categories ({data?.vendors?.length || 0})
          </button>
          {data?.categories?.map((cat: any) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-amber-600 text-white'
                  : 'bg-white text-stone-700 border border-stone-300 hover:bg-stone-50'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Vendor Cards Grid */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data?.vendors?.map((v: any) => {
            const nextStep = nextWorkflowStep[v.bookingStatus];

            return (
              <div
                key={v.id}
                className="bg-white rounded-2xl border border-stone-300 shadow-sm p-6 flex flex-col justify-between hover:border-amber-400 transition-all space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-stone-100 text-stone-800 border border-stone-200">
                      {v.category?.name}
                    </span>
                    <StatusBadge label={v.bookingStatus} variant={getWorkflowBadge(v.bookingStatus)} />
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-stone-900">{v.name}</h2>
                    <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded inline-block mt-1">
                      {v.sourceTag === 'USER_ENTERED' ? 'User-Entered Record' : 'Illustrative Demo Data'}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-stone-600">
                    {v.contactName && <p>👤 {v.contactName}</p>}
                    {v.email && <p>✉️ {v.email}</p>}
                    {v.phone && <p>📞 {v.phone}</p>}
                    {v.location && <p>📍 {v.location}</p>}
                  </div>

                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-stone-500 block">Estimate</span>
                      <span className="font-bold text-stone-900">{formatMoney(v.estimatedPriceMinor)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-stone-500 block">Rating</span>
                      <span className="font-bold text-amber-600">★ {v.rating}/5</span>
                    </div>
                  </div>

                  {/* Quotes Summary */}
                  {v.quotes && v.quotes.length > 0 && (
                    <div className="bg-[#fbf8f3] p-3 rounded-xl border border-stone-200 space-y-1 text-xs">
                      <span className="font-bold text-stone-700 block">
                        Quotes Received ({v.quotes.length})
                      </span>
                      {v.quotes.map((q: any) => (
                        <div key={q.id} className="flex justify-between text-stone-600">
                          <span className="truncate pr-2">{q.title}</span>
                          <span className="font-bold text-stone-900 shrink-0">
                            {formatMoney(Number(q.basePriceMinor) + Number(q.additionalFeesMinor))}
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
                    onClick={() => {
                      setTargetVendor(v);
                      setIsQuoteModalOpen(true);
                    }}
                    className="text-xs font-semibold text-stone-700 hover:text-stone-900 underline"
                  >
                    + Add Quote
                  </button>

                  <div className="flex items-center gap-2">
                    {v.bookingStatus === 'NEGOTIATING' && (
                      <button
                        type="button"
                        onClick={() => handleConfirmBooking(v)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
                      >
                        Confirm Booking
                      </button>
                    )}

                    {nextStep && v.bookingStatus !== 'NEGOTIATING' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(v.id, nextStep)}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors"
                      >
                        Advance to {nextStep} &rarr;
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {data?.vendors?.length === 0 && (
          <div className="mt-12 p-12 text-center rounded-2xl border-2 border-dashed border-stone-300 bg-white space-y-3">
            <div className="text-3xl">🤝</div>
            <h3 className="text-base font-bold text-stone-900">No vendors registered in this category</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Add genuine vendor quotes and proposals to evaluate pricing and contract terms.
            </p>
          </div>
        )}
      </main>

      {/* Register Vendor Modal */}
      <Modal
        isOpen={isVendorModalOpen}
        onClose={() => setIsVendorModalOpen(false)}
        title="Register Vendor Profile"
        description="Records vendor contact details, services, and estimated price."
      >
        <form onSubmit={handleRegisterVendor} className="space-y-4">
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
                onChange={(e) => setVendorName(e.target.value)}
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
                value={vendorCategoryId}
                onChange={(e) => setVendorCategoryId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7]"
              >
                {data?.categories?.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
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
                onChange={(e) => setContactName(e.target.value)}
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
                value={vendorEmail}
                onChange={(e) => setVendorEmail(e.target.value)}
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
                value={vendorPhone}
                onChange={(e) => setVendorPhone(e.target.value)}
                placeholder="+1-555-0144"
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7]"
              />
            </div>

            <div>
              <label htmlFor="vnd-est" className="block text-xs font-semibold text-stone-700 mb-1">
                Estimated Price ($)
              </label>
              <input
                id="vnd-est"
                type="number"
                min="0"
                step="50"
                value={vendorEstimateDollars}
                onChange={(e) => setVendorEstimateDollars(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7]"
              />
            </div>

            <div>
              <label htmlFor="vnd-rate" className="block text-xs font-semibold text-stone-700 mb-1">
                Rating (1 to 5)
              </label>
              <select
                id="vnd-rate"
                value={vendorRating}
                onChange={(e) => setVendorRating(Number(e.target.value))}
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
              onClick={() => setIsVendorModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingVendor}
              className="px-5 py-2 text-xs font-bold rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {submittingVendor ? 'Registering...' : 'Register Vendor'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Quotation Modal */}
      <Modal
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
        title="Add Vendor Quotation"
        description={targetVendor ? `Submit quote for: ${targetVendor.name}` : ''}
      >
        <form onSubmit={handleAddQuote} className="space-y-4">
          <div>
            <label htmlFor="q-title" className="block text-xs font-semibold text-stone-700 mb-1">
              Package Title *
            </label>
            <input
              id="q-title"
              type="text"
              required
              value={quoteTitle}
              onChange={(e) => setQuoteTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="q-base" className="block text-xs font-semibold text-stone-700 mb-1">
                Base Price ($) *
              </label>
              <input
                id="q-base"
                type="number"
                min="0"
                required
                value={quoteBaseDollars}
                onChange={(e) => setQuoteBaseDollars(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7]"
              />
            </div>

            <div>
              <label htmlFor="q-extra" className="block text-xs font-semibold text-stone-700 mb-1">
                Additional Fees ($)
              </label>
              <input
                id="q-extra"
                type="number"
                min="0"
                value={quoteAdditionalDollars}
                onChange={(e) => setQuoteAdditionalDollars(Number(e.target.value))}
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
              value={quoteServices}
              onChange={(e) => setQuoteServices(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7]"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsQuoteModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingQuote}
              className="px-5 py-2 text-xs font-bold rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {submittingQuote ? 'Submitting...' : 'Save Quotation'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
