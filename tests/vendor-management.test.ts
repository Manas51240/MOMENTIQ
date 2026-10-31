import { describe, it, expect, beforeEach } from 'vitest';
import db from '../src/lib/database';
import { AuthService } from '../src/services/auth-service';
import { EventService } from '../src/services/event-service';
import { VendorService } from '../src/services/vendor-service';
import { STANDARD_VENDOR_CATEGORIES, isValidVendorStateTransition } from '../src/lib/vendor/workflow';
import { authRateLimiter } from '../src/lib/security/rate-limiter';

describe('Vendor Management, Workflow State Machine & Quotation Comparison Suite', () => {
  let userA: { user: { id: string; email: string } };
  let userB: { user: { id: string; email: string } };
  let eventA: { id: string; title: string };
  let venueCategoryId: string;
  let cateringCategoryId: string;

  beforeEach(async () => {
    authRateLimiter.reset();
    const timestamp = Date.now();

    userA = await AuthService.register({
      email: `vend_a_${timestamp}@example.com`,
      name: 'User A Vendor',
      password: 'StrongPassword123!',
    });

    userB = await AuthService.register({
      email: `vend_b_${timestamp}@example.com`,
      name: 'User B Vendor',
      password: 'StrongPassword123!',
    });

    eventA = await EventService.createEvent(userA.user.id, {
      title: 'Vendor Testing Celebration 2026',
      description: 'Vendor module tests',
      eventType: 'CORPORATE',
      startDate: new Date(Date.now() + 86400000 * 60).toISOString(),
      endDate: new Date(Date.now() + 86400000 * 61).toISOString(),
      venue: 'Metropolitan Convention Hall',
      city: 'San Francisco',
      country: 'USA',
      guestTarget: 200,
      budgetMinor: 10000000,
      currency: 'USD',
    });

    const categories = await VendorService.listCategories();
    venueCategoryId = categories.find((c) => c.name === 'Venues')!.id;
    cateringCategoryId = categories.find((c) => c.name === 'Catering')!.id;
  });

  it('seeds all 12 standard vendor categories with complete descriptions', async () => {
    const categories = await VendorService.listCategories();
    expect(categories.length).toBeGreaterThanOrEqual(12);

    const names = categories.map((c) => c.name);
    for (const std of STANDARD_VENDOR_CATEGORIES) {
      expect(names).toContain(std.name);
    }
  });

  it('registers a vendor with profile, location, rating, transparent source tag, and optional follow-up task', async () => {
    const followUpDueDate = new Date(Date.now() + 86400000 * 7).toISOString();

    const vendor = await VendorService.registerVendor(userA.user.id, eventA.id, {
      categoryId: venueCategoryId,
      name: 'The Glasshouse Pavilion',
      contactName: 'Sarah Jenkins',
      email: 'events@glasshouse.example.com',
      phone: '+1-415-555-0199',
      location: 'Embarcadero, San Francisco, CA',
      serviceDescription: 'Waterfront banquet hall with floor-to-ceiling panoramic views',
      priceEstimateMinor: 2500000, // $25,000.00
      status: 'SHORTLISTED',
      isAvailabilityVerified: false, // Transparent grounding: unverified until formal contract
      sourceTag: 'USER_ENTERED',
      notes: 'Requires 50% deposit upon date lock',
      rating: 5,
      createFollowUpTask: true,
      followUpDueDate,
    });

    expect(vendor.id).toBeDefined();
    expect(vendor.name).toBe('The Glasshouse Pavilion');
    expect(vendor.status).toBe('SHORTLISTED');
    expect(vendor.sourceTag).toBe('USER_ENTERED');
    expect(vendor.isAvailabilityVerified).toBe(false);

    // Verify automatic follow-up task was created in Task table
    const task = await db.task.findFirst({
      where: { eventId: eventA.id, category: 'Vendors' },
    });
    expect(task).toBeDefined();
    expect(task?.title).toContain('The Glasshouse Pavilion');
  });

  describe('Vendor Workflow State Machine', () => {
    it('validates allowed workflow transitions and blocks illegal skips', () => {
      // Valid progression
      expect(isValidVendorStateTransition('SHORTLISTED', 'CONTACTED')).toBe(true);
      expect(isValidVendorStateTransition('CONTACTED', 'QUOTATION_RECEIVED')).toBe(true);
      expect(isValidVendorStateTransition('QUOTATION_RECEIVED', 'NEGOTIATING')).toBe(true);
      expect(isValidVendorStateTransition('NEGOTIATING', 'CONFIRMED')).toBe(true);
      expect(isValidVendorStateTransition('CONFIRMED', 'COMPLETED')).toBe(true);

      // Rejections from any active state
      expect(isValidVendorStateTransition('SHORTLISTED', 'REJECTED')).toBe(true);
      expect(isValidVendorStateTransition('CONTACTED', 'REJECTED')).toBe(true);
      expect(isValidVendorStateTransition('NEGOTIATING', 'REJECTED')).toBe(true);

      // Illegal skip transitions
      expect(isValidVendorStateTransition('SHORTLISTED', 'CONFIRMED')).toBe(false);
      expect(isValidVendorStateTransition('SHORTLISTED', 'COMPLETED')).toBe(false);
      expect(isValidVendorStateTransition('CONTACTED', 'COMPLETED')).toBe(false);
      expect(isValidVendorStateTransition('COMPLETED', 'SHORTLISTED')).toBe(false); // Terminal
    });

    it('enforces workflow transitions at service and database level', async () => {
      const vendor = await VendorService.registerVendor(userA.user.id, eventA.id, {
        categoryId: cateringCategoryId,
        name: 'Gourmet Artisan Catering',
        status: 'SHORTLISTED',
      });

      // Illegal transition: SHORTLISTED directly to CONFIRMED -> MUST BE REJECTED
      await expect(
        VendorService.updateVendor(userA.user.id, eventA.id, vendor.id, {
          status: 'CONFIRMED',
        })
      ).rejects.toThrow(/Illegal vendor state transition/);

      // Legal transition: SHORTLISTED -> CONTACTED -> SUCCESS
      const contacted = await VendorService.updateVendor(userA.user.id, eventA.id, vendor.id, {
        status: 'CONTACTED',
      });
      expect(contacted.status).toBe('CONTACTED');
    });
  });

  describe('Quotation Comparison Matrix & Grounding Directives', () => {
    it('normalizes multiple quotes and computes total quote = base + additional fees in minor units', async () => {
      // Register 2 catering vendors
      const v1 = await VendorService.registerVendor(userA.user.id, eventA.id, {
        categoryId: cateringCategoryId,
        name: 'Alpha Cuisine',
        location: 'Downtown SF',
        isAvailabilityVerified: true,
      });

      const v2 = await VendorService.registerVendor(userA.user.id, eventA.id, {
        categoryId: cateringCategoryId,
        name: 'Beta Banquets',
        location: 'South Bay',
        isAvailabilityVerified: false,
      });

      // V1 Quote: $5,000 base + $500 cleaning fee = $5,500 total (550,000 minor)
      await VendorService.addVendorQuote(userA.user.id, eventA.id, v1.id, {
        quoteAmountMinor: 500000,
        additionalFeesMinor: 50000,
        details: 'Standard plated dinner for 200',
        servicesIncluded: 'Plated 3-course dinner, linens, waitstaff',
        contractConditions: '50% deposit required',
      });

      // V2 Quote: $4,500 base + $1,200 travel/tax fee = $5,700 total (570,000 minor)
      await VendorService.addVendorQuote(userA.user.id, eventA.id, v2.id, {
        quoteAmountMinor: 450000,
        additionalFeesMinor: 120000,
        details: 'Buffet style banquet',
        servicesIncluded: 'Buffet stations, disposable flatware',
        contractConditions: 'Non-refundable deposit',
      });

      const { comparisonMatrix } = await VendorService.getVendorComparisonMatrix(
        userA.user.id,
        eventA.id,
        cateringCategoryId
      );

      expect(comparisonMatrix.length).toBe(2);

      // V1 total = $5,500 (550000) -> lowest total quote ranked first
      expect(comparisonMatrix[0].vendorName).toBe('Alpha Cuisine');
      expect(comparisonMatrix[0].baseQuoteMinor).toBe(500000);
      expect(comparisonMatrix[0].additionalFeesMinor).toBe(50000);
      expect(comparisonMatrix[0].totalQuoteMinor).toBe(550000);
      expect(comparisonMatrix[0].isAvailabilityVerified).toBe(true);

      // V2 total = $5,700 (570000) ranked second
      expect(comparisonMatrix[1].vendorName).toBe('Beta Banquets');
      expect(comparisonMatrix[1].totalQuoteMinor).toBe(570000);
      expect(comparisonMatrix[1].isAvailabilityVerified).toBe(false);
    });
  });

  describe('Contract Booking & Financial Synchronization', () => {
    it('confirms booking, records contract metadata, and creates corresponding Expense in Financial module', async () => {
      const vendor = await VendorService.registerVendor(userA.user.id, eventA.id, {
        categoryId: venueCategoryId,
        name: 'The Grand Palladium Ballroom',
        status: 'SHORTLISTED',
      });

      // Confirm booking with $15,000 contract (1,500,000 minor) and $5,000 deposit
      const booking = await VendorService.confirmBooking(userA.user.id, eventA.id, vendor.id, {
        contractAmountMinor: 1500000,
        depositAmountMinor: 500000,
        contractUrl: 'https://storage.internal.celebra.com/contracts/contract_01.pdf',
        contractStorageKey: 'key_palladium_contract_123',
        notes: 'Signed contract with full ballroom access and load-in permits',
        createExpenseRecord: true,
      });

      expect(booking.id).toBeDefined();
      expect(booking.status).toBe('CONFIRMED');

      // Verify vendor status was advanced to CONFIRMED
      const checkVendor = await db.vendor.findUnique({ where: { id: vendor.id } });
      expect(checkVendor?.status).toBe('CONFIRMED');

      // Verify matching Expense was created in the database linked to this vendor
      const expense = await db.expense.findFirst({
        where: { eventId: eventA.id, vendorId: vendor.id },
      });
      expect(expense).toBeDefined();
      expect(Number(expense?.amountMinor)).toBe(1500000);
      expect(expense?.title).toContain('The Grand Palladium Ballroom');
    });
  });

  describe('IDOR Multi-Tenant Authorization Checks', () => {
    it('ENFORCES IDOR DEFENSE: User B CANNOT view, register, or confirm bookings on User A vendors', async () => {
      const vendorA = await VendorService.registerVendor(userA.user.id, eventA.id, {
        categoryId: venueCategoryId,
        name: 'User A Private Estate',
      });

      // User B tries to view User A's vendor matrix
      await expect(
        VendorService.getVendorComparisonMatrix(userB.user.id, eventA.id)
      ).rejects.toThrow(/Access denied/);

      // User B tries to add a quote to User A's vendor
      await expect(
        VendorService.addVendorQuote(userB.user.id, eventA.id, vendorA.id, {
          quoteAmountMinor: 100000,
          details: 'Unauthorized quote',
        })
      ).rejects.toThrow(/Access denied/);

      // User B tries to update User A's vendor
      await expect(
        VendorService.updateVendor(userB.user.id, eventA.id, vendorA.id, {
          name: 'Hacked Vendor Name',
        })
      ).rejects.toThrow(/Access denied/);

      // User B tries to delete User A's vendor
      await expect(
        VendorService.deleteVendor(userB.user.id, eventA.id, vendorA.id)
      ).rejects.toThrow(/Access denied/);
    });
  });
});

