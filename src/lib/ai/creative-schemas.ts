import { z } from 'zod';

// ==============================================================================
// CELEBRA — AI Creative Studio Schemas & Types
// Covers 14 Specialized Creative Event Disciplines with Strict Validation
// ==============================================================================

export const CREATIVE_CATEGORIES = [
  'WEDDING_THEME',
  'BIRTHDAY_CONCEPT',
  'DECORATION_RECOMMENDATION',
  'COLOR_PALETTE',
  'INVITATION_CONTENT',
  'WELCOME_MESSAGE',
  'MENU_SUGGESTIONS',
  'ENTERTAINMENT_IDEAS',
  'PHOTOGRAPHY_SHOTLIST',
  'RETURN_GIFTS',
  'EVENT_BRANDING',
  'SOCIAL_MEDIA_CAPTIONS',
  'CULTURAL_CONCEPT',
  'VISUAL_MOODBOARD',
] as const;

export type CreativeCategory = (typeof CREATIVE_CATEGORIES)[number];

export const creativeCategorySchema = z.enum(CREATIVE_CATEGORIES);

/**
 * Common Event Context input to ground AI creativity in real event parameters.
 */
export const creativeGenerationInputSchema = z.object({
  category: creativeCategorySchema,
  userInstructions: z.string().max(2000, 'User instructions cannot exceed 2000 characters').default(''),
  tone: z.enum(['ELEGANT', 'MODERN', 'VIBRANT', 'PLAYFUL', 'ROYAL', 'RUSTIC', 'MINIMALIST', 'CULTURAL_HERITAGE']).default('ELEGANT'),
  generateComparison: z.boolean().default(false), // When true, generates Option A (e.g. Classic/Formal) and Option B (e.g. Contemporary/Alternative)
});

export type CreativeGenerationInput = z.infer<typeof creativeGenerationInputSchema>;

// 1. Wedding Theme Schema
export const weddingThemeSchema = z.object({
  conceptName: z.string().min(1),
  tagline: z.string().min(1),
  narrative: z.string().min(1),
  keyMotifs: z.array(z.string()).min(1),
  attireGuide: z.object({
    couple: z.string(),
    bridalParty: z.string(),
    guests: z.string(),
  }),
  ceremonyAesthetic: z.string(),
  receptionAesthetic: z.string(),
  suggestedFlorals: z.array(z.string()).min(1),
  estimatedBudgetSharePercent: z.number().int().min(1).max(100),
});

// 2. Birthday Concept Schema
export const birthdayConceptSchema = z.object({
  themeTitle: z.string().min(1),
  ageGroupOrMilestone: z.string().min(1),
  tagline: z.string().min(1),
  cakeConcept: z.string().min(1),
  entranceFeature: z.string().min(1),
  activityZones: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      targetAudience: z.string(),
    })
  ).min(1),
  interactiveMoments: z.array(z.string()).min(1),
  favorsConcept: z.string().min(1),
});

// 3. Decoration Recommendation Schema
export const decorationRecommendationSchema = z.object({
  overallStyle: z.string().min(1),
  entranceDecor: z.string().min(1),
  focalPointOrStage: z.string().min(1),
  tableSettings: z.object({
    centerpieces: z.string(),
    linens: z.string(),
    tableware: z.string(),
  }),
  lightingDesign: z.object({
    ambient: z.string(),
    accent: z.string(),
    eveningTransition: z.string(),
  }),
  signagePlan: z.array(z.string()).min(1),
  sustainableEcoTips: z.array(z.string()).min(1),
});

// 4. Color Palette Schema
export const colorPaletteSchema = z.object({
  paletteName: z.string().min(1),
  moodDescription: z.string().min(1),
  colors: z.array(
    z.object({
      name: z.string(),
      hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a 6-digit hex color (e.g. #FF5733)'),
      role: z.enum(['PRIMARY', 'SECONDARY', 'ACCENT', 'NEUTRAL', 'BACKGROUND']),
      usageTip: z.string(),
    })
  ).min(3).max(8),
  pairingRules: z.array(z.string()).min(1),
  avoidPairings: z.array(z.string()).default([]),
});

// 5. Invitation Content Schema
export const invitationContentSchema = z.object({
  hostHeader: z.string().min(1),
  eventHeadline: z.string().min(1),
  invitationBody: z.string().min(1),
  dateTimeVenueNotice: z.string().min(1),
  dressCodeNote: z.string().min(1),
  rsvpNotice: z.string().min(1),
  poeticVersion: z.string().min(1),
  casualVersion: z.string().min(1),
});

// 6. Welcome Message Schema
export const welcomeMessageSchema = z.object({
  easelBoardText: z.string().min(1),
  tableWelcomeCard: z.string().min(1),
  itineraryNotice: z.string().min(1),
  qrWifiCardText: z.string().min(1),
  emceeWelcomeScript: z.string().min(1),
});

// 7. Menu Suggestions Schema
export const menuSuggestionsSchema = z.object({
  cuisineStyle: z.string().min(1),
  dietaryCoverage: z.string().min(1),
  welcomeDrinks: z.array(z.string()).min(1),
  appetizers: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      dietaryTags: z.array(z.string()),
    })
  ).min(1),
  mainCourses: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      dietaryTags: z.array(z.string()),
    })
  ).min(1),
  desserts: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      dietaryTags: z.array(z.string()),
    })
  ).min(1),
  signatureCocktailOrMocktail: z.object({
    name: z.string(),
    ingredients: z.string(),
    garnish: z.string(),
  }),
  costOptimizationTips: z.array(z.string()).min(1),
});

