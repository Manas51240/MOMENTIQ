'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/ui/Navbar';
import { SkipToContent } from '@/components/ui/SkipToContent';
import { StatusBadge, StatusVariant } from '@/components/ui/StatusBadge';
import { Alert } from '@/components/ui/Alert';

interface EventSummary {
  id: string;
  title: string;
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
  userRole?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventSummary[]>([]);
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

        const eventsRes = await fetch('/api/events');
        const eventsData = await eventsRes.json();
        if (eventsData.success && eventsData.events) {
          setEvents(eventsData.events);
        }
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : 'Failed to load celebrations');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  const filteredEvents = events.filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.eventType.toLowerCase().includes(search.toLowerCase()) ||
    e.city.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusVariant = (status: string): StatusVariant => {
    switch (status) {
      case 'CONFIRMED':
      case 'COMPLETED':
        return 'SUCCESS';
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
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              Celebration Dashboard
            </h1>
            <p className="text-sm text-stone-600 mt-1">
              Manage your active celebrations, AI architectures, and guest manifests
            </p>
          </div>
          <Link
            href="/events/new"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md transition-all hover:scale-[1.02] focus:outline-none focus:ring-4 focus:ring-amber-500/40"
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

        {/* Search & Filter Bar */}
        <div className="mt-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <label htmlFor="search-events" className="sr-only">
              Search celebrations
            </label>
            <input
              id="search-events"
              type="search"
              placeholder="Filter by title, category, or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <svg
              className="w-5 h-5 text-stone-400 absolute left-3.5 top-3"
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

          <div className="text-xs font-semibold text-stone-500">
            Showing {filteredEvents.length} of {events.length} celebrations
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-20 text-center space-y-3">
            <div className="inline-block w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-stone-600 font-medium">Loading celebrations...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredEvents.length === 0 && (
          <div className="mt-12 p-12 text-center rounded-2xl border-2 border-dashed border-stone-300 bg-white space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-2xl">
              🎉
            </div>
            <h2 className="text-lg font-bold text-stone-900">No celebrations found</h2>
            <p className="text-sm text-stone-600 max-w-sm mx-auto">
              {search
                ? 'No celebrations match your search criteria. Try a different term.'
                : 'You have not created any celebrations yet. Launch your first event to get started.'}
            </p>
            <Link
              href="/events/new"
              className="inline-block px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm shadow-sm transition-all"
            >
              Create First Celebration
            </Link>
          </div>
        )}

        {/* Events Grid */}
        {!loading && filteredEvents.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((evt) => {
              const formattedDate = new Date(evt.startDate).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              });

              const budgetAmount = (Number(evt.budgetMinor) / 100).toLocaleString(undefined, {
                style: 'currency',
                currency: evt.currency || 'USD',
                maximumFractionDigits: 0,
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

                    <h2 className="text-xl font-bold text-stone-900 leading-snug line-clamp-1">
                      {evt.title}
                    </h2>

                    <div className="space-y-1.5 text-xs text-stone-600">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-stone-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{formattedDate}</span>
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
                      <span className="text-sm font-bold text-stone-900">{budgetAmount}</span>
                    </div>

                    <Link
                      href={`/events/${evt.id}`}
                      className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      Open Workspace &rarr;
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
