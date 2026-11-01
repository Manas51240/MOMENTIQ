'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/ui/Navbar';
import { SkipToContent } from '@/components/ui/SkipToContent';
import { EventNavTabs } from '@/components/ui/EventNavTabs';
import { StatusBadge, StatusVariant } from '@/components/ui/StatusBadge';
import { Alert } from '@/components/ui/Alert';

interface ReportCategory {
  id: string;
  name: string;
  allocatedMinor: number;
  spentMinor: number;
  varianceMinor: number;
  utilizationPercent: number;
}

interface ReportExpense {
  id: string;
  title: string;
  category: string;
  vendor?: string;
  totalMinor: number;
  status: string;
}

interface ReportGuest {
  id: string;
  name: string;
  email?: string;
  group?: string;
  rsvpStatus: string;
  dietary?: string;
  dietaryRequirements?: string;
  attendingCount?: number;
  tableNumber?: number;
  seatingTable?: string;
  checkedIn: boolean;
  [key: string]: unknown;
}

interface ReportVendor {
  id: string;
  name: string;
  category: string;
  contactName?: string;
  phone?: string;
  bookingStatus: string;
  status?: string;
  isVerified?: boolean;
  estimateMinor?: number;
  totalQuoteCostMinor?: number;
  contractTotalMinor?: number;
  [key: string]: unknown;
}

interface ReportRisk {
  id: string;
  title: string;
  category: string;
  probability?: number;
  impact?: number;
  riskScore: number;
  severity?: string;
  status: string;
  mitigation?: string;
  mitigationPlan?: string;
  [key: string]: unknown;
}

interface ReportTask {
  id: string;
  title: string;
  phase?: string;
  milestone?: string;
  priority: string;
  status: string;
  dueDate: string;
  progressPercent?: number;
  [key: string]: unknown;
}

interface ReportPayment {
  id: string;
  expenseTitle: string;
  vendorName?: string;
  amountMinor: number;
  paymentMethod: string;
  paidAt?: string;
  createdAt?: string;
  status?: string;
  [key: string]: unknown;
}

interface ReportSchedule {
  id: string;
  activity?: string;
  title?: string;
  time?: string;
  timeSlot?: string;
  dayNumber?: number;
  location?: string;
  leadPerson?: string;
  [key: string]: unknown;
}

interface ReportMeta {
  type: string;
  title: string;
  description: string;
  availableFormats: string[];
}

interface ReportPayload {
  type?: string;
  metadata?: { title: string; description: string };
  event?: { id?: string; title?: string; currency?: string; preferences?: { theme?: string; tone?: string; dietaryNotes?: string; [key: string]: unknown }; [key: string]: unknown };
  preferences?: { theme?: string; tone?: string; dietaryNotes?: string; [key: string]: unknown };
  summary?: {
    totalBudgetMinor?: number | string;
    totalSpentMinor?: number | string;
    remainingBudgetMinor?: number | string;
    pendingLiabilitiesMinor?: number | string;
    utilizationPercent?: number | string;
    totalGuests?: number;
    totalInvited?: number;
    attendingHeads?: number;
    attendingCount?: number;
    declinedCount?: number;
    pendingCount?: number;
    checkedInCount?: number;
    totalRisks?: number;
    unresolvedCount?: number;
    highHazardCount?: number;
    totalMilestones?: number;
    completedMilestones?: number;
    totalTasks?: number;
    completedTasks?: number;
    overdueTasks?: number;
    completionPercent?: number;
    progressPercent?: number;
    totalVendors?: number;
    confirmedVendors?: number;
    totalContractValueMinor?: number | string;
    totalPaidMinor?: number | string;
    totalDisbursedMinor?: number | string;
    totalRefundedMinor?: number | string;
    netDisbursedMinor?: number | string;
    pendingDueMinor?: number | string;
    actualAttendingHeads?: number;
    targetGuests?: number;
    actualCheckedInHeads?: number;
    taskCompletionPercent?: number;
    allRisksResolved?: boolean;
    [key: string]: unknown;
  };
  operationalSummary?: {
    plannedBudgetMinor?: string;
    actualSpentMinor?: string;
    budgetVarianceMinor?: string;
    targetGuests?: number;
    actualAttendingHeads?: number;
    actualCheckedInHeads?: number;
    taskCompletionPercent?: number;
    allTasksCompleted?: boolean;
    allRisksResolved?: boolean;
    totalRisksHandled?: number;
  };
  categories?: ReportCategory[];
  expenses?: ReportExpense[];
  guests?: ReportGuest[];
  groups?: Array<{ name: string; guestCount: number }>;
  seating?: Array<{ tableName: string; capacity: number; assignedCount: number }>;
  milestones?: Array<{ title: string; targetDate: string; isCompleted: boolean }>;
  tasks?: ReportTask[];
  schedules?: ReportSchedule[];
  vendors?: ReportVendor[];
  risks?: ReportRisk[];
  payments?: ReportPayment[];
  currency?: string;
  [key: string]: unknown;
}

