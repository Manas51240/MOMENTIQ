'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/ui/Navbar';
import { SkipToContent } from '@/components/ui/SkipToContent';
import { EventNavTabs } from '@/components/ui/EventNavTabs';
import { Alert } from '@/components/ui/Alert';

interface AiSection {
  key: string;
  title: string;
  content: unknown;
}

interface EventHeaderRecord {
  id?: string;
  title?: string;
  [key: string]: unknown;
}

export default function AiArchitectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [event, setEvent] = useState<EventHeaderRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [plan, setPlan] = useState<Record<string, unknown> | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>('executiveSummary');
  const [editableContent, setEditableContent] = useState<Record<string, string>>({});
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackComment, setFeedbackComment] = useState<string>('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);
  const [alertInfo, setAlertInfo] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Input Parameter Customizations
  const [style, setStyle] = useState('Festive & Elegant');
  const [indoorOutdoor, setIndoorOutdoor] = useState('OUTDOOR');
  const [specialInstructions, setSpecialInstructions] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [evtRes, planRes] = await Promise.all([
          fetch(`/api/events/${id}`),
          fetch(`/api/events/${id}/ai-architect`),
        ]);

        const evtData = await evtRes.json();
        if (evtData.success && evtData.event) {
          setEvent(evtData.event);
          if (evtData.event.venue?.toLowerCase().includes('garden') || evtData.event.venue?.toLowerCase().includes('outdoor')) {
            setIndoorOutdoor('OUTDOOR');
          } else {
            setIndoorOutdoor('INDOOR');
          }
        }

        const planData = await planRes.json().catch(() => null);
        if (planData && planData.success && planData.plan) {
          setPlan(planData.plan);
          setGenerationId(planData.plan.id || null);
          initializeEditable(planData.plan.structuredPlan);
        }
      } catch (err: unknown) {
        setAlertInfo({
          type: 'error',
          message: err instanceof Error ? err.message : 'Error loading AI Architect Studio',
        });
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  const initializeEditable = (structuredPlan: Record<string, unknown> | null) => {
    if (!structuredPlan) return;
    const initial: Record<string, string> = {};
    for (const [key, val] of Object.entries(structuredPlan)) {
      initial[key] = typeof val === 'string' ? val : JSON.stringify(val, null, 2);
    }
    setEditableContent(initial);
  };

  const handleGenerateFullPlan = async () => {
    setGenerating(true);
    setAlertInfo(null);

    try {
      const res = await fetch(`/api/events/${id}/ai-architect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          style,
          indoorOutdoor,
          specialInstructions,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate master event plan');
      }

      setPlan(data.plan);
      setGenerationId(data.plan.id || null);
      initializeEditable(data.plan.structuredPlan);
      setAlertInfo({
        type: 'success',
        message: 'Master event plan generated successfully across all 12 dimensions!',
      });
    } catch (err: unknown) {
      setAlertInfo({
        type: 'error',
        message: err instanceof Error ? err.message : 'Generation failed',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerateSection = async (sectionKey: string) => {
    setGenerating(true);
    setAlertInfo(null);

    try {
      const res = await fetch(`/api/events/${id}/ai-architect`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionName: sectionKey,
          instructions: `Regenerate with fresh creative ideas for ${style}`,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Failed to regenerate ${sectionKey}`);
      }

      const updatedVal = data.sectionContent;
      setEditableContent((prev) => ({
        ...prev,
        [sectionKey]: typeof updatedVal === 'string' ? updatedVal : JSON.stringify(updatedVal, null, 2),
      }));

      setAlertInfo({
        type: 'success',
        message: `Section "${sectionKey}" regenerated while preserving your custom edits across all other sections.`,
      });
    } catch (err: unknown) {
      setAlertInfo({
        type: 'error',
        message: err instanceof Error ? err.message : 'Section regeneration failed',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleCommitPlan = async () => {
    setCommitting(true);
    setAlertInfo(null);

    try {
      // Parse modified edits back into structured plan
      const parsedPlan: Record<string, any> = {};
      for (const [key, text] of Object.entries(editableContent)) {
        try {
          parsedPlan[key] = JSON.parse(text);
        } catch {
          parsedPlan[key] = text;
        }
      }

      const res = await fetch(`/api/events/${id}/ai-architect/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generationId,
          approvedPlan: parsedPlan,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to commit approved plan');
      }

      setAlertInfo({
        type: 'success',
        message: 'Plan committed! Budget categories, financial allocations, and timeline tasks have been committed to the database.',
      });
    } catch (err: unknown) {
      setAlertInfo({
        type: 'error',
        message: err instanceof Error ? err.message : 'Plan commitment failed',
      });
    } finally {
      setCommitting(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!generationId) return;

    try {
      const res = await fetch(`/api/events/${id}/ai-architect/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generationId,
          rating: feedbackRating,
          feedbackComment,
        }),
      });

      if (res.ok) {
        setFeedbackSubmitted(true);
        setAlertInfo({
          type: 'success',
          message: 'Thank you! Your feedback helps calibrate the AI Event Architect.',
        });
      }
    } catch {
      // safe ignore
    }
  };

  const sections: Array<{ key: string; label: string; icon: string }> = [
    { key: 'executiveSummary', label: '1. Executive Concept', icon: '💡' },
    { key: 'themeAndPalette', label: '2. Theme & Palette', icon: '🎨' },
    { key: 'decorAndStyling', label: '3. Decor & Spatial Design', icon: '💐' },
    { key: 'budgetEstimate', label: '4. Budget Allocation', icon: '📊' },
    { key: 'timelineMilestones', label: '5. Planning Milestones', icon: '📅' },
    { key: 'vendorChecklist', label: '6. Vendor Procurement', icon: '📋' },
    { key: 'guestExperience', label: '7. Guest Experience Plan', icon: '🥂' },
    { key: 'scheduleItinerary', label: '8. Event-Day Schedule', icon: '⏱️' },
    { key: 'menuSuggestions', label: '9. Menu & Catering', icon: '🍽️' },
    { key: 'entertainmentPlan', label: '10. Entertainment & Music', icon: '🎵' },
    { key: 'contingencyPlan', label: '11. Contingency & Backup', icon: '🛡️' },
    { key: 'assumptions', label: '12. Key Assumptions', icon: '🔍' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#fdfbf7] text-stone-900">
      <SkipToContent />
      <Navbar />

      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-stone-500 mb-1">
              <Link href={`/events/${id}`} className="hover:underline">
                {event?.title || 'Celebration'}
              </Link>
              <span>/</span>
              <span>AI Architect Studio</span>
            </div>
            <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight">
              AI Event Architect Studio
            </h1>
            <p className="text-sm text-stone-600 mt-1">
              Google Gemini powered 12-section event generation, inline section edits, and relational commit
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleGenerateFullPlan}
              disabled={generating}
              className="px-5 py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-bold text-sm shadow-md transition-all disabled:opacity-50 flex items-center gap-2 focus:ring-4 focus:ring-amber-800/40"
            >
              {generating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <span>✨</span>
                  <span>{plan ? 'Regenerate Master Plan' : 'Generate Master Plan'}</span>
                </>
              )}
            </button>

            {plan && (
              <button
                type="button"
                onClick={handleCommitPlan}
                disabled={committing}
                className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm shadow-md transition-all disabled:opacity-50 flex items-center gap-2 focus:ring-4 focus:ring-stone-400"
              >
                {committing ? 'Committing...' : 'Commit to Database'}
              </button>
            )}
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

        {/* Input Parameters Drawer / Bar */}
        <div className="mt-6 bg-white p-6 rounded-2xl border border-stone-300 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-stone-800 uppercase tracking-wider">
            Architect Brief Parameters
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label htmlFor="param-style" className="block font-semibold text-stone-700 mb-1">
                Aesthetic Style
              </label>
              <input
                id="param-style"
                type="text"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-[#fdfbf7] text-stone-900"
              />
            </div>

            <div>
              <label htmlFor="param-layout" className="block font-semibold text-stone-700 mb-1">
                Venue Layout
              </label>
              <select
                id="param-layout"
                value={indoorOutdoor}
                onChange={(e) => setIndoorOutdoor(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-[#fdfbf7] text-stone-900"
              >
                <option value="OUTDOOR">Outdoor (Garden / Lawn / Beach)</option>
                <option value="INDOOR">Indoor (Ballroom / Banquet)</option>
                <option value="HYBRID">Hybrid (Indoor Hall + Outdoor Terrace)</option>
              </select>
            </div>

            <div>
              <label htmlFor="param-spec" className="block font-semibold text-stone-700 mb-1">
                Special Instructions
              </label>
              <input
                id="param-spec"
                type="text"
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="e.g. Include candlelit evening sendoff"
                className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-[#fdfbf7] text-stone-900"
              />
            </div>
          </div>
        </div>

        {/* Studio Viewer */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Section Navigation Sidebar */}
          <div className="lg:col-span-1 bg-white p-4 rounded-2xl border border-stone-300 shadow-sm flex flex-col gap-1.5 h-fit">
            <span className="text-xs font-bold text-stone-700 uppercase tracking-wider px-3 py-1">
              Plan Sections
            </span>
            {sections.map((sec) => (
              <button
                key={sec.key}
                type="button"
                onClick={() => setActiveSection(sec.key)}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                  activeSection === sec.key
                    ? 'bg-amber-800 text-white shadow-sm'
                    : 'text-stone-700 hover:bg-stone-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>{sec.icon}</span>
                  <span>{sec.label}</span>
                </span>
                {editableContent[sec.key] && (
                  <span className="text-[10px] opacity-75">✓</span>
                )}
              </button>
            ))}
          </div>

          {/* Section Content & Inline Editor */}
          <div className="lg:col-span-3 bg-white p-6 sm:p-8 rounded-2xl border border-stone-300 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-stone-200 gap-3 mb-4">
                <div>
                  <h2 className="text-xl font-bold text-stone-900">
                    {sections.find((s) => s.key === activeSection)?.label}
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Inline editable. Modifications are preserved across regenerations.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleRegenerateSection(activeSection)}
                  disabled={generating}
                  className="px-3.5 py-1.5 rounded-lg border border-stone-300 hover:border-amber-500 hover:bg-amber-50 text-stone-700 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  Regenerate This Section
                </button>
              </div>

              {editableContent[activeSection] !== undefined ? (
                <div className="space-y-4">
                  <label htmlFor="section-editor" className="sr-only">
                    Section Content Editor
                  </label>
                  <textarea
                    id="section-editor"
                    rows={16}
                    value={editableContent[activeSection] || ''}
                    onChange={(e) =>
                      setEditableContent({
                        ...editableContent,
                        [activeSection]: e.target.value,
                      })
                    }
                    className="w-full p-4 rounded-xl border border-stone-300 bg-[#fdfbf7] text-stone-900 font-mono text-xs leading-relaxed focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <span className="text-[11px] text-stone-500 block">
                    Tip: You can edit formatted text or JSON structured content directly.
                  </span>
                </div>
              ) : (
                <div className="py-20 text-center space-y-3">
                  <div className="text-3xl">✨</div>
                  <h3 className="text-base font-bold text-stone-800">Section not generated yet</h3>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto">
                    Click &ldquo;Generate Master Plan&rdquo; above to run the AI Event Architect across all 12 sections.
                  </p>
                </div>
              )}
            </div>

            {/* User Feedback & Star Rating */}
            {plan && (
              <div className="mt-8 pt-6 border-t border-stone-200">
                <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                  Calibrate AI Architect Output
                </h3>
                {feedbackSubmitted ? (
                  <p className="text-xs text-emerald-700 font-semibold">
                    ✓ Feedback submitted successfully. Thank you!
                  </p>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setFeedbackRating(star)}
                          className={`text-xl transition-colors ${
                            star <= feedbackRating ? 'text-amber-500' : 'text-stone-300'
                          }`}
                          aria-label={`Rate ${star} star`}
                        >
                          ★
                        </button>
                      ))}
                    </div>

                    <input
                      type="text"
                      placeholder="Optional feedback comment..."
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-stone-300 bg-[#fdfbf7]"
                    />

                    <button
                      type="button"
                      onClick={handleSubmitFeedback}
                      className="px-4 py-1.5 rounded-lg bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition-colors"
                    >
                      Submit Rating
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

