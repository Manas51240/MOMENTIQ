'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/ui/Navbar';
import { EventNavTabs } from '@/components/ui/EventNavTabs';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Alert } from '@/components/ui/Alert';
import { Modal } from '@/components/ui/Modal';
import { CREATIVE_CATEGORIES, CreativeCategory } from '@/lib/ai/creative-schemas';

const CATEGORY_LABELS: Record<CreativeCategory, { label: string; icon: string; description: string }> = {
  WEDDING_THEME: { label: 'Wedding Themes', icon: '💍', description: 'Cohesive aesthetic narratives, attire guides & florals' },
  BIRTHDAY_CONCEPT: { label: 'Birthday Concepts', icon: '🎂', description: 'Activity zones, entrance portals & cake concepts' },
  DECORATION_RECOMMENDATION: { label: 'Decoration & Styling', icon: '✨', description: 'Tablescapes, focal stage, eco tips & lighting design' },
  COLOR_PALETTE: { label: 'Color Palettes', icon: '🎨', description: 'Harmonized color swatches with HEX codes and pairing rules' },
  INVITATION_CONTENT: { label: 'Invitation Wording', icon: '💌', description: 'Formal, poetic, and casual wording with dress code notices' },
  WELCOME_MESSAGE: { label: 'Welcome Signage & Scripts', icon: '📜', description: 'Easel board welcome, table cards, itinerary & emcee speech' },
  MENU_SUGGESTIONS: { label: 'Menu & Beverages', icon: '🍽️', description: 'Curated courses, cocktail pairings & dietary coverage' },
  ENTERTAINMENT_IDEAS: { label: 'Entertainment & Games', icon: '🎭', description: 'Live performances, interactive games & dance flow' },
  PHOTOGRAPHY_SHOTLIST: { label: 'Photography Shot List', icon: '📸', description: 'Must-have moments, detail shots & creative portraits' },
  RETURN_GIFTS: { label: 'Return Gifts & Favors', icon: '🎁', description: 'Gifts tailored to guest count, budget & packaging style' },
  EVENT_BRANDING: { label: 'Event Branding', icon: '🏷️', description: 'Monograms, official hashtags & typography guides' },
  SOCIAL_MEDIA_CAPTIONS: { label: 'Social Media Captions', icon: '📱', description: 'Countdown posts, hooks, reels music & gratitude' },
  CULTURAL_CONCEPT: { label: 'Cultural & Regional Concepts', icon: '🪔', description: 'Sacred rituals, customs, traditional attire & modern twists' },
  VISUAL_MOODBOARD: { label: 'Visual Moodboards', icon: '🖼️', description: 'Aesthetic moodboard collages with zero fake portfolio images' },
};

const TONES = [
  { id: 'ELEGANT', label: 'Classic & Elegant' },
  { id: 'MODERN', label: 'Sleek & Modern' },
  { id: 'VIBRANT', label: 'Vibrant & Festive' },
  { id: 'ROYAL', label: 'Regal & Opulent' },
  { id: 'RUSTIC', label: 'Rustic & Botanical' },
  { id: 'MINIMALIST', label: 'Clean Minimalist' },
  { id: 'PLAYFUL', label: 'Playful & High Energy' },
  { id: 'CULTURAL_HERITAGE', label: 'Cultural Heritage' },
];

