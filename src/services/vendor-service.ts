import db, { serializeBigInts } from '@/lib/database';
import { logActivity } from '@/lib/database/audit';
import { authorizeEventAccess } from '@/lib/security/auth-middleware';
import {
  STANDARD_VENDOR_CATEGORIES,
  isValidVendorStateTransition,
  buildQuoteComparisonMatrix,
  VendorStatus,
} from '@/lib/vendor/workflow';
import { z } from 'zod';
import crypto from 'crypto';

export const registerVendorSchema = z.object({
  categoryId: z.string().min(1, 'Category ID is required'),
  name: z.string().trim().min(2, 'Vendor name must be at least 2 characters').max(100),
  contactName: z.string().trim().max(100).optional(),
  email: z.string().trim().email().optional().or(z.literal('')),
  phone: z.string().trim().max(30).optional(),
  website: z.string().trim().url().optional().or(z.literal('')),
  location: z.string().trim().max(150).optional().default(''),
  serviceDescription: z.string().trim().max(2000).optional().default(''),
  priceEstimateMinor: z.number().int().min(0).default(0),
  status: z
    .enum([
      'SHORTLISTED',
      'CONTACTED',
      'QUOTATION_RECEIVED',
      'NEGOTIATING',
      'CONFIRMED',
      'COMPLETED',
      'REJECTED',
      'CANCELLED',
    ])
    .default('SHORTLISTED'),
  isAvailabilityVerified: z.boolean().default(false),
  availabilityNotes: z.string().trim().max(500).optional().default(''),
  sourceTag: z.enum(['USER_ENTERED', 'DEMO_ILLUSTRATIVE', 'VERIFIED_PARTNER']).default('USER_ENTERED'),
  notes: z.string().trim().max(2000).optional(),
  rating: z.number().int().min(1).max(5).default(5),
  createFollowUpTask: z.boolean().default(false),
  followUpDueDate: z.string().optional(),
});

export const addQuoteSchema = z.object({
  quoteAmountMinor: z.number().int().min(0),
  additionalFeesMinor: z.number().int().min(0).default(0),
  currency: z.string().length(3).default('USD'),
  details: z.string().trim().min(2).max(2000),
  servicesIncluded: z.string().trim().max(2000).default(''),
  contractConditions: z.string().trim().max(2000).default(''),
  status: z.enum(['REQUESTED', 'RECEIVED', 'ACCEPTED', 'DECLINED', 'EXPIRED']).default('RECEIVED'),
  isVerified: z.boolean().default(false),
  documentStorageKey: z.string().optional(),
  validUntil: z.string().optional(),
});

export const confirmBookingSchema = z.object({
  contractAmountMinor: z.number().int().min(1),
  depositAmountMinor: z.number().int().min(0).default(0),
  contractUrl: z.string().optional(),
  contractStorageKey: z.string().optional(),
  notes: z.string().trim().max(1000).optional().default(''),
  signedAt: z.string().default(() => new Date().toISOString()),
  createExpenseRecord: z.boolean().default(true),
});

export class VendorService {
  /**
   * Seeds the 12 standard vendor categories if not already present.
   */
  static async seedStandardCategories() {
    for (const cat of STANDARD_VENDOR_CATEGORIES) {
      await db.vendorCategory.upsert({
        where: { name: cat.name },
        update: { description: cat.description },
        create: { name: cat.name, description: cat.description },
      });
    }
  }

