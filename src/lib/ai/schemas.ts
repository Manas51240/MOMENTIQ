import { z } from 'zod';

// ==============================================================================
// CELEBRA — AI Event Architect Structured Output Schemas & Zod Validators
// Validates 14 Input Parameters and 12 Structured Generated Event Plan Sections
// ==============================================================================

export const PROMPT_VERSION = 'v1.2.0-event-architect';

export const eventArchitectCategoryEnum = z.enum([
  'WEDDING',
  'BIRTHDAY',
  'ANNIVERSARY',
  'ENGAGEMENT',
  'BABY_SHOWER',
  'CORPORATE',
  'COMMUNITY',
  'CUSTOM',
  'CULTURAL',
]);

export const indoorOutdoorEnum = z.enum(['INDOOR', 'OUTDOOR', 'HYBRID']);

// ------------------------------------------------------------------------------
// Input Parameters Schema (14 parameters)
// ------------------------------------------------------------------------------
export const eventArchitectInputSchema = z.object({
  category: eventArchitectCategoryEnum,
  eventDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Valid ISO date string is required for eventDate',
  }),
  durationHours: z.number().min(1).max(72).default(5),
  location: z.string().trim().min(2).max(150),
  budgetMinor: z.number().int().min(10000, 'Minimum budget is 10,000 minor units ($100.00)'),
  currency: z.string().length(3).default('USD'),
  guestCount: z.number().int().min(2).max(50000),
  eventStyle: z.string().trim().min(2).max(100).default('Elegant & Contemporary'),
  theme: z.string().trim().max(100).default('Tailored Celebration'),
  culturalPreferences: z.array(z.string().trim().max(100)).default([]),
  dietaryPreferences: z.array(z.string().trim().max(100)).default([]),
  venuePreferences: z.string().trim().max(200).default('Flexible ballroom or scenic hall'),
  indoorOutdoor: indoorOutdoorEnum.default('INDOOR'),
  accessibilityRequirements: z.array(z.string().trim().max(100)).default([]),
  specialInstructions: z.string().trim().max(2000).default(''),
});

export type EventArchitectInput = z.infer<typeof eventArchitectInputSchema>;

// ------------------------------------------------------------------------------
// Section 1: Executive Event Concept
// ------------------------------------------------------------------------------
export const executiveConceptSchema = z.object({
  title: z.string().min(2),
  tagline: z.string().min(5),
  overview: z.string().min(20),
  keyHighlights: z.array(z.string().min(3)).min(2),
  atmosphere: z.string().min(10),
});

// ------------------------------------------------------------------------------
// Section 2: Recommended Theme
// ------------------------------------------------------------------------------
export const recommendedThemeSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(15),
  colorPalette: z.object({
    primary: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid primary color hex'),
    secondary: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid secondary color hex'),
    accent: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid accent color hex'),
    neutral: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid neutral color hex'),
  }),
  aestheticMotifs: z.array(z.string().min(2)).min(2),
  dressCode: z.string().min(3),
});

// ------------------------------------------------------------------------------
// Section 3: Decoration Plan
// ------------------------------------------------------------------------------
export const decorationPlanSchema = z.object({
  focalPoints: z.array(z.string().min(3)).min(2),
  lightingPlan: z.string().min(10),
  floralAndGreenery: z.string().min(10),
  tableSettings: z.string().min(10),
  signageAndStationery: z.string().min(10),
});

// ------------------------------------------------------------------------------
// Section 4: Budget Allocation (Fixed Integer Minor Units)
// ------------------------------------------------------------------------------
export const budgetCategoryAllocationSchema = z.object({
  name: z.string().min(2),
  percentage: z.number().min(1).max(100),
  allocatedMinor: z.number().int().min(0),
  rationale: z.string().min(5),
});

export const budgetAllocationSchema = z.object({
  totalBudgetMinor: z.number().int().min(0),
  currency: z.string().length(3),
  categories: z.array(budgetCategoryAllocationSchema).min(3),
  contingencyMinor: z.number().int().min(0),
  contingencyPercentage: z.number().min(1).max(30),
});

// ------------------------------------------------------------------------------
// Section 5: Planning Milestones
// ------------------------------------------------------------------------------
export const planningMilestoneItemSchema = z.object({
  phase: z.string().min(2),
  timeframe: z.string().min(3),
  targetDateOffsetWeeks: z.number().int(),
  deliverables: z.array(z.string().min(3)).min(1),
  criticalPath: z.boolean().default(false),
});

export const planningMilestonesSchema = z.object({
  milestones: z.array(planningMilestoneItemSchema).min(3),
});

// ------------------------------------------------------------------------------
// Section 6: Vendor Checklist
// ------------------------------------------------------------------------------
export const vendorChecklistItemSchema = z.object({
  category: z.string().min(2),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'OPTIONAL']),
  recommendedBookingWindowWeeks: z.number().int().min(0),
  keySelectionCriteria: z.array(z.string().min(3)).min(1),
  estimatedMinor: z.number().int().min(0),
});

export const vendorChecklistSchema = z.object({
  vendors: z.array(vendorChecklistItemSchema).min(3),
});

// ------------------------------------------------------------------------------
// Section 7: Guest Management Plan
// ------------------------------------------------------------------------------
export const guestManagementPlanSchema = z.object({
  invitationStrategy: z.string().min(10),
  rsvpDeadlineOffsetWeeks: z.number().int().min(1),
  seatingArrangementType: z.string().min(5),
  welcomeExperience: z.string().min(10),
  dietaryTrackingStrategy: z.string().min(10),
  accessibilityAccommodations: z.array(z.string().min(3)).min(1),
});

