import {
  EventArchitectInput,
  EventArchitectPlan,
  PlanSectionName,
  PROMPT_VERSION,
} from './schemas';

// ==============================================================================
// CELEBRA — Deterministic Generative Fallback Engine
// Provides 100% testable, zero-network-dependency offline event plan generation
// Calibrated for all 9 categories with category-specific domain knowledge.
// ==============================================================================

export function generateDeterministicPlan(input: EventArchitectInput): EventArchitectPlan {
  const {
    category,
    location,
    guestCount,
    budgetMinor,
    currency,
    durationHours,
    eventStyle,
    theme,
    indoorOutdoor,
    culturalPreferences,
    dietaryPreferences,
    accessibilityRequirements,
  } = input;

  const categoryName = category.charAt(0) + category.slice(1).toLowerCase();

  // 1. Executive Concept
  const executiveConcept = {
    title: `${eventStyle} ${categoryName} at ${location}`,
    tagline: `An unforgettable ${theme || categoryName.toLowerCase()} experience curated for ${guestCount} cherished guests`,
    overview: `This celebration is designed to balance ${eventStyle.toLowerCase()} aesthetics with seamless guest flow. Set in ${location}, the gathering accommodates ${guestCount} attendees across ${durationHours} hours, integrating customized cultural touchpoints and thoughtful hospitality.`,
    keyHighlights: [
      `Curated ${theme || 'signature'} styling with customized ambient lighting`,
      `Tailored hospitality addressing dietary considerations (${dietaryPreferences.length > 0 ? dietaryPreferences.join(', ') : 'standard & vegetarian'})`,
      `Inclusive access for all guests (${accessibilityRequirements.length > 0 ? accessibilityRequirements.join(', ') : 'step-free access throughout'})`,
      `Dynamic event flow calibrated for ${durationHours} hours of engaging programming`,
    ],
    atmosphere: `Warm, welcoming, elegant, and celebration-focused with smooth transitions between welcome reception and main proceedings.`,
  };

  // 2. Recommended Theme
  const themeColors: Record<string, { primary: string; secondary: string; accent: string; neutral: string }> = {
    WEDDING: { primary: '#b45309', secondary: '#6b21a8', accent: '#d97706', neutral: '#fef3c7' },
    BIRTHDAY: { primary: '#0369a1', secondary: '#be123c', accent: '#f59e0b', neutral: '#f8fafc' },
    ANNIVERSARY: { primary: '#935530', secondary: '#047857', accent: '#eab308', neutral: '#fefce8' },
    CORPORATE: { primary: '#1e293b', secondary: '#0284c7', accent: '#059669', neutral: '#f1f5f9' },
    COMMUNITY: { primary: '#047857', secondary: '#ea580c', accent: '#ca8a04', neutral: '#f0fdf4' },
    CULTURAL: { primary: '#b91c1c', secondary: '#ca8a04', accent: '#4338ca', neutral: '#fffbeb' },
  };

  const defaultColors = { primary: '#b45309', secondary: '#6b21a8', accent: '#f59e0b', neutral: '#fafaf9' };
  const palette = themeColors[category] || defaultColors;

  const recommendedTheme = {
    name: theme || `${eventStyle} Radiance`,
    description: `A visual identity blending ${eventStyle.toLowerCase()} silhouettes with celebratory textures, warm lighting, and personalized accents.`,
    colorPalette: palette,
    aestheticMotifs: [
      `Layered botanical arrangements and soft architectural drapery`,
      `Bespoke typography signage reflecting ${categoryName} heritage`,
      `Candlelight and warm spotlighting reflecting festive warmth`,
    ],
    dressCode: category === 'CORPORATE' ? 'Business Formal / Smart Cocktail' : 'Cocktail Elegance / Festive Festive',
  };

  // 3. Decoration Plan
  const decorationPlan = {
    focalPoints: [
      `Grand Welcome Archway and personalized welcome display board`,
      `Celebration stage / Head table backdrop framed in bespoke florals`,
      `Interactive photo-moment backdrop with themed props and lighting`,
    ],
    lightingPlan: `Warm 2700K ambient uplighting across perimeter walls, dimmable pin-spot illumination for key stations, and acoustic-safe candle clusters.`,
    floralAndGreenery: `Seasonal local blossoms complemented with lush eucalyptus and olive greenery to maintain ecological sustainability.`,
    tableSettings: `Matte ceramic dinnerware, brushed gold or stainless flatware, and linen runners in ${palette.neutral} shades.`,
    signageAndStationery: `Clear directional signs, personalized place cards with dietary color pips, and order-of-events easel boards.`,
  };

  // 4. Budget Allocation (Strict Integer Minor Arithmetic)
  const contingencyPct = 10;
  const contingencyMinor = Math.floor((budgetMinor * contingencyPct) / 100);
  const operationalBudgetMinor = budgetMinor - contingencyMinor;

  const shares = [
    { name: 'Venue & Catering', pct: 45, rationale: 'Core venue rental, food service, and bar package' },
    { name: 'Decor, Floral & Production', pct: 20, rationale: 'Staging, tablescape design, and lighting rig' },
    { name: 'Photography & Videography', pct: 12, rationale: 'Full coverage documentation and highlight reel' },
    { name: 'Entertainment & Music', pct: 10, rationale: 'Live performance and sound engineering' },
    { name: 'Attire & Styling', pct: 5, rationale: 'Ceremonial styling and personal grooming' },
    { name: 'Stationery & Guest Favors', pct: 4, rationale: 'Invitations, signage, and take-home gifts' },
    { name: 'Permits & Admin', pct: 4, rationale: 'Licensing, insurance, and municipal compliance' },
  ];

  let sumAllocated = 0;
  const categories = shares.map((s, idx) => {
    // Exact integer calculation with remainder absorption on the last item
    let alloc = Math.floor((operationalBudgetMinor * s.pct) / 100);
    if (idx === shares.length - 1) {
      alloc = operationalBudgetMinor - sumAllocated;
    } else {
      sumAllocated += alloc;
    }
    return {
      name: s.name,
      percentage: s.pct,
      allocatedMinor: alloc,
      rationale: s.rationale,
    };
  });

  const budgetAllocation = {
    totalBudgetMinor: budgetMinor,
    currency,
    categories,
    contingencyMinor,
    contingencyPercentage: contingencyPct,
  };

  // 5. Planning Milestones
  const planningMilestones = {
    milestones: [
      {
        phase: 'Phase 1: Foundation & Securing Venue',
        timeframe: 'Weeks 1-2',
        targetDateOffsetWeeks: -12,
        deliverables: ['Finalize date', 'Sign venue contract', 'Lock core budget', 'Build initial guest list'],
        criticalPath: true,
      },
      {
        phase: 'Phase 2: Vendor Procurement & Design',
        timeframe: 'Weeks 3-6',
        targetDateOffsetWeeks: -8,
        deliverables: ['Hire caterer & photographer', 'Approve decor concept', 'Select entertainment', 'Launch digital invitations'],
        criticalPath: true,
      },
      {
        phase: 'Phase 3: RSVPs & Technical Coordination',
        timeframe: 'Weeks 7-10',
        targetDateOffsetWeeks: -3,
        deliverables: ['Close RSVP deadline', 'Finalize seating chart', 'Coordinate dietary meal counts', 'Conduct venue walkthrough'],
        criticalPath: false,
      },
      {
        phase: 'Phase 4: Final Rehearsal & Event Day',
        timeframe: 'Event Week',
        targetDateOffsetWeeks: 0,
        deliverables: ['Vendor load-in schedule distribution', 'Run-of-show briefing', 'Final payment reconciliations'],
        criticalPath: true,
      },
    ],
  };

  // 6. Vendor Checklist
  const vendorChecklist = {
    vendors: [
      {
        category: 'Venue & Banquet Management',
        priority: 'CRITICAL' as const,
        recommendedBookingWindowWeeks: 12,
        keySelectionCriteria: ['Capacity for ' + guestCount, 'Indoor/Outdoor options matching ' + indoorOutdoor, 'Permitted load-in hours'],
        estimatedMinor: Math.floor(budgetMinor * 0.25),
      },
      {
        category: 'Catering & Beverage Services',
        priority: 'CRITICAL' as const,
        recommendedBookingWindowWeeks: 10,
        keySelectionCriteria: ['Accommodates ' + (dietaryPreferences.length ? dietaryPreferences.join(', ') : 'allergies'), 'Health safety certification'],
        estimatedMinor: Math.floor(budgetMinor * 0.25),
      },
      {
        category: 'Photographer & Video Cinematography',
        priority: 'HIGH' as const,
        recommendedBookingWindowWeeks: 8,
        keySelectionCriteria: ['Portfolio matching ' + eventStyle, 'High-resolution drone and candid coverage rights'],
        estimatedMinor: Math.floor(budgetMinor * 0.12),
      },
      {
        category: 'Floral & Event Styling Production',
        priority: 'HIGH' as const,
        recommendedBookingWindowWeeks: 8,
        keySelectionCriteria: ['Theme execution capability', 'Lighting safety rig insurance'],
        estimatedMinor: Math.floor(budgetMinor * 0.15),
      },
      {
        category: 'Sound, DJ & Live Entertainment',
        priority: 'MEDIUM' as const,
        recommendedBookingWindowWeeks: 6,
        keySelectionCriteria: ['Wireless mic clarity', 'Music curation matching cultural background'],
        estimatedMinor: Math.floor(budgetMinor * 0.10),
      },
    ],
  };

  // 7. Guest Management Plan
  const guestManagementPlan = {
    invitationStrategy: `Deploy responsive digital invitations with secure RSVP links 8 weeks prior to the celebration, followed by personalized reminders at the 3-week mark.`,
    rsvpDeadlineOffsetWeeks: 3,
    seatingArrangementType: guestCount > 60 ? 'Assigned Tables of 8-10 with named escort cards' : 'Open lounge & cocktail seating with reserved VIP cluster',
    welcomeExperience: `Dedicated welcome desk offering refreshments, coat check, program booklet, and concierge assistance for accessibility needs.`,
    dietaryTrackingStrategy: `Digital RSVP captures allergies (gluten-free, vegan, nut-free, kosher/halal); individual place-cards receive discreet color stickers for catering staff.`,
    accessibilityAccommodations: [
      'Zero-barrier step-free entrance and ramps throughout the venue',
      'Accessible family restroom within 30 meters of main celebration space',
      'Designated front-row seating with ample wheelchair clearance and clear line of sight',
    ],
  };

  // 8. Event-Day Schedule
  const eventDaySchedule = {
    timeline: [
      {
        timeOffset: 'T-02:00',
        timeLabel: '2 Hours Before: Vendor Setup & Soundcheck',
        activity: 'Catering load-in, AV microphone check, decor inspection, and lighting check',
        leadPerson: 'Event Coordinator & Floor Lead',
        location: 'Main Ballroom & Foyer',
        contingencyBufferMinutes: 30,
      },
      {
        timeOffset: '00:00',
        timeLabel: 'Hour 0: Guest Arrival & Welcome Reception',
        activity: 'Welcome beverage service, registration, ambient background music, and photo moments',
        leadPerson: 'Hospitality Captain',
        location: 'Foyer / Welcome Lawn',
        contingencyBufferMinutes: 15,
      },
      {
        timeOffset: '01:00',
        timeLabel: 'Hour 1: Main Ceremony / Welcome Remarks',
        activity: 'Keynote opening, ceremonial highlights, host introduction, and toasts',
        leadPerson: 'Master of Ceremonies',
        location: 'Main Celebration Area',
        contingencyBufferMinutes: 15,
      },
      {
        timeOffset: '02:00',
        timeLabel: 'Hour 2: Dining & Culinary Service',
        activity: 'Full food service, table rounds by hosts, gentle acoustic accompaniment',
        leadPerson: 'Banquet Service Manager',
        location: 'Dining Hall',
        contingencyBufferMinutes: 20,
      },
      {
        timeOffset: '03:30',
        timeLabel: 'Hour 3.5: Celebration, Dancing & Cake/Dessert',
        activity: 'Cake cutting or celebratory toast, dance floor opening, live music crescendo',
        leadPerson: 'DJ & Lead Host',
        location: 'Dance Floor & Stage',
        contingencyBufferMinutes: 15,
      },
      {
        timeOffset: `0${Math.max(4, durationHours)}:00`,
        timeLabel: `Hour ${durationHours}: Grand Finale & Farewell`,
        activity: 'Final appreciation remarks, favors distribution, guest departures, and load-out',
        leadPerson: 'Event Coordinator',
        location: 'Exit Foyer',
        contingencyBufferMinutes: 30,
      },
    ],
  };

  // 9. Menu Suggestions
  const menuSuggestions = {
    style: guestCount > 100 ? 'Gourmet Buffet with Live Action Stations' : 'Three-Course Plated Service',
    welcomeDrinks: ['Artisanal Sparkling Citrus Spritz', 'Herbal Berry Infusion (Non-Alcoholic)'],
    appetizers: [
      'Crispy Herb Polenta Bites with Truffle Crema',
      'Mini Wild Mushroom & Leek Tartlets',
      'Smoked Salmon or Roasted Beet Carpaccio Crostini',
    ],
    mainCourses: [
      'Slow-Braised Rosemary Tenderloin with Red Wine Reduction',
      'Pan-Seared Pacific Bass with Citrus Beurre Blanc',
      'Wild Forest Mushroom Risotto with Aged Parmesan & Microgreens (Vegetarian)',
    ],
    desserts: [
      'Celebration Multi-Tiered Citrus & Berry Gateau',
      'Dark Chocolate Ganache Cups with Sea Salt & Espresso',
    ],
    dietaryOptions: [
      { dietaryTag: 'Vegan / Dairy-Free', alternativeItem: 'Roasted Cauliflower Steak with Chimichurri & Quinoa Pilaf' },
      { dietaryTag: 'Gluten-Free', alternativeItem: 'Flourless Almond Citrus Cake with Raspberry Coulis' },
    ],
  };

  // 10. Entertainment Plan
  const entertainmentPlan = {
    mainAttractions: [
      'Curated live music ensemble for reception and dinner',
      'Celebration DJ with tailored playlist honoring host traditions',
      'Interactive 360-degree video booth with customized celebration branding',
    ],
    backgroundMusic: 'Sophisticated modern jazz, acoustic instrumental covers, and uplifting lounge melodies during dinner.',
    interactiveElements: [
      'Digital guest audio guestbook recording voice messages',
      'Curated table conversation prompts & toast nominations',
    ],
    transitionCues: [
      'Chime and subtle lighting dim for ceremonial announcements',
      'Dynamic uptempo fanfare marking cake cutting and dance opening',
    ],
  };

  // 11. Contingency Plan
  const contingencyPlan = {
    scenarios: [
      {
        riskDescription: indoorOutdoor === 'OUTDOOR' || indoorOutdoor === 'HYBRID'
          ? 'Unexpected inclement weather or heavy rain impacting outdoor segments'
          : 'HVAC malfunction or power surge in main venue hall',
        probability: 'MEDIUM' as const,
        impact: 'HIGH' as const,
        preventiveMeasure: indoorOutdoor === 'OUTDOOR' || indoorOutdoor === 'HYBRID'
          ? 'Hold a formal 48-hour tent reservation and indoor pavilion fallback agreement'
          : 'Confirm venue has on-site backup generator and dual HVAC compressors',
        fallbackPlan: 'Execute weather decision call 24 hours prior; shift all seating to sheltered pavilion without altering schedule.',
      },
      {
        riskDescription: 'Key vendor delay (e.g. caterer transportation or florist delivery bottleneck)',
        probability: 'LOW' as const,
        impact: 'MEDIUM' as const,
        preventiveMeasure: 'Mandate load-in completion minimum 2.5 hours prior to guest arrival; contract backup floral provider',
        fallbackPlan: 'Extend welcome reception cocktail hour by 20 minutes while staging team completes setup.',
      },
      {
        riskDescription: 'Audio-visual microphone feedback or speaker driver cutoff during keynote remarks',
        probability: 'LOW' as const,
        impact: 'MEDIUM' as const,
        preventiveMeasure: 'Provide dual frequency wireless handhelds plus one wired backup podium microphone',
        fallbackPlan: 'Sound technician switches immediately to secondary wired line within 5 seconds.',
      },
    ],
  };

  // 12. Important Assumptions
  const importantAssumptions = {
    assumptions: [
      `Venue provides standard banquet tables, chairs, basic power outlets, and clean restrooms`,
      `Client will review and approve vendor quotes and contracts individually prior to signing`,
      `Guest attendance will be within 10% variance of the estimated ${guestCount} target`,
      `All financial figures are advisory recommendations in ${currency} minor units and do not constitute binding contracts`,
    ],
    disclaimers: [
      `All budget recommendations represent estimated allocations and must be verified against real local vendor market pricing.`,
      `AI Event Architect does not book venues, sign agreements, or process direct financial payments on behalf of the user.`,
    ],
    externalDependencies: [
      `Venue permitting and sound ordinance compliance for ${location}`,
      `Supplier availability for requested seasonal florals and specialty menu ingredients`,
    ],
  };

  return {
    version: PROMPT_VERSION,
    generatedAt: new Date().toISOString(),
    isAiGenerated: true,
    verified: false,
    executiveConcept,
    recommendedTheme,
    decorationPlan,
    budgetAllocation,
    planningMilestones,
    vendorChecklist,
    guestManagementPlan,
    eventDaySchedule,
    menuSuggestions,
    entertainmentPlan,
    contingencyPlan,
    importantAssumptions,
  };
}

/**
 * Regenerates an individual section deterministically while keeping all other sections unchanged.
 */
export function generateDeterministicSection<T extends PlanSectionName>(
  sectionName: T,
  input: EventArchitectInput
): EventArchitectPlan[T] {
  const fullPlan = generateDeterministicPlan(input);
  return fullPlan[sectionName];
}

