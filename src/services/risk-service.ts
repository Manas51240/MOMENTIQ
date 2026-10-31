import db, { serializeBigInts } from '@/lib/database';
import { logActivity } from '@/lib/database/audit';
import { authorizeEventAccess } from '@/lib/security/auth-middleware';
import {
  calculateRiskSeverity,
  getComprehensiveRisksForEvent,
  RiskRagRating,
  MANDATORY_RISK_CATEGORIES,
} from '@/lib/risk/matrix';
import { z } from 'zod';

export const riskInputSchema = z.object({
  title: z.string().trim().min(3, 'Risk title must be at least 3 characters').max(200),
  description: z.string().trim().max(2000).optional().default(''),
  category: z.string().trim().min(2).max(100).default('Operational'),
  probability: z.number().int().min(1).max(5).default(1),
  impact: z.number().int().min(1).max(5).default(1),
  status: z.enum(['IDENTIFIED', 'MITIGATED', 'ACCEPTED', 'CLOSED']).default('IDENTIFIED'),
  notes: z.string().trim().max(1000).optional().default(''),
  mitigationPlan: z.string().trim().max(2000).optional().default(''),
  contingencyPlan: z.string().trim().max(2000).optional().default(''),
  mitigation: z.string().trim().max(2000).optional().default(''),
  contingency: z.string().trim().max(2000).optional().default(''),
  ownerId: z.string().optional(),
  ownerName: z.string().trim().max(100).optional().default(''),
  reviewDate: z.string().or(z.date()).optional().nullable(),
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
      if (risk.category === 'Weather') {
        categoryCount['Weather & Climate'] = (categoryCount['Weather & Climate'] || 0) + 1;
      }

      // Ensure mitigation and contingency are accessible at top-level
      const firstMitigation = risk.mitigations?.[0];
      const mitigation = risk.mitigation || firstMitigation?.mitigationPlan || '';
      const contingency = risk.contingency || firstMitigation?.contingencyPlan || '';
      const description = risk.description || risk.title;

      return {
        ...risk,
        description,
        mitigation,
        contingency,
        mitigationPlan: mitigation,
        contingencyPlan: contingency,
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
   * Registers a new risk item with all 9 attributes:
   * Description, Probability, Impact, Severity, Mitigation, Contingency, Owner, Status, Review Date.
   */
  static async createRisk(
    userId: string,
    eventId: string,
    data: z.input<typeof riskInputSchema>
  ) {
    await authorizeEventAccess(userId, eventId, 'RISK_MANAGE');
    const parsed = riskInputSchema.parse(data);

    const assessment = calculateRiskSeverity(parsed.probability, parsed.impact);
    const mitigationText = parsed.mitigation || parsed.mitigationPlan || 'Standard preventative controls.';
    const contingencyText = parsed.contingency || parsed.contingencyPlan || 'Emergency fallback protocol.';
    const desc = parsed.description || parsed.title;
    const reviewDate = parsed.reviewDate ? new Date(parsed.reviewDate) : null;

    const result = await db.$transaction(async (tx) => {
      const risk = await tx.riskItem.create({
        data: {
          eventId,
          title: parsed.title,
          description: desc,
          category: parsed.category,
          probability: assessment.probability,
          impact: assessment.impact,
          riskScore: assessment.score,
          severity: assessment.rating,
          mitigation: mitigationText,
          contingency: contingencyText,
          ownerName: parsed.ownerName || null,
          ownerId: parsed.ownerId || null,
          status: parsed.status,
          reviewDate,
          notes: parsed.notes,
        },
      });

      const mitigation = await tx.riskMitigation.create({
        data: {
          riskId: risk.id,
          mitigationPlan: mitigationText,
          contingencyPlan: contingencyText,
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
        severity: assessment.rating,
      },
    });

    return result;
  }

  /**
   * Updates risk severity scores, status, mitigation, contingency, and review dates.
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

    const mitigationText = parsed.mitigation ?? parsed.mitigationPlan ?? existing.mitigation;
    const contingencyText = parsed.contingency ?? parsed.contingencyPlan ?? existing.contingency;
    const reviewDate = parsed.reviewDate !== undefined
      ? (parsed.reviewDate ? new Date(parsed.reviewDate) : null)
      : existing.reviewDate;

    const updated = await db.$transaction(async (tx) => {
      if (existing.mitigations.length > 0) {
        await tx.riskMitigation.update({
          where: { id: existing.mitigations[0].id },
          data: {
            mitigationPlan: mitigationText,
            contingencyPlan: contingencyText,
            ownerId: parsed.ownerId !== undefined ? parsed.ownerId : existing.mitigations[0].ownerId,
            status: (parsed.status ?? existing.status) === 'MITIGATED' ? 'RESOLVED' : 'PLANNED',
          },
        });
      }

      const updatedRisk = await tx.riskItem.update({
        where: { id: riskId },
        data: {
          title: parsed.title ?? existing.title,
          description: parsed.description ?? existing.description,
          category: parsed.category ?? existing.category,
          probability: assessment.probability,
          impact: assessment.impact,
          riskScore: assessment.score,
          severity: assessment.rating,
          mitigation: mitigationText,
          contingency: contingencyText,
          ownerName: parsed.ownerName !== undefined ? parsed.ownerName : existing.ownerName,
          ownerId: parsed.ownerId !== undefined ? parsed.ownerId : existing.ownerId,
          status: parsed.status ?? existing.status,
          reviewDate,
          notes: parsed.notes !== undefined ? parsed.notes : existing.notes,
        },
        include: { mitigations: true },
      });

      return updatedRisk;
    });

    await logActivity({
      eventId,
      userId,
      action: 'RISK_UPDATED',
      entityType: 'RiskItem',
      entityId: riskId,
      details: {
        score: assessment.score,
        status: updated.status,
        category: updated.category,
      },
    });

    return {
      ...updated,
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
   * Generates baseline risk matrix across all 11 mandatory domains:
   * Vendors, Venue, Weather, Budget, Attendance, Deliveries, Transport,
   * Equipment, Food, Scheduling, Emergency preparedness.
   */
  static async generateDefaultRisks(userId: string, eventId: string) {
    await authorizeEventAccess(userId, eventId, 'RISK_MANAGE');

    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { eventType: true, venue: true, title: true, startDate: true },
    });

    if (!event) throw new Error('Event not found');

    const comprehensiveRisks = getComprehensiveRisksForEvent(
      event.eventType,
      event.venue,
      event.startDate
    );

    const existing = await db.riskItem.findMany({
      where: { eventId },
      select: { title: true },
    });

    const existingTitles = new Set(existing.map((r) => r.title.toLowerCase()));
    let createdCount = 0;

    for (const item of comprehensiveRisks) {
      if (existingTitles.has(item.title.toLowerCase())) continue;

      const assessment = calculateRiskSeverity(item.probability, item.impact);
      const reviewDate = new Date(
        new Date(event.startDate).getTime() - item.reviewDaysBeforeEvent * 86400000
      );

      await db.$transaction(async (tx) => {
        const risk = await tx.riskItem.create({
          data: {
            eventId,
            title: item.title,
            description: item.description,
            category: item.category,
            probability: assessment.probability,
            impact: assessment.impact,
            riskScore: assessment.score,
            severity: assessment.rating,
            mitigation: item.mitigation,
            contingency: item.contingency,
            ownerName: item.ownerName,
            status: item.status,
            reviewDate,
          },
        });

        await tx.riskMitigation.create({
          data: {
            riskId: risk.id,
            mitigationPlan: item.mitigation,
            contingencyPlan: item.contingency,
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
      details: { createdCount, categories: MANDATORY_RISK_CATEGORIES },
    });

    return {
      success: true,
      createdCount,
      message: `Generated ${createdCount} comprehensive risk items across 11 celebration categories.`,
    };
  }
}
