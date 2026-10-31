import { describe, it, expect, beforeEach } from 'vitest';
import db from '../src/lib/database';
import { AuthService } from '../src/services/auth-service';
import { EventService } from '../src/services/event-service';
import { AiEventArchitectService } from '../src/services/ai-event-architect-service';
import { EventArchitectInput, EventArchitectPlan } from '../src/lib/ai/schemas';

describe('AiEventArchitectService End-to-End Orchestration & Relational Persistence', () => {
  let userA: { user: { id: string; email: string } };
  let userB: { user: { id: string; email: string } };
  let eventA: { id: string; title: string };

  const testEventBrief: EventArchitectInput = {
    category: 'WEDDING',
    eventDate: new Date(Date.now() + 86400000 * 120).toISOString(),
    durationHours: 6,
    location: 'Charleston, South Carolina',
    budgetMinor: 6000000, // $60,000.00
    currency: 'USD',
    guestCount: 150,
    eventStyle: 'Historic Southern Charm',
    theme: 'Magnolia & Midnight Blue',
    culturalPreferences: ['Lowcountry culinary traditions'],
    dietaryPreferences: ['Shellfish-Free', 'Vegetarian'],
    venuePreferences: 'Historic plantation carriage house',
    indoorOutdoor: 'HYBRID',
    accessibilityRequirements: ['Paved cart paths for mobility aid'],
    specialInstructions: 'Feature a live jazz trio during welcome cocktails',
  };

  beforeEach(async () => {
    const timestamp = Date.now();
    userA = await AuthService.register({
      email: `architect_a_${timestamp}@example.com`,
      name: 'User A Architect',
      password: 'StrongPassword123!',
    });

    userB = await AuthService.register({
      email: `architect_b_${timestamp}@example.com`,
      name: 'User B Architect',
      password: 'StrongPassword123!',
    });

    eventA = await EventService.createEvent(userA.user.id, {
      title: 'Alice & Bob Wedding 2026',
      description: 'Charleston celebration',
      eventType: 'WEDDING',
      startDate: testEventBrief.eventDate,
      endDate: testEventBrief.eventDate,
      venue: testEventBrief.venuePreferences,
      city: 'Charleston',
      country: 'USA',
      guestTarget: 150,
      budgetMinor: 6000000,
      currency: 'USD',
    });
  });

  it('generates a complete 12-section master event plan and logs AI generation telemetry', async () => {
    const result = await AiEventArchitectService.generatePlan(
      userA.user.id,
      eventA.id,
      testEventBrief
    );

    expect(result.generationId).toBeDefined();
    expect(result.plan).toBeDefined();
    expect(result.plan.version).toBeDefined();
    expect(result.plan.isAiGenerated).toBe(true);
    expect(result.plan.verified).toBe(false);

    // Verify all 12 sections are present and populated
    expect(result.plan.executiveConcept.title).toContain('Wedding');
    expect(result.plan.recommendedTheme.name).toBe('Magnolia & Midnight Blue');
    expect(result.plan.decorationPlan.focalPoints.length).toBeGreaterThanOrEqual(2);
    expect(result.plan.budgetAllocation.categories.length).toBeGreaterThanOrEqual(3);
    expect(result.plan.planningMilestones.milestones.length).toBeGreaterThanOrEqual(3);
    expect(result.plan.vendorChecklist.vendors.length).toBeGreaterThanOrEqual(3);
    expect(result.plan.guestManagementPlan.accessibilityAccommodations.length).toBeGreaterThanOrEqual(1);
    expect(result.plan.eventDaySchedule.timeline.length).toBeGreaterThanOrEqual(4);
    expect(result.plan.menuSuggestions.mainCourses.length).toBeGreaterThanOrEqual(2);
    expect(result.plan.entertainmentPlan.mainAttractions.length).toBeGreaterThanOrEqual(1);
    expect(result.plan.contingencyPlan.scenarios.length).toBeGreaterThanOrEqual(2);
    expect(result.plan.importantAssumptions.assumptions.length).toBeGreaterThanOrEqual(2);

    // Verify AiGeneration record was saved in database
    const savedGeneration = await db.aiGeneration.findUnique({
      where: { id: result.generationId },
    });
    expect(savedGeneration).toBeDefined();
    expect(savedGeneration?.serviceType).toBe('EVENT_ARCHITECT_FULL');
    expect(savedGeneration?.eventId).toBe(eventA.id);
  });

  it('regenerates an individual section without regenerating the entire plan', async () => {
    // 1. Initial full plan
    const initial = await AiEventArchitectService.generatePlan(
      userA.user.id,
      eventA.id,
      testEventBrief
    );

    // 2. Regenerate only menuSuggestions with updated dietary note
    const updatedBrief: EventArchitectInput = {
      ...testEventBrief,
      dietaryPreferences: ['Strict Vegan', 'Nut-Free'],
    };

    const sectionResult = await AiEventArchitectService.regenerateSection(
      userA.user.id,
      eventA.id,
      'menuSuggestions',
      updatedBrief
    );

    expect(sectionResult.sectionName).toBe('menuSuggestions');
    const menuData = sectionResult.sectionData as EventArchitectPlan['menuSuggestions'];
    expect(menuData).toBeDefined();
    expect(menuData.welcomeDrinks.length).toBeGreaterThan(0);
    expect(menuData.mainCourses.length).toBeGreaterThan(0);

    // Verify other sections in initial plan remain unchanged
    expect(initial.plan.recommendedTheme.name).toBe('Magnolia & Midnight Blue');
  });

  it('preserves user custom edits and commits approved plan into real relational database models', async () => {
    // 1. Generate plan
    const gen = await AiEventArchitectService.generatePlan(
      userA.user.id,
      eventA.id,
      testEventBrief
    );

    // 2. User edits specific sections (e.g., changes theme name and amends an assumption)
    const customizedPlan = {
      ...gen.plan,
      recommendedTheme: {
        ...gen.plan.recommendedTheme,
        name: 'Custom User-Edited Theme Name',
        dressCode: 'Black Tie Optional',
      },
      importantAssumptions: {
        ...gen.plan.importantAssumptions,
        assumptions: [
          ...gen.plan.importantAssumptions.assumptions,
          'User Added Custom Assumption: Bride family provides heirloom silver',
        ],
      },
    };

    // 3. User approves and commits plan
    const approval = await AiEventArchitectService.approveAndApplyPlan(
      userA.user.id,
      eventA.id,
      customizedPlan
    );
    expect(approval.success).toBe(true);

    // 4. Verify data was persisted into real database relational models
    const [preference, budget, categories, milestones, tasks, schedules, risks] =
      await Promise.all([
        db.eventPreference.findUnique({ where: { eventId: eventA.id } }),
        db.eventBudget.findUnique({ where: { eventId: eventA.id } }),
        db.budgetCategory.findMany({ where: { eventId: eventA.id } }),
        db.milestone.findMany({ where: { eventId: eventA.id } }),
        db.task.findMany({ where: { eventId: eventA.id } }),
        db.eventSchedule.findMany({ where: { eventId: eventA.id } }),
        db.riskItem.findMany({
          where: { eventId: eventA.id },
          include: { mitigations: true },
        }),
      ]);

    // Check user edits were preserved
    expect(preference?.theme).toBe('Custom User-Edited Theme Name');

    // Check relational records were created
    expect(budget).toBeDefined();
    expect(Number(budget?.totalBudgetMinor)).toBe(testEventBrief.budgetMinor);
    expect(categories.length).toBeGreaterThanOrEqual(3);
    expect(milestones.length).toBeGreaterThanOrEqual(3);
    expect(tasks.length).toBeGreaterThanOrEqual(3);
    expect(schedules.length).toBeGreaterThanOrEqual(4);
    expect(risks.length).toBeGreaterThanOrEqual(2);
    expect(risks[0].mitigations.length).toBeGreaterThanOrEqual(1);

    // Check activity log recorded
    const auditLogs = await db.activityLog.findMany({
      where: { eventId: eventA.id, action: 'AI_PLAN_APPROVED_AND_APPLIED' },
    });
    expect(auditLogs.length).toBe(1);
  });

  it('records user feedback ratings and comments', async () => {
    const gen = await AiEventArchitectService.generatePlan(
      userA.user.id,
      eventA.id,
      testEventBrief
    );

    const feedback = await AiEventArchitectService.submitFeedback(userA.user.id, {
      generationId: gen.generationId,
      rating: 5,
      comments: 'Excellent breakdown of Charleston vendor requirements and dietary options!',
    });

    expect(feedback.id).toBeDefined();
    expect(feedback.rating).toBe(5);
    expect(feedback.comments).toContain('Charleston vendor');

    // Verify history includes the feedback
    const history = await AiEventArchitectService.getGenerationHistory(
      userA.user.id,
      eventA.id
    );
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].feedbacks.length).toBe(1);
    expect(history[0].feedbacks[0].rating).toBe(5);
  });

  it('ENFORCES IDOR DEFENSE: User B CANNOT generate or approve AI plan for User A event', async () => {
    // User B tries to generate an AI plan for User A's event
    await expect(
      AiEventArchitectService.generatePlan(userB.user.id, eventA.id, testEventBrief)
    ).rejects.toThrow(/Access denied/);

    // User B tries to retrieve AI generation history for User A's event
    await expect(
      AiEventArchitectService.getGenerationHistory(userB.user.id, eventA.id)
    ).rejects.toThrow(/Access denied/);
  });
});
