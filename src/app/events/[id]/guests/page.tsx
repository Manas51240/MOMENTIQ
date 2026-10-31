'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/ui/Navbar';
import { SkipToContent } from '@/components/ui/SkipToContent';
import { EventNavTabs } from '@/components/ui/EventNavTabs';
import { StatusBadge, StatusVariant } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';

export default function GuestsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [alertInfo, setAlertInfo] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Add Guest Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestCount, setGuestCount] = useState(1);
  const [guestDiet, setGuestDiet] = useState('');
  const [guestAccess, setGuestAccess] = useState('');
  const [guestTable, setGuestTable] = useState('');
  const [submittingGuest, setSubmittingGuest] = useState(false);

  // CSV Import Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);

  // AI Invitation Copy Modal
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const [inviteTone, setInviteTone] = useState('CELEBRATORY');
  const [generatedCopy, setGeneratedCopy] = useState<any>(null);
  const [generatingCopy, setGeneratingCopy] = useState(false);

  const loadGuests = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${id}/guests`);
      const resData = await res.json();
      if (resData.success) {
        setData(resData);
      }
    } catch (err: unknown) {
      setAlertInfo({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to load guest list',
      });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadGuests();
  }, [loadGuests]);

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingGuest(true);
    setAlertInfo(null);

    try {
      const res = await fetch(`/api/events/${id}/guests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: guestName,
          email: guestEmail || undefined,
          phone: guestPhone || undefined,
          attendingCount: Number(guestCount),
          dietaryRequirements: guestDiet || undefined,
          accessibilityNotes: guestAccess,
          seatingTable: guestTable || undefined,
        }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || 'Failed to add guest');
      }

      setIsAddModalOpen(false);
      setGuestName('');
      setGuestEmail('');
      setAlertInfo({
        type: 'success',
        message: 'Guest registered with unique tokenized invitation code.',
      });
      await loadGuests();
    } catch (err: unknown) {
      setAlertInfo({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error registering guest',
      });
    } finally {
      setSubmittingGuest(false);
    }
  };

  const handleCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setImporting(true);
    setAlertInfo(null);

    try {
      const res = await fetch(`/api/events/${id}/guests/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || 'CSV import failed');
      }

      setIsImportModalOpen(false);
      setCsvText('');
      setAlertInfo({
        type: 'success',
        message: `CSV Imported successfully! Inserted: ${resData.importedCount}, Excluded duplicates: ${resData.skippedDuplicates}.`,
      });
      await loadGuests();
    } catch (err: unknown) {
      setAlertInfo({
        type: 'error',
        message: err instanceof Error ? err.message : 'Import failed',
      });
    } finally {
      setImporting(false);
    }
  };

  const handleCheckInToggle = async (guest: any) => {
    try {
      const res = await fetch(`/api/events/${id}/guests/${guest.id}/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkedIn: !guest.checkedIn }),
      });

      if (!res.ok) throw new Error('Failed to update door check-in status');

      await loadGuests();
    } catch (err: unknown) {
      setAlertInfo({
        type: 'error',
        message: err instanceof Error ? err.message : 'Check-in update failed',
      });
    }
  };

  const handleGenerateCopy = async () => {
    if (!selectedGuest) return;
    setGeneratingCopy(true);

    try {
      const res = await fetch(`/api/events/${id}/guests/${selectedGuest.id}/invitation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tone: inviteTone }),
      });

      const resData = await res.json();
      if (resData.success) {
        setGeneratedCopy(resData.invitation);
      }
    } catch {
      // safe ignore
    } finally {
      setGeneratingCopy(false);
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

  const getRsvpVariant = (status: string): StatusVariant => {
    switch (status) {
      case 'ATTENDING':
        return 'SUCCESS';
      case 'DECLINED':
        return 'DANGER';
      case 'MAYBE':
        return 'WARNING';
      default:
        return 'PENDING';
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
              <span>Guest Manifest & RSVP</span>
            </div>
            <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight">
              Guest List, Invitations & Seating
            </h1>
            <p className="text-sm text-stone-600 mt-1">
              Tokenized zero-auth RSVP portals, CSV batch imports with duplicate detection, and door check-in
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="px-4 py-2.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 font-semibold text-xs shadow-sm transition-colors flex items-center gap-1.5"
            >
              <span>📄</span>
              <span>Import CSV</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 focus:ring-4 focus:ring-amber-500/40"
            >
              <span>+</span>
              <span>Add Guest</span>
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

        {/* Headcount Metrics Cards */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-4 rounded-xl border border-stone-300 shadow-sm">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
              Total Records
            </span>
            <span className="text-xl font-black text-stone-900 mt-1 block">
              {metrics.totalGuestRecords || 0}
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-stone-300 shadow-sm">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
              Invited Seats
            </span>
            <span className="text-xl font-black text-stone-900 mt-1 block">
              {metrics.totalInvitedSeats || 0}
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-stone-300 shadow-sm">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
              Attending
            </span>
            <span className="text-xl font-black text-emerald-700 mt-1 block">
              {metrics.totalAttendingSeats || 0}
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-stone-300 shadow-sm">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
              Declined
            </span>
            <span className="text-xl font-black text-rose-700 mt-1 block">
              {metrics.totalDeclined || 0}
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-stone-300 shadow-sm">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
              Pending
            </span>
            <span className="text-xl font-black text-amber-700 mt-1 block">
              {metrics.totalPending || 0}
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-stone-300 shadow-sm">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
              Door Checked In
            </span>
            <span className="text-xl font-black text-purple-700 mt-1 block">
              {metrics.totalCheckedIn || 0}
            </span>
          </div>
        </div>

        {/* Guests Table */}
        <div className="mt-8 bg-white rounded-2xl border border-stone-300 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-stone-900">Guest Manifest</h2>
            <span className="text-xs text-stone-500">
              PII is automatically masked for read-only viewers
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#fbf8f3] text-stone-700 text-xs uppercase font-bold border-b border-stone-200">
                <tr>
                  <th scope="col" className="py-3 px-4">Guest Name</th>
                  <th scope="col" className="py-3 px-4">Contact</th>
                  <th scope="col" className="py-3 px-4">Seats</th>
                  <th scope="col" className="py-3 px-4">RSVP</th>
                  <th scope="col" className="py-3 px-4">Table</th>
                  <th scope="col" className="py-3 px-4">Check-In</th>
                  <th scope="col" className="py-3 px-4 text-right">Invitation & Portal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {data?.guests?.map((g: any) => {
                  const rsvpUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/rsvp/${g.invitationCode}`;

                  return (
                    <tr key={g.id} className="hover:bg-stone-50/50">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-stone-900">{g.name}</div>
                        {g.dietaryRequirements && (
                          <span className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-block mt-0.5">
                            Diet: {g.dietaryRequirements}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-stone-600">
                        {g.email && <div>{g.email}</div>}
                        {g.phone && <div>{g.phone}</div>}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium">{g.attendingCount}</td>
                      <td className="py-3 px-4">
                        <StatusBadge label={g.rsvpStatus} variant={getRsvpVariant(g.rsvpStatus)} />
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-stone-700">
                        {g.seatingTable || 'Unassigned'}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => handleCheckInToggle(g)}
                          className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                            g.checkedIn
                              ? 'bg-purple-100 text-purple-900 border border-purple-300'
                              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                          }`}
                        >
                          {g.checkedIn ? '✓ Checked In' : 'Check In'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(rsvpUrl);
                            setAlertInfo({
                              type: 'success',
                              message: `RSVP link copied to clipboard for ${g.name}!`,
                            });
                          }}
                          className="px-2.5 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold"
                        >
                          Copy Link
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedGuest(g);
                            setIsInviteModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded bg-amber-800 hover:bg-amber-900 text-white text-xs font-semibold"
                        >
                          Wording
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add Guest Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Individual Guest"
        description="Registers guest, issues unguessable invitation token, and checks for duplicates."
      >
        <form onSubmit={handleAddGuest} className="space-y-4">
          <div>
            <label htmlFor="g-name" className="block text-xs font-semibold text-stone-700 mb-1">
              Guest Full Name *
            </label>
            <input
              id="g-name"
              type="text"
              required
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="e.g. Dr. Arthur Dent"
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="g-email" className="block text-xs font-semibold text-stone-700 mb-1">
                Email Address
              </label>
              <input
                id="g-email"
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="arthur@example.com"
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7]"
              />
            </div>

            <div>
              <label htmlFor="g-phone" className="block text-xs font-semibold text-stone-700 mb-1">
                Phone Number
              </label>
              <input
                id="g-phone"
                type="tel"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                placeholder="+1-555-0199"
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="g-seats" className="block text-xs font-semibold text-stone-700 mb-1">
                Party Count (Seats) *
              </label>
              <input
                id="g-seats"
                type="number"
                min="1"
                max="20"
                required
                value={guestCount}
                onChange={(e) => setGuestCount(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7]"
              />
            </div>

            <div>
              <label htmlFor="g-table" className="block text-xs font-semibold text-stone-700 mb-1">
                Table Name / Number
              </label>
              <input
                id="g-table"
                type="text"
                value={guestTable}
                onChange={(e) => setGuestTable(e.target.value)}
                placeholder="Table 4"
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="g-diet" className="block text-xs font-semibold text-stone-700 mb-1">
              Dietary Restrictions
            </label>
            <input
              id="g-diet"
              type="text"
              value={guestDiet}
              onChange={(e) => setGuestDiet(e.target.value)}
              placeholder="e.g. Vegetarian, Peanut allergy"
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7]"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingGuest}
              className="px-5 py-2 text-xs font-bold rounded-lg bg-amber-800 text-white hover:bg-amber-900 disabled:opacity-50"
            >
              {submittingGuest ? 'Registering...' : 'Add Guest'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CSV Import Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Batch Import Guest List CSV"
        description="Paste raw CSV text with headers: Name, Email, Phone, Attending Count, Dietary, Accessibility."
      >
        <form onSubmit={handleCsvImport} className="space-y-4">
          <div>
            <label htmlFor="csv-content" className="sr-only">
              CSV Content
            </label>
            <textarea
              id="csv-content"
              rows={8}
              required
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={`Name,Email,Phone,Attending Count,Dietary
Sarah Connor,sarah@example.com,+1-555-0101,2,Gluten-Free
John Connor,john@example.com,+1-555-0102,1,None`}
              className="w-full p-3 font-mono text-xs rounded-lg border border-stone-300 bg-[#fdfbf7]"
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsImportModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={importing}
              className="px-5 py-2 text-xs font-bold rounded-lg bg-amber-800 text-white hover:bg-amber-900 disabled:opacity-50"
            >
              {importing ? 'Importing...' : 'Import Guests'}
            </button>
          </div>
        </form>
      </Modal>

      {/* AI Invitation Studio Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => {
          setIsInviteModalOpen(false);
          setGeneratedCopy(null);
        }}
        title="Creative Studio Invitation Copy"
        description={selectedGuest ? `Personalized wording for: ${selectedGuest.name}` : ''}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label htmlFor="inv-tone" className="text-xs font-semibold text-stone-700">
              Select Tone:
            </label>
            <select
              id="inv-tone"
              value={inviteTone}
              onChange={(e) => setInviteTone(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-stone-300 bg-[#fdfbf7]"
            >
              <option value="CELEBRATORY">Celebratory & Festive</option>
              <option value="FORMAL">Formal & Elegant</option>
              <option value="MODERN_MINIMAL">Modern & Minimal</option>
              <option value="WARM_FAMILY">Warm & Family-Centric</option>
            </select>
            <button
              type="button"
              onClick={handleGenerateCopy}
              disabled={generatingCopy}
              className="px-4 py-1.5 rounded-lg bg-amber-800 text-white font-bold text-xs hover:bg-amber-900 disabled:opacity-50"
            >
              {generatingCopy ? 'Drafting...' : 'Generate Copy'}
            </button>
          </div>

          {generatedCopy && (
            <div className="p-4 rounded-xl bg-[#fdfbf7] border border-stone-300 space-y-3 font-serif text-sm">
              <h3 className="font-bold text-stone-900 text-base">{generatedCopy.headline}</h3>
              <p className="font-semibold text-stone-800">{generatedCopy.salutation}</p>
              <p className="text-stone-700 leading-relaxed">{generatedCopy.body}</p>
              <p className="font-semibold text-amber-900">{generatedCopy.callToAction}</p>
              <p className="italic text-stone-600">{generatedCopy.signOff}</p>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(generatedCopy.formattedInvitationText);
                  setAlertInfo({
                    type: 'success',
                    message: 'Invitation text copied to clipboard!',
                  });
                }}
                className="mt-2 px-3 py-1 rounded bg-stone-900 text-white font-sans text-xs font-semibold"
              >
                Copy Full Invitation Text
              </button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
