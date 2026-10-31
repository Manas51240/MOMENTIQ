'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/ui/Navbar';
import { SkipToContent } from '@/components/ui/SkipToContent';
import { EventNavTabs } from '@/components/ui/EventNavTabs';
import { StatusBadge, StatusVariant } from '@/components/ui/StatusBadge';
import { Alert } from '@/components/ui/Alert';

interface EventDetail {
  id: string;
  title: string;
  description: string;
  eventType: string;
  startDate: string;
  endDate: string;
  venue: string;
  city: string;
  country: string;
  guestTarget: number;
  budgetMinor: number | string;
  currency: string;
  status: string;
  preferences?: {
    theme?: string;
    tone?: string;
  };
}

export default function EventOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [budgetMetrics, setBudgetMetrics] = useState<any>(null);
  const [guestMetrics, setGuestMetrics] = useState<any>(null);
  const [riskMetrics, setRiskMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadEventData() {
      try {
        const [evtRes, budgetRes, guestRes, riskRes] = await Promise.all([
          fetch(`/api/events/${id}`),
          fetch(`/api/events/${id}/budgets`),
          fetch(`/api/events/${id}/guests`),
          fetch(`/api/events/${id}/risks`),
        ]);

        if (evtRes.status === 401 || evtRes.status === 403) {
          router.push('/dashboard');
          return;
        }

        const evtData = await evtRes.json();
        if (evtData.success && evtData.event) {
          setEvent(evtData.event);
        }

        const bData = await budgetRes.json().catch(() => null);
        if (bData && bData.metrics) setBudgetMetrics(bData.metrics);

        const gData = await guestRes.json().catch(() => null);
        if (gData && gData.metrics) setGuestMetrics(gData.metrics);

        const rData = await riskRes.json().catch(() => null);
        if (rData && rData.metrics) setRiskMetrics(rData.metrics);
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : 'Error loading celebration details');
      } finally {
        setLoading(false);
      }
    }

    loadEventData();
  }, [id, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#fdfbf7]">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-medium text-stone-600">Loading celebration workspace...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col bg-[#fdfbf7]">
        <Navbar />
        <div className="flex-1 max-w-7xl mx-auto px-4 py-12 text-center space-y-4">
          <Alert type="error" message="Celebration not found or access denied." />
          <Link href="/dashboard" className="inline-block px-4 py-2 bg-stone-900 text-white rounded-lg text-sm">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const daysRemaining = Math.max(
    0,
    Math.ceil((new Date(event.startDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );

  const budgetSpent = budgetMetrics ? Number(budgetMetrics.totalActualPaidMinor) / 100 : 0;
  const totalBudget = Number(event.budgetMinor) / 100;
  const budgetUtilization = totalBudget > 0 ? Math.min(100, Math.round((budgetSpent / totalBudget) * 100)) : 0;
  const currSymbol = event.currency === 'USD' ? '$' : (event.currency === 'INR' ? '₹' : `${event.currency} `);
  const locale = event.currency === 'INR' ? 'en-IN' : 'en-US';

  return (
    <div className="min-h-screen flex flex-col bg-[#fdfbf7] text-stone-900">
      <SkipToContent />
      <Navbar />

      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Celebration Header */}
        <div className="bg-white rounded-2xl border border-stone-300 shadow-sm p-6 sm:p-8 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 border border-amber-200">
                  {event.eventType}
                </span>
                <StatusBadge label={event.status} variant="SUCCESS" />
                {event.preferences?.theme && (
                  <span className="text-xs text-stone-500 font-medium">
                    Theme: {event.preferences.theme}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold text-stone-900 tracking-tight">
                {event.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-sm text-stone-600">
                <span className="flex items-center gap-1.5 font-medium">
                  📅 {new Date(event.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5 font-medium">
                  📍 {event.venue}, {event.city}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5 font-medium">
                  👥 {event.guestTarget} target attendees
                </span>
              </div>
            </div>

            {/* Countdown Badge */}
            <div className="bg-gradient-to-br from-amber-50 to-amber-100/60 border border-amber-200 rounded-xl p-4 sm:p-5 text-center min-w-[160px] shrink-0">
              <span className="text-3xl sm:text-4xl font-black text-amber-900 block tracking-tight">
                {daysRemaining}
              </span>
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block mt-0.5">
                Days to Celebration
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <EventNavTabs eventId={id} />

        {errorMessage && (
          <div className="mt-6">
            <Alert type="error" message={errorMessage} onClose={() => setErrorMessage(null)} />
          </div>
        )}

        {/* Primary Health & Metric Cards */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Budget Health Card */}
          <div className="bg-white p-6 rounded-2xl border border-stone-300 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                Budget Utilization
              </span>
              <div className="text-2xl font-black text-stone-900 mt-2">
                {budgetUtilization}%
              </div>
              <p className="text-xs text-stone-600 mt-1">
                {currSymbol}{budgetSpent.toLocaleString(locale)} spent of {currSymbol}{totalBudget.toLocaleString(locale)}
              </p>
            </div>
            <div className="w-full bg-stone-100 rounded-full h-2.5 mt-4 overflow-hidden border border-stone-200">
              <div
                className={`h-2.5 rounded-full ${budgetUtilization > 90 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                style={{ width: `${budgetUtilization}%` }}
              />
            </div>
          </div>

          {/* Guest Attendance Card */}
          <div className="bg-white p-6 rounded-2xl border border-stone-300 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                Confirmed Attendance
              </span>
              <div className="text-2xl font-black text-stone-900 mt-2">
                {guestMetrics ? guestMetrics.totalAttendingSeats : 0}{' '}
                <span className="text-sm font-medium text-stone-500">/ {event.guestTarget}</span>
              </div>
              <p className="text-xs text-stone-600 mt-1">
                {guestMetrics ? guestMetrics.totalDeclined : 0} declined, {guestMetrics ? guestMetrics.totalPending : 0} pending
              </p>
            </div>
            <div className="pt-2 flex items-center justify-between text-xs font-semibold text-amber-700">
              <span>{guestMetrics ? guestMetrics.totalCheckedIn : 0} checked in</span>
              <Link href={`/events/${id}/guests`} className="hover:underline">Manage &rarr;</Link>
            </div>
          </div>

          {/* AI Architect Quick Launch */}
          <div className="bg-gradient-to-br from-amber-600 to-amber-700 text-white p-6 rounded-2xl shadow-md flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-200">
                AI Event Architect
              </span>
              <div className="text-xl font-bold mt-2">
                12-Section Master Plan
              </div>
              <p className="text-xs text-amber-100 mt-1">
                Regenerate themes, decor concepts, and schedules
              </p>
            </div>
            <Link
              href={`/events/${id}/ai-architect`}
              className="mt-4 inline-block text-center py-2 px-4 rounded-xl bg-white text-stone-900 font-bold text-xs shadow-sm hover:bg-stone-50 transition-colors"
            >
              Open AI Architect Studio &rarr;
            </Link>
          </div>

          {/* Risk Health Card */}
          <div className="bg-white p-6 rounded-2xl border border-stone-300 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                Risk Management
              </span>
              <div className="text-2xl font-black text-stone-900 mt-2 flex items-center gap-2">
                <span>{riskMetrics ? riskMetrics.totalRisks : 0} Risks</span>
                <StatusBadge
                  label={riskMetrics ? riskMetrics.overallEventRiskHealth : 'LOW'}
                  variant={riskMetrics?.overallEventRiskHealth === 'HIGH' ? 'DANGER' : 'SUCCESS'}
                />
              </div>
              <p className="text-xs text-stone-600 mt-1">
                {riskMetrics ? riskMetrics.highRiskCount : 0} high hazards, {riskMetrics ? riskMetrics.mediumRiskCount : 0} moderate
              </p>
            </div>
            <Link
              href={`/events/${id}/risks`}
              className="text-xs font-bold text-amber-700 hover:text-amber-800 transition-colors pt-2 block"
            >
              View Risk Register &rarr;
            </Link>
          </div>
        </div>

        {/* Workspace Quick Links Grid */}
        <div className="mt-10">
          <h2 className="text-lg font-bold text-stone-900 mb-4">Celebration Modules</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link
              href={`/events/${id}/ai-architect`}
              className="bg-white p-6 rounded-2xl border border-stone-300 shadow-sm hover:border-amber-500 hover:shadow-md transition-all space-y-2"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-lg">
                ✨
              </div>
              <h3 className="font-bold text-stone-900">AI Event Architect</h3>
              <p className="text-xs text-stone-600">
                12-section master brief, personalized decor, schedules, assumptions, and feedback.
              </p>
            </Link>

            <Link
              href={`/events/${id}/budget`}
              className="bg-white p-6 rounded-2xl border border-stone-300 shadow-sm hover:border-amber-500 hover:shadow-md transition-all space-y-2"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-lg">
                💵
              </div>
              <h3 className="font-bold text-stone-900">Budget & Financial Management</h3>
              <p className="text-xs text-stone-600">
                Deterministic zero-float minor units, tax basis points, advances, refunds, and CSV reports.
              </p>
            </Link>

            <Link
              href={`/events/${id}/timeline`}
              className="bg-white p-6 rounded-2xl border border-stone-300 shadow-sm hover:border-amber-500 hover:shadow-md transition-all space-y-2"
            >
              <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-lg">
                🗓️
              </div>
              <h3 className="font-bold text-stone-900">Timeline, Milestones & Itinerary</h3>
              <p className="text-xs text-stone-600">
                Interactive Kanban board, DAG cycle detection, and event-day run of show.
              </p>
            </Link>

            <Link
              href={`/events/${id}/vendors`}
              className="bg-white p-6 rounded-2xl border border-stone-300 shadow-sm hover:border-amber-500 hover:shadow-md transition-all space-y-2"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-lg">
                🤝
              </div>
              <h3 className="font-bold text-stone-900">Vendors & Quotations Matrix</h3>
              <p className="text-xs text-stone-600">
                12 categories, 6-step state machine, transparent quote comparison, and contracts.
              </p>
            </Link>

            <Link
              href={`/events/${id}/guests`}
              className="bg-white p-6 rounded-2xl border border-stone-300 shadow-sm hover:border-amber-500 hover:shadow-md transition-all space-y-2"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-lg">
                🎟️
              </div>
              <h3 className="font-bold text-stone-900">Guests, RSVP & Seating</h3>
              <p className="text-xs text-stone-600">
                CSV import validation, unguessable tokenized RSVP codes, door check-ins, and tables.
              </p>
            </Link>

            <Link
              href={`/events/${id}/risks`}
              className="bg-white p-6 rounded-2xl border border-stone-300 shadow-sm hover:border-amber-500 hover:shadow-md transition-all space-y-2"
            >
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-lg">
                🛡️
              </div>
              <h3 className="font-bold text-stone-900">Risk Register & Contingency</h3>
              <p className="text-xs text-stone-600">
                5x5 ISO 31000 RAG matrix, outdoor weather contingencies, and emergency protocols.
              </p>
            </Link>

            <Link
              href={`/events/${id}/reports`}
              className="bg-white p-6 rounded-2xl border border-stone-300 shadow-sm hover:border-amber-500 hover:shadow-md transition-all space-y-2"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-lg">
                📊
              </div>
              <h3 className="font-bold text-stone-900">Reports & Blueprint Exports</h3>
              <p className="text-xs text-stone-600">
                8 dedicated reports, professional vector PDF & RFC 4180 CSV exports with audit integrity.
              </p>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