// 8. Entertainment Ideas Schema
export const entertainmentIdeasSchema = z.object({
  soundtrackStyle: z.string().min(1),
  livePerformance: z.string().min(1),
  guestEngagementGames: z.array(
    z.object({
      title: z.string(),
      rulesSummary: z.string(),
      durationMinutes: z.number().int().min(5),
    })
  ).min(1),
  photoBoothConcept: z.object({
    backdrop: z.string(),
    props: z.array(z.string()),
    printLayout: z.string(),
  }),
  danceFloorPacing: z.string().min(1),
  kidsOrSeniorInclusion: z.string().min(1),
});

// 9. Photography Shot List Schema
export const photographyShotlistSchema = z.object({
  keyMoments: z.array(
    z.object({
      timeOrPhase: z.string(),
      shotDescription: z.string(),
      subjects: z.string(),
      priority: z.enum(['MUST_HAVE', 'NICE_TO_HAVE']),
    })
  ).min(1),
  creativePortraitIdeas: z.array(z.string()).min(1),
  detailShots: z.array(z.string()).min(1),
  candidsFocus: z.array(z.string()).min(1),
  lightingNotes: z.string().min(1),
});

// 10. Return Gifts Schema
export const returnGiftsSchema = z.object({
  giftConcept: z.string().min(1),
  packagingStyle: z.string().min(1),
  estimatedPerUnitCostMinor: z.number().int().min(0), // minor cents (e.g. 1500 = $15.00)
  totalEstimatedCostMinor: z.number().int().min(0),
  customizationDetails: z.string().min(1),
  culturalSignificance: z.string().min(1),
  ecoFriendlyAlternative: z.string().min(1),
});

// 11. Event Branding Schema
export const eventBrandingSchema = z.object({
  eventTitle: z.string().min(1),
  monogramOrInitials: z.string().min(1),
  officialHashtags: z.array(z.string()).min(1),
  typographyRecommendation: z.object({
    primaryFont: z.string(),
    secondaryFont: z.string(),
    styleGuide: z.string(),
  }),
  designElements: z.array(z.string()).min(1),
  merchandiseOrKeepsakeMockups: z.array(z.string()).min(1),
});

// 12. Social Media Captions Schema
export const socialMediaCaptionsSchema = z.object({
  instagramCaptions: z.array(
    z.object({
      hook: z.string(),
      body: z.string(),
      callToAction: z.string(),
      hashtags: z.array(z.string()),
    })
  ).min(1),
  countdownPosts: z.array(
    z.object({
      daysLeft: z.number().int(),
      caption: z.string(),
    })
  ).min(1),
  postEventGratitude: z.string().min(1),
  reelsAudioRecommendation: z.string().min(1),
});

// 13. Cultural Concept Schema
export const culturalConceptSchema = z.object({
  culturalTradition: z.string().min(1),
  heritageHighlights: z.array(z.string()).min(1),
  ritualsAndCeremonies: z.array(
    z.object({
      ritualName: z.string(),
      meaning: z.string(),
      suggestedTiming: z.string(),
      itemsNeeded: z.array(z.string()),
    })
  ).min(1),
  customaryAttire: z.object({
    hosts: z.string(),
    guests: z.string(),
  }),
  auspiciousElements: z.array(z.string()).min(1),
  modernTwistSuggestion: z.string().min(1),
});

