'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/ui/Navbar';
import { SkipToContent } from '@/components/ui/SkipToContent';
import { EventNavTabs } from '@/components/ui/EventNavTabs';
import { StatusBadge, StatusVariant } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { MANDATORY_RISK_CATEGORIES } from '@/lib/risk/matrix';

interface RiskMitigation {
  id: string;
  mitigationPlan: string;
  contingencyPlan?: string;
  status: string;
}

interface RiskRecord {
  id: string;
  title: string;
  description?: string;
  category: string;
  probability: number;
  impact: number;
  riskScore: number;
  status: string;
  notes?: string;
  ownerName?: string;
  reviewDate?: string;
  mitigation?: string;
  contingency?: string;
  mitigations?: RiskMitigation[];
  [key: string]: unknown;
}

interface RiskMetrics {
  totalRisks: number;
  unresolvedCount?: number;
  highSeverityCount?: number;
  overallEventRiskHealth: string;
  highRiskCount?: number;
  mediumRiskCount?: number;
  lowRiskCount?: number;
  averageRiskScore?: number;
  [key: string]: unknown;
}

interface RiskPageData {
  success: boolean;
  risks: RiskRecord[];
  metrics: RiskMetrics;
}

export default function RisksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<RiskPageData | null>(null);
  const [alertInfo, setAlertInfo] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; message: string } | null>(null);

  // Category filter
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [expandedRiskId, setExpandedRiskId] = useState<string | null>(null);

  // New Risk Modal State
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [riskTitle, setRiskTitle] = useState('');
  const [riskDescription, setRiskDescription] = useState('');
  const [riskCategory, setRiskCategory] = useState<string>('Vendors');
  const [probability, setProbability] = useState(2);
  const [impact, setImpact] = useState(3);
  const [mitigationPlan, setMitigationPlan] = useState('');
  const [contingencyPlan, setContingencyPlan] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [reviewDate, setReviewDate] = useState('');
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
          description: riskDescription || riskTitle,
          category: riskCategory,
          probability: Number(probability),
          impact: Number(impact),
          mitigationPlan,
          contingencyPlan,
          ownerName: ownerName || 'Assigned Lead',
          reviewDate: reviewDate || null,
        }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error?.message || resData.error || 'Failed to create risk');
      }

      setIsRiskModalOpen(false);
      setRiskTitle('');
      setRiskDescription('');
      setMitigationPlan('');
      setContingencyPlan('');
      setOwnerName('');
      setReviewDate('');
      setAlertInfo({
        type: 'success',
        message: 'Risk item registered with calculated 5x5 severity score, mitigation plan, and review schedule.',
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
        throw new Error(resData.error?.message || resData.error || 'Failed to generate default risks');
      }

      setAlertInfo({
        type: 'success',
        message: resData.message || '11-category comprehensive risk baseline seeded successfully.',
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

  const risks: RiskRecord[] = data?.risks || [];
  const metrics = data?.metrics || {
    totalRisks: 0,
    highRiskCount: 0,
    mediumRiskCount: 0,
    lowRiskCount: 0,
    averageRiskScore: 0,
    overallEventRiskHealth: 'LOW',
  };

  const filteredRisks = risks.filter((r) => {
    if (filterCategory === 'ALL') return true;
    return r.category === filterCategory;
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#fdfbf7] text-stone-900">
      <SkipToContent />
      <Navbar />

      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-stone-500 mb-1">
              <Link href={`/events/${id}`} className="hover:underline">Celebration Hub</Link>
              <span>/</span>
              <span>ISO 31000 Risk Register</span>
            </div>
            <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight flex items-center gap-3">
              Risk Management &amp; Contingency
            </h1>
            <p className="text-sm text-stone-600 mt-1">
              Deterministic 5x5 RAG severity scoring across 11 mandatory domains with mitigations and review schedules.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleGenerateDefaults}
              disabled={generatingDefaults}
              className="px-4 py-2 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-xl transition-all shadow-sm disabled:opacity-50"
            >
              {generatingDefaults ? 'Seeding 11 Domains...' : '✨ Generate 11-Domain Baseline'}
            </button>
            <button
              type="button"
              onClick={() => setIsRiskModalOpen(true)}
              className="px-4 py-2 text-xs font-bold text-white bg-amber-800 hover:bg-amber-900 rounded-xl transition-all shadow-sm"
            >
              + Register Risk
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

        {/* 5x5 Metrics Overview */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">Total Hazards</span>
            <span className="text-2xl font-extrabold text-stone-900">{metrics.totalRisks}</span>
          </div>

          <div className="bg-rose-50 p-4 rounded-xl border border-rose-200 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 block">Critical (Red)</span>
            <span className="text-2xl font-extrabold text-rose-800">{metrics.highRiskCount}</span>
          </div>

          <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 block">Moderate (Amber)</span>
            <span className="text-2xl font-extrabold text-amber-800">{metrics.mediumRiskCount}</span>
          </div>

          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">Acceptable (Green)</span>
            <span className="text-2xl font-extrabold text-emerald-800">{metrics.lowRiskCount}</span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mt-6 bg-white p-4 rounded-xl border border-stone-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <label htmlFor="risk-cat-filter" className="text-xs font-bold text-stone-600 uppercase tracking-wider">
              Filter Domain:
            </label>
            <select
              id="risk-cat-filter"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="text-xs font-medium rounded-lg border-stone-300 py-1.5 px-3 border bg-white focus:ring-amber-500"
            >
              <option value="ALL">All 11 Domains ({risks.length})</option>
              {MANDATORY_RISK_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <span className="text-xs text-stone-500">
            Showing {filteredRisks.length} of {risks.length} risk items
          </span>
        </div>

        {/* Risks Table & Cards */}
        <div className="mt-6 bg-white rounded-2xl border border-stone-300 shadow-sm overflow-hidden">
          {filteredRisks.length === 0 ? (
            <div className="p-12 text-center">
              <span className="text-3xl block mb-2">🛡️</span>
              <h3 className="text-base font-bold text-stone-900">No Risks In Selected Domain</h3>
              <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                Click &quot;Generate 11-Domain Baseline&quot; to seed industry-standard contingencies or register a hazard.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-stone-200">
              {filteredRisks.map((r: RiskRecord) => {
                const score = r.riskScore;
                const isHigh = score >= 15;
                const isMedium = score >= 8 && score < 15;
                const isExpanded = expandedRiskId === r.id;

                const badgeVariant: StatusVariant = isHigh ? 'DANGER' : isMedium ? 'WARNING' : 'SUCCESS';

                return (
                  <div key={r.id} className="p-5 hover:bg-stone-50/60 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-stone-100 text-stone-700 px-2 py-0.5 rounded border border-stone-200">
                            {r.category}
                          </span>
                          <StatusBadge label={isHigh ? 'HIGH' : isMedium ? 'MEDIUM' : 'LOW'} variant={badgeVariant} />
                          <span className="font-mono text-xs text-stone-500">
                            P: {r.probability} &times; I: {r.impact} = <strong>{r.riskScore}/25</strong>
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-stone-900">{r.title}</h3>
                        {r.description && r.description !== r.title && (
                          <p className="text-xs text-stone-600 line-clamp-2">{r.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right text-xs">
                          <span className="text-[10px] uppercase font-bold text-stone-400 block">Owner / Review</span>
                          <span className="font-semibold text-stone-800">{r.ownerName || 'Unassigned'}</span>
                          {r.reviewDate && (
                            <span className="text-[10px] text-stone-500 block">
                              Rev: {new Date(r.reviewDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        <select
                          aria-label={`Update status for risk: ${r.title}`}
                          value={r.status}
                          onChange={(e) => handleStatusChange(r.id, e.target.value)}
                          className="bg-stone-100 text-stone-800 font-semibold px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs focus:ring-2 focus:ring-amber-800"
                        >
                          <option value="IDENTIFIED">Identified</option>
                          <option value="MITIGATED">Mitigated</option>
                          <option value="ACCEPTED">Accepted</option>
                          <option value="CLOSED">Closed</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => setExpandedRiskId(isExpanded ? null : r.id)}
                          className="p-1.5 text-stone-500 hover:text-stone-900 border rounded-lg"
                        >
                          {isExpanded ? '▲' : '▼'}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Protocol Drawer */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-stone-100 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs bg-stone-50/70 p-4 rounded-xl">
                        <div className="space-y-1">
                          <strong className="text-emerald-900 block font-bold">
                            🛡️ Mitigation Protocol (Proactive Controls):
                          </strong>
                          <p className="text-stone-700 leading-relaxed">{r.mitigation || 'No mitigation documented.'}</p>
                        </div>
                        <div className="space-y-1">
                          <strong className="text-amber-900 block font-bold">
                            ⚡ Contingency Protocol (Emergency Fallback):
                          </strong>
                          <p className="text-stone-700 leading-relaxed">{r.contingency || 'No contingency documented.'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* New Risk Modal */}
      <Modal
        isOpen={isRiskModalOpen}
        onClose={() => setIsRiskModalOpen(false)}
        title="Register Event Risk & Contingency"
        description="Quantifies probability and impact on a 1-5 scale across 11 celebration categories."
      >
        <form onSubmit={handleCreateRisk} className="space-y-4">
          <div>
            <label htmlFor="rk-title" className="block text-xs font-semibold text-stone-700 mb-1">
              Risk Title *
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
            <label htmlFor="rk-desc" className="block text-xs font-semibold text-stone-700 mb-1">
              Hazard Description
            </label>
            <textarea
              id="rk-desc"
              rows={2}
              value={riskDescription}
              onChange={(e) => setRiskDescription(e.target.value)}
              placeholder="Describe the failure scenario and potential impact on guests..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="rk-cat" className="block text-xs font-semibold text-stone-700 mb-1">
                Category (11 Domains) *
              </label>
              <select
                id="rk-cat"
                value={riskCategory}
                onChange={(e) => setRiskCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7]"
              >
                {MANDATORY_RISK_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="rk-owner" className="block text-xs font-semibold text-stone-700 mb-1">
                Risk Owner / Lead
              </label>
              <input
                id="rk-owner"
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="e.g. Lead Planner"
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7]"
              />
            </div>
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
              {probability * impact >= 15 ? 'Critical Hazard (Red)' : probability * impact >= 8 ? 'Moderate Risk (Amber)' : 'Acceptable (Green)'}
            </span>
          </div>

          <div>
            <label htmlFor="rk-mit" className="block text-xs font-semibold text-stone-700 mb-1">
              Mitigation (Preventive Protocol) *
            </label>
            <textarea
              id="rk-mit"
              rows={2}
              required
              value={mitigationPlan}
              onChange={(e) => setMitigationPlan(e.target.value)}
              placeholder="Action steps taken in advance to prevent this risk..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7]"
            />
          </div>

          <div>
            <label htmlFor="rk-cont" className="block text-xs font-semibold text-stone-700 mb-1">
              Contingency (Emergency Fallback) *
            </label>
            <textarea
              id="rk-cont"
              rows={2}
              required
              value={contingencyPlan}
              onChange={(e) => setContingencyPlan(e.target.value)}
              placeholder="Action steps executed immediately if the risk occurs..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7]"
            />
          </div>

          <div>
            <label htmlFor="rk-review" className="block text-xs font-semibold text-stone-700 mb-1">
              Review Date
            </label>
            <input
              id="rk-review"
              type="date"
              value={reviewDate}
              onChange={(e) => setReviewDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7]"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-stone-200">
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
              className="px-5 py-2 text-xs font-bold rounded-lg bg-amber-800 text-white hover:bg-amber-900 disabled:opacity-50"
            >
              {submittingRisk ? 'Saving...' : 'Register Risk'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
