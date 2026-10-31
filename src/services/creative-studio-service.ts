import db from '@/lib/database';
import {
  CreativeCategory,
  CreativeStudioResponse,
  CREATIVE_CATEGORY_SCHEMAS,
  creativeGenerationInputSchema,
  saveCreativeAssetSchema,
  updateCreativeAssetSchema,
} from '@/lib/ai/creative-schemas';
import { executeCreativeGeneration } from '@/lib/ai/creative-gemini';
import { EventContextParams } from '@/lib/ai/creative-fallback';
import { authorizeEventAccess } from '@/lib/security/auth-middleware';

export class CreativeStudioService {
  /**
   * Generates creative event assets (Option A and optional Option B for comparison).
   */
  static async generate(
    eventId: string,
    userId: string,
    input: unknown
  ): Promise<CreativeStudioResponse> {
    const validatedInput = creativeGenerationInputSchema.parse(input);

    // Verify read authorization via ASVS-aligned middleware guard
    await authorizeEventAccess(userId, eventId, 'EVENT_VIEW');

    // Fetch event and preferences
    const event = await db.event.findUnique({
      where: { id: eventId },
      include: {
        preferences: true,
      },
    });

    if (!event) {
      throw new Error(`Event not found: ${eventId}`);
    }

    // Compute event duration in hours
    const startMs = new Date(event.startDate).getTime();
    const endMs = new Date(event.endDate).getTime();
    const durationHours = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60)));

    const context: EventContextParams = {
      eventId: event.id,
      title: event.title,
      eventType: event.eventType,
      budgetMinor: event.budgetMinor,
      currency: event.currency,
      guestTarget: event.guestTarget,
      venue: event.venue,
      city: event.city,
      country: event.country,
      theme: event.preferences?.theme || undefined,
      culturalPreferences: event.preferences?.culturalTraditionsJson
        ? (() => {
            try {
              const parsed = JSON.parse(event.preferences.culturalTraditionsJson);
              return Array.isArray(parsed) ? parsed.join(', ') : String(parsed);
            } catch {
              return event.preferences.culturalTraditionsJson;
            }
          })()
        : undefined,
      dietaryRestrictions: event.preferences?.dietaryNotes
        ? [event.preferences.dietaryNotes]
        : undefined,
      durationHours,
      tone: validatedInput.tone,
      userInstructions: validatedInput.userInstructions,
    };

    const response = await executeCreativeGeneration(validatedInput, context);

    // Record AI generation audit trace & activity log
    try {
      await db.aiGeneration.create({
        data: {
          eventId: event.id,
          serviceType: `CREATIVE_STUDIO_${validatedInput.category}`,
          promptVersion: response.promptVersion,
          latencyMs: response.latencyMs,
          inputParamsJson: JSON.stringify({
            category: validatedInput.category,
            tone: validatedInput.tone,
            instructions: validatedInput.userInstructions,
            compare: validatedInput.generateComparison,
          }),
          outputJson: JSON.stringify(response.optionA.content),
        },
      });

      await db.activityLog.create({
        data: {
          eventId: event.id,
          userId,
          action: 'AI_CREATIVE_GENERATION',
          entityType: 'CreativeStudio',
          entityId: event.id,
          detailsJson: JSON.stringify({
            category: validatedInput.category,
            source: response.source,
            latencyMs: response.latencyMs,
          }),
        },
      });
    } catch {
      // Continue even if logging encountered non-critical issue
    }

    return response;
  }

  /**
   * Saves an approved creative asset to the event workspace.
   */
  static async saveAsset(eventId: string, userId: string, input: unknown) {
    const validated = saveCreativeAssetSchema.parse(input);

    // Enforce edit permission
    await authorizeEventAccess(userId, eventId, 'EVENT_EDIT');

    // Validate content against schema
    const schema = CREATIVE_CATEGORY_SCHEMAS[validated.category];
    const validatedContent = schema.parse(validated.content);

    const asset = await db.creativeAsset.create({
      data: {
        eventId,
        category: validated.category,
        title: validated.title,
        contentJson: JSON.stringify(validatedContent),
        prompt: validated.prompt || '',
        notes: validated.notes || null,
        isApproved: validated.isApproved,
        version: validated.version || 1,
        createdById: userId,
      },
    });

    await db.activityLog.create({
      data: {
        eventId,
        userId,
        action: 'CREATIVE_ASSET_SAVED',
        entityType: 'CreativeAsset',
        entityId: asset.id,
        detailsJson: JSON.stringify({
          category: asset.category,
          title: asset.title,
          isApproved: asset.isApproved,
        }),
      },
    });

    return {
      ...asset,
      content: validatedContent,
    };
  }

  /**
   * Lists all saved creative assets for an event with optional category filtering.
   */
  static async listAssets(eventId: string, userId: string, categoryFilter?: string) {
    await authorizeEventAccess(userId, eventId, 'EVENT_VIEW');

    const assets = await db.creativeAsset.findMany({
      where: {
        eventId,
        ...(categoryFilter && categoryFilter !== 'ALL' ? { category: categoryFilter } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    return assets.map((a: any) => {
      let parsedContent: any = {};
      try {
        parsedContent = JSON.parse(a.contentJson);
      } catch {
        parsedContent = a.contentJson;
      }
      return {
        ...a,
        content: parsedContent,
      };
    });
  }

  /**
   * Updates an existing creative asset in the event workspace.
   */
  static async updateAsset(eventId: string, userId: string, assetId: string, input: unknown) {
    const validated = updateCreativeAssetSchema.parse(input);

    await authorizeEventAccess(userId, eventId, 'EVENT_EDIT');

    const asset = await db.creativeAsset.findUnique({
      where: { id: assetId },
    });

    if (!asset || asset.eventId !== eventId) {
      throw new Error(`Creative asset not found or access denied (IDOR protection)`);
    }

    let updatedContentJson = asset.contentJson;
    if (validated.content) {
      const schema = CREATIVE_CATEGORY_SCHEMAS[asset.category as CreativeCategory];
      const validContent = schema.parse(validated.content);
      updatedContentJson = JSON.stringify(validContent);
    }

    const updated = await db.creativeAsset.update({
      where: { id: assetId },
      data: {
        title: validated.title ?? asset.title,
        notes: validated.notes !== undefined ? validated.notes : asset.notes,
        isApproved: validated.isApproved !== undefined ? validated.isApproved : asset.isApproved,
        contentJson: updatedContentJson,
        version: asset.version + 1,
      },
    });

    await db.activityLog.create({
      data: {
        eventId,
        userId,
        action: 'CREATIVE_ASSET_UPDATED',
        entityType: 'CreativeAsset',
        entityId: asset.id,
        detailsJson: JSON.stringify({
          category: asset.category,
          version: updated.version,
        }),
      },
    });

    return {
      ...updated,
      content: JSON.parse(updated.contentJson),
    };
  }

  /**
   * Deletes a creative asset from the event workspace.
   */
  static async deleteAsset(eventId: string, userId: string, assetId: string) {
    await authorizeEventAccess(userId, eventId, 'EVENT_EDIT');

    const asset = await db.creativeAsset.findUnique({
      where: { id: assetId },
    });

    if (!asset || asset.eventId !== eventId) {
      throw new Error(`Creative asset not found or access denied (IDOR protection)`);
    }

    await db.creativeAsset.delete({
      where: { id: assetId },
    });

    await db.activityLog.create({
      data: {
        eventId,
        userId,
        action: 'CREATIVE_ASSET_DELETED',
        entityType: 'CreativeAsset',
        entityId: assetId,
        detailsJson: JSON.stringify({ category: asset.category, title: asset.title }),
      },
    });

    return { success: true, deletedId: assetId };
  }
}
