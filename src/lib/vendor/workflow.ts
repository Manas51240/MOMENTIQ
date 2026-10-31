// ==============================================================================
// CELEBRA — Vendor Workflow State Machine & Grounding Directives
// ASVS Level 2: Strict Workflow Enforcement & Transparent Verification Flags
// ==============================================================================

export type VendorStatus =
  | 'SHORTLISTED'
  | 'CONTACTED'
  | 'QUOTATION_RECEIVED'
  | 'NEGOTIATING'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';

export const STANDARD_VENDOR_CATEGORIES = [
  { name: 'Venues', description: 'Banquet halls, estates, ballrooms, rooftops, outdoor grounds' },
  { name: 'Catering', description: 'Food service, beverage packages, bar staff, wedding cakes' },
  { name: 'Photography', description: 'Ceremony coverage, portraiture, albums, high-res digital media' },
  { name: 'Videography', description: 'Cinematic films, drone footage, live streaming, documentary edits' },
  { name: 'Decoration', description: 'Thematic backdrops, drapery, lighting rigs, stage architecture' },
  { name: 'Flowers', description: 'Bouquets, boutonnieres, centerpieces, floral arches' },
  { name: 'Entertainment', description: 'Live bands, DJs, acoustic musicians, emcees, performers' },
  { name: 'Transportation', description: 'Limousines, guest shuttle buses, classic vintage getaways' },
  { name: 'Makeup & Hair', description: 'Bridal styling, beauty artists, party grooming, touch-ups' },
  { name: 'Invitations & Stationery', description: 'Printed invitations, signage, menus, escort cards' },
  { name: 'Security', description: 'Access control, guest list check-in, venue security personnel' },
  { name: 'Equipment & Rentals', description: 'Tents, chairs, stages, generators, heating/cooling units' },
];

const VALID_TRANSITIONS: Record<VendorStatus, VendorStatus[]> = {
  SHORTLISTED: ['CONTACTED', 'REJECTED', 'CANCELLED'],
  CONTACTED: ['QUOTATION_RECEIVED', 'REJECTED', 'CANCELLED'],
  QUOTATION_RECEIVED: ['NEGOTIATING', 'CONFIRMED', 'REJECTED', 'CANCELLED'],
  NEGOTIATING: ['CONFIRMED', 'REJECTED', 'CANCELLED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [], // Terminal state
  REJECTED: ['SHORTLISTED', 'CONTACTED'], // Reopening
  CANCELLED: ['SHORTLISTED'], // Reopening
};

/**
 * Validates whether a vendor state transition is permitted by the workflow.
 */
export function isValidVendorStateTransition(current: string, next: string): boolean {
  if (current === next) return true;
  const allowed = VALID_TRANSITIONS[current as VendorStatus];
  if (!allowed) return false;
  return allowed.includes(next as VendorStatus);
}

export interface QuoteComparisonRow {
  vendorId: string;
  vendorName: string;
  categoryName: string;
  status: string;
  rating: number;
  location: string;
  isAvailabilityVerified: boolean;
  sourceTag: string;
  quoteId?: string;
  baseQuoteMinor: number;
  additionalFeesMinor: number;
  totalQuoteMinor: number;
  servicesIncluded: string;
  contractConditions: string;
  isVerifiedQuote: boolean;
  validUntil?: string | null;
}

/**
 * Normalizes vendor quotes for transparent comparison matrix.
 * Accurately calculates total quote = base + additional fees in integer minor units.
 */
export function buildQuoteComparisonMatrix(vendors: {
  id: string;
  name: string;
  status: string;
  rating: number | null;
  location: string;
  isAvailabilityVerified: boolean;
  sourceTag: string;
  category: { name: string };
  quotes: {
    id: string;
    quoteAmountMinor: bigint;
    additionalFeesMinor: bigint;
    servicesIncluded: string;
    contractConditions: string;
    isVerified: boolean;
    validUntil: Date | null;
    status: string;
  }[];
}[]): QuoteComparisonRow[] {
  const rows: QuoteComparisonRow[] = [];

  for (const v of vendors) {
    if (v.quotes.length === 0) {
      // Vendor has no quote yet
      rows.push({
        vendorId: v.id,
        vendorName: v.name,
        categoryName: v.category.name,
        status: v.status,
        rating: v.rating ?? 5,
        location: v.location || 'Not specified',
        isAvailabilityVerified: v.isAvailabilityVerified,
        sourceTag: v.sourceTag,
        baseQuoteMinor: 0,
        additionalFeesMinor: 0,
        totalQuoteMinor: 0,
        servicesIncluded: 'Awaiting formal quotation',
        contractConditions: 'Pending',
        isVerifiedQuote: false,
      });
    } else {
      for (const q of v.quotes) {
        const base = Number(q.quoteAmountMinor);
        const fees = Number(q.additionalFeesMinor);
        const total = base + fees;

        rows.push({
          vendorId: v.id,
          vendorName: v.name,
          categoryName: v.category.name,
          status: v.status,
          rating: v.rating ?? 5,
          location: v.location || 'Not specified',
          isAvailabilityVerified: v.isAvailabilityVerified,
          sourceTag: v.sourceTag,
          quoteId: q.id,
          baseQuoteMinor: base,
          additionalFeesMinor: fees,
          totalQuoteMinor: total,
          servicesIncluded: q.servicesIncluded || 'Standard package',
          contractConditions: q.contractConditions || 'Standard cancellation clause',
          isVerifiedQuote: q.isVerified,
          validUntil: q.validUntil ? q.validUntil.toISOString() : null,
        });
      }
    }
  }

  // Sort by lowest total quote first
  return rows.sort((a, b) => {
    if (a.totalQuoteMinor === 0) return 1;
    if (b.totalQuoteMinor === 0) return -1;
    return a.totalQuoteMinor - b.totalQuoteMinor;
  });
}

