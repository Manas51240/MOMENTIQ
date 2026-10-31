/**
 * @fileoverview Type definitions and metadata constants for the AI Creative Studio.
 * @module components/studio/types
 */

import { CreativeCategory } from '@/lib/ai/creative-schemas';

/**
 * Metadata definition for each creative category.
 */
export interface CategoryMetadata {
  /** Human-readable display label */
  readonly label: string;
  /** Emoji icon representing the discipline */
  readonly icon: string;
  /** Short explanatory description */
  readonly description: string;
}

/**
 * Mapping of all 14 creative categories to their UI labels and icons.
 */
export const CATEGORY_LABELS: Record<CreativeCategory, CategoryMetadata> = {
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

/**
 * Tone / Aesthetic vibe descriptor.
 */
export interface AestheticTone {
  readonly id: string;
  readonly label: string;
}

/**
 * Pre-defined aesthetic tones for generation.
 */
export const TONES: readonly AestheticTone[] = [
  { id: 'ELEGANT', label: 'Classic & Elegant' },
  { id: 'MODERN', label: 'Sleek & Modern' },
  { id: 'VIBRANT', label: 'Vibrant & Festive' },
  { id: 'ROYAL', label: 'Regal & Opulent' },
  { id: 'RUSTIC', label: 'Rustic & Botanical' },
  { id: 'MINIMALIST', label: 'Clean Minimalist' },
  { id: 'PLAYFUL', label: 'Playful & High Energy' },
  { id: 'CULTURAL_HERITAGE', label: 'Cultural Heritage' },
] as const;

/**
 * Individual generated creative option (Option A or Option B).
 */
export interface CreativeOption {
  title: string;
  styleVariant: string;
  content: Record<string, unknown>;
}

/**
 * Full generation result returned by the API.
 */
export interface GenerationResult {
  success: boolean;
  category: CreativeCategory;
  source: 'ONLINE_GEMINI_AI' | 'DETERMINISTIC_OFFLINE_ENGINE';
  latencyMs: number;
  truthInGenerationDisclaimer?: string;
  eventContext: {
    eventTitle: string;
    eventType: string;
    guestCount: number;
    budgetFormatted: string;
    location: string;
    culturalPreferences?: string;
  };
  optionA: CreativeOption;
  optionB?: CreativeOption;
}

/**
 * Saved creative asset entity stored in database.
 */
export interface SavedAsset {
  id: string;
  eventId: string;
  category: CreativeCategory;
  title: string;
  content: Record<string, unknown>;
  prompt?: string;
  notes?: string;
  isApproved: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

