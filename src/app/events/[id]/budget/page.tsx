'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/ui/Navbar';
import { SkipToContent } from '@/components/ui/SkipToContent';
import { EventNavTabs } from '@/components/ui/EventNavTabs';
import { Alert } from '@/components/ui/Alert';
import {
  BudgetData,
  ExpenseItem,
  GuestSimulationResult,
  BudgetSummaryCards,
  CategoryBreakdownTable,
  ExpenseTable,
  GuestSimulationCard,
  AddExpenseModal,
  RecordPaymentModal,
} from '@/components/budget';

export default function BudgetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<BudgetData | null>(null);
  const [alertInfo, setAlertInfo] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Expense Modal State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseCategoryId, setExpenseCategoryId] = useState('');
  const [expenseBaseAmount, setExpenseBaseAmount] = useState(15000);
  const [taxBasisPoints, setTaxBasisPoints] = useState(1800); // 18% GST default for IN
  const [expenseNotes, setExpenseNotes] = useState('');
  const [submittingExpense, setSubmittingExpense] = useState(false);

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseItem | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(5000);
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [isRefund, setIsRefund] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Guest Simulation State
  const [newGuestCount, setNewGuestCount] = useState<number>(120);
  const [simulationResult, setSimulationResult] = useState<GuestSimulationResult | null>(null);
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
      const baseAmountMinor = Math.round(Number(expenseBaseAmount) * 100);

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
      const amountMinor = Math.round(Number(paymentAmount) * 100);

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

  const metrics = data?.metrics || {
    totalBudgetMinor: 0,
    totalAllocatedMinor: 0,
    totalActualPaidMinor: 0,
    totalPendingMinor: 0,
    remainingContingencyMinor: 0,
    utilizationPercentage: 0,
  };
  const currency = data?.budget?.currency || 'INR';

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
            {metrics.alerts.map((al, idx) => (
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
        <div className="mt-6">
          <BudgetSummaryCards metrics={metrics} currency={currency} />
        </div>

        {/* Categories Breakdown Table */}
        <div className="mt-8">
          <CategoryBreakdownTable categories={data?.categories} currency={currency} />
        </div>

        {/* Expenses List & Payment Trigger */}
        <div className="mt-8">
          <ExpenseTable
            expenses={data?.expenses}
            currency={currency}
            onOpenAddModal={() => setIsExpenseModalOpen(true)}
            onSelectRecordPayment={(exp) => {
              setSelectedExpense(exp);
              const totalMinor = Number(exp.baseAmountMinor) + Number(exp.taxAmountMinor);
              const paidMinor = Number(exp.paidAmountMinor);
              const remaining = Math.max(0, (totalMinor - paidMinor) / 100);
              setPaymentAmount(remaining > 0 ? remaining : 1000);
              setIsPaymentModalOpen(true);
            }}
          />
        </div>

        {/* Guest Count Budget Simulation Tool */}
        <div className="mt-8">
          <GuestSimulationCard
            newGuestCount={newGuestCount}
            onChangeGuestCount={setNewGuestCount}
            onSimulate={handleSimulateGuests}
            isSimulating={simulating}
            simulationResult={simulationResult}
            currency={currency}
          />
        </div>
      </main>

      {/* Expense Modal */}
      <AddExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSubmit={handleCreateExpense}
        categories={data?.categories}
        title={expenseTitle}
        onChangeTitle={setExpenseTitle}
        categoryId={expenseCategoryId}
        onChangeCategoryId={setExpenseCategoryId}
        baseAmount={expenseBaseAmount}
        onChangeBaseAmount={setExpenseBaseAmount}
        taxBasisPoints={taxBasisPoints}
        onChangeTaxBasisPoints={setTaxBasisPoints}
        notes={expenseNotes}
        onChangeNotes={setExpenseNotes}
        isSubmitting={submittingExpense}
        currency={currency}
      />

      {/* Payment Modal */}
      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSubmit={handleRecordPayment}
        selectedExpense={selectedExpense}
        isRefund={isRefund}
        onChangeIsRefund={setIsRefund}
        amount={paymentAmount}
        onChangeAmount={setPaymentAmount}
        paymentMethod={paymentMethod}
        onChangePaymentMethod={setPaymentMethod}
        isSubmitting={submittingPayment}
        currency={currency}
      />
    </div>
  );
}
