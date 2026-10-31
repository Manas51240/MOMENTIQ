// ==============================================================================
// CELEBRA — Risk Matrix & Contingency Planning Engine
// Standard: ISO 31000 Risk Management Framework & 5x5 RAG Assessment Matrix
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

export const RISK_CATEGORIES = [
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

/**
 * Returns baseline risk profiles tailored to celebration type and venue attributes.
 */
export function getDefaultRisksForEvent(eventType: string, venue: string): Array<{
  title: string;
  category: string;
  probability: number;
  impact: number;
  mitigationPlan: string;
  contingencyPlan: string;
}> {
  const isOutdoor = venue.toLowerCase().includes('garden') ||
    venue.toLowerCase().includes('park') ||
    venue.toLowerCase().includes('beach') ||
    venue.toLowerCase().includes('lawn') ||
    venue.toLowerCase().includes('outdoor');

  const base: Array<{
    title: string;
    category: string;
    probability: number;
    impact: number;
    mitigationPlan: string;
    contingencyPlan: string;
  }> = [
    {
      title: 'Key Vendor Delayed or No-Show',
      category: 'Vendor & Procurement',
      probability: 2,
      impact: 4,
      mitigationPlan: 'Confirm arrival schedules 72 hours and 24 hours prior with named contact on site.',
      contingencyPlan: 'Pre-screened secondary backup vendors on standby with direct mobile hotlines.',
    },
    {
      title: 'Power Outage or Audio / AV Failure',
      category: 'Technical & AV',
      probability: 2,
      impact: 4,
      mitigationPlan: 'Ensure venue provides uninterrupted power supply (UPS) and test sound 2 hours prior.',
      contingencyPlan: 'On-site portable diesel generator and battery-powered backup megaphone / speaker.',
    },
    {
      title: 'Guest Medical Emergency or Severe Allergic Reaction',
      category: 'Safety, Health & Medical',
      probability: 1,
      impact: 5,
      mitigationPlan: 'Catalog all guest dietary allergens and mark dedicated allergen-free banquet stations.',
      contingencyPlan: 'First aid kit with EpiPen on-site; designate nearest emergency hospital and direct route.',
    },
  ];

  if (isOutdoor) {
    base.unshift({
      title: 'Inclement Weather & Rain Intrusion',
      category: 'Weather & Climate',
      probability: 3,
      impact: 5,
      mitigationPlan: 'Continuous 7-day meteorological forecast tracking; confirm waterproof marquee availability.',
      contingencyPlan: 'Immediate transfer to indoor backup hall 3 hours prior if precipitation probability > 50%.',
    });
  } else {
    base.push({
      title: 'Indoor HVAC or Climate Control Malfunction',
      category: 'Operational',
      probability: 2,
      impact: 3,
      mitigationPlan: 'Perform HVAC pressure and cooling checks during morning venue walkthrough.',
      contingencyPlan: 'Deploy auxiliary standing commercial cooling fans and request emergency venue technician.',
    });
  }

  if (eventType === 'CORPORATE') {
    base.push({
      title: 'Keynote Presenter Travel or Presentation File Glitch',
      category: 'Logistics & Transportation',
      probability: 2,
      impact: 4,
      mitigationPlan: 'Collect pre-loaded slide decks on offline USB drives 24 hours in advance.',
      contingencyPlan: 'Re-order agenda with panel session while secondary presenter prep is initiated.',
    });
  }

  return base;
}
