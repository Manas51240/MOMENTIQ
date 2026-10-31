'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/ui/Navbar';
import { EventNavTabs } from '@/components/ui/EventNavTabs';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Alert } from '@/components/ui/Alert';
import { CreativeCategory } from '@/lib/ai/creative-schemas';
import {
  CATEGORY_LABELS,
  GenerationResult,
  SavedAsset,
  StudioConfigurator,
  CreativeOptionCard,
  SavedAssetCard,
  SaveAssetModal,
} from '@/components/studio';

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
  const [generatedResult, setGeneratedResult] = useState<GenerationResult | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; variant: 'success' | 'danger' | 'info' } | null>(null);

  // Saved Assets State
  const [savedAssets, setSavedAssets] = useState<SavedAsset[]>([]);
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate creative content';
      setStatusMessage({ text: msg, variant: 'danger' });
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save asset';
      setStatusMessage({ text: msg, variant: 'danger' });
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete asset';
      setStatusMessage({ text: msg, variant: 'danger' });
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
            <StudioConfigurator
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              selectedTone={selectedTone}
              onSelectTone={setSelectedTone}
              generateComparison={generateComparison}
              onToggleComparison={setGenerateComparison}
              userInstructions={userInstructions}
              onChangeUserInstructions={setUserInstructions}
              isGenerating={isGenerating}
              onGenerate={handleGenerate}
            />

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
                  <CreativeOptionCard
                    option={generatedResult.optionA}
                    category={generatedResult.category}
                    badgeVariant="amber"
                    onSave={() => openSaveModal(generatedResult.optionA)}
                    onCopyText={copyToClipboard}
                    copiedId={copiedId}
                  />

                  {generatedResult.optionB && (
                    <CreativeOptionCard
                      option={generatedResult.optionB}
                      category={generatedResult.category}
                      badgeVariant="indigo"
                      onSave={() => openSaveModal(generatedResult.optionB!)}
                      onCopyText={copyToClipboard}
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
                  {Object.keys(CATEGORY_LABELS).map((catKey) => (
                    <option key={catKey} value={catKey}>
                      {CATEGORY_LABELS[catKey as CreativeCategory].label}
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
                  className="mt-4 px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white font-semibold text-sm rounded-lg"
                >
                  Go to Generator
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAssets.map((asset) => (
                  <SavedAssetCard
                    key={asset.id}
                    asset={asset}
                    copiedId={copiedId}
                    onCopyJson={copyToClipboard}
                    onDelete={handleDeleteAsset}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* SAVE TO WORKSPACE MODAL */}
        <SaveAssetModal
          isOpen={!!assetToSave}
          onClose={() => setAssetToSave(null)}
          assetToSave={assetToSave}
          saveCustomTitle={saveCustomTitle}
          onChangeCustomTitle={setSaveCustomTitle}
          saveNotes={saveNotes}
          onChangeNotes={setSaveNotes}
          isSavingAsset={isSavingAsset}
          onSave={handleSaveApprovedAsset}
        />
      </main>
    </div>
  );
}
