import { describe, it, expect, beforeEach } from 'vitest';
import db from '../src/lib/database';
import { AuthService } from '../src/services/auth-service';
import { EventService } from '../src/services/event-service';
import { TimelineService } from '../src/services/timeline-service';
import { authRateLimiter } from '../src/lib/security/rate-limiter';

describe('TimelineService, Kanban Board, Gantt DAG & Notification System Suite', () => {
  let userA: { user: { id: string; email: string } };
  let userB: { user: { id: string; email: string } };
  let eventA: { id: string; title: string };

  beforeEach(async () => {
    authRateLimiter.reset();
    const timestamp = Date.now();
    userA = await AuthService.register({
      email: `time_a_${timestamp}@example.com`,
      name: 'User A Timeline',
      password: 'StrongPassword123!',
    });

    userB = await AuthService.register({
      email: `time_b_${timestamp}@example.com`,
      name: 'User B Timeline',
      password: 'StrongPassword123!',
    });

    // Create 3-day multi-day wedding celebration
    const start = new Date(Date.now() + 86400000 * 90);
    const end = new Date(start.getTime() + 86400000 * 3);

    eventA = await EventService.createEvent(userA.user.id, {
      title: 'Grand Weekend Wedding Festival',
      description: '3-day celebration',
      eventType: 'WEDDING',
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      venue: 'Vineyard Estate',
      city: 'Sonoma',
      country: 'USA',
      guestTarget: 180,
      budgetMinor: 8000000,
      currency: 'USD',
    });
  });

  it('generates a full multi-day timeline, milestones, and itinerary slots', async () => {
    const overview = await TimelineService.generateTimeline(userA.user.id, eventA.id, false);

    expect(overview.milestones.length).toBeGreaterThanOrEqual(3);
    expect(overview.metrics.totalTasks).toBeGreaterThanOrEqual(6);
    expect(overview.ganttItems.length).toBeGreaterThanOrEqual(6);
    expect(overview.taskBoard.TODO.length).toBeGreaterThanOrEqual(6);

    // Verify multi-day itinerary has Day 1, Day 2, and Day 3
    expect(overview.itineraryByDay[1]).toBeDefined();
    expect(overview.itineraryByDay[2]).toBeDefined();
    expect(overview.itineraryByDay[3]).toBeDefined();

    // Verify activity log was recorded
    const log = await db.activityLog.findFirst({
      where: { eventId: eventA.id, action: 'TIMELINE_GENERATED' },
    });
    expect(log).toBeDefined();
  });

  it('creates manual user tasks and updates progress & Kanban status', async () => {
    // Create manual task
    const due = new Date(Date.now() + 86400000 * 30).toISOString();
    const task = await TimelineService.createTask(userA.user.id, eventA.id, {
      title: 'Order Custom Monogrammed Napkins',
      category: 'Decor',
      dueDate: due,
      priority: 'HIGH',
    });

    expect(task.id).toBeDefined();
    expect(task.isUserLocked).toBe(true); // Manual task must be locked

    // Update status to IN_PROGRESS with 50% progress
    const updated = await TimelineService.updateTask(userA.user.id, eventA.id, task.id, {
      status: 'IN_PROGRESS',
      progressPercent: 50,
    });

    expect(updated.status).toBe('IN_PROGRESS');
    expect(updated.progressPercent).toBe(50);

    // Mark as COMPLETED -> automatically sets progress to 100%
    const completed = await TimelineService.updateTask(userA.user.id, eventA.id, task.id, {
      status: 'COMPLETED',
    });
    expect(completed.status).toBe('COMPLETED');
    expect(completed.progressPercent).toBe(100);
  });

  it('adds task dependencies and rejects circular cycles', async () => {
    const now = Date.now();
    const t1 = await TimelineService.createTask(userA.user.id, eventA.id, {
      title: 'Design Invitations',
      dueDate: new Date(now + 86400000 * 20).toISOString(),
    });

    const t2 = await TimelineService.createTask(userA.user.id, eventA.id, {
      title: 'Print Invitations',
      dueDate: new Date(now + 86400000 * 25).toISOString(),
    });

    // t2 depends on t1 (Print depends on Design)
    const dep = await TimelineService.addTaskDependency(userA.user.id, eventA.id, t2.id, t1.id);
    expect(dep.id).toBeDefined();

    // Now try to make t1 depend on t2 -> CIRCULAR CYCLE (Design depends on Print which depends on Design) -> MUST FAIL
    await expect(
      TimelineService.addTaskDependency(userA.user.id, eventA.id, t1.id, t2.id)
    ).rejects.toThrow(/Circular dependency detected/);
  });

  it('preserves user custom tasks when the timeline is regenerated', async () => {
    // 1. Initial generation
    await TimelineService.generateTimeline(userA.user.id, eventA.id, false);

    // 2. User creates a custom locked task
    const customTask = await TimelineService.createTask(userA.user.id, eventA.id, {
      title: 'User Custom Secret Wedding Gift',
      category: 'Gifts',
      dueDate: new Date(Date.now() + 86400000 * 45).toISOString(),
      priority: 'CRITICAL',
    });

    // 3. Regenerate timeline with preserveUserEdits = true
    await TimelineService.generateTimeline(userA.user.id, eventA.id, true);

    // 4. Verify custom task still exists in database
    const verifyCustom = await db.task.findUnique({ where: { id: customTask.id } });
    expect(verifyCustom).toBeDefined();
    expect(verifyCustom?.title).toBe('User Custom Secret Wedding Gift');
  });

  it('generates notifications for overdue tasks and upcoming deadlines', async () => {
    const pastDate = new Date(Date.now() - 86400000 * 2).toISOString(); // 2 days ago
    const soonDate = new Date(Date.now() + 86400000 * 1).toISOString(); // Tomorrow

    await TimelineService.createTask(userA.user.id, eventA.id, {
      title: 'Overdue Venue Insurance Waiver',
      dueDate: pastDate,
      status: 'TODO',
    });

    await TimelineService.createTask(userA.user.id, eventA.id, {
      title: 'Submit Tasting Menu Selection',
      dueDate: soonDate,
      status: 'TODO',
    });

    const notifications = await TimelineService.generateDeadlineNotifications(
      userA.user.id,
      eventA.id
    );

    expect(notifications.length).toBeGreaterThanOrEqual(2);
    expect(notifications.some((n) => n.title.includes('OVERDUE'))).toBe(true);
    expect(notifications.some((n) => n.title.includes('DUE SOON'))).toBe(true);
  });

  it('ENFORCES IDOR DEFENSE: User B CANNOT create tasks or modify User A timeline', async () => {
    // User B tries to create task on User A's event
    await expect(
      TimelineService.createTask(userB.user.id, eventA.id, {
        title: 'Hacked Task by User B',
        dueDate: new Date().toISOString(),
      })
    ).rejects.toThrow(/Access denied/);

    // User B tries to generate timeline on User A's event
    await expect(
      TimelineService.generateTimeline(userB.user.id, eventA.id, true)
    ).rejects.toThrow(/Access denied/);
  });
});
