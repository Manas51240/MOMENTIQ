/**
 * @fileoverview Creative Option Card component for AI Creative Studio.
 * Renders rich comparative outputs for Color Palettes, Visual Moodboards,
 * Invitations, Menus, Return Gifts, and Shot Lists with full INR currency support.
 * @module components/studio/CreativeOptionCard
 */

import React from 'react';
import { CreativeCategory } from '@/lib/ai/creative-schemas';
import { CATEGORY_LABELS, CreativeOption } from './types';
import { RenderContentSnippet } from './RenderContentSnippet';

export interface CreativeOptionCardProps {
  /** Generated option data */
  option: CreativeOption;
  /** Creative discipline category */
  category: CreativeCategory;
  /** Visual badge color theme */
  badgeVariant: 'amber' | 'indigo';
  /** Triggered when user approves and saves to event workspace */
  onSave: () => void;
  /** Clipboard copy handler */
  onCopyText: (text: string, id: string) => void;
  /** Current active copied snippet ID */
  copiedId: string | null;
}

/**
 * Formats minor currency units into Indian Rupee (INR) representation.
 */
function formatRupeeMinor(minorUnits: number | undefined): string {
  if (typeof minorUnits !== 'number' || isNaN(minorUnits)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(minorUnits / 100);
}

/**
 * Renders detailed output card for a single creative option.
 */
interface ColorSwatch {
  hex: string;
  name: string;
  role: string;
  usageTip: string;
}

interface AppetizerItem {
  name: string;
  description: string;
  dietaryTags?: string[];
}

interface ShotMoment {
  shotDescription: string;
  timeOrPhase: string;
  subjects: string;
  priority: string;
}

interface CreativeCardContent {
  moodDescription?: string;
  colors?: ColorSwatch[];
  pairingRules?: string[];
  svgVisualPreview?: string;
  aestheticStyle?: string;
  lightingVibe?: string;
  focalElements?: string[];
  hostHeader?: string;
  eventHeadline?: string;
  invitationBody?: string;
  dateTimeVenueNotice?: string;
  dressCodeNote?: string;
  rsvpNotice?: string;
  poeticVersion?: string;
  casualVersion?: string;
  cuisineStyle?: string;
  dietaryCoverage?: string;
  appetizers?: AppetizerItem[];
  signatureCocktailOrMocktail?: { name?: string; description?: string; ingredients?: string };
  dessertHighlight?: string;
  estimatedPerUnitCostMinor?: number;
  totalEstimatedCostMinor?: number;
  giftConcept?: string;
  packagingStyle?: string;
  culturalSignificance?: string;
  ecoFriendlyAlternative?: string;
  shots?: ShotMoment[];
  equipmentRequirements?: string[];
  [key: string]: unknown;
}

export function CreativeOptionCard({
  option,
  category,
  badgeVariant,
  onSave,
  onCopyText,
  copiedId,
}: CreativeOptionCardProps) {
  const content = option.content as CreativeCardContent;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden flex flex-col justify-between">
      {/* Header */}
      <div
        className={`p-5 border-b ${
          badgeVariant === 'amber' ? 'bg-amber-50/50 border-amber-100' : 'bg-indigo-50/50 border-indigo-100'
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <span
            className={`text-xs font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
              badgeVariant === 'amber' ? 'bg-amber-200 text-amber-900' : 'bg-indigo-200 text-indigo-900'
            }`}
          >
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
              {(content.colors as ColorSwatch[])?.map((color: ColorSwatch, idx: number) => (
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
                  <span className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold">
                    {color.role}
                  </span>
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
                onClick={() => onCopyText(content.poeticVersion || '', 'poetic-btn')}
                className="text-xs flex-1 py-1.5 px-3 bg-stone-100 hover:bg-stone-200 rounded-lg font-semibold text-stone-700"
              >
                {copiedId === 'poetic-btn' ? '✓ Copied Poetic' : 'Copy Poetic Rhyme'}
              </button>
              <button
                type="button"
                onClick={() => onCopyText(content.casualVersion || '', 'casual-btn')}
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
              {(content.appetizers as AppetizerItem[])?.map((app: AppetizerItem, idx: number) => (
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
              <span className="text-[11px] font-bold text-amber-900 block">
                Signature Drink: {content.signatureCocktailOrMocktail?.name}
              </span>
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
                  {formatRupeeMinor(content.estimatedPerUnitCostMinor)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-stone-500 block">Total Budget Estimate</span>
                <span className="text-base font-extrabold text-amber-700">
                  {formatRupeeMinor(content.totalEstimatedCostMinor)}
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
              <p className="text-stone-600">
                {content.culturalSignificance} • {content.ecoFriendlyAlternative}
              </p>
            </div>
          </div>
        )}

        {category === 'PHOTOGRAPHY_SHOTLIST' && (
          <div className="space-y-3 text-xs">
            <strong className="text-stone-900 block">Key Moments Shot List:</strong>
            <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar pr-1">
              {(content.keyMoments as ShotMoment[])?.map((m: ShotMoment, idx: number) => (
                <div
                  key={idx}
                  className="p-2 rounded bg-stone-50 border border-stone-100 flex items-start justify-between gap-2"
                >
                  <div>
                    <span className="font-bold text-stone-800 block">{m.shotDescription}</span>
                    <span className="text-[10px] text-stone-500">
                      {m.timeOrPhase} • {m.subjects}
                    </span>
                  </div>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      m.priority === 'MUST_HAVE' ? 'bg-red-100 text-red-800' : 'bg-stone-200 text-stone-700'
                    }`}
                  >
                    {m.priority}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fallback for other categories: Wedding, Birthday, Branding, Cultural, etc. */}
        {!['COLOR_PALETTE', 'VISUAL_MOODBOARD', 'INVITATION_CONTENT', 'MENU_SUGGESTIONS', 'RETURN_GIFTS', 'PHOTOGRAPHY_SHOTLIST'].includes(
          category
        ) && (
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
          className="text-xs font-bold text-white bg-amber-800 hover:bg-amber-900 px-4 py-2 rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-amber-800"
        >
          💾 Save to Event Workspace
        </button>
      </div>
    </div>
  );
}

