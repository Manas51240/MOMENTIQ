'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/ui/Navbar';
import { SkipToContent } from '@/components/ui/SkipToContent';
import { EventNavTabs } from '@/components/ui/EventNavTabs';
import { Alert } from '@/components/ui/Alert';
import {
  VendorItem,
  VendorsData,
  VendorCard,
  AddVendorModal,
  AddQuoteModal,
} from '@/components/vendors';

export default function VendorsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<VendorsData | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [alertInfo, setAlertInfo] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New Vendor Modal
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [vendorName, setVendorName] = useState('');
  const [vendorCategoryId, setVendorCategoryId] = useState('');
  const [contactName, setContactName] = useState('');
  const [vendorEmail, setVendorEmail] = useState('');
  const [vendorPhone, setVendorPhone] = useState('');
  const [vendorEstimate, setVendorEstimate] = useState(25000);
  const [vendorRating, setVendorRating] = useState(5);
  const [submittingVendor, setSubmittingVendor] = useState(false);

  // Add Quote Modal
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [targetVendor, setTargetVendor] = useState<VendorItem | null>(null);
  const [quoteTitle, setQuoteTitle] = useState('Comprehensive Service Package');
  const [quoteBasePrice, setQuoteBasePrice] = useState(30000);
  const [quoteAdditionalFees, setQuoteAdditionalFees] = useState(2500);
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
      const estimatedPriceMinor = Math.round(Number(vendorEstimate) * 100);

      const res = await fetch(`/api/events/${id}/vendors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: vendorCategoryId,
          name: vendorName,
          contactName,
          email: vendorEmail || undefined,
          phone: vendorPhone || undefined,
          estimatedPriceMinor,
          rating: Number(vendorRating),
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
      const basePriceMinor = Math.round(Number(quoteBasePrice) * 100);
      const additionalFeesMinor = Math.round(Number(quoteAdditionalFees) * 100);

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

  const handleConfirmBooking = async (vendor: VendorItem) => {
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
        message: 'Booking confirmed! Contract synchronized and Expense created in Budget ledger.',
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

  const currency = data?.currency || 'INR';

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
            className="px-5 py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 focus:ring-4 focus:ring-amber-500/40"
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
          {data?.categories?.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-amber-800 text-white'
                  : 'bg-white text-stone-700 border border-stone-300 hover:bg-stone-50'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Vendor Cards Grid */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data?.vendors?.map((v) => (
            <VendorCard
              key={v.id}
              vendor={v}
              currency={currency}
              onOpenAddQuote={(vendor) => {
                setTargetVendor(vendor);
                setIsQuoteModalOpen(true);
              }}
              onConfirmBooking={handleConfirmBooking}
              onUpdateStatus={handleUpdateStatus}
            />
          ))}
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
      <AddVendorModal
        isOpen={isVendorModalOpen}
        onClose={() => setIsVendorModalOpen(false)}
        onSubmit={handleRegisterVendor}
        categories={data?.categories}
        vendorName={vendorName}
        onChangeName={setVendorName}
        categoryId={vendorCategoryId}
        onChangeCategory={setVendorCategoryId}
        contactName={contactName}
        onChangeContact={setContactName}
        email={vendorEmail}
        onChangeEmail={setVendorEmail}
        phone={vendorPhone}
        onChangePhone={setVendorPhone}
        estimate={vendorEstimate}
        onChangeEstimate={setVendorEstimate}
        rating={vendorRating}
        onChangeRating={setVendorRating}
        isSubmitting={submittingVendor}
        currency={currency}
      />

      {/* Add Quotation Modal */}
      <AddQuoteModal
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
        onSubmit={handleAddQuote}
        targetVendor={targetVendor}
        quoteTitle={quoteTitle}
        onChangeTitle={setQuoteTitle}
        basePrice={quoteBasePrice}
        onChangeBasePrice={setQuoteBasePrice}
        additionalFees={quoteAdditionalFees}
        onChangeAdditionalFees={setQuoteAdditionalFees}
        servicesIncluded={quoteServices}
        onChangeServicesIncluded={setQuoteServices}
        isSubmitting={submittingQuote}
        currency={currency}
      />
    </div>
  );
}
