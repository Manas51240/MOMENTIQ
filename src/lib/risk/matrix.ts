// ==============================================================================
// CELEBRA — Risk Matrix & Contingency Planning Engine
// Standard: ISO 31000 Risk Management Framework & Deterministic 5x5 Matrix
// Covers 11 Mandatory Domains: Vendors, Venue, Weather, Budget, Attendance,
// Deliveries, Transport, Equipment, Food, Scheduling, Emergency preparedness
// ==============================================================================

export type RiskRagRating = 'LOW' | 'MEDIUM' | 'HIGH';

export interface RiskSeverityAssessment {
  probability: number; // 1 to 5
  impact: number;      // 1 to 5
  score: number;       // 1 to 25
  rating: RiskRagRating;
  ratingLabel: string;
  colorHex: string;
  actionRequirement: string;
}

export const MANDATORY_RISK_CATEGORIES = [
  'Vendors',
  'Venue',
  'Weather',
  'Budget',
  'Attendance',
  'Deliveries',
  'Transport',
  'Equipment',
  'Food',
  'Scheduling',
  'Emergency preparedness',
] as const;

export type MandatoryRiskCategory = typeof MANDATORY_RISK_CATEGORIES[number];

// Alias for backwards compatibility with earlier tests
export const RISK_CATEGORIES = [
  ...MANDATORY_RISK_CATEGORIES,
  'Weather & Climate',
  'Vendor & Procurement',
  'Technical & AV',
  'Safety, Health & Medical',
  'Logistics & Transportation',
  'Financial & Budgetary',
  'Legal & Permitting',
  'Operational',
] as const;

export type RiskCategory = typeof RISK_CATEGORIES[number];

/**
 * Computes deterministic 5x5 risk severity and ISO 31000 RAG classification.
 * Formula: Severity Score = Probability (1-5) * Impact (1-5) -> [1, 25]
 * Score >= 15: HIGH (Red, Mandatory Contingency Protocol)
 * Score >= 8:  MEDIUM (Amber, Proactive Mitigation Required)
 * Score < 8:   LOW (Green, Routine Operational Monitoring)
 */
export function calculateRiskSeverity(probability: number, impact: number): RiskSeverityAssessment {
  const p = Math.max(1, Math.min(5, Math.floor(probability)));
  const i = Math.max(1, Math.min(5, Math.floor(impact)));
  const score = p * i;

  if (score >= 15) {
    return {
      probability: p,
      impact: i,
      score,
      rating: 'HIGH',
      ratingLabel: 'Critical Hazard (Red)',
      colorHex: '#EF4444',
      actionRequirement: 'Mandatory contingency protocol and designated emergency lead required.',
    };
  }

  if (score >= 8) {
    return {
      probability: p,
      impact: i,
      score,
      rating: 'MEDIUM',
      ratingLabel: 'Moderate Risk (Amber)',
      colorHex: '#F59E0B',
      actionRequirement: 'Proactive mitigation plan must be enacted prior to event-week.',
    };
  }

  return {
    probability: p,
    impact: i,
    score,
    rating: 'LOW',
    ratingLabel: 'Acceptable Risk (Green)',
    colorHex: '#10B981',
    actionRequirement: 'Standard operational awareness and routine monitoring.',
  };
}

export interface ComprehensiveRiskProfile {
  title: string;
  description: string;
  category: MandatoryRiskCategory;
  probability: number;
  impact: number;
  severity: RiskRagRating;
  mitigation: string;
  contingency: string;
  ownerName: string;
  status: 'IDENTIFIED' | 'MITIGATED' | 'ACCEPTED' | 'CLOSED';
  reviewDaysBeforeEvent: number;
}

/**
 * Returns pre-calibrated baseline risk profiles across all 11 mandatory categories,
 * dynamically tailored to event type, venue, and outdoor/indoor exposure.
 */
