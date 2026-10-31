'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/ui/Navbar';
import { SkipToContent } from '@/components/ui/SkipToContent';
import { Alert } from '@/components/ui/Alert';

export default function NewEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState('WEDDING');
  const [startDate, setStartDate] = useState(
    new Date(Date.now() + 86400000 * 60).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 86400000 * 61).toISOString().split('T')[0]
  );
  const [venue, setVenue] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('USA');
  const [guestTarget, setGuestTarget] = useState(100);
  const [budgetDollars, setBudgetDollars] = useState(25000);
  const [currency, setCurrency] = useState('USD');
  const [theme, setTheme] = useState('');
  const [dietaryNotes, setDietaryNotes] = useState('');
  const [tone, setTone] = useState('Festive & Elegant');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const budgetMinor = Math.round(Number(budgetDollars) * 100);

      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || `Celebration plan for ${title}`,
          eventType,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          venue: venue || 'Venue TBD',
          city: city || 'City TBD',
          country,
          guestTarget: Number(guestTarget),
          budgetMinor,
          currency,
          preferences: {
            theme: theme || `${eventType} Celebration`,
            tone,
            dietaryNotes,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create celebration');
      }

      router.push(`/events/${data.event.id}`);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error creating celebration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fdfbf7] text-stone-900">
      <SkipToContent />
      <Navbar />

      <main id="main-content" className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="text-xs font-semibold text-stone-500 hover:text-stone-800 transition-colors inline-flex items-center gap-1.5"
          >
            &larr; Back to Dashboard
          </Link>
          <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight mt-2">
            Create New Celebration
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Initialize your celebration workspace with budget, guest capacity, and style preferences
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6">
            <Alert type="error" message={errorMessage} onClose={() => setErrorMessage(null)} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-2xl border border-stone-300 shadow-xl space-y-6">
          {/* Section 1: Event Essentials */}
          <div>
            <h2 className="text-lg font-bold text-stone-900 border-b border-stone-200 pb-2 mb-4">
              1. Celebration Essentials
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label htmlFor="evt-title" className="block text-sm font-semibold text-stone-700 mb-1">
                  Celebration Title *
                </label>
                <input
                  id="evt-title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Maya & Liam's Autumn Garden Wedding"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 bg-[#fdfbf7] text-stone-900 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="evt-type" className="block text-sm font-semibold text-stone-700 mb-1">
                  Event Category *
                </label>
                <select
                  id="evt-type"
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 bg-[#fdfbf7] text-stone-900 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="WEDDING">Wedding Celebration</option>
                  <option value="BIRTHDAY">Birthday & Milestone</option>
                  <option value="ANNIVERSARY">Anniversary</option>
                  <option value="ENGAGEMENT">Engagement Soirée</option>
                  <option value="BABY_SHOWER">Baby Shower</option>
                  <option value="CORPORATE">Corporate Gala / Conference</option>
                  <option value="COMMUNITY">Community / Charity Festival</option>
                  <option value="CULTURAL">Cultural Celebration</option>
                  <option value="CUSTOM">Custom Celebration</option>
                </select>
              </div>

              <div>
                <label htmlFor="evt-guests" className="block text-sm font-semibold text-stone-700 mb-1">
                  Target Guest Count *
                </label>
                <input
                  id="evt-guests"
                  type="number"
                  min="1"
                  max="100000"
                  required
                  value={guestTarget}
                  onChange={(e) => setGuestTarget(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 bg-[#fdfbf7] text-stone-900 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="evt-start" className="block text-sm font-semibold text-stone-700 mb-1">
                  Start Date *
                </label>
                <input
                  id="evt-start"
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 bg-[#fdfbf7] text-stone-900 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="evt-end" className="block text-sm font-semibold text-stone-700 mb-1">
                  End Date *
                </label>
                <input
                  id="evt-end"
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 bg-[#fdfbf7] text-stone-900 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Budget & Financial Currency */}
          <div>
            <h2 className="text-lg font-bold text-stone-900 border-b border-stone-200 pb-2 mb-4">
              2. Budget & Precision Currency
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="evt-budget" className="block text-sm font-semibold text-stone-700 mb-1">
                  Total Event Budget ({currency}) *
                </label>
                <input
                  id="evt-budget"
                  type="number"
                  min="100"
                  max="100000000"
                  step="100"
                  required
                  value={budgetDollars}
                  onChange={(e) => setBudgetDollars(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 bg-[#fdfbf7] text-stone-900 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                <span className="text-[11px] text-stone-500 mt-1 block">
                  Computed into integer minor units ({Math.round(budgetDollars * 100).toLocaleString()} minor units) with zero float drift.
                </span>
              </div>

              <div>
                <label htmlFor="evt-currency" className="block text-sm font-semibold text-stone-700 mb-1">
                  Currency *
                </label>
                <select
                  id="evt-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 bg-[#fdfbf7] text-stone-900 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CAD">CAD (C$)</option>
                  <option value="AUD">AUD (A$)</option>
                  <option value="INR">INR (₹)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Location & Venue */}
          <div>
            <h2 className="text-lg font-bold text-stone-900 border-b border-stone-200 pb-2 mb-4">
              3. Location & Venue
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-3">
                <label htmlFor="evt-venue" className="block text-sm font-semibold text-stone-700 mb-1">
                  Venue Name / Location
                </label>
                <input
                  id="evt-venue"
                  type="text"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="e.g. Whispering Oaks Botanical Gardens"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 bg-[#fdfbf7] text-stone-900 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="evt-city" className="block text-sm font-semibold text-stone-700 mb-1">
                  City
                </label>
                <input
                  id="evt-city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. San Francisco"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 bg-[#fdfbf7] text-stone-900 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="evt-country" className="block text-sm font-semibold text-stone-700 mb-1">
                  Country
                </label>
                <input
                  id="evt-country"
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="USA"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 bg-[#fdfbf7] text-stone-900 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Style & Preferences */}
          <div>
            <h2 className="text-lg font-bold text-stone-900 border-b border-stone-200 pb-2 mb-4">
              4. Style & Preferences
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="evt-theme" className="block text-sm font-semibold text-stone-700 mb-1">
                  Theme / Aesthetic
                </label>
                <input
                  id="evt-theme"
                  type="text"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  placeholder="e.g. Rustic Elegance with Warm Amber Accents"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 bg-[#fdfbf7] text-stone-900 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="evt-tone" className="block text-sm font-semibold text-stone-700 mb-1">
                  Atmosphere & Tone
                </label>
                <input
                  id="evt-tone"
                  type="text"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  placeholder="e.g. Festive, Warm & Family-Centric"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 bg-[#fdfbf7] text-stone-900 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="evt-diet" className="block text-sm font-semibold text-stone-700 mb-1">
                  Dietary Accommodations
                </label>
                <input
                  id="evt-diet"
                  type="text"
                  value={dietaryNotes}
                  onChange={(e) => setDietaryNotes(e.target.value)}
                  placeholder="e.g. Vegan and Gluten-free options requested"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 bg-[#fdfbf7] text-stone-900 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-stone-200 flex items-center justify-end gap-3">
            <Link
              href="/dashboard"
              className="px-5 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-sm font-semibold transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-sm font-bold shadow-md transition-all disabled:opacity-50 focus:outline-none focus:ring-4 focus:ring-amber-500/40"
            >
              {loading ? 'Initializing Workspace...' : 'Create Celebration'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