// ------------------------------------------------------------------------------
// Section 8: Event-Day Schedule
// ------------------------------------------------------------------------------
export const scheduleSlotSchema = z.object({
  timeOffset: z.string().min(2), // e.g., "T-02:00", "16:00"
  timeLabel: z.string().min(2),  // e.g., "4:00 PM - Guest Arrival"
  activity: z.string().min(5),
  leadPerson: z.string().min(2),
  location: z.string().min(2),
  contingencyBufferMinutes: z.number().int().min(0),
});

export const eventDayScheduleSchema = z.object({
  timeline: z.array(scheduleSlotSchema).min(4),
});

// ------------------------------------------------------------------------------
// Section 9: Menu Suggestions
// ------------------------------------------------------------------------------
export const dietaryAlternativeSchema = z.object({
  dietaryTag: z.string().min(2),
  alternativeItem: z.string().min(3),
});

export const menuSuggestionsSchema = z.object({
  style: z.string().min(3),
  welcomeDrinks: z.array(z.string().min(2)).min(1),
  appetizers: z.array(z.string().min(2)).min(2),
  mainCourses: z.array(z.string().min(2)).min(2),
  desserts: z.array(z.string().min(2)).min(1),
  dietaryOptions: z.array(dietaryAlternativeSchema).min(1),
});

// ------------------------------------------------------------------------------
// Section 10: Entertainment Plan
// ------------------------------------------------------------------------------
export const entertainmentPlanSchema = z.object({
  mainAttractions: z.array(z.string().min(3)).min(1),
  backgroundMusic: z.string().min(5),
  interactiveElements: z.array(z.string().min(3)).min(1),
  transitionCues: z.array(z.string().min(3)).min(1),
});

// ------------------------------------------------------------------------------
// Section 11: Contingency Plan
// ------------------------------------------------------------------------------
export const contingencyScenarioSchema = z.object({
  riskDescription: z.string().min(5),
  probability: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  impact: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  preventiveMeasure: z.string().min(5),
  fallbackPlan: z.string().min(5),
});

export const contingencyPlanSchema = z.object({
  scenarios: z.array(contingencyScenarioSchema).min(2),
});

// ------------------------------------------------------------------------------
// Section 12: Important Assumptions
// ------------------------------------------------------------------------------
export const importantAssumptionsSchema = z.object({
  assumptions: z.array(z.string().min(5)).min(2),
  disclaimers: z.array(z.string().min(5)).min(2),
  externalDependencies: z.array(z.string().min(5)).min(1),
});

// ------------------------------------------------------------------------------
// Complete Master Event Architect Plan Schema
// ------------------------------------------------------------------------------
export const eventArchitectPlanSchema = z.object({
  version: z.string().default(PROMPT_VERSION),
  generatedAt: z.string().default(() => new Date().toISOString()),
  isAiGenerated: z.literal(true).default(true),
  verified: z.literal(false).default(false), // Separates AI recommendation from human verified fact
  executiveConcept: executiveConceptSchema,
  recommendedTheme: recommendedThemeSchema,
  decorationPlan: decorationPlanSchema,
  budgetAllocation: budgetAllocationSchema,
  planningMilestones: planningMilestonesSchema,
  vendorChecklist: vendorChecklistSchema,
  guestManagementPlan: guestManagementPlanSchema,
  eventDaySchedule: eventDayScheduleSchema,
  menuSuggestions: menuSuggestionsSchema,
  entertainmentPlan: entertainmentPlanSchema,
  contingencyPlan: contingencyPlanSchema,
  importantAssumptions: importantAssumptionsSchema,
});

export type EventArchitectPlan = z.infer<typeof eventArchitectPlanSchema>;

// ------------------------------------------------------------------------------
// Section Name Enum for Selective Regeneration
// ------------------------------------------------------------------------------
export const planSectionNameEnum = z.enum([
  'executiveConcept',
  'recommendedTheme',
  'decorationPlan',
  'budgetAllocation',
  'planningMilestones',
  'vendorChecklist',
  'guestManagementPlan',
  'eventDaySchedule',
  'menuSuggestions',
  'entertainmentPlan',
  'contingencyPlan',
  'importantAssumptions',
]);

export type PlanSectionName = z.infer<typeof planSectionNameEnum>;

// Section to Schema Map for validation during regeneration
export const SECTION_SCHEMAS: Record<PlanSectionName, z.ZodTypeAny> = {
  executiveConcept: executiveConceptSchema,
  recommendedTheme: recommendedThemeSchema,
  decorationPlan: decorationPlanSchema,
  budgetAllocation: budgetAllocationSchema,
  planningMilestones: planningMilestonesSchema,
  vendorChecklist: vendorChecklistSchema,
  guestManagementPlan: guestManagementPlanSchema,
  eventDaySchedule: eventDayScheduleSchema,
  menuSuggestions: menuSuggestionsSchema,
  entertainmentPlan: entertainmentPlanSchema,
  contingencyPlan: contingencyPlanSchema,
  importantAssumptions: importantAssumptionsSchema,
};

// ------------------------------------------------------------------------------
// User Feedback Schema
// ------------------------------------------------------------------------------
export const aiFeedbackInputSchema = z.object({
  generationId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comments: z.string().trim().max(1000).optional(),
});