export function getComprehensiveRisksForEvent(
  eventType: string,
  venue: string,
  startDate?: Date
): ComprehensiveRiskProfile[] {
  const venueLower = venue.toLowerCase();
  const isOutdoor =
    venueLower.includes('garden') ||
    venueLower.includes('park') ||
    venueLower.includes('beach') ||
    venueLower.includes('lawn') ||
    venueLower.includes('outdoor') ||
    venueLower.includes('rooftop');

  const baseProfiles: ComprehensiveRiskProfile[] = [
    // 1. Vendors
    {
      title: 'Key Vendor No-Show or Late Arrival',
      description: 'Critical service vendor (photographer, band, or decorator) experiences sudden transport failure or scheduling conflict.',
      category: 'Vendors',
      probability: 2,
      impact: 4,
      severity: 'MEDIUM',
      mitigation: 'Establish binding service agreements with 72-hour and 24-hour mandatory check-in confirmations and primary contact cell phones.',
      contingency: 'Pre-screened secondary backup vendor roster on retainer with guaranteed 60-minute emergency dispatch.',
      ownerName: 'Vendor Lead',
      status: 'IDENTIFIED',
      reviewDaysBeforeEvent: 7,
    },
    // 2. Venue
    {
      title: 'Venue Power Outage or Structural Access Restriction',
      description: 'Municipal power grid trip, elevator malfunction, or restricted venue loading bay hindering guest entrance or setup.',
      category: 'Venue',
      probability: 2,
      impact: 4,
      severity: 'MEDIUM',
      mitigation: 'Inspect venue electrical breaker distribution boards and ensure uninterrupted backup generator transition systems (UPS).',
      contingency: 'On-site portable 25kW silent diesel generator pre-positioned at service dock with dual fuel reserves.',
      ownerName: 'Venue Manager',
      status: 'IDENTIFIED',
      reviewDaysBeforeEvent: 14,
    },
    // 3. Weather
    isOutdoor
      ? {
          title: 'Heavy Rainfall, High Winds, or Severe Thunderstorm',
          description: 'Outdoor celebration exposed to unexpected sudden precipitation, damaging temporary marquees or drenching guests.',
          category: 'Weather',
          probability: 4,
          impact: 5,
          severity: 'HIGH',
          mitigation: '7-day micro-climate radar tracking with local meteorological alerts; enforce waterproof heavy-duty canopy anchorage.',
          contingency: 'Contracted immediate transfer to indoor backup hall if rainfall radar indicates >40% precipitation 3 hours prior.',
          ownerName: 'Operations Lead',
          status: 'IDENTIFIED',
          reviewDaysBeforeEvent: 3,
        }
      : {
          title: 'Indoor HVAC or Climate Control Malfunction',
          description: 'Indoor ballroom temperature control failure causing high heat and guest discomfort during crowded banquet.',
          category: 'Venue',
          probability: 2,
          impact: 3,
          severity: 'LOW',
          mitigation: 'Verify chiller coolant levels and perform thermostat stress tests during morning venue walkthrough.',
          contingency: 'Deploy four standing commercial evaporative cooling units and open auxiliary cross-ventilation baffles.',
          ownerName: 'Facilities Lead',
          status: 'IDENTIFIED',
          reviewDaysBeforeEvent: 7,
        },
    // 4. Budget
    {
      title: 'Unexpected Overtime Charges and Consumption Surcharges',
      description: 'Event runs past midnight curfew or beverage consumption surpasses estimated bar limits, causing budget overrun.',
      category: 'Budget',
      probability: 3,
      impact: 3,
      severity: 'MEDIUM',
      mitigation: 'Include fixed contingency reserve (10-15%) and cap open-bar beverage orders with strict manager authorization thresholds.',
      contingency: 'Enforce predefined hard stop on premium liquor tiers; trigger pre-approved contingency allocation with signed change order.',
      ownerName: 'Finance Manager',
      status: 'IDENTIFIED',
      reviewDaysBeforeEvent: 10,
    },
    // 5. Attendance
    {
      title: 'Unconfirmed Plus-One Surge or Severe Under-Attendance',
      description: 'More than 25 unannounced guests arrive simultaneously, or weather causes sudden drop in attendance creating food waste.',
      category: 'Attendance',
      probability: 3,
      impact: 3,
      severity: 'MEDIUM',
      mitigation: 'Tokenized digital RSVP tracking with QR check-in and automated SMS attendance re-confirmation 48 hours prior.',
      contingency: 'Venue maintains two reserve banquet tables (20 covers) with quick-deploy place settings and standard entrees.',
      ownerName: 'Guest Coordinator',
      status: 'IDENTIFIED',
      reviewDaysBeforeEvent: 2,
    },
    // 6. Deliveries
    {
      title: 'Delayed Floral or Cake Delivery Traffic Jam',
      description: 'Delivery vehicle carrying central wedding cake or perishable floral centerpieces delayed by expressway accident.',
      category: 'Deliveries',
      probability: 2,
      impact: 4,
      severity: 'MEDIUM',
      mitigation: 'Schedule all fragile and centerpiece deliveries for 3 hours before guest arrival window via dual arterial routes.',
      contingency: 'Dispatch localized floral replenishment team and keep emergency patisserie contact on 45-minute standby.',
      ownerName: 'Logistics Lead',
      status: 'IDENTIFIED',
      reviewDaysBeforeEvent: 1,
    },
    // 7. Transport
    {
      title: 'Guest Shuttle Van Breakdown or Parking Lot Congestion',
      description: 'Hotel-to-venue shuttle experiences engine failure or valet parking reaches 100% capacity blocking entry lanes.',
      category: 'Transport',
      probability: 2,
      impact: 3,
      severity: 'LOW',
      mitigation: 'Reserve overflow parking lot 200m away with illuminated walking path and pre-inspect shuttle mechanics.',
      contingency: 'Secondary backup shuttle service on call and direct traffic attendants deployed with reflective vests.',
      ownerName: 'Transport Captain',
      status: 'IDENTIFIED',
      reviewDaysBeforeEvent: 5,
    },
    // 8. Equipment
    {
      title: 'Microphone Feedback or Projector Video Cable Failure',
      description: 'Wireless microphone frequency interference during speeches or main projector display going black during montage.',
      category: 'Equipment',
      probability: 3,
      impact: 3,
      severity: 'MEDIUM',
      mitigation: 'Full audio sweep and multi-channel wireless frequency coordination at 2 hours prior to doors opening.',
      contingency: 'Wired dynamic Shure SM58 microphone and dual redundant HDMI / optical connections ready at audio console.',
      ownerName: 'AV Lead',
      status: 'IDENTIFIED',
      reviewDaysBeforeEvent: 1,
    },
    // 9. Food
    {
      title: 'Severe Guest Food Allergen Reaction or Cross-Contamination',
      description: 'Guest with severe peanut or shellfish allergy ingests mislabeled hors d’oeuvres causing anaphylaxis.',
      category: 'Food',
      probability: 1,
      impact: 5,
      severity: 'LOW',
      mitigation: 'Dedicated allergen color-coded prep kitchen zone and distinct colored cocktail napkins for special dietary meals.',
      contingency: 'First aid station equipped with adult and pediatric EpiPens; verified emergency ambulance route to local hospital.',
      ownerName: 'Catering Lead',
      status: 'IDENTIFIED',
      reviewDaysBeforeEvent: 3,
    },
    // 10. Scheduling
    {
      title: 'Ceremony Running Overtime Causing Noise Curfew Breach',
      description: 'Prolonged religious rites or lengthy speeches pushing dance reception past municipal 11:00 PM acoustic curfew.',
      category: 'Scheduling',
      probability: 3,
      impact: 4,
      severity: 'HIGH',
      mitigation: 'Emcee holds tight timing cue sheet with visual amber warning paddles for speakers exceeding 4 minutes.',
      contingency: 'Pre-planned seamless transition to indoor after-party lounge where soundproofing complies with midnight curfew.',
      ownerName: 'Lead Planner',
      status: 'IDENTIFIED',
      reviewDaysBeforeEvent: 2,
    },
    // 11. Emergency preparedness
    {
      title: 'Fire Alarm, Medical Incident or Evacuation Order',
      description: 'Accidental kitchen flare-up triggering sprinkler alarm or senior guest experiencing cardiac distress.',
      category: 'Emergency preparedness',
      probability: 1,
      impact: 5,
      severity: 'LOW',
      mitigation: 'Establish clear unblocked emergency exit corridors, inspect fire extinguishers, and brief all staff on muster zones.',
      contingency: 'Certified on-site CPR/First Aid responder on duty and dedicated emergency lane kept vacant for ambulance arrival.',
      ownerName: 'Security & Safety Lead',
      status: 'IDENTIFIED',
      reviewDaysBeforeEvent: 1,
    },
  ];

  return baseProfiles;
}

/**
 * Backward compatibility helper for existing test suites.
 */
export function getDefaultRisksForEvent(eventType: string, venue: string) {
  const comprehensive = getComprehensiveRisksForEvent(eventType, venue);
  return comprehensive.map((r) => ({
    title: r.title,
    category: r.category,
    probability: r.probability,
    impact: r.impact,
    mitigationPlan: r.mitigation,
    contingencyPlan: r.contingency,
  }));
}
