/**
 * @fileoverview Studio Configurator component for configuring AI creative parameters.
 * Provides accessible controls for 14 disciplines, tone options, side-by-side comparison mode,
 * and custom prompt directives.
 * @module components/studio/StudioConfigurator
 */

import React from 'react';
import { CREATIVE_CATEGORIES, CreativeCategory } from '@/lib/ai/creative-schemas';
import { CATEGORY_LABELS, TONES } from './types';

export interface StudioConfiguratorProps {
  selectedCategory: CreativeCategory;
  onSelectCategory: (category: CreativeCategory) => void;
  selectedTone: string;
  onSelectTone: (tone: string) => void;
  generateComparison: boolean;
  onToggleComparison: (enabled: boolean) => void;
  userInstructions: string;
  onChangeUserInstructions: (text: string) => void;
  isGenerating: boolean;
  onGenerate: () => void;
}

/**
 * Control panel for configuring AI synthesis options.
 */
export function StudioConfigurator({
  selectedCategory,
  onSelectCategory,
  selectedTone,
  onSelectTone,
  generateComparison,
  onToggleComparison,
  userInstructions,
  onChangeUserInstructions,
  isGenerating,
  onGenerate,
}: StudioConfiguratorProps) {
  return (
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
              onClick={() => onSelectCategory(catKey)}
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
            onChange={(e) => onSelectTone(e.target.value)}
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
              onChange={(e) => onToggleComparison(e.target.checked)}
              className="h-4 w-4 rounded border-stone-300 text-amber-800 focus:ring-amber-800"
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
            onClick={onGenerate}
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
          onChange={(e) => onChangeUserInstructions(e.target.value)}
          placeholder="e.g. Must include warm saffron accents, accommodate Jain dietary preferences, or include a memory table honoring grandparents..."
          className="w-full rounded-lg border border-stone-300 p-2.5 text-sm shadow-sm focus:border-amber-500 focus:ring-amber-500"
        />
        <p className="mt-1 text-xs text-stone-500">
          {userInstructions.length} / 2000 characters • Guarded against prompt injections and malicious inputs.
        </p>
      </div>
    </div>
  );
}

