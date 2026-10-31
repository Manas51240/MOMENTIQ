'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Alert } from '@/components/ui/Alert';

export interface PublicInvitation {
  id: string;
  guestName: string;
  currentRsvpStatus: 'PENDING' | 'ATTENDING' | 'DECLINED' | 'MAYBE';
  attendingCount: number;
  dietaryRequirements?: string;
  accessibilityNotes?: string;
  customWording?: string;
  event: {
    id: string;
    title: string;
    eventType: string;
    startDate: string;
    venue: string;
    city: string;
    country: string;
  };
}

export default function PublicRsvpPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<PublicInvitation | null>(null);
  const [rsvpStatus, setRsvpStatus] = useState<'ATTENDING' | 'DECLINED'>('ATTENDING');
  const [attendingCount, setAttendingCount] = useState(1);
  const [dietaryRequirements, setDietaryRequirements] = useState('');
  const [accessibilityNotes, setAccessibilityNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadInvite() {
      try {
        const res = await fetch(`/api/rsvp/${code}`);
        const data = await res.json();
        if (data.success && data.invitation) {
          setInvitation(data.invitation);
          if (data.invitation.currentRsvpStatus === 'DECLINED') {
            setRsvpStatus('DECLINED');
          } else {
            setRsvpStatus('ATTENDING');
          }
          setAttendingCount(data.invitation.attendingCount || 1);
          setDietaryRequirements(data.invitation.dietaryRequirements || '');
          setAccessibilityNotes(data.invitation.accessibilityNotes || '');
        } else {
          setErrorMessage(data.error || 'Invitation not found or link has expired.');
        }
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : 'Error locating your invitation');
      } finally {
        setLoading(false);
      }
    }

    loadInvite();
  }, [code]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/rsvp/${code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rsvpStatus,
          attendingCount: rsvpStatus === 'ATTENDING' ? Number(attendingCount) : 0,
          dietaryRequirements: dietaryRequirements || undefined,
          accessibilityNotes: accessibilityNotes || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit RSVP response');
      }

      setSubmittedMessage(data.message);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to record RSVP response');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfbf7]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-stone-600">Retrieving your celebration invitation...</p>
        </div>
      </div>
    );
  }

  if (errorMessage && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfbf7] p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-stone-300 shadow-xl text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <h1 className="text-xl font-bold text-stone-900">Invitation Not Found</h1>
          <p className="text-sm text-stone-600">{errorMessage}</p>
          <Link
            href="/"
            className="inline-block mt-4 px-4 py-2 rounded-lg bg-stone-900 text-white text-xs font-bold"
          >
            Visit CELEBRA Home
          </Link>
        </div>
      </div>
    );
  }

  const evt = invitation?.event;
  const eventDate = evt?.startDate
    ? new Date(evt.startDate).toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#fdfbf7] via-[#f7f3eb] to-[#ece5d8] p-4 sm:p-6 lg:p-8 text-stone-900">
      <main className="w-full max-w-xl bg-white p-8 sm:p-10 rounded-3xl border border-stone-300 shadow-2xl space-y-6">
        {/* Celebration Title & Details Header */}
        <div className="text-center space-y-2 border-b border-stone-200 pb-6">
          <span className="text-[11px] font-bold tracking-widest text-amber-800 uppercase px-3 py-1 rounded-full bg-amber-100 border border-amber-200 inline-block">
            {evt?.eventType || 'Celebration'}
          </span>
          <h1 className="text-2xl sm:text-4xl font-serif font-black text-stone-900 tracking-tight">
            {evt?.title}
          </h1>
          <div className="pt-2 text-sm text-stone-600 space-y-1 font-medium">
            <p className="text-stone-800 font-semibold">{eventDate}</p>
            <p>{evt?.venue}, {evt?.city}, {evt?.country}</p>
          </div>
        </div>

        {/* Personalized Host Custom Copy (if available) */}
        {invitation?.customWording && (
          <div className="p-5 rounded-2xl bg-[#fbf8f3] border border-amber-200 font-serif text-sm leading-relaxed text-stone-800 italic text-center">
            &ldquo;{invitation.customWording}&rdquo;
          </div>
        )}

        {/* Guest Greeting */}
        <div className="text-center">
          <h2 className="text-lg font-bold text-stone-900">
            Welcome, {invitation?.guestName}
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Please confirm your attendance below so we can accommodate your party
          </p>
        </div>

        {submittedMessage ? (
          <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-300 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto text-xl font-bold">
              ✓
            </div>
            <h3 className="text-lg font-bold text-emerald-950">RSVP Confirmed!</h3>
            <p className="text-sm text-emerald-800 leading-relaxed">{submittedMessage}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {errorMessage && <Alert type="error" message={errorMessage} />}

            {/* Attendance Toggle */}
            <div className="grid grid-cols-2 gap-4">
              <label
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  rsvpStatus === 'ATTENDING'
                    ? 'border-emerald-500 bg-emerald-50/60 shadow-sm'
                    : 'border-stone-200 bg-[#fdfbf7] hover:border-stone-300'
                }`}
              >
                <input
                  type="radio"
                  name="rsvpStatus"
                  value="ATTENDING"
                  checked={rsvpStatus === 'ATTENDING'}
                  onChange={() => setRsvpStatus('ATTENDING')}
                  className="sr-only"
                />
                <span className="text-2xl mb-1">🎉</span>
                <span className="font-bold text-sm text-stone-900">Attending</span>
                <span className="text-[11px] text-stone-500">I will celebrate</span>
              </label>

              <label
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  rsvpStatus === 'DECLINED'
                    ? 'border-rose-400 bg-rose-50/60 shadow-sm'
                    : 'border-stone-200 bg-[#fdfbf7] hover:border-stone-300'
                }`}
              >
                <input
                  type="radio"
                  name="rsvpStatus"
                  value="DECLINED"
                  checked={rsvpStatus === 'DECLINED'}
                  onChange={() => setRsvpStatus('DECLINED')}
                  className="sr-only"
                />
                <span className="text-2xl mb-1">💌</span>
                <span className="font-bold text-sm text-stone-900">Respectfully Decline</span>
                <span className="text-[11px] text-stone-500">Sending best wishes</span>
              </label>
            </div>

            {/* Attending Count */}
            {rsvpStatus === 'ATTENDING' && (
              <div className="space-y-4 pt-2">
                <div>
                  <label htmlFor="party-count" className="block text-xs font-semibold text-stone-700 mb-1">
                    Number of Attendees in Your Party
                  </label>
                  <input
                    id="party-count"
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={attendingCount}
                    onChange={(e) => setAttendingCount(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-[#fdfbf7] text-stone-900 text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="diet-notes" className="block text-xs font-semibold text-stone-700 mb-1">
                    Dietary Requirements & Allergens
                  </label>
                  <input
                    id="diet-notes"
                    type="text"
                    value={dietaryRequirements}
                    onChange={(e) => setDietaryRequirements(e.target.value)}
                    placeholder="e.g. Vegetarian, Nut Allergy, Halal"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-[#fdfbf7] text-stone-900 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="access-notes" className="block text-xs font-semibold text-stone-700 mb-1">
                    Accessibility Accommodations
                  </label>
                  <input
                    id="access-notes"
                    type="text"
                    value={accessibilityNotes}
                    onChange={(e) => setAccessibilityNotes(e.target.value)}
                    placeholder="e.g. Step-free access, wheelchair seating"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-[#fdfbf7] text-stone-900 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm shadow-md transition-all disabled:opacity-50 focus:outline-none focus:ring-4 focus:ring-stone-400"
            >
              {submitting ? 'Submitting...' : 'Submit RSVP Response'}
            </button>
          </form>
        )}

        <div className="pt-4 border-t border-stone-200 text-center">
          <span className="text-[11px] text-stone-400">
            Secure token: {code} &bull; Powered by CELEBRA
          </span>
        </div>
      </main>
    </div>
  );
}

