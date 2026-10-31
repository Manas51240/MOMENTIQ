import { describe, it, expect } from 'vitest';
import {
  generateDeterministicSchedule,
  detectCircularDependency,
  shiftTimelineDates,
  evaluateTaskOverdueStatus,
} from '../src/lib/timeline/scheduler';

describe('Intelligent Timeline Scheduler & DAG Dependency Engine Suite', () => {
  describe('Deterministic Schedule Generation & Edge Cases', () => {
    it('generates a standard multi-phase schedule for future celebrations', () => {
      const start = new Date(Date.now() + 86400000 * 90); // 90 days away
      const end = new Date(start.getTime() + 86400000 * 1); // 1-day event

      const plan = generateDeterministicSchedule(start, end, 'WEDDING');

      expect(plan.isCompressedTimeline).toBe(false);
      expect(plan.isPastEvent).toBe(false);
      expect(plan.multiDayCount).toBe(1);
      expect(plan.milestones.length).toBe(4); // 4 wedding phases
      expect(plan.itineraryDays.length).toBe(1);
      expect(plan.itineraryDays[0].slots.length).toBe(4);
    });

    it('adapts to near-term events (e.g. 5 days away) with timeline compression and escalated priorities', () => {
      const start = new Date(Date.now() + 86400000 * 5); // 5 days away
      const end = new Date(start.getTime() + 86400000 * 1);

      const plan = generateDeterministicSchedule(start, end, 'CORPORATE');

      expect(plan.isCompressedTimeline).toBe(true);
      // Priorities should be escalated
      const hasCritical = plan.milestones.some((m) =>
        m.tasks.some((t) => t.priority === 'CRITICAL')
      );
      expect(hasCritical).toBe(true);
    });

    it('generates multi-day itinerary schedules spanning multiple distinct calendar dates', () => {
      const start = new Date(Date.now() + 86400000 * 60);
      const end = new Date(start.getTime() + 86400000 * 3); // 3-day multi-day event

      const plan = generateDeterministicSchedule(start, end, 'COMMUNITY');

      expect(plan.multiDayCount).toBe(3);
      expect(plan.itineraryDays.length).toBe(3);
      expect(plan.itineraryDays[0].dayNumber).toBe(1);
      expect(plan.itineraryDays[1].dayNumber).toBe(2);
      expect(plan.itineraryDays[2].dayNumber).toBe(3);
      expect(plan.itineraryDays[1].slots[0].title).toContain('Day 2');
    });

    it('handles events in the past and flags overdue items', () => {
      const pastStart = new Date(Date.now() - 86400000 * 30); // 30 days ago
      const pastEnd = new Date(Date.now() - 86400000 * 29);

      const plan = generateDeterministicSchedule(pastStart, pastEnd, 'BIRTHDAY');
      expect(plan.isPastEvent).toBe(true);
    });
  });

  describe('Circular Dependency Prevention in Task DAG', () => {
    it('accepts valid linear acyclic task dependencies (A -> B -> C -> D)', () => {
      const deps = [
        { taskId: 'task_B', dependsOnTaskId: 'task_A' }, // B depends on A
        { taskId: 'task_C', dependsOnTaskId: 'task_B' }, // C depends on B
        { taskId: 'task_D', dependsOnTaskId: 'task_C' }, // D depends on C
      ];

      const check = detectCircularDependency(deps);
      expect(check.hasCycle).toBe(false);
    });

    it('detects and rejects direct self-dependency (A -> A)', () => {
      const check = detectCircularDependency([], { taskId: 'task_A', dependsOnTaskId: 'task_A' });
      expect(check.hasCycle).toBe(true);
    });

    it('detects and rejects 2-node circular dependencies (A -> B -> A)', () => {
      const deps = [
        { taskId: 'task_B', dependsOnTaskId: 'task_A' },
      ];
      // Candidate: A depends on B (creates cycle A -> B -> A)
      const check = detectCircularDependency(deps, {
        taskId: 'task_A',
        dependsOnTaskId: 'task_B',
      });
      expect(check.hasCycle).toBe(true);
    });

    it('detects and rejects multi-node cycles (A -> B -> C -> A)', () => {
      const deps = [
        { taskId: 'task_B', dependsOnTaskId: 'task_A' },
        { taskId: 'task_C', dependsOnTaskId: 'task_B' },
      ];
      // Candidate: A depends on C
      const check = detectCircularDependency(deps, {
        taskId: 'task_A',
        dependsOnTaskId: 'task_C',
      });
      expect(check.hasCycle).toBe(true);
    });
  });

  describe('Event Date Shifts & Preserving User-Locked Tasks', () => {
    it('propagates event date shift while strictly preserving user-locked customized tasks', () => {
      const oldEventDate = new Date('2026-06-01T12:00:00Z');
      const newEventDate = new Date('2026-07-01T12:00:00Z'); // +30 days shift

      const tasks = [
        {
          id: 'task_unlocked',
          dueDate: new Date('2026-05-15T12:00:00Z'),
          isUserLocked: false,
        },
        {
          id: 'task_user_locked',
          dueDate: new Date('2026-05-20T12:00:00Z'), // User manually locked this deadline
          isUserLocked: true,
        },
      ];

      const milestones = [
        { id: 'm_1', targetDate: new Date('2026-05-01T12:00:00Z') },
      ];

      const { shiftedTasks, shiftedMilestones } = shiftTimelineDates(
        oldEventDate,
        newEventDate,
        tasks,
        milestones
      );

      // Milestone shifted +30 days (May 1 -> May 31)
      expect(shiftedMilestones[0].targetDate.toISOString()).toContain('2026-05-31');

      // Unlocked task was shifted +30 days
      expect(shiftedTasks.length).toBe(1);
      expect(shiftedTasks[0].id).toBe('task_unlocked');
      expect(shiftedTasks[0].dueDate.toISOString()).toContain('2026-06-14');

      // Locked task was NOT in shiftedTasks list
      expect(shiftedTasks.some((t) => t.id === 'task_user_locked')).toBe(false);
    });
  });

  describe('Overdue and Deadline Alert Evaluation', () => {
    it('identifies overdue uncompleted tasks against a reference timestamp', () => {
      const now = new Date('2026-06-15T12:00:00Z');

      const tasks = [
        { id: 't1', title: 'Task Due Yesterday', dueDate: new Date('2026-06-14T12:00:00Z'), status: 'TODO' },
        { id: 't2', title: 'Task Completed Yesterday', dueDate: new Date('2026-06-14T12:00:00Z'), status: 'COMPLETED' },
        { id: 't3', title: 'Task Due Tomorrow', dueDate: new Date('2026-06-16T12:00:00Z'), status: 'TODO' },
      ];

      const { overdueTaskIds, overdueCount } = evaluateTaskOverdueStatus(tasks, now);

      expect(overdueCount).toBe(1);
      expect(overdueTaskIds).toEqual(['t1']);
    });
  });
});

