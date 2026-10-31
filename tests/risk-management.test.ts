import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '../src/services/auth-service';
import { EventService } from '../src/services/event-service';
import { RiskService } from '../src/services/risk-service';
import { calculateRiskSeverity, getDefaultRisksForEvent } from '../src/lib/risk/matrix';
import { authRateLimiter } from '../src/lib/security/rate-limiter';

describe('Risk Register, 5x5 RAG Matrix & Contingency Planning Suite', () => {
  let userA: { user: { id: string; email: string } };
  let userB: { user: { id: string; email: string } };
  let eventA: { id: string; title: string };

  beforeEach(async () => {
    authRateLimiter.reset();
    const timestamp = Date.now();

    userA = await AuthService.register({
      email: `risk_a_${timestamp}@example.com`,
      name: 'Host User A',
      password: 'StrongPassword123!',
    });

    userB = await AuthService.register({
      email: `risk_b_${timestamp}@example.com`,
      name: 'Unrelated User B',
      password: 'StrongPassword123!',
    });

    eventA = await EventService.createEvent(userA.user.id, {
      title: 'Botanical Garden Gala 2026',
      description: 'Outdoor garden party with high weather dependency',
      eventType: 'COMMUNITY',
      startDate: new Date(Date.now() + 86400000 * 30).toISOString(),
      endDate: new Date(Date.now() + 86400000 * 31).toISOString(),
      venue: 'Botanical Rose Garden Lawn',
      city: 'Portland',
      country: 'USA',
      guestTarget: 180,
      budgetMinor: 7500000,
      currency: 'USD',
    });
  });

  it('1. Calculates deterministic 5x5 severity scores and assigns ISO 31000 RAG ratings', () => {
    // Low: 1 * 2 = 2
    const low = calculateRiskSeverity(1, 2);
    expect(low.score).toBe(2);
    expect(low.rating).toBe('LOW');
    expect(low.colorHex).toBe('#10B981');

    // Medium: 3 * 3 = 9
    const medium = calculateRiskSeverity(3, 3);
    expect(medium.score).toBe(9);
    expect(medium.rating).toBe('MEDIUM');
    expect(medium.colorHex).toBe('#F59E0B');

    // High: 4 * 4 = 16
    const high = calculateRiskSeverity(4, 4);
    expect(high.score).toBe(16);
    expect(high.rating).toBe('HIGH');
    expect(high.colorHex).toBe('#EF4444');

    // Bounds checking (e.g. 10 clamped to 5)
    const clamped = calculateRiskSeverity(10, 10);
    expect(clamped.score).toBe(25);
    expect(clamped.probability).toBe(5);
    expect(clamped.impact).toBe(5);
    expect(clamped.rating).toBe('HIGH');
  });

  it('2. Tailors default baseline risks to venue type (outdoor weather contingency)', () => {
    const outdoorRisks = getDefaultRisksForEvent('WEDDING', 'Rose Garden Lawn');
    const weatherRisk = outdoorRisks.find((r) => r.category === 'Weather' || (r.category as string) === 'Weather & Climate');
    expect(weatherRisk).toBeDefined();
    expect(weatherRisk?.contingencyPlan).toContain('backup hall');

    const indoorRisks = getDefaultRisksForEvent('WEDDING', 'Grand Crystal Ballroom');
    const indoorWeather = indoorRisks.find((r) => r.category === 'Weather' || (r.category as string) === 'Weather & Climate');
    expect(indoorWeather).toBeUndefined();
    const hvac = indoorRisks.find((r) => r.title.includes('HVAC'));
    expect(hvac).toBeDefined();
  });

  it('3. Creates a risk with attached mitigation and contingency plans', async () => {
    const risk = await RiskService.createRisk(userA.user.id, eventA.id, {
      title: 'Sudden Downpour Floods Garden Pathways',
      category: 'Weather & Climate',
      probability: 4,
      impact: 5,
      mitigationPlan: 'Install elevated wooden duckboards along primary walkways 24h prior.',
      contingencyPlan: 'Trigger marquee tent enclosed walkways with industrial water vacuum pumps.',
      notes: 'Monsoon season potential',
    });

    expect(risk.id).toBeDefined();
    expect(risk.title).toBe('Sudden Downpour Floods Garden Pathways');
    expect(risk.riskScore).toBe(20);
    expect(risk.severity.rating).toBe('HIGH');
    expect(risk.mitigations.length).toBe(1);
    expect(risk.mitigations[0].mitigationPlan).toContain('wooden duckboards');
    expect(risk.mitigations[0].contingencyPlan).toContain('marquee tent');
  });

  it('4. Updates risk attributes, recalculates severity score, and updates mitigation status', async () => {
    const risk = await RiskService.createRisk(userA.user.id, eventA.id, {
      title: 'Stage Lighting Dimmer Failure',
      category: 'Technical & AV',
      probability: 3,
      impact: 3,
      mitigationPlan: 'Procure spare DMX dimmer pack.',
      contingencyPlan: 'Run static LED floodlights directly on manual switches.',
    });

    expect(risk.riskScore).toBe(9);
    expect(risk.severity.rating).toBe('MEDIUM');

    // Update risk: lower probability to 1 and mark status as MITIGATED
    const updated = await RiskService.updateRisk(userA.user.id, eventA.id, risk.id, {
      probability: 1,
      impact: 3,
      status: 'MITIGATED',
      mitigationPlan: 'Spare DMX dimmer pack tested and certified by master electrician.',
    });

    expect(updated.riskScore).toBe(3);
    expect(updated.severity.rating).toBe('LOW');
    expect(updated.status).toBe('MITIGATED');
    expect(updated.mitigations[0].status).toBe('RESOLVED');
  });

  it('5. Generates baseline risk matrix for outdoor event automatically', async () => {
    const result = await RiskService.generateDefaultRisks(userA.user.id, eventA.id);
    expect(result.success).toBe(true);
    expect(result.createdCount).toBeGreaterThanOrEqual(3);

    const list = await RiskService.listRisks(userA.user.id, eventA.id);
    expect(list.risks.length).toBe(result.createdCount);
    expect(list.metrics.totalRisks).toBe(result.createdCount);
    expect(list.metrics.categoryBreakdown['Weather & Climate']).toBeGreaterThanOrEqual(1);

    // Re-running generation does not duplicate existing risks
    const rerun = await RiskService.generateDefaultRisks(userA.user.id, eventA.id);
    expect(rerun.createdCount).toBe(0);
  });

  it('6. Enforces IDOR protection: User B cannot view, modify, or delete User A risks', async () => {
    const risk = await RiskService.createRisk(userA.user.id, eventA.id, {
      title: 'Proprietary Secret Risk',
      category: 'Operational',
      probability: 2,
      impact: 2,
      mitigationPlan: 'Mitigation plan',
      contingencyPlan: 'Contingency plan',
    });

    // User B attempts to read User A's risks
    await expect(RiskService.listRisks(userB.user.id, eventA.id)).rejects.toThrow(
      /Access denied|Forbidden/
    );

    // User B attempts to update User A's risk
    await expect(
      RiskService.updateRisk(userB.user.id, eventA.id, risk.id, {
        title: 'Tampered Title',
      })
    ).rejects.toThrow(/Access denied|Forbidden/);

    // User B attempts to delete User A's risk
    await expect(RiskService.deleteRisk(userB.user.id, eventA.id, risk.id)).rejects.toThrow(
      /Access denied|Forbidden/
    );
  });

  it('7. Enforces RBAC: Collaborator with VIEWER role cannot create or update risks', async () => {
    await EventService.addCollaborator(userA.user.id, eventA.id, {
      email: userB.user.email,
      role: 'VIEWER',
    });

    // Viewer can read risks
    const list = await RiskService.listRisks(userB.user.id, eventA.id);
    expect(list.risks).toBeDefined();

    // Viewer cannot create risk (requires RISK_MANAGE)
    await expect(
      RiskService.createRisk(userB.user.id, eventA.id, {
        title: 'Viewer Attempted Risk',
        category: 'Operational',
        probability: 1,
        impact: 1,
        mitigationPlan: 'None',
        contingencyPlan: 'None',
      })
    ).rejects.toThrow(/Access denied|Forbidden/);
  });
});

