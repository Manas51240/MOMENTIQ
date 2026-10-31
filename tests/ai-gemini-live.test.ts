import { describe, it, expect } from 'vitest';
import { executeAiEventArchitect, executeAiSectionRegeneration } from '../src/lib/ai/gemini-client';
import { EventArchitectInput } from '../src/lib/ai/schemas';

describe('Google Gemini API Live Integration (Isolated Provider Test)', () => {
  const hasLiveApiKey =
    process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here' &&
    process.env.GEMINI_API_KEY.trim().length > 10;

  const sampleInput: EventArchitectInput = {
    category: 'CORPORATE',
    eventDate: new Date(Date.now() + 86400000 * 45).toISOString(),
    durationHours: 8,
    location: 'Seattle Convention Center, WA',
    budgetMinor: 10000000, // $100,000.00
    currency: 'USD',
    guestCount: 300,
    eventStyle: 'Executive High-Tech',
    theme: 'Future of Cloud Computing',
    culturalPreferences: [],
    dietaryPreferences: ['Vegan', 'Halal', 'Kosher'],
    venuePreferences: 'Auditorium with AV breakout rooms',
    indoorOutdoor: 'INDOOR',
    accessibilityRequirements: ['Closed captioning for keynotes', 'Braille signage'],
    specialInstructions: 'Livestream all keynote speeches to remote global attendees',
  };

  it.runIf(hasLiveApiKey)(
    'executes real live Google Gemini 2.5 Flash API call via server-side client',
    async () => {
      const result = await executeAiSectionRegeneration('executiveConcept', sampleInput);

      expect(result.source).toBe('GEMINI_API');
      expect(result.data).toBeDefined();
      expect(result.data.title).toBeDefined();
      expect(result.latencyMs).toBeGreaterThan(0);
    },
    30000
  );

  it('gracefully uses deterministic fallback when live credentials are empty or in offline test environment', async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    try {
      delete process.env.GEMINI_API_KEY;
      const result = await executeAiEventArchitect(sampleInput);

      expect(result.source).toBe('DETERMINISTIC_FALLBACK');
      expect(result.data).toBeDefined();
      expect(result.data.isAiGenerated).toBe(true);
      expect(result.data.verified).toBe(false);
      expect(result.data.executiveConcept.title).toContain('Corporate');
    } finally {
      process.env.GEMINI_API_KEY = originalKey;
    }
  });
});

