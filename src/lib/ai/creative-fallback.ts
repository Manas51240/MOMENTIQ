import {
  CreativeCategory,
  CreativeAssetContentMap,
  weddingThemeSchema,
  birthdayConceptSchema,
  decorationRecommendationSchema,
  colorPaletteSchema,
  invitationContentSchema,
  welcomeMessageSchema,
  menuSuggestionsSchema,
  entertainmentIdeasSchema,
  photographyShotlistSchema,
  returnGiftsSchema,
  eventBrandingSchema,
  socialMediaCaptionsSchema,
  culturalConceptSchema,
  visualMoodboardSchema,
} from './creative-schemas';

export interface EventContextParams {
  eventId: string;
  title: string;
  eventType: string; // WEDDING, BIRTHDAY, etc.
  budgetMinor: number | bigint;
  currency: string;
  guestTarget: number;
  venue: string;
  city: string;
  country: string;
  theme?: string;
  culturalPreferences?: string;
  dietaryRestrictions?: string[];
  durationHours?: number;
  userInstructions?: string;
  tone?: string;
}

/**
 * Builds a deterministic SVG visual moodboard collage with color swatches, aesthetic textures,
 * and an explicit truth-in-generation watermark banner.
 */
function generateMoodboardSvg(
  title: string,
  style: string,
  colors: { name: string; hex: string }[]
): string {
  const swatchWidth = 80;
  const swatchesSvg = colors
    .slice(0, 5)
    .map(
      (c, idx) => `
    <g transform="translate(${40 + idx * 95}, 210)">
      <rect width="80" height="90" rx="8" fill="${c.hex}" stroke="#ffffff" stroke-width="2" />
      <rect y="95" width="80" height="35" rx="4" fill="#ffffff" opacity="0.9" />
      <text x="40" y="112" font-family="system-ui, sans-serif" font-size="10" font-weight="bold" fill="#1e293b" text-anchor="middle">${c.name.slice(0, 10)}</text>
      <text x="40" y="124" font-family="monospace" font-size="9" fill="#64748b" text-anchor="middle">${c.hex}</text>
    </g>`
    )
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%" height="100%" style="border-radius: 12px; background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%);">
  <defs>
    <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
  </defs>

  <!-- Background decorative pattern -->
  <circle cx="530" cy="70" r="120" fill="#ffffff" opacity="0.04" />
  <circle cx="70" cy="350" r="90" fill="#ffffff" opacity="0.04" />

  <!-- Moodboard Header -->
  <text x="40" y="55" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" letter-spacing="2" fill="url(#goldGradient)">CELEBRA CREATIVE MOODBOARD</text>
  <text x="40" y="90" font-family="serif" font-size="26" font-weight="bold" fill="#ffffff">${title.replace(/&/g, '&amp;')}</text>
  <text x="40" y="118" font-family="system-ui, sans-serif" font-size="14" fill="#c7d2fe">Aesthetic: ${style}</text>

  <!-- Visual Card Elements -->
  <rect x="40" y="140" width="160" height="50" rx="8" fill="#ffffff" opacity="0.12" />
  <text x="55" y="162" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" fill="#e0e7ff">LIGHTING &amp; AMBIANCE</text>
  <text x="55" y="177" font-family="system-ui, sans-serif" font-size="10" fill="#cbd5e1">Warm candlelight &amp; uplighting</text>

  <rect x="215" y="140" width="160" height="50" rx="8" fill="#ffffff" opacity="0.12" />
  <text x="230" y="162" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" fill="#e0e7ff">TEXTURES &amp; FABRICS</text>
  <text x="230" y="177" font-family="system-ui, sans-serif" font-size="10" fill="#cbd5e1">Lustrous silk, velvet, raw wood</text>

  <rect x="390" y="140" width="170" height="50" rx="8" fill="#ffffff" opacity="0.12" />
  <text x="405" y="162" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" fill="#e0e7ff">FLORAL &amp; MOTIFS</text>
  <text x="405" y="177" font-family="system-ui, sans-serif" font-size="10" fill="#cbd5e1">Garden roses, olive branches</text>

  <!-- Color Palette Section -->
  <text x="40" y="200" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" letter-spacing="1" fill="#93c5fd">HARMONIZED PALETTE SWATCHES</text>
  ${swatchesSvg}

  <!-- Watermark Truth-In-Generation Disclaimer Bar -->
  <rect x="0" y="365" width="600" height="35" fill="#0f172a" opacity="0.95" />
  <text x="300" y="387" font-family="system-ui, sans-serif" font-size="10" font-weight="bold" fill="#f59e0b" text-anchor="middle">
    ⚠️ AI Generated Concept Moodboard — Not vendor portfolio photograph
  </text>
</svg>`;
}

/**
 * Generates deterministic structured creative content for any of the 14 categories.
 * Option variant distinguishes Option A (e.g. Classic/Formal) from Option B (e.g. Modern/Vibrant).
 */
export function generateDeterministicCreativeAsset<K extends CreativeCategory>(
  category: K,
  context: EventContextParams,
  variant: 'OPTION_A' | 'OPTION_B' = 'OPTION_A'
): CreativeAssetContentMap[K] {
  const isOptionB = variant === 'OPTION_B';
  const guests = context.guestTarget || 100;
  const budgetNum = Number(context.budgetMinor) || 1000000;
  const locationStr = [context.venue, context.city].filter(Boolean).join(', ') || 'Metropolitan Grand Ballroom';
  const culture = context.culturalPreferences || 'Contemporary Multicultural';
  const customNote = context.userInstructions ? ` (Incorporating: ${context.userInstructions})` : '';

  switch (category) {
    case 'WEDDING_THEME': {
      const data = isOptionB
        ? {
            conceptName: `Ethereal Celestial Romance${customNote}`,
            tagline: 'A starlit evening celebrating cosmic unity and timeless elegance',
            narrative: `Designed for ${guests} guests in ${locationStr}, this concept balances midnight indigo drapes with suspended crystal constellations and golden candlelight, reflecting ${culture} heritage.`,
            keyMotifs: ['Starlight Chandeliers', 'Indigo & Gold Geometry', 'Velvet Drapes', 'Calligraphy Scrolls'],
            attireGuide: {
              couple: 'Modern midnight-blue tailored tuxedo with gold embroidery and a sparkling crystalline tulle gown.',
              bridalParty: 'Muted slate-blue and champagne floor-length slip gowns with gold cuff accents.',
              guests: 'Black-tie optional with metallic or jewel-tone evening accents.',
            },
            ceremonyAesthetic: 'An illuminated arched tunnel with fairy lights leading to a mirrored altar reflecting candlelight.',
            receptionAesthetic: 'Dusk ambient lighting with starry ceiling projections and cascading orchid centerpieces.',
            suggestedFlorals: ['White Delphiniums', 'Midnight Calla Lilies', 'Eucalyptus', 'Gold-dipped Ferns'],
            estimatedBudgetSharePercent: 25,
          }
        : {
            conceptName: `Timeless Royal Garden Elegance${customNote}`,
            tagline: 'An opulent symphony of heritage florals, antique brass, and romantic intimacy',
            narrative: `Created for ${context.title} accommodating ${guests} guests at ${locationStr}. This concept bridges classical heritage warmth with contemporary floral grandeur inspired by ${culture}.`,
            keyMotifs: ['Vintage Brass Candlesticks', 'Botanical Archways', 'Silk Brocade Linens', 'Heritage Motifs'],
            attireGuide: {
              couple: 'Ivory heirloom embroidered sherwani / classical lace bridal gown with royal cathedral veil.',
              bridalParty: 'Blush rose and sage green tailored ensembles with fresh jasmine wrist corsages.',
              guests: 'Formal traditional attire or elegant evening formal in pastel and jewel tones.',
            },
            ceremonyAesthetic: 'Open-air botanical mandap or floral gazebo draped in sheer chiffon with cascading blush roses.',
            receptionAesthetic: 'Warm amber chandeliers, banquet tables dressed in champagne linen, and tall garden rose runners.',
            suggestedFlorals: ['Garden Roses', 'Blush Peonies', 'Baby Breath Garlands', 'Olive Foliage'],
            estimatedBudgetSharePercent: 28,
          };
      return weddingThemeSchema.parse(data) as CreativeAssetContentMap[K];
    }

    case 'BIRTHDAY_CONCEPT': {
      const data = isOptionB
        ? {
            themeTitle: `Neon Glow Cybernetic Fiesta${customNote}`,
            ageGroupOrMilestone: 'All Ages / Milestone Celebration',
            tagline: 'High-energy futuristic radiance with immersive beats and glow visuals',
            cakeConcept: 'Multi-tiered geometric black fondant cake with responsive LED sugar-crystal accents.',
            entranceFeature: 'Neon tunnel with responsive UV lasers, mist jets, and a customized glowing welcome portal.',
            activityZones: [
              { name: 'Laser Tag Arena', description: 'Glow-in-the-dark interactive team maze.', targetAudience: 'Youth & Adults' },
              { name: 'VR Experience Pod', description: 'Immersive 360-degree virtual worlds and gaming.', targetAudience: 'Tech Lovers' },
              { name: 'Glow Mocktail Lounge', description: 'Bioluminescent tonics and neon mocktails.', targetAudience: 'All Guests' },
            ],
            interactiveMoments: ['Synchronized glow-stick countdown', 'Live DJ remix drop', 'Digital graffiti wall'],
            favorsConcept: 'Custom engraved UV-reactive wristbands and portable mini LED Bluetooth speakers.',
          }
        : {
            themeTitle: `Vintage Golden Jubilee Carnival${customNote}`,
            ageGroupOrMilestone: 'Milestone Celebration',
            tagline: 'Whimsical nostalgia with vintage carousel charm, artisanal treats, and jazz',
            cakeConcept: 'Four-tier vintage naked cake with caramelized figs, edible 24k gold leaf, and spun sugar.',
            entranceFeature: 'Grand striped archway with fairy bulb festooning and an acoustic brass trio welcoming guests.',
            activityZones: [
              { name: 'Artisanal Gelato & Pastry Bar', description: 'Handcrafted gelato cones and crepe station.', targetAudience: 'All Ages' },
              { name: 'Vintage Photo Booth', description: 'Authentic 1950s photobooth with instant sepia polaroid prints.', targetAudience: 'Families' },
              { name: 'Acoustic Jazz Courtyard', description: 'Intimate lounge with velvet seating and acoustic quartet.', targetAudience: 'Adults' },
            ],
            interactiveMoments: ['Communal storytelling toast', 'Polaroid guestbook wall signing', 'Surprise jazz serenade'],
            favorsConcept: 'Personalized jars of artisanal wildflower honey with monogrammed wooden spoons.',
          };
      return birthdayConceptSchema.parse(data) as CreativeAssetContentMap[K];
    }

    case 'DECORATION_RECOMMENDATION': {
      const data = isOptionB
        ? {
            overallStyle: `Contemporary Minimalist Architectural${customNote}`,
            entranceDecor: 'Monolithic concrete pedestals with sculptural dry palm fronds and sleek warm linear LED strips.',
            focalPointOrStage: 'Asymmetrical floating matte-black metal frames adorned with single-stem white anthuriums.',
            tableSettings: {
              centerpieces: 'Fluted glass bud vases with architectural ikebana arrangements and smoke-grey taper candles.',
              linens: 'Textured matte charcoal organic linen runners over raw polished oak.',
              tableware: 'Matte black stoneware plates, brushed titanium flatware, and crystal tumbler glassware.',
            },
            lightingDesign: {
              ambient: 'Low-profile warm 2700K recessed beam lighting highlighting textures.',
              accent: 'Pin spots precisely focused on each floral sculpture and table centerpiece.',
              eveningTransition: 'Dynamic dimming into warm amber candlelight and subtle shadow play.',
            },
            signagePlan: ['Frosted acrylic welcome plaque', 'Monochrome metal easel seating directory', 'Backlit bar menus'],
            sustainableEcoTips: ['Zero floral foam used', '100% reusable linen rentals', 'Locally sourced dry foliage'],
          }
        : {
            overallStyle: `Lush Heritage Botanical Grandeur${customNote}`,
            entranceDecor: 'Grand cascading twin floral urns overflowing with hydrangea, garden roses, and brass oil lamps.',
            focalPointOrStage: 'Three-tiered architectural floral arch with woven gold fabric backdrops and suspended crystal lanterns.',
            tableSettings: {
              centerpieces: 'Footed brass compote bowls with overflowing peonies, ranunculus, and trailing ivy.',
              linens: 'Rich ivory damask tablecloths with scalloped champagne satin napkins.',
              tableware: 'Gold-rimmed fine bone china, 24k gold electroplated cutlery, and etched crystal goblets.',
            },
            lightingDesign: {
              ambient: 'Soft golden uplighting along venue perimeter pillars.',
              accent: 'Twinkling fairy light canopies and scented beeswax taper candles.',
              eveningTransition: 'Warm chandelier dimming synchronized with dessert service.',
            },
            signagePlan: ['Ornate gilded frame welcome mirror', 'Calligraphed parchment escort cards', 'Hand-lettered menu stands'],
            sustainableEcoTips: ['Potted plants repurposed as guest favors', 'Biodegradable cotton ribbon', 'Solar-powered fairy string arrays'],
          };
      return decorationRecommendationSchema.parse(data) as CreativeAssetContentMap[K];
    }

    case 'COLOR_PALETTE': {
      const data = isOptionB
        ? {
            paletteName: `Saffron Dawn & Terracotta Radiance${customNote}`,
            moodDescription: 'An earthy, warm, and spirited palette evoking sunrise celebrations and artisanal warmth.',
            colors: [
              { name: 'Saffron Gold', hex: '#E69F24', role: 'PRIMARY' as const, usageTip: 'Focal florals, stationery highlights, and bridal accents' },
              { name: 'Warm Terracotta', hex: '#C05A3E', role: 'SECONDARY' as const, usageTip: 'Earthen vessels, table runners, and backdrop drapery' },
              { name: 'Olive Leaf', hex: '#556B2F', role: 'ACCENT' as const, usageTip: 'Garlands, foliage accents, and typography details' },
              { name: 'Oatmeal Linen', hex: '#F4EBD9', role: 'NEUTRAL' as const, usageTip: 'Tablecloths, envelope stock, and architectural wall washes' },
              { name: 'Deep Umber', hex: '#3B2219', role: 'BACKGROUND' as const, usageTip: 'Typography ink, signage stands, and night-time lounge frames' },
            ],
            pairingRules: ['Pair Saffron with Oatmeal Linen for high contrast readability', 'Use Olive Leaf to balance Terracotta warmth'],
            avoidPairings: ['Do not place Saffron directly on bright white background without sufficient contrast'],
          }
        : {
            paletteName: `Midnight Sapphire & Champagne Rose${customNote}`,
            moodDescription: 'Regal, intimate, and timelessly luxurious, balancing deep oceanic navy with soft metallic luster.',
            colors: [
              { name: 'Midnight Sapphire', hex: '#1A2A44', role: 'PRIMARY' as const, usageTip: 'Primary linens, evening lighting wash, and velvet furniture' },
              { name: 'Champagne Rose', hex: '#E8C5B8', role: 'SECONDARY' as const, usageTip: 'Floral blossoms, bridesmaid dresses, and silk ribbons' },
              { name: 'Heirloom Gold', hex: '#D4AF37', role: 'ACCENT' as const, usageTip: 'Candelabras, foil calligraphy, and rimmed tableware' },
              { name: 'Alabaster Silk', hex: '#F9F6F0', role: 'NEUTRAL' as const, usageTip: 'Ceiling drapes, main menus, and ceremony aisle runners' },
              { name: 'Smoky Indigo', hex: '#2C3E55', role: 'BACKGROUND' as const, usageTip: 'Exterior facade projections and evening lounge dividers' },
            ],
            pairingRules: ['Heirloom Gold text over Midnight Sapphire provides regal ASVS compliant contrast', 'Ground Champagne Rose florals against Midnight Sapphire linens'],
            avoidPairings: ['Avoid pairing Smoky Indigo directly against Midnight Sapphire to preserve depth separation'],
          };
      return colorPaletteSchema.parse(data) as CreativeAssetContentMap[K];
    }

    case 'INVITATION_CONTENT': {
      const data = isOptionB
        ? {
            hostHeader: 'Together with their families and dearest friends',
            eventHeadline: `Celebrate the Joy of ${context.title}`,
            invitationBody: `We invite you to gather under the open stars for an evening filled with laughter, feast, and celebration as we mark this momentous milestone.`,
            dateTimeVenueNotice: `Saturday, the twenty-fourth of October at six o'clock in the evening | ${locationStr}`,
            dressCodeNote: 'Cocktail Festive — vibrant attire encouraged',
            rsvpNotice: `Kindly confirm your presence by visiting your personalized guest portal or scanning the RSVP code.`,
            poeticVersion: `Two hearts, one song, beneath celestial skies,
A twilight dance where pure devotion lies.
Join us in merriment and joy untold,
As another chapter of our love unfolds.`,
            casualVersion: `We're celebrating! Come eat, drink, and make memories with us at ${locationStr}. RSVP online to let us know you'll be there!`,
          }
        : {
            hostHeader: 'With the blessings of Almighty and our revered ancestors',
            eventHeadline: `The Grand Celebration of ${context.title}`,
            invitationBody: `Cordially request the honor of your gracious presence and blessings to celebrate the auspicious union and milestone of our family.`,
            dateTimeVenueNotice: `Sunday, the fifteenth of November at five o'clock in the evening | ${locationStr}`,
            dressCodeNote: 'Formal Traditional or Black Tie Optional',
            rsvpNotice: `Please favor us with a reply by the first of November via the secure invitation link.`,
            poeticVersion: `Grace descends in golden light of dawn,
A sacred bond of cherished memories drawn.
Your presence is the blessing that we seek,
More precious than the words our hearts can speak.`,
            casualVersion: `Can't wait to celebrate with you! Join us for an unforgettable evening at ${locationStr}. Please RSVP through your unique link!`,
          };
      return invitationContentSchema.parse(data) as CreativeAssetContentMap[K];
    }

    case 'WELCOME_MESSAGE': {
      const data = isOptionB
        ? {
            easelBoardText: `Welcome to ${context.title}! We are so grateful you travelled near and far to share this celebration with us. Grab a drink and let the magic begin!`,
            tableWelcomeCard: `Thank you for being part of our story. You are seated at Table of Friends & Family. Cheers to an unforgettable night!`,
            itineraryNotice: `Program: 6:00 PM Welcome Drinks • 7:15 PM Grand Entrance • 8:30 PM Dinner Feast • 9:45 PM Dancing`,
            qrWifiCardText: `Complimentary Venue Wi-Fi: "CelebraGuest" | Share photos with #${context.title.replace(/\s+/g, '')}2026`,
            emceeWelcomeScript: `Ladies, gentlemen, and honoured guests! Welcome to ${context.title}! Tonight is all about warmth, community, and joy. Let's make memories that will last a lifetime!`,
          }
        : {
            easelBoardText: `Welcome to the Auspicious Celebration of ${context.title}. Your gracious presence fills our hearts with boundless joy and honor.`,
            tableWelcomeCard: `With heartfelt gratitude for your blessings and love on this blessed occasion. May this evening bring joy to your heart.`,
            itineraryNotice: `Auspicious Muhurat & Reception: 5:00 PM Welcome Traditional Music • 6:30 PM Ceremonial Blessings • 7:45 PM Banquet Dinner`,
            qrWifiCardText: `Guest Portal & Live Photo Gallery: Scan your table QR or tag #${context.title.replace(/\s+/g, '')}Celebration`,
            emceeWelcomeScript: `A very warm and auspicious welcome to all our esteemed families, elders, and dear friends gathered here at ${locationStr}. On behalf of the hosts, we thank you for gracing this celebration!`,
          };
      return welcomeMessageSchema.parse(data) as CreativeAssetContentMap[K];
    }

    case 'MENU_SUGGESTIONS': {
      const data = isOptionB
        ? {
            cuisineStyle: `Modern Farm-to-Table Artisanal Fusion${customNote}`,
            dietaryCoverage: 'Comprehensive Vegan, Gluten-Free, Halal, and Nut-Free Options Included',
            welcomeDrinks: ['Cucumber Mint Botanical Spritz', 'Smoked Rosemary Citrus Tonic', 'Spiced Passionfruit Sparkler'],
            appetizers: [
              { name: 'Crispy Truffle Polenta Bites', description: 'With wild mushroom ragout and micro chives', dietaryTags: ['Vegetarian', 'Gluten-Free'] },
              { name: 'Seared Scallop or King Oyster Skewers', description: 'Glazed with yuzu miso and toasted sesame', dietaryTags: ['Dairy-Free', 'Pescatarian'] },
              { name: 'Spiced Jackfruit Sliders', description: 'On toasted brioche with pickled red cabbage', dietaryTags: ['Vegan'] },
            ],
            mainCourses: [
              { name: 'Herb-Crusted Medallions / Portobello Steaks', description: 'Served with celereac puree and port reduction', dietaryTags: ['Gluten-Free'] },
              { name: 'Pan-Roasted Sea Bass or Cauliflower Steak', description: 'With saffron fennel broth and heirloom carrots', dietaryTags: ['Gluten-Free', 'Halal'] },
              { name: 'Wild Morel & Asparagus Risotto', description: 'Slow-simmered Carnaroli rice with aged pecorino or vegan cashew cream', dietaryTags: ['Vegetarian'] },
            ],
            desserts: [
              { name: 'Dark Chocolate Lava Dome', description: 'With raspberry coulis and gold dust', dietaryTags: ['Vegetarian'] },
              { name: 'Coconut Mango Panna Cotta', description: 'With passionfruit jelly and toasted coconut chips', dietaryTags: ['Vegan', 'Gluten-Free'] },
            ],
            signatureCocktailOrMocktail: {
              name: 'The Golden Horizon',
              ingredients: 'Cold-pressed blood orange, ginger cordial, sparkling botanical water, and optional aged botanical spirit',
              garnish: 'Dehydrated blood orange wheel and edible gold flake',
            },
            costOptimizationTips: [
              'Action stations reduce seated service labor costs by 15%',
              'Seasonal local produce lowers procurement cost while improving freshness',
            ],
          }
        : {
            cuisineStyle: `Grand Heritage Royal Banquet${customNote}`,
            dietaryCoverage: 'Pure Vegetarian, Jain Options, and Rich Halal Meat Entrees Prepared Separately',
            welcomeDrinks: ['Saffron Rose Petal Sherbet', 'Kashmiri Kahwa with Almond slivers', 'Fresh Tender Coconut Water with Mint'],
            appetizers: [
              { name: 'Paneer Tikka Angare / Malai Boti', description: 'Charcoal roasted with aromatic whole spices', dietaryTags: ['Halal', 'Vegetarian'] },
              { name: 'Crispy Lotus Stem Honey Chilli', description: 'Tossed with toasted sesame and scallions', dietaryTags: ['Vegan'] },
              { name: 'Dahi Ke Kebab', description: 'Hung yogurt patties flavored with cardamom and coriander', dietaryTags: ['Vegetarian'] },
            ],
            mainCourses: [
              { name: 'Shahi Awadhi Dum Biryani', description: 'Slow-cooked in sealed earthen handis with saffron and mint', dietaryTags: ['Gluten-Free', 'Halal'] },
              { name: 'Dal Makhani Bukhara', description: 'Simmered overnight for 18 hours with slow churned butter', dietaryTags: ['Vegetarian', 'Gluten-Free'] },
              { name: 'Paneer Lababdar / Butter Chicken Masala', description: 'Velvety tomato gravy infused with fenugreek leaves', dietaryTags: ['Gluten-Free'] },
            ],
            desserts: [
              { name: 'Kesari Rasmalai with Pistachio Dust', description: 'Spongy cottage cheese patties steeped in thickened saffron milk', dietaryTags: ['Vegetarian', 'Gluten-Free'] },
              { name: 'Warm Moong Dal Halwa', description: 'Rich lentils roasted in pure desi ghee with crushed cashews', dietaryTags: ['Vegetarian'] },
            ],
            signatureCocktailOrMocktail: {
              name: 'The Royal Cardamom Elixir',
              ingredients: 'Muddled green cardamom, rose water, lime juice, and sparkling tonic water',
              garnish: 'Silver leaf (vark) and fresh red rose petal',
            },
            costOptimizationTips: [
              'Centralizing dessert into a curated station prevents over-plating waste',
              'Dual live cooking stations increase guest satisfaction while controlling meat portion yields',
            ],
          };
      return menuSuggestionsSchema.parse(data) as CreativeAssetContentMap[K];
    }

    case 'ENTERTAINMENT_IDEAS': {
      const data = isOptionB
        ? {
            soundtrackStyle: 'Eclectic Chill Lounge transitioning to High-Energy Global Bass & Funk',
            livePerformance: 'Electric Violinist performing modern pop/dance mashups accompanied by live percussion (Djembe/Cajon)',
            guestEngagementGames: [
              { title: 'Interactive Smartphone Trivia', rulesSummary: 'Guests answer fun trivia about the hosts via web portal on their phone.', durationMinutes: 20 },
              { title: 'The Shoe Game Remixed', rulesSummary: 'Couple/hosts back-to-back answer rapid fire crowd-sourced questions.', durationMinutes: 15 },
              { title: 'Musical Chairs Royale', rulesSummary: 'High stakes competitive musical chairs with funny challenges per round.', durationMinutes: 25 },
            ],
            photoBoothConcept: {
              backdrop: '3D Holographic Infinity Mirror with customized neon typography sign',
              props: ['Vintage designer sunglasses', 'Custom speech bubbles', 'Feather boas', 'Champagne poppers'],
              printLayout: 'Sleek 2x6 matte black instant print strip with embedded digital animated GIF download link',
            },
            danceFloorPacing: 'Slow buildup after dessert, confetti cannon drop at 10:00 PM, and high tempo till midnight closing.',
            kidsOrSeniorInclusion: 'Dedicated acoustic unplugged lounge area with comfortable acoustic baffles for seniors.',
          }
        : {
            soundtrackStyle: 'Classical Instrumental Serenade leading to Celebratory Heritage Folk & Bollywood Brass',
            livePerformance: 'Sitar & Santoor classical symphony for welcoming, followed by high-energy Live Dhol Drummers for entrance',
            guestEngagementGames: [
              { title: 'Antakshari Musical Face-off', rulesSummary: 'Team-based singing competition divided by family sides.', durationMinutes: 30 },
              { title: 'Tug of Love (Rope Challenge)', rulesSummary: 'Friendly tug of war between celebratory sides with silk-wrapped rope.', durationMinutes: 15 },
              { title: 'Memory Lane Flashback Quiz', rulesSummary: 'Vintage photo matching game projected on the main LED screen.', durationMinutes: 20 },
            ],
            photoBoothConcept: {
              backdrop: 'Floral marigold wall with antique hand-carved jharokha wooden window frame',
              props: ['Royal turbans (pagris)', 'Vintage umbrellas', 'Ornate hand mirrors', 'Quirky Hindi/regional quote signs'],
              printLayout: 'Vintage postcard format with gold foil border and personalized event stamp',
            },
            danceFloorPacing: 'Family choreographed performances first, then elders lead the folk dance, transitioning to open floor beats.',
            kidsOrSeniorInclusion: 'Traditional puppet show (Kathputli) and clay pottery wheel workshop for younger guests.',
          };
      return entertainmentIdeasSchema.parse(data) as CreativeAssetContentMap[K];
    }

    case 'PHOTOGRAPHY_SHOTLIST': {
      const data = isOptionB
        ? {
            keyMoments: [
              { timeOrPhase: 'Pre-Event (2 Hours Prior)', shotDescription: 'Architectural details, untouched tablescapes, and ambient room lighting', subjects: 'Decor & Atmosphere', priority: 'MUST_HAVE' as const },
              { timeOrPhase: 'First Look (1 Hour Prior)', shotDescription: 'Emotional initial reveal between key persons in private courtyard', subjects: 'Hosts / Couple', priority: 'MUST_HAVE' as const },
              { timeOrPhase: 'Grand Entrance', shotDescription: 'Dynamic wide-angle entrance through sparkler / fog archway', subjects: 'Key Hosts & Cheering Crowd', priority: 'MUST_HAVE' as const },
              { timeOrPhase: 'Toasts & Speeches', shotDescription: 'Split coverage: speaker on mic and emotional audience reactions', subjects: 'Speaker & Family Tables', priority: 'MUST_HAVE' as const },
              { timeOrPhase: 'Dance Floor High Peak', shotDescription: 'Motion-blur shutter drag capturing vibrant dance movement and joy', subjects: 'Open Dance Floor', priority: 'NICE_TO_HAVE' as const },
            ],
            creativePortraitIdeas: ['Night-time backlit rain or champagne spray portrait', 'Reflections in vintage architectural glass'],
            detailShots: ['Stationery suite with rings and florals', 'Cocktail garnish closeup', 'Embroidered dress fabric textures'],
            candidsFocus: ['Elders laughing together', 'Children sliding across the dance floor', 'Secret glances between hosts'],
            lightingNotes: 'Utilize 85mm f/1.4 prime lens for creamy bokeh; off-camera flash gridded for evening reception to avoid washing out ambiance.',
          }
        : {
            keyMoments: [
              { timeOrPhase: 'Ritual Preparations', shotDescription: 'Applying turmeric/henna, jewelry fastening, and mother’s blessing', subjects: 'Family & Bride/Groom', priority: 'MUST_HAVE' as const },
              { timeOrPhase: 'Baraat / Welcome Procession', shotDescription: 'Dhol drummers, lively dancing family members, and garland exchange (Varmala)', subjects: 'Both families meeting', priority: 'MUST_HAVE' as const },
              { timeOrPhase: 'Sacred Rituals & Vows', shotDescription: 'Close-ups of sacred fire (havan), flower petal shower, and tying of the auspicious knot', subjects: 'Couple, Priest, Parents', priority: 'MUST_HAVE' as const },
              { timeOrPhase: 'Family Group Portraits', shotDescription: 'Formal organized multigenerational family stage portraits', subjects: 'Entire Extended Family', priority: 'MUST_HAVE' as const },
              { timeOrPhase: 'Farewell / Vidaai', shotDescription: 'Emotional tearful embrace and petal tossing upon departure', subjects: 'Daughter, Parents, Siblings', priority: 'MUST_HAVE' as const },
            ],
            creativePortraitIdeas: ['Symmetrical architectural framing through carved stone jali arches', 'Royal throne vintage portraiture'],
            detailShots: ['Intricate mehndi patterns with wedding date hidden', 'Heirloom jewelry pieces on velvet', 'Pooja thali and brass lamps'],
            candidsFocus: ['Grandparents blessing the couple', 'Unrehearsed laughter during ceremonial games', 'Tears of happiness during blessings'],
            lightingNotes: 'Warm continuous lighting for sacred rituals; warm bounce flash on high ceilings to preserve natural sacred fire tones.',
          };
      return photographyShotlistSchema.parse(data) as CreativeAssetContentMap[K];
    }

    case 'RETURN_GIFTS': {
      const perUnitCents = Math.max(800, Math.min(5000, Math.floor(budgetNum / (guests * 20))));
      const totalCents = perUnitCents * guests;
      const data = isOptionB
        ? {
            giftConcept: `Artisanal Ceramic Keepsake Candle & Organic Tea Blend${customNote}`,
            packagingStyle: 'Matte stone-grey cylinder box tied with natural cotton twill ribbon and wax stamp',
            estimatedPerUnitCostMinor: perUnitCents,
            totalEstimatedCostMinor: totalCents,
            customizationDetails: `Hand-poured soy candle with notes of amber & cedarwood, featuring gold engraved monogram "${context.title[0]}"`,
            culturalSignificance: 'Light symbolizes warmth, enduring friendship, and illumination of life’s journey.',
            ecoFriendlyAlternative: '100% biodegradable soy wax in reusable handmade ceramic vessel that converts into a succulent planter.',
          }
        : {
            giftConcept: `Heirloom Brass Spice Box (Masala Dabba) & Silver Coin${customNote}`,
            packagingStyle: 'Royal brocade velvet pouch with hand-embroidered golden zari cord',
            estimatedPerUnitCostMinor: perUnitCents,
            totalEstimatedCostMinor: totalCents,
            customizationDetails: `Pure brass box etched with peacock motifs and a commemorative inscription of ${context.title}`,
            culturalSignificance: 'Spices and brass symbolize prosperity, domestic warmth, health, and ancestral blessings.',
            ecoFriendlyAlternative: 'Handcrafted by generational rural brass artisans supporting fair-trade heritage co-operatives.',
          };
      return returnGiftsSchema.parse(data) as CreativeAssetContentMap[K];
    }

    case 'EVENT_BRANDING': {
      const initials = context.title
        .split(' ')
        .map((w) => w[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('&')
        .toUpperCase() || 'C&E';
      const cleanTag = context.title.replace(/[^a-zA-Z0-9]/g, '');

      const data = isOptionB
        ? {
            eventTitle: context.title,
            monogramOrInitials: initials,
            officialHashtags: [`#${cleanTag}2026`, `#CelebrateWith${cleanTag}`, `#${initials}Forever`],
            typographyRecommendation: {
              primaryFont: 'Cinzel / Playfair Display',
              secondaryFont: 'Montserrat / Inter Light',
              styleGuide: 'Use Cinzel for dramatic all-caps titles with generous letter-spacing (+3px); pair with clean Montserrat for legible invitations.',
            },
            designElements: ['Linear geometric gold frames', 'Asymmetrical botanical crests', 'Minimalist blind-debossed paper textures'],
            merchandiseOrKeepsakeMockups: [
              'Custom embroidered linen cocktail napkins',
              'Engraved acrylic luggage tags for out-of-town guests',
              'Monogrammed wooden matchboxes with gold foil',
            ],
          }
        : {
            eventTitle: context.title,
            monogramOrInitials: initials,
            officialHashtags: [`#${cleanTag}Celebration`, `#TheRoyal${cleanTag}`, `#${cleanTag}Diaries`],
            typographyRecommendation: {
              primaryFont: 'Cormorant Garamond',
              secondaryFont: 'Lato Regular',
              styleGuide: 'Use Cormorant Garamond Semi-Bold for regal headline flourishes; Lato for menu item descriptions.',
            },
            designElements: ['Intertwined royal crest with elephant/peacock motifs', 'Ornate floral filigree borders', 'Gold wax seal emblem'],
            merchandiseOrKeepsakeMockups: [
              'Custom gold-stamped velvet gift bags',
              'Silk-screened wooden welcome fans with calligraphy',
              'Monogrammed ceramic tea coasters',
            ],
          };
      return eventBrandingSchema.parse(data) as CreativeAssetContentMap[K];
    }

    case 'SOCIAL_MEDIA_CAPTIONS': {
      const cleanTag = context.title.replace(/[^a-zA-Z0-9]/g, '');
      const data = isOptionB
        ? {
            instagramCaptions: [
              {
                hook: 'They say the best things in life are the people we love and the memories we make along the way. ✨',
                body: `Still floating on cloud nine after an unforgettable evening celebrating ${context.title} at ${locationStr}! Surrounded by so much warmth, laughter, and incredible music.`,
                callToAction: 'Swipe to see the highlights that took our breath away! Which moment was your favorite? 👇',
                hashtags: [`#${cleanTag}`, '#CelebrationVibes', '#EventGoals', '#UnforgettableNight', '#PartyMemories'],
              },
              {
                hook: 'To the nights that turned into morning with the people who turn into family. 🥂',
                body: `Words can’t describe the energy in the room. Thank you to every single guest who showed up, danced, and poured love into this milestone!`,
                callToAction: 'Drop a heart if you’re still reliving this magic!',
                hashtags: [`#${cleanTag}2026`, '#LifeMilestones', '#PartyHighlights', '#CelebrateLove'],
              },
            ],
            countdownPosts: [
              { daysLeft: 7, caption: `One week until the magic begins! Pack your dancing shoes and get ready for ${context.title}. See you soon! ⏳✨` },
              { daysLeft: 1, caption: `Tomorrow is the day! Everything is set, the chandeliers are lit, and our hearts are full. Let’s celebrate! 🎉` },
            ],
            postEventGratitude: `To our amazing guests, hardworking vendors, and supportive families: thank you from the bottom of our hearts. You made ${context.title} a dream come true! ❤️`,
            reelsAudioRecommendation: '"Until I Found You" (Acoustic Remix) or "Golden Hour" (Orchestral Instrumental)',
          }
        : {
            instagramCaptions: [
              {
                hook: 'Bound by sacred traditions, blessed by our loved ones, and celebrating a new dawn. 🌺🙏',
                body: `With gratitude in our hearts, we share glimpses from the auspicious celebration of ${context.title}. Every ritual, melody, and blessing touched our souls.`,
                callToAction: 'Bless this new journey with your heartfelt wishes in the comments below. ✨',
                hashtags: [`#${cleanTag}`, '#TraditionAndLove', '#SacredVows', '#RoyalCelebrations', '#FamilyBlessings'],
              },
              {
                hook: 'When heritage meets timeless love. 👑✨',
                body: `An evening woven with colors, laughter, and generational blessings. Thank you to everyone who joined hands to make this grand day historic.`,
                callToAction: 'Tag someone who danced their heart out with us! 💃🕺',
                hashtags: [`#${cleanTag}Celebration`, '#GrandOccasion', '#RoyalHeritage', '#MemoriesForLife'],
              },
            ],
            countdownPosts: [
              { daysLeft: 5, caption: `5 days until the sacred festivities begin! May peace and prosperity shower upon all as we prepare for ${context.title}. 🪔` },
              { daysLeft: 1, caption: `The countdown ends tonight! Tomorrow we gather in celebration and joy. Can’t wait to welcome you all! 🌸` },
            ],
            postEventGratitude: `Humbled and overwhelmed by the outpouring of love and blessings for ${context.title}. Thank you for making our celebration truly sacred and divine. 🙏`,
            reelsAudioRecommendation: '"Kudmayi" / "Kesariya" (Instrumental Flute & Sitar cover)',
          };
      return socialMediaCaptionsSchema.parse(data) as CreativeAssetContentMap[K];
    }

    case 'CULTURAL_CONCEPT': {
      const data = isOptionB
        ? {
            culturalTradition: `${culture} Fusion & Contemporary Heritage${customNote}`,
            heritageHighlights: [
              'Honoring dual ancestral lineages through complementary ritual customs',
              'Bilingual ceremonial readings and symbolic blessing gestures',
              'Culinary storytelling connecting family migratory roots',
            ],
            ritualsAndCeremonies: [
              {
                ritualName: 'The Unity Ribbon Binding',
                meaning: 'Entwining colored ribbons representing distinct families into a singular unbreakable knot.',
                suggestedTiming: 'Directly following the main exchange of vows',
                itemsNeeded: ['Four embroidered silk ribbons', 'Ceremonial brass plate', 'Elder blessings scroll'],
              },
              {
                ritualName: 'The Ancestral Light Ceremony',
                meaning: 'Lighting heirloom candles to honor ancestors and invite peaceful blessings into the new era.',
                suggestedTiming: 'At sunset just before dinner banquet commences',
                itemsNeeded: ['Three beeswax pillar candles', 'Brass oil lamp', 'Floral jasmine garland'],
              },
            ],
            customaryAttire: {
              hosts: 'Modern Indo-Western fusion achkan or embroidered tuxedo paired with pastel silk dupatta.',
              guests: 'Festive cultural attire or cocktail attire accented with vibrant scarves, pashminas, or pocket squares.',
            },
            auspiciousElements: ['Sacred olive and neem foliage', 'Floating lotus blossoms in water bowls', 'Sandalwood fragrance mist'],
            modernTwistSuggestion: 'Provide cards explaining the spiritual significance of each ritual so multinational and multicultural guests feel intimately involved.',
          }
        : {
            culturalTradition: `Traditional ${culture} Auspicious Heritage Rites${customNote}`,
            heritageHighlights: [
              'Sacred Vedic or cultural chants invoking health, longevity, and generational wealth',
              'Traditional musical welcome with Nadaswaram, Shehnai, or ceremonial trumpets',
              'Reverence to elders with ceremonial touch of feet (Charan Sparsh) and gifting of silk stoles',
            ],
            ritualsAndCeremonies: [
              {
                ritualName: 'The Welcoming Aarti & Tilak',
                meaning: 'Warding off negative energies and welcoming guests with fragrant sandalwood paste and sacred light.',
                suggestedTiming: 'Upon initial guest arrival at the threshold',
                itemsNeeded: ['Silver Aarti thali', 'Camphor', 'Roli & Chandan paste', 'Fresh rose petals'],
              },
              {
                ritualName: 'The Sacred Seven Circumambulations (Saptapadi)',
                meaning: 'Seven sacred steps around the holy fire, each reciting a mutual pledge for companionship, nourishment, and honor.',
                suggestedTiming: 'Peak Muhurat during ceremony',
                itemsNeeded: ['Sacred Agni fire pit', 'Ghee', 'Puffed rice (Laja)', 'Betel nuts & leaves'],
              },
            ],
            customaryAttire: {
              hosts: 'Pure Kanjeevaram / Banarasi silk saree with gold temple jewelry, or raw silk sherwani with royal safa.',
              guests: 'Modest traditional sarees, lehengas, kurtas, or suits in joyful auspicious colors (avoiding plain black or stark white).',
            },
            auspiciousElements: ['Mango leaf torans on doorways', 'Swastik and Om symbols rendered in turmeric and vermillion', 'Rangoli designs at threshold'],
            modernTwistSuggestion: 'Live English commentary subtitles on side LED screens explaining ancient hymns and vows in real time.',
          };
      return culturalConceptSchema.parse(data) as CreativeAssetContentMap[K];
    }

    case 'VISUAL_MOODBOARD': {
      const paletteColors = isOptionB
        ? [
            { name: 'Saffron Gold', hex: '#E69F24', role: 'PRIMARY' },
            { name: 'Warm Terracotta', hex: '#C05A3E', role: 'SECONDARY' },
            { name: 'Olive Leaf', hex: '#556B2F', role: 'ACCENT' },
            { name: 'Oatmeal Linen', hex: '#F4EBD9', role: 'NEUTRAL' },
            { name: 'Deep Umber', hex: '#3B2219', role: 'BACKGROUND' },
          ]
        : [
            { name: 'Midnight Sapphire', hex: '#1A2A44', role: 'PRIMARY' },
            { name: 'Champagne Rose', hex: '#E8C5B8', role: 'SECONDARY' },
            { name: 'Heirloom Gold', hex: '#D4AF37', role: 'ACCENT' },
            { name: 'Alabaster Silk', hex: '#F9F6F0', role: 'NEUTRAL' },
            { name: 'Smoky Indigo', hex: '#2C3E55', role: 'BACKGROUND' },
          ];

      const aestheticTitle = isOptionB ? `Modern Boho Terracotta & Saffron Romance` : `Regal Midnight Sapphire & Gold Chandelier`;
      const svg = generateMoodboardSvg(aestheticTitle, isOptionB ? 'Earthy Bohemian Radiance' : 'Classical Grandeur', paletteColors);

      const data = {
        moodboardTitle: aestheticTitle,
        aestheticStyle: isOptionB ? 'Earthy Bohemian Radiance' : 'Regal Classical Grandeur',
        textureAndMaterials: [
          'Lustrous pure mulberry silk and velvet drapery',
          'Antiqued brushed brass candelabras and gold flatware',
          'Hand-poured textured ceramic plates and raw travertine stone',
          'Soft chiffon ceiling swags illuminated with warm fairy lights',
        ],
        lightingVibe: 'Warm 2400K candlelight wash, glowing fairy bulb festoons, and dramatic pin spot accents on tablescapes',
        colorSwatches: paletteColors,
        focalElements: [
          'Dramatic 14-foot suspended floral chandelier above main reception dance floor',
          'Curved sweetheart table backed by organic floral foam-free meadow arrangement',
          'Monolithic welcome entrance arch featuring personalized metallic monogram',
        ],
        imagePrompt: `Cinematic high-end event interior design photography of ${aestheticTitle} celebration, opulent floral arches, luxurious candlelit banquet tables, ${paletteColors.map((c) => c.name).join(', ')} color harmony, photorealistic 8k, architectural lighting, highly detailed.`,
        providerStatus: 'PROVIDER_UNCONFIGURED_DETERMINISTIC_PALETTE' as const,
        imageUrl: null,
        svgVisualPreview: svg,
        truthInGenerationDisclaimer: 'AI Generated Concept Moodboard — Not vendor portfolio photograph' as const,
      };

      return visualMoodboardSchema.parse(data) as CreativeAssetContentMap[K];
    }

    default:
      throw new Error(`Unsupported creative category: ${category}`);
  }
}

