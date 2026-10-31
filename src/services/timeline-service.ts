import db, { serializeBigInts } from '@/lib/database';
import { logActivity } from '@/lib/database/audit';
import { authorizeEventAccess } from '@/lib/security/auth-middleware';
import {
  generateDeterministicSchedule,
  detectCircularDependency,
  shiftTimelineDates,
  evaluateTaskOverdueStatus,
  GanttTaskItem,
} from '@/lib/timeline/scheduler';
import { z } from 'zod';

export const taskInputSchema = z.object({
  title: z.string().trim().min(2).max(150),
  description: z.string().trim().max(1000).optional().default(''),
  category: z.string().trim().max(50).default('General'),
  assignedToId: z.string().optional(),
  startDate: z.string().optional(),
  dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Valid ISO date string is required for dueDate',
  }),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  status: z.enum(['TODO', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED']).default('TODO'),
  progressPercent: z.number().int().min(0).max(100).default(0),
  milestoneId: z.string().optional(),
  isUserLocked: z.boolean().default(true),
});

export const scheduleItemInputSchema = z.object({
  dayNumber: z.number().int().min(1).default(1),
  startTime: z.string().min(1).max(20),
  endTime: z.string().min(1).max(20),
  title: z.string().trim().min(2).max(150),
  location: z.string().trim().max(100).optional().default('Main Venue'),
  speakerOrHost: z.string().trim().max(100).optional().default('Coordinator'),
  notes: z.string().trim().max(500).optional().default(''),
  orderIndex: z.number().int().min(0).default(0),
});

