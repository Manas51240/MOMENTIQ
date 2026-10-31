import db, { serializeBigInts } from '@/lib/database';
import { logActivity } from '@/lib/database/audit';
import { authorizeEventAccess } from '@/lib/security/auth-middleware';
import {
  EventArchitectInput,
  EventArchitectPlan,
  PlanSectionName,
  eventArchitectInputSchema,
  eventArchitectPlanSchema,
  planSectionNameEnum,
  aiFeedbackInputSchema,
} from '@/lib/ai/schemas';
import {
  executeAiEventArchitect,
  executeAiSectionRegeneration,
} from '@/lib/ai/gemini-client';
import { z } from 'zod';

export class AiEventArchitectService {
  /**
   * Generates a complete 12-section event plan and records generation telemetry.
   */
  static async generatePlan(
    userId: string,
    eventId: string,
    input: z.infer<typeof eventArchitectInputSchema>
  ) {
    // 1. Authorize: user must have edit permissions on the event
    await authorizeEventAccess(userId, eventId, 'EVENT_EDIT');

    // 2. Validate input schemas
    const parsedInput = eventArchitectInputSchema.parse(input);

    // 3. Execute dual-engine AI generation
    const result = await executeAiEventArchitect(parsedInput);

    // 4. Persist generation record to database
    const record = await db.aiGeneration.create({
      data: {
        eventId,
        serviceType: 'EVENT_ARCHITECT_FULL',
        promptVersion: result.promptVersion,
        latencyMs: result.latencyMs,
        inputParamsJson: JSON.stringify(parsedInput),
        outputJson: JSON.stringify(result.data),
      },
    });

    // 5. Audit log
    await logActivity({
      eventId,
      userId,
      action: 'AI_PLAN_GENERATED',
      entityType: 'AiGeneration',
      entityId: record.id,
      details: {
        source: result.source,
        model: result.model,
        latencyMs: result.latencyMs,
      },
    });

    return {
      generationId: record.id,
      plan: result.data,
      metadata: {
        source: result.source,
        model: result.model,
        latencyMs: result.latencyMs,
        promptVersion: result.promptVersion,
      },
    };
  }

  /**
   * Regenerates a single section without modifying other sections.
   */
  static async regenerateSection(
    userId: string,
    eventId: string,
    sectionName: PlanSectionName,
    input: z.infer<typeof eventArchitectInputSchema>
  ) {
    await authorizeEventAccess(userId, eventId, 'EVENT_EDIT');
    const validSectionName = planSectionNameEnum.parse(sectionName);
    const parsedInput = eventArchitectInputSchema.parse(input);

    const result = await executeAiSectionRegeneration(validSectionName, parsedInput);

    const record = await db.aiGeneration.create({
      data: {
        eventId,
        serviceType: `EVENT_ARCHITECT_SECTION_${validSectionName.toUpperCase()}`,
        promptVersion: result.promptVersion,
        latencyMs: result.latencyMs,
        inputParamsJson: JSON.stringify({ sectionName: validSectionName, ...parsedInput }),
        outputJson: JSON.stringify(result.data),
      },
    });

    return {
      generationId: record.id,
      sectionName: validSectionName,
      sectionData: result.data,
      metadata: {
        source: result.source,
        model: result.model,
        latencyMs: result.latencyMs,
      },
    };
  }