// 14. Visual Moodboard Schema
export const visualMoodboardSchema = z.object({
  moodboardTitle: z.string().min(1),
  aestheticStyle: z.string().min(1),
  textureAndMaterials: z.array(z.string()).min(1),
  lightingVibe: z.string().min(1),
  colorSwatches: z.array(
    z.object({
      name: z.string(),
      hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      role: z.string(),
    })
  ).min(3),
  focalElements: z.array(z.string()).min(1),
  imagePrompt: z.string().min(1),
  providerStatus: z.enum(['PROVIDER_CONFIGURED', 'PROVIDER_UNCONFIGURED_DETERMINISTIC_PALETTE']),
  imageUrl: z.string().nullable(),
  svgVisualPreview: z.string().min(1),
  truthInGenerationDisclaimer: z.literal(
    'AI Generated Concept Moodboard — Not vendor portfolio photograph'
  ),
});

/**
 * Mapping of category keys to their respective Zod validation schemas.
 */
export const CREATIVE_CATEGORY_SCHEMAS = {
  WEDDING_THEME: weddingThemeSchema,
  BIRTHDAY_CONCEPT: birthdayConceptSchema,
  DECORATION_RECOMMENDATION: decorationRecommendationSchema,
  COLOR_PALETTE: colorPaletteSchema,
  INVITATION_CONTENT: invitationContentSchema,
  WELCOME_MESSAGE: welcomeMessageSchema,
  MENU_SUGGESTIONS: menuSuggestionsSchema,
  ENTERTAINMENT_IDEAS: entertainmentIdeasSchema,
  PHOTOGRAPHY_SHOTLIST: photographyShotlistSchema,
  RETURN_GIFTS: returnGiftsSchema,
  EVENT_BRANDING: eventBrandingSchema,
  SOCIAL_MEDIA_CAPTIONS: socialMediaCaptionsSchema,
  CULTURAL_CONCEPT: culturalConceptSchema,
  VISUAL_MOODBOARD: visualMoodboardSchema,
} as const;

export type CreativeAssetContentMap = {
  WEDDING_THEME: z.infer<typeof weddingThemeSchema>;
  BIRTHDAY_CONCEPT: z.infer<typeof birthdayConceptSchema>;
  DECORATION_RECOMMENDATION: z.infer<typeof decorationRecommendationSchema>;
  COLOR_PALETTE: z.infer<typeof colorPaletteSchema>;
  INVITATION_CONTENT: z.infer<typeof invitationContentSchema>;
  WELCOME_MESSAGE: z.infer<typeof welcomeMessageSchema>;
  MENU_SUGGESTIONS: z.infer<typeof menuSuggestionsSchema>;
  ENTERTAINMENT_IDEAS: z.infer<typeof entertainmentIdeasSchema>;
  PHOTOGRAPHY_SHOTLIST: z.infer<typeof photographyShotlistSchema>;
  RETURN_GIFTS: z.infer<typeof returnGiftsSchema>;
  EVENT_BRANDING: z.infer<typeof eventBrandingSchema>;
  SOCIAL_MEDIA_CAPTIONS: z.infer<typeof socialMediaCaptionsSchema>;
  CULTURAL_CONCEPT: z.infer<typeof culturalConceptSchema>;
  VISUAL_MOODBOARD: z.infer<typeof visualMoodboardSchema>;
};

/**
 * Creative Studio Result Package containing Option A and optional Option B for side-by-side comparison.
 */
export interface CreativeStudioResponse<T = unknown> {
  category: CreativeCategory;
  optionA: {
    title: string;
    styleVariant: string;
    content: T;
  };
  optionB?: {
    title: string;
    styleVariant: string;
    content: T;
  };
  eventContext: {
    eventId: string;
    eventTitle: string;
    eventType: string;
    budgetFormatted: string;
    guestCount: number;
    location: string;
    culturalPreferences?: string;
  };
  source: 'GEMINI_API' | 'DETERMINISTIC_FALLBACK';
  latencyMs: number;
  promptVersion: string;
  truthInGenerationDisclaimer?: string;
}

/**
 * Schema for saving an approved creative asset.
 */
export const saveCreativeAssetSchema = z.object({
  category: creativeCategorySchema,
  title: z.string().min(1, 'Title is required').max(150),
  content: z.record(z.any()), // JSON payload matching category schema
  prompt: z.string().max(2000).default(''),
  notes: z.string().max(1000).optional(),
  isApproved: z.boolean().default(true),
  version: z.number().int().min(1).default(1),
});

export type SaveCreativeAssetInput = z.infer<typeof saveCreativeAssetSchema>;

/**
 * Schema for updating an existing creative asset.
 */
export const updateCreativeAssetSchema = z.object({
  title: z.string().min(1).max(150).optional(),
  content: z.record(z.any()).optional(),
  notes: z.string().max(1000).optional(),
  isApproved: z.boolean().optional(),
});

export type UpdateCreativeAssetInput = z.infer<typeof updateCreativeAssetSchema>;
