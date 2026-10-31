'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/ui/Navbar';
import { SkipToContent } from '@/components/ui/SkipToContent';
import { EventNavTabs } from '@/components/ui/EventNavTabs';
import { StatusBadge, StatusVariant } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';

export default function BudgetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [alertInfo, setAlertInfo] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Expense Modal State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseCategoryId, setExpenseCategoryId] = useState('');
  const [expenseBaseDollars, setExpenseBaseDollars] = useState(1500);
  const [taxBasisPoints, setTaxBasisPoints] = useState(825); // 8.25%
  const [expenseNotes, setExpenseNotes] = useState('');
  const [submittingExpense, setSubmittingExpense] = useState(false);

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [paymentAmountDollars, setPaymentAmountDollars] = useState(500);
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [isRefund, setIsRefund] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Guest Simulation State
  const [newGuestCount, setNewGuestCount] = useState<number>(120);
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [simulating, setSimulating] = useState(false);

  const loadBudgetData = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${id}/budgets`);
      const resData = await res.json();
      if (resData.success) {
        setData(resData);
        if (resData.categories && resData.categories.length > 0 && !expenseCategoryId) {
          setExpenseCategoryId(resData.categories[0].id);
        }
      }
    } catch (err: unknown) {
      setAlertInfo({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to load financial records',
      });
    } finally {
      setLoading(false);
    }
  }, [id, expenseCategoryId]);

  useEffect(() => {
    loadBudgetData();
  }, [loadBudgetData]);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingExpense(true);
    setAlertInfo(null);

    try {
      const baseAmountMinor = Math.round(Number(expenseBaseDollars) * 100);

      const res = await fetch(`/api/events/${id}/budgets/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: expenseCategoryId,
          title: expenseTitle,
          baseAmountMinor,
          taxBasisPoints: Number(taxBasisPoints),
          notes: expenseNotes,
        }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || 'Failed to create expense');
      }

      setIsExpenseModalOpen(false);
      setExpenseTitle('');
      setAlertInfo({
        type: 'success',
        message: 'Expense created with deterministic tax calculations and linked to category.',
      });
      await loadBudgetData();
    } catch (err: unknown) {
      setAlertInfo({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error creating expense',
      });
    } finally {
      setSubmittingExpense(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpense) return;
    setSubmittingPayment(true);
    setAlertInfo(null);

    try {
      const amountMinor = Math.round(Number(paymentAmountDollars) * 100);

      const res = await fetch(`/api/events/${id}/budgets/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expenseId: selectedExpense.id,
          amountMinor,
          paymentMethod,
          isRefund,
        }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || 'Failed to record payment');
      }

      setIsPaymentModalOpen(false);
      setSelectedExpense(null);
      setAlertInfo({
        type: 'success',
        message: isRefund ? 'Refund recorded successfully!' : 'Payment recorded and financial state synchronized!',
      });
      await loadBudgetData();
    } catch (err: unknown) {
      setAlertInfo({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error processing payment',
      });
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleSimulateGuests = async () => {
    setSimulating(true);
    try {
      const res = await fetch(`/api/events/${id}/budgets/simulate-guests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newGuestCount }),
      });
      const simData = await res.json();
      if (simData.success) {
        setSimulationResult(simData.simulation);
      }
    } catch {
      // safe ignore
    } finally {
      setSimulating(false);
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

  const metrics = data?.metrics || {};
  const currency = data?.budget?.currency || 'USD';

  const formatMoney = (minorUnits: number | string = 0) => {
    return (Number(minorUnits) / 100).toLocaleString(undefined, {
      style: 'currency',
      currency,
    });
  };

  const getExpenseStatusVariant = (status: string): StatusVariant => {
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
              <span>Financial & Budget Management</span>
            </div>
            <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight">
              Budget & Financial Ledger
            </h1>
            <p className="text-sm text-stone-600 mt-1">
              Zero floating-point arithmetic with 64-bit integer minor units and basis point taxation
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={`/api/events/${id}/budgets/export`}
              download="budget_report.csv"
              className="px-4 py-2.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 font-semibold text-sm shadow-sm transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Export CSV</span>
            </a>

            <button
              type="button"
              onClick={() => setIsExpenseModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 focus:ring-4 focus:ring-amber-500/40"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Expense</span>
            </button>
          </div>
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

        {/* Budget Alerts Banner */}
        {metrics.alerts && metrics.alerts.length > 0 && (
          <div className="mt-6 space-y-2">
            {metrics.alerts.map((al: any, idx: number) => (
              <Alert
                key={idx}
                type={al.type === 'CRITICAL_OVERRUN' ? 'error' : 'warning'}
                title={al.type}
                message={al.message}
              />
            ))}
          </div>
        )}

        {/* KPI Cards Grid */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-stone-300 shadow-sm">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
              Total Budget
            </span>
            <span className="text-xl font-black text-stone-900 block mt-1">
              {formatMoney(metrics.totalBudgetMinor)}
            </span>
            <span className="text-[11px] text-stone-500 block mt-0.5">Authoritative base</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-300 shadow-sm">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
              Allocated
            </span>
            <span className="text-xl font-black text-amber-700 block mt-1">
              {formatMoney(metrics.totalAllocatedMinor)}
            </span>
            <span className="text-[11px] text-stone-500 block mt-0.5">Across planned categories</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-300 shadow-sm">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
              Actual Paid
            </span>
            <span className="text-xl font-black text-emerald-700 block mt-1">
              {formatMoney(metrics.totalActualPaidMinor)}
            </span>
            <span className="text-[11px] text-stone-500 block mt-0.5">Settled transactions</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-300 shadow-sm">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
              Pending Balance
            </span>
            <span className="text-xl font-black text-indigo-700 block mt-1">
              {formatMoney(metrics.totalPendingMinor)}
            </span>
            <span className="text-[11px] text-stone-500 block mt-0.5">Committed unpaid</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-300 shadow-sm">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
              Contingency Reserve
            </span>
            <span className="text-xl font-black text-stone-900 block mt-1">
              {formatMoney(metrics.remainingContingencyMinor)}
            </span>
            <span className="text-[11px] text-emerald-600 font-semibold block mt-0.5">
              {metrics.utilizationPercentage}% utilized
            </span>
          </div>
        </div>

        {/* Categories Breakdown Table */}
        <div className="mt-8 bg-white rounded-2xl border border-stone-300 shadow-sm p-6">
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
                {data?.categories?.map((cat: any) => {
                  const variance = Number(cat.allocatedMinor) - Number(cat.actualSpentMinor);
                  return (
                    <tr key={cat.id} className="hover:bg-stone-50/50">
                      <td className="py-3 px-4 font-semibold text-stone-900">{cat.name}</td>
                      <td className="py-3 px-4 text-stone-700">{formatMoney(cat.allocatedMinor)}</td>
                      <td className="py-3 px-4 text-stone-700">{formatMoney(cat.committedMinor || 0)}</td>
                      <td className="py-3 px-4 text-stone-700">{formatMoney(cat.actualSpentMinor)}</td>
                      <td className="py-3 px-4 font-semibold">
                        <span className={variance >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                          {formatMoney(variance)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Expenses List & Payment Trigger */}
        <div className="mt-8 bg-white rounded-2xl border border-stone-300 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-stone-900">Expenses & Invoices</h2>
            <button
              type="button"
              onClick={() => setIsExpenseModalOpen(true)}
              className="text-xs font-bold text-amber-700 hover:text-amber-800"
            >
              + Add Item
            </button>
          </div>

          {data?.expenses?.length === 0 ? (
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
                  {data?.expenses?.map((exp: any) => {
                    const totalMinor = Number(exp.baseAmountMinor) + Number(exp.taxAmountMinor);
                    const paidMinor = Number(exp.paidAmountMinor);
                    return (
                      <tr key={exp.id} className="hover:bg-stone-50/50">
                        <td className="py-3 px-4 font-semibold text-stone-900">{exp.title}</td>
                        <td className="py-3 px-4 text-xs text-stone-600">{exp.category?.name || 'General'}</td>
                        <td className="py-3 px-4 font-mono font-medium">{formatMoney(totalMinor)}</td>
                        <td className="py-3 px-4 font-mono text-emerald-700 font-medium">{formatMoney(paidMinor)}</td>
                        <td className="py-3 px-4">
                          <StatusBadge label={exp.paymentStatus} variant={getExpenseStatusVariant(exp.paymentStatus)} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedExpense(exp);
                              const remaining = Math.max(0, (totalMinor - paidMinor) / 100);
                              setPaymentAmountDollars(remaining > 0 ? remaining : 100);
                              setIsPaymentModalOpen(true);
                            }}
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

        {/* Guest Count Budget Simulation Tool */}
        <div className="mt-8 bg-stone-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl">
          <h2 className="text-lg font-bold text-white mb-2">
            Guest Count Financial Simulation
          </h2>
          <p className="text-xs text-stone-400 mb-6 max-w-xl">
            Simulate how scaling or reducing guest attendance recalculates variable per-guest catering, seating, and floral allocations deterministically.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-full sm:w-64">
              <label htmlFor="sim-guests" className="block text-xs font-semibold text-stone-300 mb-1">
                Hypothetical Guest Count
              </label>
              <input
                id="sim-guests"
                type="number"
                min="10"
                max="5000"
                value={newGuestCount}
                onChange={(e) => setNewGuestCount(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-lg bg-stone-800 border border-stone-700 text-white text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handleSimulateGuests}
              disabled={simulating}
              className="mt-5 w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-bold text-sm shadow-md transition-colors"
            >
              {simulating ? 'Calculating...' : 'Run Simulation'}
            </button>
          </div>

          {simulationResult && (
            <div className="mt-6 pt-6 border-t border-stone-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-4 rounded-xl bg-stone-800/80">
                <span className="text-stone-400 block">Baseline Guest Count:</span>
                <span className="text-base font-bold text-white mt-1 block">
                  {simulationResult.baselineGuestCount} guests
                </span>
              </div>
              <div className="p-4 rounded-xl bg-stone-800/80">
                <span className="text-stone-400 block">Forecasted Expenditure:</span>
                <span className="text-base font-bold text-amber-400 mt-1 block">
                  {formatMoney(simulationResult.simulatedTotalMinor)}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-stone-800/80">
                <span className="text-stone-400 block">Estimated Variance:</span>
                <span className="text-base font-bold text-emerald-400 mt-1 block">
                  {formatMoney(simulationResult.varianceMinor)}
                </span>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Expense Modal */}
      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        title="Create Expense Record"
        description="Records expense with deterministic integer basis point tax computation."
      >
        <form onSubmit={handleCreateExpense} className="space-y-4">
          <div>
            <label htmlFor="exp-title" className="block text-xs font-semibold text-stone-700 mb-1">
              Title / Vendor Description *
            </label>
            <input
              id="exp-title"
              type="text"
              required
              value={expenseTitle}
              onChange={(e) => setExpenseTitle(e.target.value)}
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
              value={expenseCategoryId}
              onChange={(e) => setExpenseCategoryId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7]"
            >
              {data?.categories?.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="exp-base" className="block text-xs font-semibold text-stone-700 mb-1">
                Base Amount ($) *
              </label>
              <input
                id="exp-base"
                type="number"
                step="1"
                min="1"
                required
                value={expenseBaseDollars}
                onChange={(e) => setExpenseBaseDollars(Number(e.target.value))}
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
                onChange={(e) => setTaxBasisPoints(Number(e.target.value))}
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
              value={expenseNotes}
              onChange={(e) => setExpenseNotes(e.target.value)}
              placeholder="e.g. Invoice #2026-FL-08"
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7]"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsExpenseModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingExpense}
              className="px-5 py-2 text-xs font-bold rounded-lg bg-amber-800 text-white hover:bg-amber-900 disabled:opacity-50"
            >
              {submittingExpense ? 'Saving...' : 'Add Expense'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Record Payment Transaction"
        description={selectedExpense ? `Expense: ${selectedExpense.title}` : ''}
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div className="flex items-center gap-4 p-3 bg-stone-100 rounded-lg text-xs">
            <label className="flex items-center gap-2 cursor-pointer font-semibold">
              <input
                type="radio"
                name="txType"
                checked={!isRefund}
                onChange={() => setIsRefund(false)}
              />
              <span>Payment / Advance</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-rose-700">
              <input
                type="radio"
                name="txType"
                checked={isRefund}
                onChange={() => setIsRefund(true)}
              />
              <span>Refund Adjustment</span>
            </label>
          </div>

          <div>
            <label htmlFor="pay-amt" className="block text-xs font-semibold text-stone-700 mb-1">
              Amount ($) *
            </label>
            <input
              id="pay-amt"
              type="number"
              step="1"
              min="1"
              required
              value={paymentAmountDollars}
              onChange={(e) => setPaymentAmountDollars(Number(e.target.value))}
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
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7]"
            >
              <option value="BANK_TRANSFER">Bank Wire / ACH</option>
              <option value="CREDIT_CARD">Credit Card</option>
              <option value="CHECK">Certified Check</option>
              <option value="CASH">Cash / Escrow</option>
            </select>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingPayment}
              className="px-5 py-2 text-xs font-bold rounded-lg bg-amber-800 text-white hover:bg-amber-900 disabled:opacity-50"
            >
              {submittingPayment ? 'Processing...' : 'Record Transaction'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