  /**
   * Commits the user-reviewed and approved AI plan into real database relational models.
   * Separates AI recommendation from verified transactional records.
   */
  static async approveAndApplyPlan(
    userId: string,
    eventId: string,
    approvedPlan: z.infer<typeof eventArchitectPlanSchema>
  ) {
    await authorizeEventAccess(userId, eventId, 'EVENT_EDIT');
    const plan = eventArchitectPlanSchema.parse(approvedPlan);

    await db.$transaction(
      async (tx) => {
        // 1. Update Preferences with approved theme and palette
        await tx.eventPreference.upsert({
          where: { eventId },
          update: {
            theme: plan.recommendedTheme.name,
            colorPaletteJson: JSON.stringify(plan.recommendedTheme.colorPalette),
            tone: plan.recommendedTheme.description.slice(0, 100),
            dietaryNotes: plan.guestManagementPlan.dietaryTrackingStrategy,
            notes: plan.executiveConcept.overview,
          },
          create: {
            eventId,
            theme: plan.recommendedTheme.name,
            colorPaletteJson: JSON.stringify(plan.recommendedTheme.colorPalette),
            tone: plan.recommendedTheme.description.slice(0, 100),
            dietaryNotes: plan.guestManagementPlan.dietaryTrackingStrategy,
            notes: plan.executiveConcept.overview,
          },
        });

        // 2. Update Event Budget
        await tx.eventBudget.upsert({
          where: { eventId },
          update: {
            totalBudgetMinor: BigInt(plan.budgetAllocation.totalBudgetMinor),
            currency: plan.budgetAllocation.currency,
            contingencyPercent: plan.budgetAllocation.contingencyPercentage,
            notes: plan.importantAssumptions.disclaimers.join(' | '),
          },
          create: {
            eventId,
            totalBudgetMinor: BigInt(plan.budgetAllocation.totalBudgetMinor),
            currency: plan.budgetAllocation.currency,
            contingencyPercent: plan.budgetAllocation.contingencyPercentage,
            notes: plan.importantAssumptions.disclaimers.join(' | '),
          },
        });

        // 3. Sync Budget Categories (Bulk optimized to minimize round-trips)
        const existingCats = await tx.budgetCategory.findMany({ where: { eventId } });
        const catMap = new Map(existingCats.map((c) => [c.name, c]));
        const newCatsToCreate: Array<{
          eventId: string;
          name: string;
          allocatedMinor: bigint;
          spentMinor: bigint;
        }> = [];

        for (const cat of plan.budgetAllocation.categories) {
          const existing = catMap.get(cat.name);
          if (existing) {
            await tx.budgetCategory.update({
              where: { id: existing.id },
              data: { allocatedMinor: BigInt(cat.allocatedMinor) },
            });
          } else {
            newCatsToCreate.push({
              eventId,
              name: cat.name,
              allocatedMinor: BigInt(cat.allocatedMinor),
              spentMinor: BigInt(0),
            });
          }
        }

        if (newCatsToCreate.length > 0) {
          await tx.budgetCategory.createMany({ data: newCatsToCreate });
        }

        // 4. Populate Milestones & Key Tasks in bulk
        for (let i = 0; i < plan.planningMilestones.milestones.length; i++) {
          const m = plan.planningMilestones.milestones[i];
          const targetDate = new Date(Date.now() + (m.targetDateOffsetWeeks + 12) * 7 * 86400000);

          const milestone = await tx.milestone.create({
            data: {
              eventId,
              title: m.phase,
              targetDate,
              orderIndex: i,
            },
          });

          if (m.deliverables && m.deliverables.length > 0) {
            await tx.task.createMany({
              data: m.deliverables.map((deliverable) => ({
                eventId,
                milestoneId: milestone.id,
                title: deliverable,
                category: 'Planning',
                dueDate: targetDate,
                priority: m.criticalPath ? 'HIGH' : 'MEDIUM',
                status: 'TODO',
              })),
            });
          }
        }

        // 5. Populate Event-Day Schedule in bulk
        if (plan.eventDaySchedule.timeline && plan.eventDaySchedule.timeline.length > 0) {
          await tx.eventSchedule.createMany({
            data: plan.eventDaySchedule.timeline.map((item, i) => ({
              eventId,
              startTime: item.timeOffset,
              endTime: item.timeOffset,
              title: item.activity,
              location: item.location,
              speakerOrHost: item.leadPerson,
              notes: item.timeLabel,
              orderIndex: i,
            })),
          });
        }

        // 6. Populate Risk Register
        for (const scenario of plan.contingencyPlan.scenarios) {
          const probScore = scenario.probability === 'HIGH' ? 4 : scenario.probability === 'MEDIUM' ? 3 : 1;
          const impactScore = scenario.impact === 'HIGH' ? 4 : scenario.impact === 'MEDIUM' ? 3 : 1;

          const risk = await tx.riskItem.create({
            data: {
              eventId,
              title: scenario.riskDescription,
              category: 'Contingency',
              probability: probScore,
              impact: impactScore,
              riskScore: probScore * impactScore,
              notes: scenario.preventiveMeasure,
              status: 'IDENTIFIED',
            },
          });

          await tx.riskMitigation.create({
            data: {
              riskId: risk.id,
              mitigationPlan: scenario.preventiveMeasure,
              contingencyPlan: scenario.fallbackPlan,
              status: 'PLANNED',
            },
          });
        }
      },
      { maxWait: 15000, timeout: 30000 }
    );

    await logActivity({
      eventId,
      userId,
      action: 'AI_PLAN_APPROVED_AND_APPLIED',
      entityType: 'Event',
      entityId: eventId,
      details: {
        themeName: plan.recommendedTheme.name,
        totalBudgetMinor: plan.budgetAllocation.totalBudgetMinor,
      },
    });

    return {
      success: true,
      message: 'Approved AI event plan successfully applied to event records',
    };
  }

  /**
   * Submits user feedback (1-5 star rating and comments) for an AI generation.
   */
  static async submitFeedback(
    userId: string,
    data: z.infer<typeof aiFeedbackInputSchema>
  ) {
    const parsed = aiFeedbackInputSchema.parse(data);

    // Verify generation exists
    const generation = await db.aiGeneration.findUnique({
      where: { id: parsed.generationId },
    });

    if (!generation) {
      throw new Error('AI Generation record not found');
    }

    const feedback = await db.aiFeedback.create({
      data: {
        generationId: parsed.generationId,
        userId,
        rating: parsed.rating,
        comments: parsed.comments || null,
      },
    });

    return feedback;
  }

  /**
   * Retrieves past AI generation history for an event.
   */
  static async getGenerationHistory(userId: string, eventId: string) {
    await authorizeEventAccess(userId, eventId, 'EVENT_VIEW');

    const history = await db.aiGeneration.findMany({
      where: { eventId },
      include: {
        feedbacks: {
          select: { id: true, rating: true, comments: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return serializeBigInts(history);
  }
}