export default function EventReportsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [reports, setReports] = useState<ReportMeta[]>([]);
  const [selectedReport, setSelectedReport] = useState<string>('budget-expenses');
  const [reportData, setReportData] = useState<ReportPayload | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load available reports list
  useEffect(() => {
    async function loadReportsList() {
      try {
        const res = await fetch(`/api/events/${id}/reports`);
        if (res.status === 401 || res.status === 403) {
          router.push('/dashboard');
          return;
        }
        const data = await res.json();
        if (data.success && data.reports) {
          setReports(data.reports);
        }
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : 'Failed to load report catalog');
      } finally {
        setLoadingList(false);
      }
    }
    loadReportsList();
  }, [id, router]);

  // Load selected report preview data
  useEffect(() => {
    if (!selectedReport) return;

    async function loadPreview() {
      setLoadingData(true);
      setErrorMessage(null);
      try {
        const res = await fetch(`/api/events/${id}/reports/${selectedReport}`);
        const data = await res.json();
        if (data.success && data.report) {
          setReportData(data.report);
        } else {
          setErrorMessage(data.error || 'Failed to generate report preview');
        }
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : 'Error retrieving report preview');
      } finally {
        setLoadingData(false);
      }
    }

    loadPreview();
  }, [id, selectedReport]);

  const handleDownload = (format: 'pdf' | 'csv') => {
    const url = `/api/events/${id}/reports/${selectedReport}/export?format=${format}`;
    window.open(url, '_blank');
  };

  const formatMinor = (minor: number | string | bigint | undefined | null, currency = 'INR') => {
    const num = Number(minor || 0) / 100;
    if (currency === 'INR' || currency === '₹') {
      return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    const symbol = currency === 'USD' ? '$' : `${currency} `;
    return `${symbol}${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fdfbf7] text-stone-900">
      <SkipToContent />
      <Navbar />

      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EventNavTabs eventId={id} />

        {/* Header */}
        <div className="mt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-stone-200">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-700 uppercase tracking-wider">
              <span>Audit & Executive Reporting</span>
              <span>&bull;</span>
              <span>Deterministic Precision</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 mt-1">
              Celebration Reports & Artifacts
            </h1>
            <p className="text-sm text-stone-600 mt-1">
              Export officially formatted PDF blueprints, financial audits, guest manifests, and risk registers
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleDownload('pdf')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-amber-500"
              aria-label="Download current report in PDF format"
            >
              <svg className="w-4 h-4 text-rose-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
              </svg>
              <span>Download PDF</span>
            </button>

            <button
              onClick={() => handleDownload('csv')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-stone-100 text-stone-800 font-semibold text-sm border border-stone-300 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-amber-500"
              aria-label="Download current report in CSV format"
            >
              <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              <span>Download CSV</span>
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-6">
            <Alert type="error" message={errorMessage} onClose={() => setErrorMessage(null)} />
          </div>
        )}

        {/* Report Selector Pills */}
        <div className="mt-6 overflow-x-auto pb-2 no-scrollbar">
          <div className="flex items-center gap-2">
            {reports.map((r) => {
              const isSelected = selectedReport === r.type;
              return (
                <button
                  key={r.type}
                  onClick={() => setSelectedReport(r.type)}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    isSelected
                      ? 'bg-amber-800 text-white shadow-sm'
                      : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-300'
                  }`}
                  aria-pressed={isSelected}
                >
                  {r.title}
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading Preview */}
        {loadingData && (
          <div className="mt-12 py-16 text-center space-y-3">
            <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-medium text-stone-600">Generating report telemetry...</p>
          </div>
        )}

        {/* On-Screen Preview Canvas */}
        {!loadingData && reportData && (
          <div className="mt-8 space-y-8 bg-white rounded-2xl border border-stone-300 p-6 sm:p-8 shadow-sm">
            {/* Report Header Card */}
            <div className="border-b border-stone-200 pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="text-xs font-extrabold uppercase text-amber-800 tracking-wider">
                  Live Report Preview
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-stone-900 mt-1">
                  {reportData.metadata?.title}
                </h2>
                <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
                  {reportData.metadata?.description}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-stone-500 uppercase font-semibold block">Event Reference</span>
                <span className="text-sm font-bold text-stone-900">{reportData.event?.title}</span>
              </div>
            </div>

            {/* PREVIEW 1: BUDGET & EXPENSES */}
            {selectedReport === 'budget-expenses' && (
              <div className="space-y-6">
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-xs font-semibold text-stone-500 block">Total Budget</span>
                    <span className="text-lg font-bold text-stone-900">
                      {formatMinor(reportData.summary?.totalBudgetMinor, reportData.event?.currency)}
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-xs font-semibold text-stone-500 block">Total Spent</span>
                    <span className="text-lg font-bold text-rose-800">
                      {formatMinor(reportData.summary?.totalSpentMinor, reportData.event?.currency)}
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-xs font-semibold text-stone-500 block">Remaining</span>
                    <span className="text-lg font-bold text-emerald-800">
                      {formatMinor(reportData.summary?.remainingBudgetMinor, reportData.event?.currency)}
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-xs font-semibold text-stone-500 block">Utilization</span>
                    <span className="text-lg font-bold text-amber-800">
                      {reportData.summary?.utilizationPercent}%
                    </span>
                  </div>
                </div>

                {/* Categories Table */}
                <div>
                  <h3 className="text-base font-bold text-stone-900 mb-3">Category Allocations</h3>
                  <div className="overflow-x-auto rounded-xl border border-stone-200">
                    <table className="w-full text-left text-xs" aria-label="Category Allocations Table">
                      <thead className="bg-stone-100 text-stone-700 font-bold uppercase text-[10px]">
                        <tr>
                          <th scope="col" className="px-4 py-3">Category</th>
                          <th scope="col" className="px-4 py-3 text-right">Allocated</th>
                          <th scope="col" className="px-4 py-3 text-right">Spent</th>
                          <th scope="col" className="px-4 py-3 text-right">Variance</th>
                          <th scope="col" className="px-4 py-3 text-right">Usage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200">
                        {reportData.categories?.map((c: ReportCategory) => (
                          <tr key={c.id} className="hover:bg-stone-50">
                            <td className="px-4 py-3 font-semibold text-stone-900">{c.name}</td>
                            <td className="px-4 py-3 text-right">{formatMinor(c.allocatedMinor, reportData.event?.currency)}</td>
                            <td className="px-4 py-3 text-right">{formatMinor(c.spentMinor, reportData.event?.currency)}</td>
                            <td className="px-4 py-3 text-right font-semibold text-emerald-800">{formatMinor(c.varianceMinor, reportData.event?.currency)}</td>
                            <td className="px-4 py-3 text-right">{c.utilizationPercent}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Expenses Table */}
                <div>
                  <h3 className="text-base font-bold text-stone-900 mb-3">Itemized Expenses</h3>
                  <div className="overflow-x-auto rounded-xl border border-stone-200">
                    <table className="w-full text-left text-xs" aria-label="Itemized Expenses Table">
                      <thead className="bg-stone-100 text-stone-700 font-bold uppercase text-[10px]">
                        <tr>
                          <th scope="col" className="px-4 py-3">Expense</th>
                          <th scope="col" className="px-4 py-3">Category</th>
                          <th scope="col" className="px-4 py-3">Vendor</th>
                          <th scope="col" className="px-4 py-3 text-right">Total Amount</th>
                          <th scope="col" className="px-4 py-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200">
                        {reportData.expenses?.map((e: ReportExpense) => (
                          <tr key={e.id} className="hover:bg-stone-50">
                            <td className="px-4 py-3 font-semibold text-stone-900">{e.title}</td>
                            <td className="px-4 py-3 text-stone-600">{e.category}</td>
                            <td className="px-4 py-3 text-stone-600">{e.vendor}</td>
                            <td className="px-4 py-3 text-right font-bold text-stone-900">
                              {formatMinor(e.totalMinor, reportData.event?.currency)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-stone-100 text-stone-700">
                                {e.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* PREVIEW 2: GUEST & RSVP */}
            {selectedReport === 'guest-rsvp' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-xs font-semibold text-stone-500 block">Total Invited</span>
                    <span className="text-lg font-bold text-stone-900">{reportData.summary?.totalInvited}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-xs font-semibold text-stone-500 block">Attending Heads</span>
                    <span className="text-lg font-bold text-emerald-800">{reportData.summary?.attendingHeads}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-xs font-semibold text-stone-500 block">Declined</span>
                    <span className="text-lg font-bold text-rose-800">{reportData.summary?.declinedCount}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-xs font-semibold text-stone-500 block">Checked In</span>
                    <span className="text-lg font-bold text-amber-800">{reportData.summary?.checkedInCount}</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold text-stone-900 mb-3">Guest Manifest</h3>
                  <div className="overflow-x-auto rounded-xl border border-stone-200">
                    <table className="w-full text-left text-xs" aria-label="Guest Manifest Table">
                      <thead className="bg-stone-100 text-stone-700 font-bold uppercase text-[10px]">
                        <tr>
                          <th scope="col" className="px-4 py-3">Guest Name</th>
                          <th scope="col" className="px-4 py-3">Group</th>
                          <th scope="col" className="px-4 py-3 text-center">RSVP</th>
                          <th scope="col" className="px-4 py-3 text-center">Heads</th>
                          <th scope="col" className="px-4 py-3">Dietary</th>
                          <th scope="col" className="px-4 py-3">Table Assignment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200">
                        {reportData.guests?.map((g: ReportGuest) => (
                          <tr key={g.id} className="hover:bg-stone-50">
                            <td className="px-4 py-3 font-semibold text-stone-900">{g.name}</td>
                            <td className="px-4 py-3 text-stone-600">{g.group}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-stone-100 text-stone-700">
                                {g.rsvpStatus}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center font-bold">{g.attendingCount}</td>
                            <td className="px-4 py-3 text-stone-600">{g.dietary}</td>
                            <td className="px-4 py-3 text-stone-600">{g.seatingTable}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* PREVIEW 3: VENDOR COMPARISON */}
            {selectedReport === 'vendor-comparison' && (
              <div className="space-y-6">
                <div className="overflow-x-auto rounded-xl border border-stone-200">
                  <table className="w-full text-left text-xs" aria-label="Vendor Comparison Matrix Table">
                    <thead className="bg-stone-100 text-stone-700 font-bold uppercase text-[10px]">
                      <tr>
                        <th scope="col" className="px-4 py-3">Vendor</th>
                        <th scope="col" className="px-4 py-3">Category</th>
                        <th scope="col" className="px-4 py-3 text-center">Verified</th>
                        <th scope="col" className="px-4 py-3 text-right">Estimate</th>
                        <th scope="col" className="px-4 py-3 text-right">Total Quote</th>
                        <th scope="col" className="px-4 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200">
                      {reportData.vendors?.map((v: ReportVendor) => (
                        <tr key={v.id} className="hover:bg-stone-50">
                          <td className="px-4 py-3 font-semibold text-stone-900">{v.name}</td>
                          <td className="px-4 py-3 text-stone-600">{v.category}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${v.isVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'}`}>
                              {v.isVerified ? 'VERIFIED' : 'UNVERIFIED'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">{formatMinor(v.estimateMinor || 0, reportData.event?.currency)}</td>
                          <td className="px-4 py-3 text-right font-bold text-amber-700">{formatMinor(v.totalQuoteCostMinor || 0, reportData.event?.currency)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-stone-100 text-stone-700">
                              {v.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* PREVIEW 4: RISK REGISTER */}
            {selectedReport === 'risk-register' && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-xs font-semibold text-stone-500 block">Total Identified</span>
                    <span className="text-lg font-bold text-stone-900">{reportData.summary?.totalRisks}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-xs font-semibold text-stone-500 block">Unresolved</span>
                    <span className="text-lg font-bold text-amber-800">{reportData.summary?.unresolvedCount}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-xs font-semibold text-stone-500 block">High Hazard</span>
                    <span className="text-lg font-bold text-rose-800">{reportData.summary?.highHazardCount}</span>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-stone-200">
                  <table className="w-full text-left text-xs" aria-label="Risk Register 5x5 RAG Table">
                    <thead className="bg-stone-100 text-stone-700 font-bold uppercase text-[10px]">
                      <tr>
                        <th scope="col" className="px-4 py-3">Risk Title</th>
                        <th scope="col" className="px-4 py-3">Domain</th>
                        <th scope="col" className="px-4 py-3 text-center">P x I</th>
                        <th scope="col" className="px-4 py-3 text-center">Score</th>
                        <th scope="col" className="px-4 py-3 text-center">Severity</th>
                        <th scope="col" className="px-4 py-3">Mitigation Plan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200">
                      {reportData.risks?.map((r: ReportRisk) => (
                        <tr key={r.id} className="hover:bg-stone-50">
                          <td className="px-4 py-3 font-semibold text-stone-900">{r.title}</td>
                          <td className="px-4 py-3 text-stone-600">{r.category}</td>
                          <td className="px-4 py-3 text-center">{r.probability} &times; {r.impact}</td>
                          <td className="px-4 py-3 text-center font-bold">{r.riskScore}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-stone-100 text-stone-700">
                              {r.severity}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-stone-600">{r.mitigation}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* PREVIEW 5: TIMELINE & MILESTONES */}
            {selectedReport === 'timeline-milestones' && (
              <div className="space-y-6">
                <div className="grid grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-xs font-semibold text-stone-500 block">Total Tasks</span>
                    <span className="text-lg font-bold text-stone-900">{reportData.summary?.totalTasks}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-xs font-semibold text-stone-500 block">Completed</span>
                    <span className="text-lg font-bold text-emerald-800">{reportData.summary?.completedTasks}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-xs font-semibold text-stone-500 block">Overdue</span>
                    <span className="text-lg font-bold text-rose-800">{reportData.summary?.overdueTasks}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-xs font-semibold text-stone-500 block">Completion %</span>
                    <span className="text-lg font-bold text-amber-800">{reportData.summary?.completionPercent}%</span>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-stone-200">
                  <table className="w-full text-left text-xs" aria-label="Timeline and Milestones Table">
                    <thead className="bg-stone-100 text-stone-700 font-bold uppercase text-[10px]">
                      <tr>
                        <th scope="col" className="px-4 py-3">Task</th>
                        <th scope="col" className="px-4 py-3">Milestone</th>
                        <th scope="col" className="px-4 py-3">Due Date</th>
                        <th scope="col" className="px-4 py-3 text-center">Priority</th>
                        <th scope="col" className="px-4 py-3 text-center">Status</th>
                        <th scope="col" className="px-4 py-3 text-right">Progress</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200">
                      {reportData.tasks?.map((t: ReportTask) => (
                        <tr key={t.id} className="hover:bg-stone-50">
                          <td className="px-4 py-3 font-semibold text-stone-900">{t.title}</td>
                          <td className="px-4 py-3 text-stone-600">{t.milestone}</td>
                          <td className="px-4 py-3 text-stone-600">{t.dueDate}</td>
                          <td className="px-4 py-3 text-center font-bold">{t.priority}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-stone-100 text-stone-700">
                              {t.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">{t.progressPercent}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* PREVIEW 6: PAYMENT SUMMARY */}
            {selectedReport === 'payment-summary' && (
              <div className="space-y-6">
                <div className="grid grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-xs font-semibold text-stone-500 block">Total Disbursed</span>
                    <span className="text-lg font-bold text-stone-900">
                      {formatMinor(reportData.summary?.totalDisbursedMinor, reportData.event?.currency)}
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-xs font-semibold text-stone-500 block">Refunds</span>
                    <span className="text-lg font-bold text-rose-800">
                      {formatMinor(reportData.summary?.totalRefundedMinor, reportData.event?.currency)}
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-xs font-semibold text-stone-500 block">Net Paid</span>
                    <span className="text-lg font-bold text-emerald-800">
                      {formatMinor(reportData.summary?.netDisbursedMinor, reportData.event?.currency)}
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-xs font-semibold text-stone-500 block">Pending Due</span>
                    <span className="text-lg font-bold text-amber-800">
                      {formatMinor(reportData.summary?.pendingDueMinor, reportData.event?.currency)}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-stone-200">
                  <table className="w-full text-left text-xs" aria-label="Payment Transactions Table">
                    <thead className="bg-stone-100 text-stone-700 font-bold uppercase text-[10px]">
                      <tr>
                        <th scope="col" className="px-4 py-3">Paid Date</th>
                        <th scope="col" className="px-4 py-3">Expense / Vendor</th>
                        <th scope="col" className="px-4 py-3 text-right">Amount</th>
                        <th scope="col" className="px-4 py-3">Method</th>
                        <th scope="col" className="px-4 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200">
                      {reportData.payments?.map((p: ReportPayment) => (
                        <tr key={p.id} className="hover:bg-stone-50">
                          <td className="px-4 py-3 text-stone-600">{p.paidAt}</td>
                          <td className="px-4 py-3 font-semibold text-stone-900">
                            {p.expenseTitle} <span className="text-stone-500">({p.vendorName})</span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-stone-900">
                            {formatMinor(p.amountMinor, reportData.event?.currency)}
                          </td>
                          <td className="px-4 py-3 text-stone-600">{p.paymentMethod}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-stone-100 text-stone-700">
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* PREVIEW 7: COMPLETE EVENT PLAN */}
            {selectedReport === 'event-plan' && (
              <div className="space-y-6">
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                  <h3 className="font-bold text-stone-900">Executive Concept</h3>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Theme: <span className="font-semibold text-stone-900">{reportData.preferences?.theme}</span> &bull; 
                    Tone: <span className="font-semibold text-stone-900">{reportData.preferences?.tone}</span> &bull; 
                    Dietary Directives: <span className="font-semibold text-stone-900">{reportData.preferences?.dietaryNotes}</span>
                  </p>
                </div>

                <div>
                  <h3 className="text-base font-bold text-stone-900 mb-3">Event Schedule</h3>
                  <div className="overflow-x-auto rounded-xl border border-stone-200">
                    <table className="w-full text-left text-xs" aria-label="Event Schedule Table">
                      <thead className="bg-stone-100 text-stone-700 font-bold uppercase text-[10px]">
                        <tr>
                          <th scope="col" className="px-4 py-3 text-center">Day</th>
                          <th scope="col" className="px-4 py-3">Time</th>
                          <th scope="col" className="px-4 py-3">Session Title</th>
                          <th scope="col" className="px-4 py-3">Location</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200">
                        {reportData.schedules?.map((s: ReportSchedule) => (
                          <tr key={s.id} className="hover:bg-stone-50">
                            <td className="px-4 py-3 text-center font-bold">{s.dayNumber}</td>
                            <td className="px-4 py-3 text-stone-600">{s.time}</td>
                            <td className="px-4 py-3 font-semibold text-stone-900">{s.title}</td>
                            <td className="px-4 py-3 text-stone-600">{s.location}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* PREVIEW 8: EVENT COMPLETION */}
            {selectedReport === 'event-completion' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-xs font-semibold text-stone-500 block">Actual Heads</span>
                    <span className="text-lg font-bold text-emerald-800">
                      {reportData.operationalSummary?.actualAttendingHeads} / {reportData.operationalSummary?.targetGuests}
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-xs font-semibold text-stone-500 block">Door Check-In</span>
                    <span className="text-lg font-bold text-amber-800">
                      {reportData.operationalSummary?.actualCheckedInHeads}
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-xs font-semibold text-stone-500 block">Task Execution</span>
                    <span className="text-lg font-bold text-stone-900">
                      {reportData.operationalSummary?.taskCompletionPercent}%
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-xs font-semibold text-stone-500 block">All Risks Handled</span>
                    <span className="text-lg font-bold text-emerald-800">
                      {reportData.operationalSummary?.allRisksResolved ? 'PASSED' : 'PENDING'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