export default function CreativeStudioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = use(params);

  // Active View Tab: 'STUDIO' | 'SAVED_ASSETS'
  const [activeTab, setActiveTab] = useState<'STUDIO' | 'SAVED_ASSETS'>('STUDIO');

  // Generator Configuration State
  const [selectedCategory, setSelectedCategory] = useState<CreativeCategory>('COLOR_PALETTE');
  const [selectedTone, setSelectedTone] = useState<string>('ELEGANT');
  const [userInstructions, setUserInstructions] = useState<string>('');
  const [generateComparison, setGenerateComparison] = useState<boolean>(true);

  // Execution & Result State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<any>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; variant: 'success' | 'danger' | 'info' } | null>(null);

  // Saved Assets State
  const [savedAssets, setSavedAssets] = useState<any[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [assetFilterCategory, setAssetFilterCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Save Modal State
  const [isSavingAsset, setIsSavingAsset] = useState(false);
  const [assetToSave, setAssetToSave] = useState<{ category: CreativeCategory; title: string; content: any } | null>(null);
  const [saveCustomTitle, setSaveCustomTitle] = useState('');
  const [saveNotes, setSaveNotes] = useState('');

  // Copy Feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load Saved Assets
  const fetchSavedAssets = useCallback(async () => {
    setIsLoadingAssets(true);
    try {
      const res = await fetch(`/api/events/${eventId}/creative-studio/assets`);
      const data = await res.json();
      if (data.success) {
        setSavedAssets(data.assets || []);
      }
    } catch {
      // Quiet fail on network issues
    } finally {
      setIsLoadingAssets(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchSavedAssets();
  }, [fetchSavedAssets]);

  // Handle Generation
  const handleGenerate = async () => {
    setIsGenerating(true);
    setStatusMessage(null);

    try {
      const res = await fetch(`/api/events/${eventId}/creative-studio/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: selectedCategory,
          tone: selectedTone,
          userInstructions,
          generateComparison,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || data.message || 'Generation failed');
      }

      setGeneratedResult(data);
      setStatusMessage({
        text: `Successfully generated ${data.optionB ? 'two comparative concepts' : 'creative concept'} via ${data.source.replace(/_/g, ' ')} (${data.latencyMs}ms)`,
        variant: 'success',
      });
    } catch (err: any) {
      setStatusMessage({
        text: err.message || 'Failed to generate creative content',
        variant: 'danger',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Open Save Modal
  const openSaveModal = (optionData: { title: string; content: any }) => {
    setAssetToSave({
      category: selectedCategory,
      title: optionData.title,
      content: optionData.content,
    });
    setSaveCustomTitle(optionData.title);
    setSaveNotes('');
  };

  // Commit Save
  const handleSaveApprovedAsset = async () => {
    if (!assetToSave) return;
    setIsSavingAsset(true);

    try {
      const res = await fetch(`/api/events/${eventId}/creative-studio/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: assetToSave.category,
          title: saveCustomTitle || assetToSave.title,
          content: assetToSave.content,
          prompt: userInstructions,
          notes: saveNotes,
          isApproved: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to save asset');
      }

      setStatusMessage({
        text: `Approved asset "${saveCustomTitle || assetToSave.title}" has been saved to your Event Workspace!`,
        variant: 'success',
      });
      setAssetToSave(null);
      fetchSavedAssets();
    } catch (err: any) {
      setStatusMessage({
        text: err.message || 'Failed to save asset',
        variant: 'danger',
      });
    } finally {
      setIsSavingAsset(false);
    }
  };

  // Delete Saved Asset
  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm('Are you sure you want to remove this creative asset from your workspace?')) return;

    try {
      const res = await fetch(`/api/events/${eventId}/creative-studio/assets/${assetId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to delete asset');
      }

      setSavedAssets((prev) => prev.filter((a) => a.id !== assetId));
      setStatusMessage({ text: 'Asset removed successfully', variant: 'info' });
    } catch (err: any) {
      setStatusMessage({ text: err.message, variant: 'danger' });
    }
  };

  // Copy helper
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Filtered saved assets
  const filteredAssets = savedAssets.filter((asset) => {
    const matchesCat = assetFilterCategory === 'ALL' || asset.category === assetFilterCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      asset.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <Navbar />

      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Workspace Breadcrumbs & Title */}
        <div className="mb-6">
          <nav className="text-sm font-medium text-stone-500 mb-2">
            <Link href="/dashboard" className="hover:text-stone-700">Dashboard</Link>
            <span className="mx-2">/</span>
            <Link href={`/events/${eventId}`} className="hover:text-stone-700">Celebration Hub</Link>
            <span className="mx-2">/</span>
            <span className="text-stone-900">AI Creative Studio</span>
          </nav>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-extrabold tracking-tight text-stone-900">
                  AI Creative Studio
                </h1>
                <StatusBadge label="Production AI" variant="SUCCESS" />
              </div>
              <p className="mt-1 text-sm text-stone-600">
                Generate, compare, and personalize 14 bespoke celebration aesthetics grounded in your event budget, guest count, and culture.
              </p>
            </div>

            {/* Studio vs Saved Assets Tabs */}
            <div className="inline-flex rounded-lg border border-stone-300 bg-stone-100 p-1">
              <button
                type="button"
                onClick={() => setActiveTab('STUDIO')}
                className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${
                  activeTab === 'STUDIO'
                    ? 'bg-white text-stone-900 shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                ✨ Creative Generator
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('SAVED_ASSETS')}
                className={`px-4 py-2 text-sm font-semibold rounded-md transition-all flex items-center gap-2 ${
                  activeTab === 'SAVED_ASSETS'
                    ? 'bg-white text-stone-900 shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                📁 Workspace Assets
                <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-bold">
                  {savedAssets.length}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Workspace Navigation Tabs */}
        <div className="mb-8">
          <EventNavTabs eventId={eventId} />
        </div>

        {/* Global Live Alert */}
        {statusMessage && (
          <div className="mb-6">
            <Alert
              type={statusMessage.variant === 'danger' ? 'error' : statusMessage.variant}
              message={statusMessage.text}
              onClose={() => setStatusMessage(null)}
            />
          </div>
        )}

        {/* TAB 1: STUDIO GENERATOR */}
        {activeTab === 'STUDIO' && (
          <div className="space-y-8">
            {/* Control Panel Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
              <h2 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
                <span>1. Select Creative Discipline</span>
              </h2>

              {/* Category Pills Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 mb-6">
                {CREATIVE_CATEGORIES.map((catKey) => {
                  const meta = CATEGORY_LABELS[catKey];
                  const isSelected = selectedCategory === catKey;
                  return (
                    <button
                      key={catKey}
                      type="button"
                      onClick={() => setSelectedCategory(catKey)}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                        isSelected
                          ? 'border-amber-600 bg-amber-50 text-amber-950 font-bold shadow-sm ring-1 ring-amber-600'
                          : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50'
                      }`}
                    >
                      <span className="text-xl mb-1">{meta.icon}</span>
                      <span className="text-xs font-semibold leading-tight">{meta.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Parameter Settings Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-stone-100">
                {/* Tone / Vibe Selector */}
                <div>
                  <label htmlFor="tone-select" className="block text-sm font-semibold text-stone-700 mb-1">
                    Aesthetic Vibe & Tone
                  </label>
                  <select
                    id="tone-select"
                    value={selectedTone}
                    onChange={(e) => setSelectedTone(e.target.value)}
                    className="w-full rounded-lg border-stone-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:ring-amber-500 border"
                  >
                    {TONES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Compare Mode Checkbox */}
                <div className="flex flex-col justify-center">
                  <span className="block text-sm font-semibold text-stone-700 mb-1">
                    Comparative Exploration
                  </span>
                  <label className="flex items-center gap-3 cursor-pointer py-1">
                    <input
                      type="checkbox"
                      checked={generateComparison}
                      onChange={(e) => setGenerateComparison(e.target.checked)}
                      className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-sm text-stone-800 font-medium">
                      Generate 2 comparative options side-by-side
                    </span>
                  </label>
                </div>

                {/* Generate Action Button */}
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="w-full inline-flex items-center justify-center px-6 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold text-sm rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-60 transition-all"
                  >
                    {isGenerating ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Synthesizing Concept...
                      </span>
                    ) : (
                      <span>✨ Synthesize Creative Concept</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Custom Instructions Textarea */}
              <div className="mt-4">
                <label htmlFor="custom-instructions" className="block text-sm font-semibold text-stone-700 mb-1">
                  Custom Instructions & Inclusions (Optional)
                </label>
                <textarea
                  id="custom-instructions"
                  rows={2}
                  maxLength={2000}
                  value={userInstructions}
                  onChange={(e) => setUserInstructions(e.target.value)}
                  placeholder="e.g. Must include warm saffron accents, accommodate Jain dietary preferences, or include a memory table honoring grandparents..."
                  className="w-full rounded-lg border border-stone-300 p-2.5 text-sm shadow-sm focus:border-amber-500 focus:ring-amber-500"
                />
                <p className="mt-1 text-xs text-stone-500">
                  {userInstructions.length} / 2000 characters • Guarded against prompt injections and malicious inputs.
                </p>
              </div>
            </div>

            {/* GENERATED RESULTS AREA */}
            {generatedResult && (
              <div className="space-y-6">
                {/* Event Context Pill Bar */}
                <div className="bg-amber-50/70 border border-amber-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-950 font-medium">
                  <div className="flex items-center gap-4 flex-wrap">
                    <span><strong>Event:</strong> {generatedResult.eventContext.eventTitle}</span>
                    <span>•</span>
                    <span><strong>Budget:</strong> {generatedResult.eventContext.budgetFormatted}</span>
                    <span>•</span>
                    <span><strong>Target Guests:</strong> {generatedResult.eventContext.guestCount}</span>
                    <span>•</span>
                    <span><strong>Location:</strong> {generatedResult.eventContext.location}</span>
                    {generatedResult.eventContext.culturalPreferences && (
                      <>
                        <span>•</span>
                        <span><strong>Cultural:</strong> {generatedResult.eventContext.culturalPreferences}</span>
                      </>
                    )}
                  </div>
                  <span className="bg-amber-200/80 px-2 py-0.5 rounded font-bold">
                    {generatedResult.source}
                  </span>
                </div>

                {/* Truth-In-Generation Disclaimer if Visual Moodboard */}
                {generatedResult.truthInGenerationDisclaimer && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg">
                    <div className="flex items-center">
                      <span className="text-yellow-600 font-bold mr-2">⚠️ Truth-in-Generation Notice:</span>
                      <p className="text-xs text-yellow-800 font-medium">
                        {generatedResult.truthInGenerationDisclaimer}. Visual moodboards are AI-synthesized conceptual aesthetic guides. They are strictly never presented as verified vendor portfolio works.
                      </p>
                    </div>
                  </div>
                )}

                {/* Comparison Grid (Option A and Option B) */}
                <div className={`grid grid-cols-1 ${generatedResult.optionB ? 'lg:grid-cols-2' : ''} gap-6`}>
                  {/* OPTION A CARD */}
                  <CreativeOptionCard
                    option={generatedResult.optionA}
                    category={generatedResult.category}
                    badgeVariant="amber"
                    onSave={() => openSaveModal(generatedResult.optionA)}
                    onCopyText={(text, id) => copyToClipboard(text, id)}
                    copiedId={copiedId}
                  />

                  {/* OPTION B CARD (if requested) */}
                  {generatedResult.optionB && (
                    <CreativeOptionCard
                      option={generatedResult.optionB}
                      category={generatedResult.category}
                      badgeVariant="indigo"
                      onSave={() => openSaveModal(generatedResult.optionB)}
                      onCopyText={(text, id) => copyToClipboard(text, id)}
                      copiedId={copiedId}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SAVED WORKSPACE ASSETS */}
        {activeTab === 'SAVED_ASSETS' && (
          <div className="space-y-6">
            {/* Filter & Search Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full md:w-auto">
                <label htmlFor="filter-cat" className="text-xs font-bold text-stone-600 uppercase tracking-wider">
                  Filter Category:
                </label>
                <select
                  id="filter-cat"
                  value={assetFilterCategory}
                  onChange={(e) => setAssetFilterCategory(e.target.value)}
                  className="rounded-lg border-stone-300 text-sm shadow-sm py-1.5 px-3 border focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="ALL">All Categories ({savedAssets.length})</option>
                  {CREATIVE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c].label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-full md:w-72">
                <input
                  type="text"
                  placeholder="Search saved assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 py-1.5 px-3 text-sm focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            </div>

            {/* Assets List */}
            {isLoadingAssets ? (
              <div className="text-center py-12 text-stone-500 text-sm">
                Loading approved event assets...
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
                <span className="text-4xl block mb-2">📁</span>
                <h3 className="text-lg font-bold text-stone-900">No Approved Assets Found</h3>
                <p className="text-sm text-stone-500 mt-1 max-w-md mx-auto">
                  Synthesize concepts in the Creative Generator and click &quot;Save to Event Workspace&quot; to keep your approved palettes, invitation wordings, and shot lists organized here.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('STUDIO')}
                  className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm rounded-lg"
                >
                  Go to Generator
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="bg-white rounded-xl shadow-sm border border-stone-200 p-5 flex flex-col justify-between hover:shadow-md transition-shadow"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {CATEGORY_LABELS[asset.category as CreativeCategory]?.label || asset.category}
                        </span>
                        <span className="text-xs text-stone-400">
                          v{asset.version} • {new Date(asset.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-stone-900 mb-2">{asset.title}</h4>

                      {asset.notes && (
                        <p className="text-xs text-stone-600 italic mb-3 bg-stone-50 p-2 rounded">
                          &quot;{asset.notes}&quot;
                        </p>
                      )}

                      {/* Snippet preview */}
                      <div className="text-xs text-stone-700 bg-stone-50 p-3 rounded-lg max-h-48 overflow-y-auto no-scrollbar border border-stone-100">
                        <RenderContentSnippet category={asset.category} content={asset.content} />
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(JSON.stringify(asset.content, null, 2), asset.id)}
                        className="text-xs font-semibold text-amber-600 hover:text-amber-800"
                      >
                        {copiedId === asset.id ? '✓ Copied' : 'Copy JSON'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteAsset(asset.id)}
                        className="text-xs font-semibold text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SAVE TO WORKSPACE MODAL */}
        {assetToSave && (
          <Modal
            isOpen={true}
            onClose={() => setAssetToSave(null)}
            title="Save Approved Asset to Workspace"
          >
            <div className="space-y-4">
              <p className="text-xs text-stone-600">
                Saving this asset locks it into your official event workspace, making it accessible to event collaborators and planners.
              </p>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Asset Title
                </label>
                <input
                  type="text"
                  value={saveCustomTitle}
                  onChange={(e) => setSaveCustomTitle(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 p-2 text-sm focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Organizer Notes / Implementation Directives (Optional)
                </label>
                <textarea
                  rows={3}
                  value={saveNotes}
                  onChange={(e) => setSaveNotes(e.target.value)}
                  placeholder="e.g. Approved by couple for main reception dining tables..."
                  className="w-full rounded-lg border border-stone-300 p-2 text-sm focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setAssetToSave(null)}
                  className="px-4 py-2 text-sm font-semibold text-stone-600 hover:text-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveApprovedAsset}
                  disabled={isSavingAsset}
                  className="px-5 py-2 text-sm font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm disabled:opacity-60"
                >
                  {isSavingAsset ? 'Saving...' : 'Confirm & Save Asset'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </main>
    </div>
  );
}

/**
 * Option Card rendering full detail for either Option A or Option B.
 */
function CreativeOptionCard({
  option,
  category,
  badgeVariant,
  onSave,
  onCopyText,
  copiedId,
}: {
  option: { title: string; styleVariant: string; content: any };
  category: CreativeCategory;
  badgeVariant: 'amber' | 'indigo';
  onSave: () => void;
  onCopyText: (text: string, id: string) => void;
  copiedId: string | null;
}) {
  const content = option.content;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden flex flex-col justify-between">
      {/* Header */}
      <div className={`p-5 border-b ${badgeVariant === 'amber' ? 'bg-amber-50/50 border-amber-100' : 'bg-indigo-50/50 border-indigo-100'}`}>
        <div className="flex items-center justify-between mb-1">
          <span className={`text-xs font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
            badgeVariant === 'amber' ? 'bg-amber-200 text-amber-900' : 'bg-indigo-200 text-indigo-900'
          }`}>
            {option.styleVariant}
          </span>
          <span className="text-xs text-stone-500">{CATEGORY_LABELS[category]?.label}</span>
        </div>
        <h3 className="text-lg font-bold text-stone-900">{option.title}</h3>
      </div>

      {/* Body Content Display */}
      <div className="p-6 flex-1 space-y-4">
        {category === 'COLOR_PALETTE' && (
          <div className="space-y-4">
            <p className="text-xs text-stone-600 italic">{content.moodDescription}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {content.colors?.map((color: any, idx: number) => (
                <div key={idx} className="border border-stone-200 rounded-lg p-2.5 bg-stone-50 flex flex-col gap-1">
                  <div
                    className="w-full h-12 rounded-md shadow-inner border border-stone-300"
                    style={{ backgroundColor: color.hex }}
                  />
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-bold text-stone-900 truncate">{color.name}</span>
                    <button
                      type="button"
                      onClick={() => onCopyText(color.hex, `hex-${idx}`)}
                      className="text-[10px] font-mono text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded hover:bg-amber-200"
                    >
                      {copiedId === `hex-${idx}` ? '✓' : color.hex}
                    </button>
                  </div>
                  <span className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold">{color.role}</span>
                  <p className="text-[11px] text-stone-600 leading-tight">{color.usageTip}</p>
                </div>
              ))}
            </div>

            <div className="text-xs text-stone-600 pt-2 border-t border-stone-100">
              <strong className="text-stone-900 block mb-1">Pairing Rules:</strong>
              <ul className="list-disc list-inside space-y-0.5 text-stone-600">
                {content.pairingRules?.map((r: string, idx: number) => (
                  <li key={idx}>{r}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {category === 'VISUAL_MOODBOARD' && (
          <div className="space-y-4">
            {content.svgVisualPreview && (
              <div
                className="w-full rounded-xl overflow-hidden shadow-inner border border-stone-300 max-h-72 flex items-center justify-center bg-stone-900"
                dangerouslySetInnerHTML={{ __html: content.svgVisualPreview }}
              />
            )}

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200">
                <strong className="text-stone-900 block mb-1">Aesthetic Style:</strong>
                <p className="text-stone-600">{content.aestheticStyle}</p>
              </div>
              <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200">
                <strong className="text-stone-900 block mb-1">Lighting Vibe:</strong>
                <p className="text-stone-600">{content.lightingVibe}</p>
              </div>
            </div>

            <div className="text-xs text-stone-600">
              <strong className="text-stone-900 block mb-1">Focal Design Elements:</strong>
              <ul className="list-disc list-inside space-y-1">
                {content.focalElements?.map((el: string, idx: number) => (
                  <li key={idx}>{el}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {category === 'INVITATION_CONTENT' && (
          <div className="space-y-4">
            <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 text-center">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-amber-800 block mb-1">
                {content.hostHeader}
              </span>
              <h4 className="text-base font-serif font-bold text-stone-900 mb-2">{content.eventHeadline}</h4>
              <p className="text-xs text-stone-700 mb-3">{content.invitationBody}</p>
              <p className="text-xs font-semibold text-stone-900 mb-1">{content.dateTimeVenueNotice}</p>
              <p className="text-xs text-stone-500 italic mb-2">Dress code: {content.dressCodeNote}</p>
              <p className="text-xs text-amber-900 font-medium">{content.rsvpNotice}</p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onCopyText(content.poeticVersion, 'poetic-btn')}
                className="text-xs flex-1 py-1.5 px-3 bg-stone-100 hover:bg-stone-200 rounded-lg font-semibold text-stone-700"
              >
                {copiedId === 'poetic-btn' ? '✓ Copied Poetic' : 'Copy Poetic Rhyme'}
              </button>
              <button
                type="button"
                onClick={() => onCopyText(content.casualVersion, 'casual-btn')}
                className="text-xs flex-1 py-1.5 px-3 bg-stone-100 hover:bg-stone-200 rounded-lg font-semibold text-stone-700"
              >
                {copiedId === 'casual-btn' ? '✓ Copied Casual' : 'Copy Casual Text'}
              </button>
            </div>
          </div>
        )}

        {category === 'MENU_SUGGESTIONS' && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between bg-stone-50 p-2.5 rounded-lg border border-stone-200">
              <span className="font-bold text-stone-900">Cuisine: {content.cuisineStyle}</span>
              <span className="text-stone-500">{content.dietaryCoverage}</span>
            </div>

            <div className="space-y-2">
              <strong className="text-stone-900 block">Appetizers &amp; Starters:</strong>
              {content.appetizers?.map((app: any, idx: number) => (
                <div key={idx} className="border-l-2 border-amber-500 pl-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-800">{app.name}</span>
                    <span className="text-[10px] text-amber-700">{app.dietaryTags?.join(', ')}</span>
                  </div>
                  <p className="text-stone-500 text-[11px]">{app.description}</p>
                </div>
              ))}
            </div>

            <div className="bg-amber-50/60 p-2.5 rounded-lg border border-amber-100">
              <span className="text-[11px] font-bold text-amber-900 block">Signature Drink: {content.signatureCocktailOrMocktail?.name}</span>
              <p className="text-[11px] text-stone-600">{content.signatureCocktailOrMocktail?.ingredients}</p>
            </div>
          </div>
        )}

        {category === 'RETURN_GIFTS' && (
          <div className="space-y-3 text-xs">
            <div className="bg-stone-50 p-3 rounded-lg border border-stone-200 flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-500 block">Per Unit Estimate</span>
                <span className="text-base font-extrabold text-stone-900">
                  ${(content.estimatedPerUnitCostMinor / 100).toFixed(2)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-stone-500 block">Total Budget Estimate</span>
                <span className="text-base font-extrabold text-amber-700">
                  ${(content.totalEstimatedCostMinor / 100).toFixed(2)}
                </span>
              </div>
            </div>

            <div>
              <strong className="text-stone-900 block mb-0.5">Gift Concept:</strong>
              <p className="text-stone-700">{content.giftConcept}</p>
            </div>
            <div>
              <strong className="text-stone-900 block mb-0.5">Packaging:</strong>
              <p className="text-stone-600">{content.packagingStyle}</p>
            </div>
            <div>
              <strong className="text-stone-900 block mb-0.5">Cultural &amp; Eco Significance:</strong>
              <p className="text-stone-600">{content.culturalSignificance} • {content.ecoFriendlyAlternative}</p>
            </div>
          </div>
        )}

        {category === 'PHOTOGRAPHY_SHOTLIST' && (
          <div className="space-y-3 text-xs">
            <strong className="text-stone-900 block">Key Moments Shot List:</strong>
            <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar pr-1">
              {content.keyMoments?.map((m: any, idx: number) => (
                <div key={idx} className="p-2 rounded bg-stone-50 border border-stone-100 flex items-start justify-between gap-2">
                  <div>
                    <span className="font-bold text-stone-800 block">{m.shotDescription}</span>
                    <span className="text-[10px] text-stone-500">{m.timeOrPhase} • {m.subjects}</span>
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    m.priority === 'MUST_HAVE' ? 'bg-red-100 text-red-800' : 'bg-stone-200 text-stone-700'
                  }`}>
                    {m.priority}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fallback for other categories: Wedding, Birthday, Branding, Cultural, etc. */}
        {!['COLOR_PALETTE', 'VISUAL_MOODBOARD', 'INVITATION_CONTENT', 'MENU_SUGGESTIONS', 'RETURN_GIFTS', 'PHOTOGRAPHY_SHOTLIST'].includes(category) && (
          <div className="text-xs text-stone-700 space-y-3 bg-stone-50 p-4 rounded-xl border border-stone-100 max-h-72 overflow-y-auto no-scrollbar">
            <RenderContentSnippet category={category} content={content} />
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onCopyText(JSON.stringify(content, null, 2), option.title)}
          className="text-xs font-semibold text-stone-600 hover:text-stone-900 px-3 py-1.5 rounded-lg border border-stone-300 bg-white"
        >
          {copiedId === option.title ? '✓ Copied' : 'Copy JSON'}
        </button>

        <button
          type="button"
          onClick={onSave}
          className="text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          💾 Save to Event Workspace
        </button>
      </div>
    </div>
  );
}

/**
 * Universal content snippet renderer for cards & lists.
 */
function RenderContentSnippet({ category, content }: { category: string; content: any }) {
  if (!content) return <span>No content available</span>;

  if (category === 'WEDDING_THEME') {
    return (
      <div>
        <h5 className="font-bold text-stone-900 mb-1">{content.conceptName}</h5>
        <p className="italic text-stone-600 mb-2">&quot;{content.tagline}&quot;</p>
        <p className="mb-2 text-stone-700">{content.narrative}</p>
        <p className="text-stone-500 text-[11px]"><strong>Motifs:</strong> {content.keyMotifs?.join(', ')}</p>
      </div>
    );
  }

  if (category === 'BIRTHDAY_CONCEPT') {
    return (
      <div>
        <h5 className="font-bold text-stone-900 mb-1">{content.themeTitle}</h5>
        <p className="italic text-stone-600 mb-2">&quot;{content.tagline}&quot;</p>
        <p className="mb-1 text-stone-700"><strong>Cake:</strong> {content.cakeConcept}</p>
        <p className="text-stone-500 text-[11px]"><strong>Entrance:</strong> {content.entranceFeature}</p>
      </div>
    );
  }

  if (category === 'CULTURAL_CONCEPT') {
    return (
      <div>
        <h5 className="font-bold text-stone-900 mb-1">{content.culturalTradition}</h5>
        <ul className="list-disc list-inside space-y-1 text-stone-600 mb-2">
          {content.ritualsAndCeremonies?.map((r: any, idx: number) => (
            <li key={idx}><strong>{r.ritualName}:</strong> {r.meaning}</li>
          ))}
        </ul>
        <p className="text-stone-500 text-[11px]"><strong>Modern Twist:</strong> {content.modernTwistSuggestion}</p>
      </div>
    );
  }

  if (category === 'EVENT_BRANDING') {
    return (
      <div>
        <h5 className="font-bold text-stone-900 mb-1">Monogram: {content.monogramOrInitials}</h5>
        <p className="text-stone-600 mb-2"><strong>Hashtags:</strong> {content.officialHashtags?.join(' ')}</p>
        <p className="text-stone-500 text-[11px]"><strong>Typography:</strong> {content.typographyRecommendation?.primaryFont}</p>
      </div>
    );
  }

  if (category === 'SOCIAL_MEDIA_CAPTIONS') {
    return (
      <div>
        <strong className="text-stone-900 block mb-1">Instagram Hooks:</strong>
        {content.instagramCaptions?.map((c: any, idx: number) => (
          <p key={idx} className="text-stone-600 mb-1 italic">&quot;{c.hook}&quot;</p>
        ))}
      </div>
    );
  }

  if (category === 'WELCOME_MESSAGE') {
    return (
      <div>
        <strong className="text-stone-900 block mb-1">Easel Welcome:</strong>
        <p className="text-stone-700 mb-2">&quot;{content.easelBoardText}&quot;</p>
        <p className="text-stone-500 text-[11px]"><strong>Emcee Opening:</strong> {content.emceeWelcomeScript}</p>
      </div>
    );
  }

  if (category === 'ENTERTAINMENT_IDEAS') {
    return (
      <div>
        <h5 className="font-bold text-stone-900 mb-1">Performance: {content.livePerformance}</h5>
        <p className="text-stone-600 mb-1"><strong>Soundtrack:</strong> {content.soundtrackStyle}</p>
        <p className="text-stone-500 text-[11px]"><strong>Photo Booth:</strong> {content.photoBoothConcept?.backdrop}</p>
      </div>
    );
  }

  return (
    <pre className="font-mono text-[11px] whitespace-pre-wrap text-stone-600">
      {JSON.stringify(content, null, 2).slice(0, 300)}...
    </pre>
  );
}
