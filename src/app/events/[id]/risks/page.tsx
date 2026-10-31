'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/ui/Navbar';
import { SkipToContent } from '@/components/ui/SkipToContent';
import { EventNavTabs } from '@/components/ui/EventNavTabs';
import { StatusBadge, StatusVariant } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';

export default function RisksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [alertInfo, setAlertInfo] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New Risk Modal State
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [riskTitle, setRiskTitle] = useState('');
  const [riskCategory, setRiskCategory] = useState('Weather & Climate');
  const [probability, setProbability] = useState(3);
  const [impact, setImpact] = useState(3);
  const [mitigationPlan, setMitigationPlan] = useState('');
  const [contingencyPlan, setContingencyPlan] = useState('');
  const [notes, setNotes] = useState('');
  const [submittingRisk, setSubmittingRisk] = useState(false);

  // Baseline Generation State
  const [generatingDefaults, setGeneratingDefaults] = useState(false);

  const loadRisks = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${id}/risks`);
      const resData = await res.json();
      if (resData.success) {
        setData(resData);
      }
    } catch (err: unknown) {
      setAlertInfo({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to load risk register',
      });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadRisks();
  }, [loadRisks]);

  const handleCreateRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingRisk(true);
    setAlertInfo(null);

    try {
      const res = await fetch(`/api/events/${id}/risks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: riskTitle,
          category: riskCategory,
          probability: Number(probability),
          impact: Number(impact),
          mitigationPlan,
          contingencyPlan,
          notes,
        }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || 'Failed to create risk');
      }

      setIsRiskModalOpen(false);
      setRiskTitle('');
      setMitigationPlan('');
      setContingencyPlan('');
      setAlertInfo({
        type: 'success',
        message: 'Risk item registered with calculated 5x5 severity score and mitigation plan.',
      });
      await loadRisks();
    } catch (err: unknown) {
      setAlertInfo({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error creating risk item',
      });
    } finally {
      setSubmittingRisk(false);
    }
  };

  const handleStatusChange = async (riskId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/events/${id}/risks/${riskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error('Failed to update risk status');

      await loadRisks();
    } catch (err: unknown) {
      setAlertInfo({
        type: 'error',
        message: err instanceof Error ? err.message : 'Status update failed',
      });
    }
  };

  const handleGenerateDefaults = async () => {
    setGeneratingDefaults(true);
    setAlertInfo(null);

    try {
      const res = await fetch(`/api/events/${id}/risks/generate`, {
        method: 'POST',
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || 'Failed to generate default risks');
      }

      setAlertInfo({
        type: 'success',
        message: resData.message || 'Baseline risk register seeded based on venue and celebration type.',
      });
      await loadRisks();
    } catch (err: unknown) {
      setAlertInfo({
        type: 'error',
        message: err instanceof Error ? err.message : 'Seeding failed',
      });
    } finally {
      setGeneratingDefaults(false);
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

  const getRagVariant = (rating: string): StatusVariant => {
    switch (rating) {
      case 'HIGH':
        return 'DANGER';
      case 'MEDIUM':
        return 'WARNING';
      case 'LOW':
      default:
        return 'SUCCESS';
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
              <span>ISO 31000 Risk Governance</span>
            </div>
            <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight">
              Risk Register & Contingency Planning
            </h1>
            <p className="text-sm text-stone-600 mt-1">
              Deterministic 5x5 RAG severity matrix, weather contingency protocols, and emergency mitigations
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleGenerateDefaults}
              disabled={generatingDefaults}
              className="px-4 py-2.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 font-semibold text-xs shadow-sm transition-colors flex items-center gap-1.5"
            >
              <span>🛡️</span>
              <span>{generatingDefaults ? 'Seeding...' : 'Seed Venue Baseline'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsRiskModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 focus:ring-4 focus:ring-amber-500/40"
            >
              <span>+</span>
              <span>Register Risk</span>
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

        {/* 5x5 RAG Matrix Metrics */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-stone-300 shadow-sm">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
              Total Risks
            </span>
            <span className="text-2xl font-black text-stone-900 mt-1 block">
              {metrics.totalRisks || 0}
            </span>
            <span className="text-[11px] text-stone-500 block mt-0.5">Identified hazards</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-300 shadow-sm">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
              Critical Hazards
            </span>
            <span className="text-2xl font-black text-rose-700 mt-1 block">
              {metrics.highRiskCount || 0}
            </span>
            <span className="text-[11px] text-rose-600 font-semibold block mt-0.5">Score &ge; 15 (Red)</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-300 shadow-sm">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
              Moderate Risks
            </span>
            <span className="text-2xl font-black text-amber-700 mt-1 block">
              {metrics.mediumRiskCount || 0}
            </span>
            <span className="text-[11px] text-amber-600 font-semibold block mt-0.5">Score 8-12 (Amber)</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-300 shadow-sm">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
              Low Risks
            </span>
            <span className="text-2xl font-black text-emerald-700 mt-1 block">
              {metrics.lowRiskCount || 0}
            </span>
            <span className="text-[11px] text-emerald-600 font-semibold block mt-0.5">Score 1-6 (Green)</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-300 shadow-sm">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
              Overall Event Health
            </span>
            <div className="mt-1 flex items-center gap-2">
              <StatusBadge
                label={metrics.overallEventRiskHealth || 'LOW'}
                variant={getRagVariant(metrics.overallEventRiskHealth || 'LOW')}
              />
            </div>
            <span className="text-[11px] text-stone-500 block mt-1.5">
              Avg score: {metrics.averageRiskScore || 0}/25
            </span>
          </div>
        </div>

        {/* Risk Register Table */}
        <div className="mt-8 bg-white rounded-2xl border border-stone-300 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-stone-900">Risk Assessment & Contingency Ledger</h2>
            <span className="text-xs text-stone-500 font-medium">
              5x5 Formula: Score = Probability &times; Impact
            </span>
          </div>

          {data?.risks?.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="text-3xl">🛡️</div>
              <h3 className="text-base font-bold text-stone-900">No risks registered yet</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Click &ldquo;Seed Venue Baseline&rdquo; to automatically identify outdoor weather contingencies and technical hazards.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#fbf8f3] text-stone-700 text-xs uppercase font-bold border-b border-stone-200">
                  <tr>
                    <th className="py-3 px-4">Risk Item</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">P &times; I</th>
                    <th className="py-3 px-4">Score & RAG</th>
                    <th className="py-3 px-4">Mitigation & Contingency</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {data?.risks?.map((r: any) => {
                    const firstMit = r.mitigations?.[0];
                    return (
                      <tr key={r.id} className="hover:bg-stone-50/50">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-stone-900">{r.title}</div>
                          {r.notes && <div className="text-[11px] text-stone-500 mt-0.5">{r.notes}</div>}
                        </td>
                        <td className="py-3 px-4 text-xs font-medium text-stone-700">{r.category}</td>
                        <td className="py-3 px-4 font-mono text-xs">
                          {r.probability} &times; {r.impact}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-stone-900">{r.riskScore}</span>
                            <StatusBadge label={r.severity?.rating} variant={getRagVariant(r.severity?.rating)} />
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs space-y-1 max-w-md">
                          {firstMit && (
                            <>
                              <div className="text-stone-700">
                                <span className="font-bold text-emerald-800">Mitigation:</span> {firstMit.mitigationPlan}
                              </div>
                              <div className="text-stone-700">
                                <span className="font-bold text-amber-800">Contingency:</span> {firstMit.contingencyPlan}
                              </div>
                            </>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={r.status}
                            onChange={(e) => handleStatusChange(r.id, e.target.value)}
                            className="bg-stone-100 text-stone-800 font-semibold px-2 py-1 rounded border border-stone-200 text-xs"
                          >
                            <option value="IDENTIFIED">Identified</option>
                            <option value="MITIGATED">Mitigated</option>
                            <option value="ACCEPTED">Accepted</option>
                            <option value="CLOSED">Closed</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* New Risk Modal */}
      <Modal
        isOpen={isRiskModalOpen}
        onClose={() => setIsRiskModalOpen(false)}
        title="Register Event Risk & Contingency"
        description="Quantifies probability and impact on a 1-5 scale and defines mandatory mitigation protocols."
      >
        <form onSubmit={handleCreateRisk} className="space-y-4">
          <div>
            <label htmlFor="rk-title" className="block text-xs font-semibold text-stone-700 mb-1">
              Risk Title / Hazard Description *
            </label>
            <input
              id="rk-title"
              type="text"
              required
              value={riskTitle}
              onChange={(e) => setRiskTitle(e.target.value)}
              placeholder="e.g. Torrential Rain Intrusion into Garden Pavilion"
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7]"
            />
          </div>

          <div>
            <label htmlFor="rk-cat" className="block text-xs font-semibold text-stone-700 mb-1">
              Risk Category *
            </label>
            <select
              id="rk-cat"
              value={riskCategory}
              onChange={(e) => setRiskCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7]"
            >
              <option value="Weather & Climate">Weather & Climate</option>
              <option value="Vendor & Procurement">Vendor & Procurement</option>
              <option value="Technical & AV">Technical & AV</option>
              <option value="Safety, Health & Medical">Safety, Health & Medical</option>
              <option value="Logistics & Transportation">Logistics & Transportation</option>
              <option value="Financial & Budgetary">Financial & Budgetary</option>
              <option value="Operational">Operational</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="rk-prob" className="block text-xs font-semibold text-stone-700 mb-1">
                Probability (1: Rare &rarr; 5: Likely) *
              </label>
              <input
                id="rk-prob"
                type="number"
                min="1"
                max="5"
                required
                value={probability}
                onChange={(e) => setProbability(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7]"
              />
            </div>

            <div>
              <label htmlFor="rk-imp" className="block text-xs font-semibold text-stone-700 mb-1">
                Impact (1: Minor &rarr; 5: Severe) *
              </label>
              <input
                id="rk-imp"
                type="number"
                min="1"
                max="5"
                required
                value={impact}
                onChange={(e) => setImpact(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7]"
              />
            </div>
          </div>

          <div className="p-3 bg-stone-100 rounded-lg text-xs flex justify-between font-mono">
            <span>Computed Score: {probability * impact}/25</span>
            <span className="font-bold text-stone-800">
              {probability * impact >= 15 ? 'Critical (Red)' : probability * impact >= 8 ? 'Moderate (Amber)' : 'Low (Green)'}
            </span>
          </div>

          <div>
            <label htmlFor="rk-mit" className="block text-xs font-semibold text-stone-700 mb-1">
              Mitigation Plan (Preventive Actions) *
            </label>
            <textarea
              id="rk-mit"
              rows={2}
              required
              value={mitigationPlan}
              onChange={(e) => setMitigationPlan(e.target.value)}
              placeholder="Continuous meteorological tracking; install elevated duckboards 24h prior..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7]"
            />
          </div>

          <div>
            <label htmlFor="rk-cont" className="block text-xs font-semibold text-stone-700 mb-1">
              Contingency Protocol (Emergency Response) *
            </label>
            <textarea
              id="rk-cont"
              rows={2}
              required
              value={contingencyPlan}
              onChange={(e) => setContingencyPlan(e.target.value)}
              placeholder="Immediate transfer to secondary indoor hall if rain chance > 50%..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7]"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsRiskModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingRisk}
              className="px-5 py-2 text-xs font-bold rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {submittingRisk ? 'Saving...' : 'Register Risk'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