export class TimelineService {
  /**
   * Retrieves complete timeline view including Kanban taskboard, calendar items, Gantt DAG, and run of show.
   */
  static async getTimelineOverview(userId: string, eventId: string) {
    await authorizeEventAccess(userId, eventId, 'EVENT_VIEW');

    const [event, tasks, milestones, schedules, members] = await Promise.all([
      db.event.findUnique({
        where: { id: eventId },
        select: { id: true, title: true, startDate: true, endDate: true, eventType: true },
      }),
      db.task.findMany({
        where: { eventId },
        include: {
          milestone: true,
          preceding: { select: { dependsOnTaskId: true } },
          succeeding: { select: { taskId: true } },
        },
        orderBy: { dueDate: 'asc' },
      }),
      db.milestone.findMany({
        where: { eventId },
        orderBy: { targetDate: 'asc' },
      }),
      db.eventSchedule.findMany({
        where: { eventId },
        orderBy: [{ dayNumber: 'asc' }, { orderIndex: 'asc' }],
      }),
      db.eventMember.findMany({
        where: { eventId },
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
    ]);

    if (!event) {
      throw new Error('Event not found');
    }

    const now = new Date();
    const { overdueTaskIds } = evaluateTaskOverdueStatus(tasks, now);

    // 1. Kanban Board structure
    const taskBoard = {
      TODO: tasks.filter((t) => t.status === 'TODO'),
      IN_PROGRESS: tasks.filter((t) => t.status === 'IN_PROGRESS'),
      COMPLETED: tasks.filter((t) => t.status === 'COMPLETED'),
      BLOCKED: tasks.filter((t) => t.status === 'BLOCKED'),
    };

    // 2. Gantt Items structure
    const ganttItems: GanttTaskItem[] = tasks.map((t) => {
      const due = t.dueDate;
      const start = t.startDate || new Date(due.getTime() - 86400000 * 3);
      const durationDays = Math.max(1, Math.round((due.getTime() - start.getTime()) / 86400000));

      return {
        id: t.id,
        title: t.title,
        category: t.category,
        startDate: start.toISOString(),
        dueDate: due.toISOString(),
        durationDays,
        progressPercent: t.progressPercent,
        priority: t.priority,
        status: t.status,
        isOverdue: overdueTaskIds.includes(t.id),
        isUserLocked: t.isUserLocked,
        assignedToId: t.assignedToId,
        milestoneId: t.milestoneId,
        dependencies: t.preceding.map((p) => p.dependsOnTaskId),
      };
    });

    // 3. Calendar View items (tasks & milestones keyed by YYYY-MM-DD)
    const calendarMap: Record<string, { tasks: typeof tasks; milestones: typeof milestones }> = {};

    for (const t of tasks) {
      const dateKey = t.dueDate.toISOString().split('T')[0];
      if (!calendarMap[dateKey]) calendarMap[dateKey] = { tasks: [], milestones: [] };
      calendarMap[dateKey].tasks.push(t);
    }

    for (const m of milestones) {
      const dateKey = m.targetDate.toISOString().split('T')[0];
      if (!calendarMap[dateKey]) calendarMap[dateKey] = { tasks: [], milestones: [] };
      calendarMap[dateKey].milestones.push(m);
    }

    // 4. Run of show grouped by day
    const itineraryByDay: Record<number, typeof schedules> = {};
    for (const s of schedules) {
      if (!itineraryByDay[s.dayNumber]) itineraryByDay[s.dayNumber] = [];
      itineraryByDay[s.dayNumber].push(s);
    }

    const totalTasks = tasks.length;
    const completedTasks = taskBoard.COMPLETED.length;
    const progressPercent = totalTasks > 0 ? Math.round((completedTasks * 100) / totalTasks) : 0;

    return serializeBigInts({
      eventId: event.id,
      eventTitle: event.title,
      startDate: event.startDate,
      endDate: event.endDate,
      taskBoard,
      ganttItems,
      calendarItems: calendarMap,
      milestones,
      itineraryByDay,
      assignees: members.map((m) => m.user),
      metrics: {
        totalTasks,
        completedTasks,
        overdueTasks: overdueTaskIds.length,
        progressPercent,
      },
    });
  }

  /**
   * Generates or regenerates an intelligent timeline.
   * If preserveUserEdits is true, user-locked tasks (`isUserLocked: true`) are kept intact.
   */
  static async generateTimeline(
    userId: string,
    eventId: string,
    preserveUserEdits: boolean = true
  ) {
    await authorizeEventAccess(userId, eventId, 'TIMELINE_MANAGE');

    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { startDate: true, endDate: true, eventType: true },
    });

    if (!event) throw new Error('Event not found');

    const schedulePlan = generateDeterministicSchedule(
      event.startDate,
      event.endDate,
      event.eventType
    );

    await db.$transaction(async (tx) => {
      // 1. If not preserving, clear existing unlocked milestones & tasks
      if (!preserveUserEdits) {
        await tx.taskDependency.deleteMany({
          where: { task: { eventId } },
        });
        await tx.task.deleteMany({ where: { eventId, isUserLocked: false } });
        await tx.milestone.deleteMany({ where: { eventId } });
        await tx.eventSchedule.deleteMany({ where: { eventId } });
      }

      // 2. Populate Milestones & Tasks
      for (let i = 0; i < schedulePlan.milestones.length; i++) {
        const m = schedulePlan.milestones[i];

        // Check if milestone with same title exists
        let milestone = await tx.milestone.findFirst({
          where: { eventId, title: m.title },
        });

        if (!milestone) {
          milestone = await tx.milestone.create({
            data: {
              eventId,
              title: m.title,
              targetDate: m.targetDate,
              orderIndex: i,
            },
          });
        }

        for (const taskItem of m.tasks) {
          // If preserving, check if locked task exists
          if (preserveUserEdits) {
            const existingTask = await tx.task.findFirst({
              where: { eventId, title: taskItem.title },
            });
            if (existingTask && existingTask.isUserLocked) {
              continue; // Do not overwrite user custom task
            }
          }

          await tx.task.create({
            data: {
              eventId,
              milestoneId: milestone.id,
              title: taskItem.title,
              category: taskItem.category,
              startDate: taskItem.startDate,
              dueDate: taskItem.dueDate,
              priority: taskItem.priority,
              status: 'TODO',
              progressPercent: 0,
              isUserLocked: false,
            },
          });
        }
      }

      // 3. Populate multi-day itinerary
      for (const day of schedulePlan.itineraryDays) {
        for (const slot of day.slots) {
          const exists = await tx.eventSchedule.findFirst({
            where: { eventId, dayNumber: day.dayNumber, title: slot.title },
          });

          if (!exists) {
            await tx.eventSchedule.create({
              data: {
                eventId,
                dayNumber: day.dayNumber,
                startTime: slot.startTime,
                endTime: slot.endTime,
                title: slot.title,
                location: slot.location,
                speakerOrHost: slot.speakerOrHost,
                orderIndex: slot.orderIndex,
              },
            });
          }
        }
      }
    });

    await logActivity({
      eventId,
      userId,
      action: 'TIMELINE_GENERATED',
      entityType: 'Milestone',
      entityId: eventId,
      details: {
        isCompressed: schedulePlan.isCompressedTimeline,
        multiDayCount: schedulePlan.multiDayCount,
        preserveUserEdits,
      },
    });

    return this.getTimelineOverview(userId, eventId);
  }

