'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/ui/Navbar';
import { SkipToContent } from '@/components/ui/SkipToContent';
import { StatusBadge, StatusVariant } from '@/components/ui/StatusBadge';
import { Alert } from '@/components/ui/Alert';
import { DashboardTelemetry } from '@/services/dashboard-service';

export default function DashboardPage() {
  const router = useRouter();
  const [telemetry, setTelemetry] = useState<DashboardTelemetry | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const authRes = await fetch('/api/auth/me');
        const authData = await authRes.json();
        if (!authData.authenticated && !authData.success) {
          router.push('/login');
          return;
        }

        const dashRes = await fetch('/api/dashboard');
        const dashData = await dashRes.json();
        if (dashData.success && dashData.dashboard) {
          setTelemetry(dashData.dashboard);
        } else {
          setErrorMessage(dashData.error || 'Failed to load dashboard telemetry');
        }
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : 'Failed to load celebration dashboard');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  const formatMinor = (minor: number | string | bigint, currency = 'INR') => {
    const num = Number(minor || 0) / 100;
    if (currency === 'INR' || currency === '₹') {
      return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    const symbol = currency === 'USD' ? '$' : `${currency} `;
    return `${symbol}${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const filteredUpcoming = (telemetry?.upcomingEvents || []).filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.eventType.toLowerCase().includes(search.toLowerCase()) ||
    e.city.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusVariant = (status: string): StatusVariant => {
    switch (status) {
      case 'CONFIRMED':
      case 'COMPLETED':
        return 'SUCCESS';
      case 'ACTIVE':
      case 'IN_PROGRESS':
        return 'INFO';
      case 'PLANNING':
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

      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header with Title and Create Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-stone-200">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-700 uppercase tracking-wider">
              <span>Executive Telemetry</span>
              <span>&bull;</span>
              <span>11 Mandatory Signals</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight mt-1">
              Celebration Dashboard
            </h1>
            <p className="text-sm text-stone-600 mt-1">
              Real-time portfolio metrics, fiscal health, operational deadlines, and vendor progress
            </p>
          </div>
          <Link
            href="/events/new"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-bold text-sm shadow-md transition-all hover:scale-[1.02] focus:outline-none focus:ring-4 focus:ring-amber-500/40"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span>New Celebration</span>
          </Link>
        </div>

        {errorMessage && (
          <div className="mt-6">
            <Alert type="error" message={errorMessage} onClose={() => setErrorMessage(null)} />
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="py-20 text-center space-y-3">
            <div className="inline-block w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-stone-600 font-medium">Aggregating celebration telemetry...</p>
          </div>
        )}

        {!loading && telemetry && (
          <div className="mt-8 space-y-8">
            {/* 11 MANDATORY TELEMETRY CARDS */}
            {/* Section 1: Executive Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Metric 1: Active Events */}
              <div className="p-5 rounded-2xl bg-white border border-stone-300 shadow-sm space-y-1">
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                  1. Active Celebrations
                </span>
                <div className="text-2xl sm:text-3xl font-extrabold text-stone-900">
                  {telemetry.activeEventsCount}
                </div>
                <span className="text-xs text-stone-500 block">
                  {telemetry.upcomingEvents.length} total in pipeline
                </span>
              </div>

              {/* Metric 3 & 4: Budget Utilization & Remaining */}
              <div className="p-5 rounded-2xl bg-white border border-stone-300 shadow-sm space-y-1">
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                  3. Budget Utilization
                </span>
                <div className="text-2xl sm:text-3xl font-extrabold text-stone-900">
                  {telemetry.budgetUtilization.utilizationPercent}%
                </div>
                <span className="text-xs text-emerald-700 font-semibold block">
                  {formatMinor(telemetry.budgetUtilization.remainingBudgetMinor, telemetry.budgetUtilization.currency)} remaining
                </span>
              </div>

              {/* Metric 5: Overdue Tasks */}
              <div className={`p-5 rounded-2xl bg-white border shadow-sm space-y-1 ${
                telemetry.overdueTasks.count > 0 ? 'border-rose-300 bg-rose-50/20' : 'border-stone-300'
              }`}>
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                  5. Overdue Tasks
                </span>
                <div className={`text-2xl sm:text-3xl font-extrabold ${
                  telemetry.overdueTasks.count > 0 ? 'text-rose-800' : 'text-stone-900'
                }`}>
                  {telemetry.overdueTasks.count}
                </div>
                <span className="text-xs text-stone-500 block">
                  {telemetry.upcomingDeadlines.count} upcoming deadlines (14d)
                </span>
              </div>

              {/* Metric 10: Unresolved Risks */}
              <div className="p-5 rounded-2xl bg-white border border-stone-300 shadow-sm space-y-1">
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                  10. Unresolved Risks
                </span>
                <div className="text-2xl sm:text-3xl font-extrabold text-amber-800">
                  {telemetry.unresolvedRisks.totalUnresolved}
                </div>
                <span className="text-xs text-stone-500 block">
                  <span className="font-bold text-rose-700">{telemetry.unresolvedRisks.highHazardCount}</span> high/critical hazard
                </span>
              </div>
            </div>

            {/* Section 2: Budget Health with Accessible Text & Table */}
            <div className="bg-white rounded-2xl border border-stone-300 p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-stone-200 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-stone-900">
                    Fiscal Telemetry & Portfolio Budget Health
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Deterministic 64-bit integer calculations across all authorized events
                  </p>
                </div>
                <div className="text-xs font-semibold px-3 py-1 bg-amber-50 text-amber-800 rounded-lg border border-amber-200 self-start">
                  Currency: {telemetry.budgetUtilization.currency}
                </div>
              </div>

              {/* Accessible Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-stone-700">
                  <span>Spent: {formatMinor(telemetry.budgetUtilization.totalSpentMinor, telemetry.budgetUtilization.currency)}</span>
                  <span>Planned: {formatMinor(telemetry.budgetUtilization.totalPlannedMinor, telemetry.budgetUtilization.currency)}</span>
                </div>
                <div
                  className="w-full h-4 bg-stone-100 rounded-full overflow-hidden border border-stone-200"
                  role="progressbar"
                  aria-valuenow={telemetry.budgetUtilization.utilizationPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Overall portfolio budget utilization progress bar"
                >
                  <div
                    className={`h-full transition-all duration-500 ${
                      telemetry.budgetUtilization.utilizationPercent > 90
                        ? 'bg-rose-500'
                        : telemetry.budgetUtilization.utilizationPercent > 75
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, telemetry.budgetUtilization.utilizationPercent)}%` }}
                  />
                </div>
                {/* Accessible text alternative for screen readers */}
                <p className="sr-only">
                  Budget utilization is at {telemetry.budgetUtilization.utilizationPercent} percent. Total spent is{' '}
                  {formatMinor(telemetry.budgetUtilization.totalSpentMinor, telemetry.budgetUtilization.currency)} out of{' '}
                  {formatMinor(telemetry.budgetUtilization.totalPlannedMinor, telemetry.budgetUtilization.currency)} total planned, with{' '}
                  {formatMinor(telemetry.budgetUtilization.remainingBudgetMinor, telemetry.budgetUtilization.currency)} remaining.
                </p>
              </div>

              {/* Accessible Data Table for Important Numerical Info */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs" aria-label="Portfolio Financial Ledger Summary">
                  <caption className="sr-only">Summary table of portfolio budget allocations, actual expenditures, remaining funds, and pending liabilities</caption>
                  <thead className="bg-stone-100 text-stone-700 font-bold uppercase text-[10px]">
                    <tr>
                      <th scope="col" className="px-4 py-2.5">Total Planned</th>
                      <th scope="col" className="px-4 py-2.5">Actual Spent</th>
                      <th scope="col" className="px-4 py-2.5">Remaining Funds</th>
                      <th scope="col" className="px-4 py-2.5">Contingency Reserve</th>
                      <th scope="col" className="px-4 py-2.5">Pending Payments</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    <tr className="font-semibold text-stone-900">
                      <td className="px-4 py-3">{formatMinor(telemetry.budgetUtilization.totalPlannedMinor, telemetry.budgetUtilization.currency)}</td>
                      <td className="px-4 py-3 text-rose-700">{formatMinor(telemetry.budgetUtilization.totalSpentMinor, telemetry.budgetUtilization.currency)}</td>
                      <td className="px-4 py-3 text-emerald-800">{formatMinor(telemetry.budgetUtilization.remainingBudgetMinor, telemetry.budgetUtilization.currency)}</td>
                      <td className="px-4 py-3 text-stone-600">{formatMinor(telemetry.budgetUtilization.totalContingencyMinor, telemetry.budgetUtilization.currency)}</td>
                      <td className="px-4 py-3 text-amber-800">{formatMinor(telemetry.pendingPayments.totalPendingMinor, telemetry.pendingPayments.currency)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 3: Operational Grids: Vendors, Guests & Payments */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Metric 7: Vendor Booking Status Breakdown */}
              <div className="bg-white rounded-2xl border border-stone-300 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <h3 className="text-sm font-bold text-stone-900">7. Vendor Bookings</h3>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                    {telemetry.vendorBookingStatus.total} Total
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-stone-50">
                    <span className="text-stone-600">Confirmed / Completed</span>
                    <span className="font-bold text-emerald-700">{telemetry.vendorBookingStatus.confirmed}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-stone-50">
                    <span className="text-stone-600">Provisional</span>
                    <span className="font-bold text-amber-800">{telemetry.vendorBookingStatus.provisional}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-stone-50">
                    <span className="text-stone-600">Negotiating</span>
                    <span className="font-bold text-stone-800">{telemetry.vendorBookingStatus.negotiating}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-stone-50">
                    <span className="text-stone-600">Quotes Received</span>
                    <span className="font-bold text-stone-800">{telemetry.vendorBookingStatus.quotationReceived}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-stone-600">Shortlisted / Contacted</span>
                    <span className="font-bold text-stone-800">{telemetry.vendorBookingStatus.shortlisted}</span>
                  </div>
                </div>
              </div>

              {/* Metric 8: Guest RSVP Summary */}
              <div className="bg-white rounded-2xl border border-stone-300 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <h3 className="text-sm font-bold text-stone-900">8. Guest & RSVP Summary</h3>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                    {telemetry.guestRsvpSummary.totalInvited} Invited
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-stone-50">
                    <span className="text-stone-600">Attending Guests</span>
                    <span className="font-bold text-emerald-700">
                      {telemetry.guestRsvpSummary.attending} ({telemetry.guestRsvpSummary.attendingHeads} heads)
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-stone-50">
                    <span className="text-stone-600">Declined</span>
                    <span className="font-bold text-rose-800">{telemetry.guestRsvpSummary.declined}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-stone-50">
                    <span className="text-stone-600">Pending Response</span>
                    <span className="font-bold text-stone-800">{telemetry.guestRsvpSummary.pending}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-stone-50">
                    <span className="text-stone-600">Checked-In Door Heads</span>
                    <span className="font-bold text-amber-700">{telemetry.guestRsvpSummary.checkedInCount}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-stone-600">Dietary Restrictions Logged</span>
                    <span className="font-bold text-stone-800">{telemetry.guestRsvpSummary.dietaryCount}</span>
                  </div>
                </div>
              </div>

              {/* Metric 9: Pending Payments */}
              <div className="bg-white rounded-2xl border border-stone-300 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <h3 className="text-sm font-bold text-stone-900">9. Pending Payments</h3>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                    {formatMinor(telemetry.pendingPayments.totalPendingMinor, telemetry.pendingPayments.currency)}
                  </span>
                </div>
                {telemetry.pendingPayments.items.length === 0 ? (
                  <p className="text-xs text-stone-500 py-4 text-center">No outstanding payments due</p>
                ) : (
                  <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                    {telemetry.pendingPayments.items.slice(0, 4).map((item) => (
                      <div key={item.id} className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs flex justify-between items-center">
                        <div>
                          <span className="font-semibold text-stone-900 block line-clamp-1">{item.title}</span>
                          <span className="text-[10px] text-stone-500 block">{item.vendorName || item.eventTitle}</span>
                        </div>
                        <span className="font-bold text-stone-900 ml-2">
                          {formatMinor(item.amountMinor, telemetry.pendingPayments.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Section 4: Operational Radar: Overdue Tasks & Deadlines */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Overdue Tasks Alert List */}
              <div className="bg-white rounded-2xl border border-stone-300 p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                    <h3 className="text-sm font-bold text-stone-900">5. Overdue Tasks Requiring Action</h3>
                  </div>
                  <span className="text-xs font-extrabold text-rose-800">
                    {telemetry.overdueTasks.count} Overdue
                  </span>
                </div>
                {telemetry.overdueTasks.items.length === 0 ? (
                  <div className="py-6 text-center text-xs text-stone-500">
                    &check; All milestone tasks are on schedule!
                  </div>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {telemetry.overdueTasks.items.map((t) => (
                      <div key={t.id} className="p-3 rounded-xl bg-rose-50/40 border border-rose-200 text-xs flex items-center justify-between gap-2">
                        <div>
                          <span className="font-bold text-stone-900 block">{t.title}</span>
                          <span className="text-[10px] text-stone-500">
                            Celebration: {t.eventTitle} &bull; Due: {new Date(t.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-800">
                          {t.priority}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upcoming Deadlines (14 Days) */}
              <div className="bg-white rounded-2xl border border-stone-300 p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <h3 className="text-sm font-bold text-stone-900">6. Upcoming Deadlines (Next 14 Days)</h3>
                  </div>
                  <span className="text-xs font-bold text-stone-600">
                    {telemetry.upcomingDeadlines.count} Due Soon
                  </span>
                </div>
                {telemetry.upcomingDeadlines.items.length === 0 ? (
                  <div className="py-6 text-center text-xs text-stone-500">
                    No immediate task deadlines in the next 14 days.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {telemetry.upcomingDeadlines.items.map((d) => (
                      <div key={d.id} className="p-3 rounded-xl bg-amber-50/40 border border-amber-200 text-xs flex items-center justify-between gap-2">
                        <div>
                          <span className="font-bold text-stone-900 block">{d.title}</span>
                          <span className="text-[10px] text-stone-500">
                            Celebration: {d.eventTitle} &bull; Category: {d.category}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] font-bold text-amber-800 block">
                            {d.daysRemaining === 0 ? 'Today' : `${d.daysRemaining}d left`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Section 5: Recent Activity Chronological Feed */}
            <div className="bg-white rounded-2xl border border-stone-300 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <h3 className="text-sm font-bold text-stone-900">11. Recent Activity Feed</h3>
                <span className="text-xs text-stone-500">Chronological Audit Log</span>
              </div>
              {telemetry.recentActivity.length === 0 ? (
                <div className="py-6 text-center text-xs text-stone-500">
                  No recent activities recorded yet.
                </div>
              ) : (
                <div className="divide-y divide-stone-100 max-h-56 overflow-y-auto">
                  {telemetry.recentActivity.map((a) => (
                    <div key={a.id} className="py-2.5 flex items-center justify-between text-xs gap-4">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0" />
                        <span className="font-semibold text-stone-900">{a.userName}</span>
                        <span className="text-stone-600">{a.action.replace(/_/g, ' ')}</span>
                        <span className="text-stone-400">({a.entityType})</span>
                        <span className="text-stone-400">&bull; in {a.eventTitle}</span>
                      </div>
                      <span className="text-[11px] text-stone-400 shrink-0">
                        {new Date(a.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 6: Upcoming & Active Celebrations Grid (Searchable) */}
            <div className="space-y-4 pt-4 border-t border-stone-200">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-stone-900">
                    2. Active & Upcoming Celebrations
                  </h2>
                  <p className="text-xs text-stone-500">
                    Direct access to individual celebration blueprints, budgets, and reporting suites
                  </p>
                </div>
                <div className="relative w-full sm:max-w-xs">
                  <input
                    type="search"
                    placeholder="Search celebrations..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-stone-300 bg-white text-stone-900 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <svg
                    className="w-4 h-4 text-stone-400 absolute left-3 top-2.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>

              {filteredUpcoming.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border-2 border-dashed border-stone-300 bg-white space-y-3">
                  <p className="text-sm text-stone-600">No celebrations found matching &quot;{search}&quot;.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredUpcoming.map((evt) => {
                    const formattedDate = new Date(evt.startDate).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    });

                    return (
                      <div
                        key={evt.id}
                        className="bg-white rounded-2xl border border-stone-300 shadow-sm hover:shadow-md hover:border-amber-400 transition-all flex flex-col justify-between p-6"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                              {evt.eventType}
                            </span>
                            <StatusBadge label={evt.status} variant={getStatusVariant(evt.status)} />
                          </div>

                          <h3 className="text-xl font-bold text-stone-900 leading-snug line-clamp-1">
                            {evt.title}
                          </h3>

                          <div className="space-y-1.5 text-xs text-stone-600">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-stone-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span>{formattedDate} ({evt.daysUntil} days away)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-stone-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              </svg>
                              <span className="line-clamp-1">{evt.venue}, {evt.city}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-stone-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span>{evt.guestTarget} target guests</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 mt-4 border-t border-stone-200 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-stone-500 uppercase font-semibold block">Budget</span>
                            <span className="text-sm font-bold text-stone-900">
                              {formatMinor(evt.budgetMinor, evt.currency)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Link
                              href={`/events/${evt.id}/reports`}
                              className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-all"
                              aria-label={`View reports for ${evt.title}`}
                            >
                              Reports
                            </Link>
                            <Link
                              href={`/events/${evt.id}`}
                              className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-amber-500"
                            >
                              Open &rarr;
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