  /**
   * Lists all available vendor categories.
   */
  static async listCategories() {
    await this.seedStandardCategories();
    return db.vendorCategory.findMany({
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Registers a new vendor for an event.
   */
  static async registerVendor(
    userId: string,
    eventId: string,
    data: z.input<typeof registerVendorSchema>
  ) {
    await authorizeEventAccess(userId, eventId, 'VENDOR_MANAGE');
    await this.seedStandardCategories();

    const parsed = registerVendorSchema.parse(data);

    // Validate category exists
    const category = await db.vendorCategory.findUnique({
      where: { id: parsed.categoryId },
    });
    if (!category) {
      throw new Error('Invalid vendor category ID');
    }

    const priceEstimateMinor = BigInt(parsed.priceEstimateMinor);

    const vendor = await db.vendor.create({
      data: {
        eventId,
        categoryId: parsed.categoryId,
        name: parsed.name,
        contactName: parsed.contactName || null,
        email: parsed.email || null,
        phone: parsed.phone || null,
        website: parsed.website || null,
        location: parsed.location,
        serviceDescription: parsed.serviceDescription,
        priceEstimateMinor,
        status: parsed.status,
        isAvailabilityVerified: parsed.isAvailabilityVerified,
        availabilityNotes: parsed.availabilityNotes,
        sourceTag: parsed.sourceTag,
        notes: parsed.notes || null,
        rating: parsed.rating,
      },
      include: {
        category: true,
      },
    });

    // Optionally create follow-up task
    if (parsed.createFollowUpTask && parsed.followUpDueDate) {
      await db.task.create({
        data: {
          eventId,
          title: `Follow up with vendor: ${vendor.name} (${category.name})`,
          category: 'Vendors',
          dueDate: new Date(parsed.followUpDueDate),
          priority: 'HIGH',
          status: 'TODO',
          isUserLocked: true,
        },
      });
    }

    await logActivity({
      eventId,
      userId,
      action: 'VENDOR_REGISTERED',
      entityType: 'Vendor',
      entityId: vendor.id,
      details: {
        name: vendor.name,
        categoryName: category.name,
        status: vendor.status,
      },
    });

    return serializeBigInts(vendor);
  }

  /**
   * Updates vendor profile and enforces state machine transitions.
   */
  static async updateVendor(
    userId: string,
    eventId: string,
    vendorId: string,
    data: Partial<z.input<typeof registerVendorSchema>>
  ) {
    await authorizeEventAccess(userId, eventId, 'VENDOR_MANAGE');

    const existing = await db.vendor.findFirst({
      where: { id: vendorId, eventId },
    });
    if (!existing) throw new Error('Vendor not found');

    // Workflow state transition check
    if (data.status && data.status !== existing.status) {
      const isAllowed = isValidVendorStateTransition(existing.status, data.status);
      if (!isAllowed) {
        throw new Error(
          `Illegal vendor state transition from "${existing.status}" to "${data.status}". Must follow: Shortlisted -> Contacted -> Quotation Received -> Negotiating -> Confirmed -> Completed.`
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.contactName !== undefined) updateData.contactName = data.contactName || null;
    if (data.email !== undefined) updateData.email = data.email || null;
    if (data.phone !== undefined) updateData.phone = data.phone || null;
    if (data.website !== undefined) updateData.website = data.website || null;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.serviceDescription !== undefined) updateData.serviceDescription = data.serviceDescription;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.isAvailabilityVerified !== undefined) updateData.isAvailabilityVerified = data.isAvailabilityVerified;
    if (data.availabilityNotes !== undefined) updateData.availabilityNotes = data.availabilityNotes;
    if (data.notes !== undefined) updateData.notes = data.notes || null;
    if (data.rating !== undefined) updateData.rating = data.rating;
    if (data.priceEstimateMinor !== undefined) {
      updateData.priceEstimateMinor = BigInt(data.priceEstimateMinor);
    }

    const updated = await db.vendor.update({
      where: { id: vendorId },
      data: updateData,
      include: { category: true, quotes: true, bookings: true },
    });

    await logActivity({
      eventId,
      userId,
      action: 'VENDOR_UPDATED',
      entityType: 'Vendor',
      entityId: vendorId,
      details: updateData as Record<string, unknown>,
    });

    return serializeBigInts(updated);
  }

  /**
   * Deletes a vendor and associated quotes and bookings.
   */
  static async deleteVendor(userId: string, eventId: string, vendorId: string) {
    await authorizeEventAccess(userId, eventId, 'VENDOR_MANAGE');

    const existing = await db.vendor.findFirst({
      where: { id: vendorId, eventId },
    });
    if (!existing) throw new Error('Vendor not found');

    await db.vendor.delete({ where: { id: vendorId } });

    await logActivity({
      eventId,
      userId,
      action: 'VENDOR_DELETED',
      entityType: 'Vendor',
      entityId: vendorId,
      details: { name: existing.name },
    });

    return { success: true, message: 'Vendor deleted successfully' };
  }

  /**
   * Adds a quotation to a vendor profile and auto-advances vendor status if appropriate.
   */
  static async addVendorQuote(
    userId: string,
    eventId: string,
    vendorId: string,
    data: z.input<typeof addQuoteSchema>
  ) {
    await authorizeEventAccess(userId, eventId, 'VENDOR_MANAGE');
    const parsed = addQuoteSchema.parse(data);

    const vendor = await db.vendor.findFirst({
      where: { id: vendorId, eventId },
    });
    if (!vendor) throw new Error('Vendor not found on this event');

    const quoteAmountMinor = BigInt(parsed.quoteAmountMinor);
    const additionalFeesMinor = BigInt(parsed.additionalFeesMinor);

    const quote = await db.$transaction(async (tx) => {
      const q = await tx.vendorQuote.create({
        data: {
          eventId,
          vendorId,
          quoteAmountMinor,
          additionalFeesMinor,
          currency: parsed.currency,
          details: parsed.details,
          servicesIncluded: parsed.servicesIncluded,
          contractConditions: parsed.contractConditions,
          status: parsed.status,
          isVerified: parsed.isVerified,
          documentStorageKey: parsed.documentStorageKey || null,
          validUntil: parsed.validUntil ? new Date(parsed.validUntil) : null,
        },
      });

      // Auto-advance vendor status to QUOTATION_RECEIVED if it was SHORTLISTED or CONTACTED
      if (vendor.status === 'SHORTLISTED' || vendor.status === 'CONTACTED') {
        await tx.vendor.update({
          where: { id: vendorId },
          data: { status: 'QUOTATION_RECEIVED' },
        });
      }

      return q;
    });

    await logActivity({
      eventId,
      userId,
      action: 'VENDOR_QUOTE_ADDED',
      entityType: 'VendorQuote',
      entityId: quote.id,
      details: {
        vendorName: vendor.name,
        quoteAmountMinor: Number(quoteAmountMinor),
      },
    });

    return serializeBigInts(quote);
  }

  /**
   * Confirms a vendor booking, attaches contract metadata, updates vendor status to CONFIRMED,
   * and optionally creates a corresponding financial expense record.
   */
  static async confirmBooking(
    userId: string,
    eventId: string,
    vendorId: string,
    data: z.input<typeof confirmBookingSchema>
  ) {
    await authorizeEventAccess(userId, eventId, 'VENDOR_MANAGE');
    const parsed = confirmBookingSchema.parse(data);

    const vendor = await db.vendor.findFirst({
      where: { id: vendorId, eventId },
      include: { category: true },
    });
    if (!vendor) throw new Error('Vendor not found on this event');

    const contractAmountMinor = BigInt(parsed.contractAmountMinor);
    const depositAmountMinor = BigInt(parsed.depositAmountMinor);

    const booking = await db.$transaction(async (tx) => {
      // 1. Create booking record
      const b = await tx.vendorBooking.create({
        data: {
          eventId,
          vendorId,
          contractAmountMinor,
          depositAmountMinor,
          status: 'CONFIRMED',
          contractUrl: parsed.contractUrl || null,
          contractStorageKey: parsed.contractStorageKey || null,
          notes: parsed.notes,
          signedAt: new Date(parsed.signedAt),
        },
      });

      // 2. Advance vendor status to CONFIRMED
      await tx.vendor.update({
        where: { id: vendorId },
        data: { status: 'CONFIRMED' },
      });

      // 3. Optionally create financial Expense linked to corresponding budget category
      if (parsed.createExpenseRecord) {
        // Find matching budget category by name
        let category = await tx.budgetCategory.findFirst({
          where: { eventId, name: { contains: vendor.category.name } },
        });

        // Fallback to first category if no direct name match
        if (!category) {
          category = await tx.budgetCategory.findFirst({ where: { eventId } });
        }

        if (category) {
          await tx.expense.create({
            data: {
              eventId,
              categoryId: category.id,
              vendorId,
              title: `Contract: ${vendor.name} (${vendor.category.name})`,
              baseAmountMinor: contractAmountMinor,
              taxAmountMinor: BigInt(0),
              amountMinor: contractAmountMinor,
              status: depositAmountMinor > BigInt(0) ? 'PARTIAL' : 'PENDING',
              notes: `Confirmed contract signed on ${parsed.signedAt}. Deposit: ${depositAmountMinor.toString()}`,
            },
          });
        }
      }

      return b;
    });

    await logActivity({
      eventId,
      userId,
      action: 'VENDOR_BOOKING_CONFIRMED',
      entityType: 'VendorBooking',
      entityId: booking.id,
      details: {
        vendorName: vendor.name,
        contractAmountMinor: Number(contractAmountMinor),
      },
    });

    return serializeBigInts(booking);
  }

  /**
   * Retrieves vendors and builds transparent quotation comparison matrix.
   */
  static async getVendorComparisonMatrix(
    userId: string,
    eventId: string,
    categoryId?: string
  ) {
    await authorizeEventAccess(userId, eventId, 'EVENT_VIEW');

    const whereClause: Record<string, unknown> = { eventId };
    if (categoryId) whereClause.categoryId = categoryId;

    const vendors = await db.vendor.findMany({
      where: whereClause,
      include: {
        category: true,
        quotes: { orderBy: { quoteAmountMinor: 'asc' } },
        bookings: true,
      },
      orderBy: { name: 'asc' },
    });

    const matrix = buildQuoteComparisonMatrix(vendors);

    return {
      vendors: serializeBigInts(vendors),
      comparisonMatrix: matrix,
    };
  }
}

