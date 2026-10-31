import db, { serializeBigInts } from '@/lib/database';
import { logActivity } from '@/lib/database/audit';
import { authorizeEventAccess } from '@/lib/security/auth-middleware';
import { calculateRiskSeverity, getDefaultRisksForEvent, RiskRagRating } from '@/lib/risk/matrix';
import { z } from 'zod';

export const riskInputSchema = z.object({
  title: z.string().trim().min(3, 'Risk title must be at least 3 characters').max(200),
  category: z.string().trim().min(2).max(100).default('Operational'),
  probability: z.number().int().min(1).max(5).default(1),
  impact: z.number().int().min(1).max(5).default(1),
  status: z.enum(['IDENTIFIED', 'MITIGATED', 'ACCEPTED', 'CLOSED']).default('IDENTIFIED'),
  notes: z.string().trim().max(1000).optional().default(''),
  mitigationPlan: z.string().trim().min(5, 'Mitigation plan is required').max(2000),
  contingencyPlan: z.string().trim().min(5, 'Contingency plan is required').max(2000),
  ownerId: z.string().optional(),
});

export const updateRiskSchema = riskInputSchema.partial();

export class RiskService {
  /**
   * Lists all risks for an event, computed 5x5 RAG severity metrics, and category breakdown.
   */
  static async listRisks(userId: string, eventId: string) {
    await authorizeEventAccess(userId, eventId, 'EVENT_VIEW');

    const risks = await db.riskItem.findMany({
      where: { eventId },
      include: {
        mitigations: true,
      },
      orderBy: [
        { riskScore: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;
    let totalScore = 0;
    const categoryCount: Record<string, number> = {};

    const enrichedRisks = risks.map((risk) => {
      const assessment = calculateRiskSeverity(risk.probability, risk.impact);
      totalScore += risk.riskScore;

      if (assessment.rating === 'HIGH') highCount++;
      else if (assessment.rating === 'MEDIUM') mediumCount++;
      else lowCount++;

      categoryCount[risk.category] = (categoryCount[risk.category] || 0) + 1;

      return {
        ...risk,
        severity: assessment,
      };
    });

    const averageRiskScore = risks.length > 0 ? Number((totalScore / risks.length).toFixed(1)) : 0;

    let overallHealth: RiskRagRating = 'LOW';
    if (highCount > 0 || averageRiskScore >= 12) {
      overallHealth = 'HIGH';
    } else if (mediumCount > 1 || averageRiskScore >= 7) {
      overallHealth = 'MEDIUM';
    }

    return serializeBigInts({
      risks: enrichedRisks,
      metrics: {
        totalRisks: risks.length,
        highRiskCount: highCount,
        mediumRiskCount: mediumCount,
        lowRiskCount: lowCount,
        averageRiskScore,
        overallEventRiskHealth: overallHealth,
        categoryBreakdown: categoryCount,
      },
    });
  }

  /**
   * Registers a new risk item with attached mitigation and contingency plan.
   */
  static async createRisk(
    userId: string,
    eventId: string,
    data: z.input<typeof riskInputSchema>
  ) {
    await authorizeEventAccess(userId, eventId, 'RISK_MANAGE');
    const parsed = riskInputSchema.parse(data);

    const assessment = calculateRiskSeverity(parsed.probability, parsed.impact);

    const result = await db.$transaction(async (tx) => {
      const risk = await tx.riskItem.create({
        data: {
          eventId,
          title: parsed.title,
          category: parsed.category,
          probability: assessment.probability,
          impact: assessment.impact,
          riskScore: assessment.score,
          status: parsed.status,
          notes: parsed.notes,
        },
      });

      const mitigation = await tx.riskMitigation.create({
        data: {
          riskId: risk.id,
          mitigationPlan: parsed.mitigationPlan,
          contingencyPlan: parsed.contingencyPlan,
          ownerId: parsed.ownerId || null,
          status: parsed.status === 'MITIGATED' ? 'RESOLVED' : 'PLANNED',
        },
      });

      return {
        ...risk,
        severity: assessment,
        mitigations: [mitigation],
      };
    });

    await logActivity({
      eventId,
      userId,
      action: 'RISK_CREATED',
      entityType: 'RiskItem',
      entityId: result.id,
      details: {
        title: result.title,
        score: result.riskScore,
        category: result.category,
      },
    });

    return result;
  }

  /**
   * Updates risk severity scores, status, and mitigation notes.
   */
  static async updateRisk(
    userId: string,
    eventId: string,
    riskId: string,
    data: z.input<typeof updateRiskSchema>
  ) {
    await authorizeEventAccess(userId, eventId, 'RISK_MANAGE');
    const parsed = updateRiskSchema.parse(data);

    const existing = await db.riskItem.findFirst({
      where: { id: riskId, eventId },
      include: { mitigations: true },
    });

    if (!existing) {
      throw new Error('Risk record not found on this event');
    }

    const prob = parsed.probability ?? existing.probability;
    const imp = parsed.impact ?? existing.impact;
    const assessment = calculateRiskSeverity(prob, imp);

    const updated = await db.$transaction(async (tx) => {
      const updatedRisk = await tx.riskItem.update({
        where: { id: riskId },
        data: {
          title: parsed.title ?? existing.title,
          category: parsed.category ?? existing.category,
          probability: assessment.probability,
          impact: assessment.impact,
          riskScore: assessment.score,
          status: parsed.status ?? existing.status,
          notes: parsed.notes !== undefined ? parsed.notes : existing.notes,
        },
      });

      if (parsed.mitigationPlan || parsed.contingencyPlan || parsed.ownerId) {
        const firstMitigation = existing.mitigations[0];
        if (firstMitigation) {
          await tx.riskMitigation.update({
            where: { id: firstMitigation.id },
            data: {
              mitigationPlan: parsed.mitigationPlan ?? firstMitigation.mitigationPlan,
              contingencyPlan: parsed.contingencyPlan ?? firstMitigation.contingencyPlan,
              ownerId: parsed.ownerId !== undefined ? parsed.ownerId : firstMitigation.ownerId,
              status: (parsed.status ?? existing.status) === 'MITIGATED' ? 'RESOLVED' : firstMitigation.status,
            },
          });
        }
      }

      return tx.riskItem.findUnique({
        where: { id: riskId },
        include: { mitigations: true },
      });
    });

    await logActivity({
      eventId,
      userId,
      action: 'RISK_UPDATED',
      entityType: 'RiskItem',
      entityId: riskId,
      details: {
        score: assessment.score,
        status: updated?.status,
      },
    });

    return {
      ...updated!,
      severity: assessment,
    };
  }

  /**
   * Deletes a risk item and all connected mitigations.
   */
  static async deleteRisk(userId: string, eventId: string, riskId: string) {
    await authorizeEventAccess(userId, eventId, 'RISK_MANAGE');

    const existing = await db.riskItem.findFirst({
      where: { id: riskId, eventId },
    });

    if (!existing) {
      throw new Error('Risk record not found');
    }

    await db.riskItem.delete({
      where: { id: riskId },
    });

    await logActivity({
      eventId,
      userId,
      action: 'RISK_DELETED',
      entityType: 'RiskItem',
      entityId: riskId,
      details: { title: existing.title },
    });

    return { success: true, message: 'Risk record deleted successfully' };
  }

  /**
   * Generates baseline risk matrix tailored to event category and venue.
   */
  static async generateDefaultRisks(userId: string, eventId: string) {
    await authorizeEventAccess(userId, eventId, 'RISK_MANAGE');

    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { eventType: true, venue: true, title: true },
    });

    if (!event) throw new Error('Event not found');

    const defaults = getDefaultRisksForEvent(event.eventType, event.venue);
    const existing = await db.riskItem.findMany({
      where: { eventId },
      select: { title: true },
    });

    const existingTitles = new Set(existing.map((r) => r.title.toLowerCase()));
    let createdCount = 0;

    for (const item of defaults) {
      if (existingTitles.has(item.title.toLowerCase())) continue;

      const assessment = calculateRiskSeverity(item.probability, item.impact);

      await db.$transaction(async (tx) => {
        const risk = await tx.riskItem.create({
          data: {
            eventId,
            title: item.title,
            category: item.category,
            probability: assessment.probability,
            impact: assessment.impact,
            riskScore: assessment.score,
            status: 'IDENTIFIED',
          },
        });

        await tx.riskMitigation.create({
          data: {
            riskId: risk.id,
            mitigationPlan: item.mitigationPlan,
            contingencyPlan: item.contingencyPlan,
            status: 'PLANNED',
          },
        });
      });

      createdCount++;
    }

    await logActivity({
      eventId,
      userId,
      action: 'DEFAULT_RISKS_GENERATED',
      entityType: 'RiskItem',
      entityId: eventId,
      details: { createdCount },
    });

    return {
      success: true,
      createdCount,
      message: `Generated ${createdCount} baseline risk items with mitigations and contingencies.`,
    };
  }
}