  /**
   * Creates a user task. Sets isUserLocked: true so automatic schedule shifts don't overwrite it.
   */
  static async createTask(
    userId: string,
    eventId: string,
    data: z.input<typeof taskInputSchema>
  ) {
    await authorizeEventAccess(userId, eventId, 'TIMELINE_MANAGE');
    const parsed = taskInputSchema.parse(data);

    const task = await db.task.create({
      data: {
        eventId,
        title: parsed.title,
        description: parsed.description,
        category: parsed.category,
        assignedToId: parsed.assignedToId || null,
        startDate: parsed.startDate ? new Date(parsed.startDate) : null,
        dueDate: new Date(parsed.dueDate),
        priority: parsed.priority,
        status: parsed.status,
        progressPercent: parsed.progressPercent,
        milestoneId: parsed.milestoneId || null,
        isUserLocked: true, // Manual user task is locked from automated regeneration
      },
    });

    await logActivity({
      eventId,
      userId,
      action: 'TASK_CREATED',
      entityType: 'Task',
      entityId: task.id,
      details: { title: task.title, dueDate: task.dueDate },
    });

    return task;
  }

  /**
   * Updates a task (status, progress, assignment, dates). Automatically sets isUserLocked = true.
   */
  static async updateTask(
    userId: string,
    eventId: string,
    taskId: string,
    data: Partial<z.input<typeof taskInputSchema>>
  ) {
    await authorizeEventAccess(userId, eventId, 'TIMELINE_MANAGE');

    const existing = await db.task.findFirst({
      where: { id: taskId, eventId },
    });
    if (!existing) throw new Error('Task not found');

    const updateData: Record<string, unknown> = {
      isUserLocked: true, // Locking manual edits
    };

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.assignedToId !== undefined) updateData.assignedToId = data.assignedToId || null;
    if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null;
    if (data.dueDate !== undefined) updateData.dueDate = new Date(data.dueDate);
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.status !== undefined) {
      updateData.status = data.status;
      if (data.status === 'COMPLETED' && data.progressPercent === undefined) {
        updateData.progressPercent = 100;
      }
    }
    if (data.progressPercent !== undefined) updateData.progressPercent = data.progressPercent;
    if (data.milestoneId !== undefined) updateData.milestoneId = data.milestoneId || null;

    const updated = await db.task.update({
      where: { id: taskId },
      data: updateData,
    });

    await logActivity({
      eventId,
      userId,
      action: 'TASK_UPDATED',
      entityType: 'Task',
      entityId: taskId,
      details: updateData as Record<string, unknown>,
    });

    return updated;
  }

  /**
   * Deletes a task.
   */
  static async deleteTask(userId: string, eventId: string, taskId: string) {
    await authorizeEventAccess(userId, eventId, 'TIMELINE_MANAGE');

    const existing = await db.task.findFirst({
      where: { id: taskId, eventId },
    });
    if (!existing) throw new Error('Task not found');

    await db.task.delete({ where: { id: taskId } });

    await logActivity({
      eventId,
      userId,
      action: 'TASK_DELETED',
      entityType: 'Task',
      entityId: taskId,
      details: { title: existing.title },
    });

    return { success: true, message: 'Task deleted successfully' };
  }

  /**
   * Adds a task dependency. Detects and REJECTS circular dependencies.
   */
  static async addTaskDependency(
    userId: string,
    eventId: string,
    taskId: string,
    dependsOnTaskId: string
  ) {
    await authorizeEventAccess(userId, eventId, 'TIMELINE_MANAGE');

    if (taskId === dependsOnTaskId) {
      throw new Error('Circular dependency: A task cannot depend on itself');
    }

    const [t1, t2] = await Promise.all([
      db.task.findFirst({ where: { id: taskId, eventId } }),
      db.task.findFirst({ where: { id: dependsOnTaskId, eventId } }),
    ]);

    if (!t1 || !t2) {
      throw new Error('Both tasks must exist within this event');
    }

    // Check all existing dependencies in this event for circular cycle
    const existingDeps = await db.taskDependency.findMany({
      where: { task: { eventId } },
      select: { taskId: true, dependsOnTaskId: true },
    });

    const cycleCheck = detectCircularDependency(existingDeps, { taskId, dependsOnTaskId });
    if (cycleCheck.hasCycle) {
      throw new Error(
        `Circular dependency detected: Adding this dependency would create a cycle: [${cycleCheck.cyclePath?.join(' -> ')}]`
      );
    }

    const dep = await db.taskDependency.create({
      data: {
        taskId,
        dependsOnTaskId,
      },
    });

    return dep;
  }

  /**
   * Shifts timeline dates when the master event date changes.
   * Preserves manual user-locked tasks.
   */
  static async handleEventDateShift(
    userId: string,
    eventId: string,
    newStartDate: Date,
    newEndDate: Date
  ) {
    await authorizeEventAccess(userId, eventId, 'EVENT_EDIT');

    const event = await db.event.findUnique({
      where: { id: eventId },
      include: { tasks: true, milestones: true },
    });
    if (!event) throw new Error('Event not found');

    const { shiftedTasks, shiftedMilestones } = shiftTimelineDates(
      event.startDate,
      newStartDate,
      event.tasks,
      event.milestones
    );

    await db.$transaction(async (tx) => {
      await tx.event.update({
        where: { id: eventId },
        data: { startDate: newStartDate, endDate: newEndDate },
      });

      for (const m of shiftedMilestones) {
        await tx.milestone.update({
          where: { id: m.id },
          data: { targetDate: m.targetDate },
        });
      }

      for (const t of shiftedTasks) {
        await tx.task.update({
          where: { id: t.id },
          data: { dueDate: t.dueDate, ...(t.startDate ? { startDate: t.startDate } : {}) },
        });
      }
    });

    await logActivity({
      eventId,
      userId,
      action: 'EVENT_DATE_SHIFTED',
      entityType: 'Event',
      entityId: eventId,
      details: {
        oldStartDate: event.startDate,
        newStartDate,
        shiftedTaskCount: shiftedTasks.length,
      },
    });

    return {
      shiftedTaskCount: shiftedTasks.length,
      preservedTaskCount: event.tasks.length - shiftedTasks.length,
    };
  }

  /**
   * Background notification evaluator for overdue and upcoming task deadlines.
   */
  static async generateDeadlineNotifications(userId: string, eventId: string) {
    await authorizeEventAccess(userId, eventId, 'EVENT_VIEW');

    const tasks = await db.task.findMany({
      where: { eventId, status: { not: 'COMPLETED' } },
    });

    const now = new Date();
    const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const notifications = [];

    for (const task of tasks) {
      if (task.dueDate < now) {
        // Overdue task alert
        const notif = await db.notification.create({
          data: {
            eventId,
            userId,
            title: `OVERDUE: ${task.title}`,
            message: `Task "${task.title}" was due on ${task.dueDate.toISOString().split('T')[0]} and requires attention.`,
          },
        });
        notifications.push(notif);
      } else if (task.dueDate <= in48Hours) {
        // Due soon alert
        const notif = await db.notification.create({
          data: {
            eventId,
            userId,
            title: `DUE SOON: ${task.title}`,
            message: `Task "${task.title}" is due in less than 48 hours.`,
          },
        });
        notifications.push(notif);
      }
    }

    return notifications;
  }
}

