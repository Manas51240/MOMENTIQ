// ==============================================================================
// CELEBRA — Intelligent Timeline, DAG Dependency & Task Scheduling Engine
// Deterministic Date Arithmetic, Circular Dependency Prevention & Gantt Computation
// ==============================================================================

export interface TaskItemInput {
  id?: string;
  title: string;
  description?: string;
  category: string;
  offsetDaysFromEvent: number; // e.g. -60 days
  durationDays: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status?: 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
  isUserLocked?: boolean;
}

export interface MilestoneTemplate {
  title: string;
  offsetDaysFromEvent: number;
  tasks: TaskItemInput[];
}

export interface GanttTaskItem {
  id: string;
  title: string;
  category: string;
  startDate: string;
  dueDate: string;
  durationDays: number;
  progressPercent: number;
  priority: string;
  status: string;
  isOverdue: boolean;
  isUserLocked: boolean;
  assignedToId?: string | null;
  milestoneId?: string | null;
  dependencies: string[];
}

/**
 * Checks for circular dependencies in a task dependency DAG.
 * Uses Depth-First Search with recursion stack tracking.
 */
export function detectCircularDependency(
  allDependencies: { taskId: string; dependsOnTaskId: string }[],
  candidate?: { taskId: string; dependsOnTaskId: string }
): { hasCycle: boolean; cyclePath?: string[] } {
  const adj = new Map<string, string[]>();

  // Self-dependency is an immediate cycle
  if (candidate && candidate.taskId === candidate.dependsOnTaskId) {
    return { hasCycle: true, cyclePath: [candidate.taskId, candidate.taskId] };
  }

  // Build adjacency list: dependsOnTaskId -> taskId (A depends on B means B must finish before A)
  const combined = candidate ? [...allDependencies, candidate] : allDependencies;

  for (const dep of combined) {
    if (!adj.has(dep.dependsOnTaskId)) {
      adj.set(dep.dependsOnTaskId, []);
    }
    adj.get(dep.dependsOnTaskId)!.push(dep.taskId);
  }

  const visited = new Set<string>();
  const recStack = new Set<string>();
  const currentPath: string[] = [];

  function dfs(node: string): boolean {
    visited.add(node);
    recStack.add(node);
    currentPath.push(node);

    const neighbors = adj.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recStack.has(neighbor)) {
        currentPath.push(neighbor);
        return true;
      }
    }

    recStack.delete(node);
    currentPath.pop();
    return false;
  }

  for (const node of adj.keys()) {
    if (!visited.has(node)) {
      if (dfs(node)) {
        return { hasCycle: true, cyclePath: [...currentPath] };
      }
    }
  }

  return { hasCycle: false };
}

/**
 * Generates category-specific milestone and task templates.
 */
function getCategoryTimelineTemplates(category: string): MilestoneTemplate[] {
  const upper = category.toUpperCase();

  if (upper === 'WEDDING') {
    return [
      {
        title: 'Phase 1: Vision, Budget & Key Vendors',
        offsetDaysFromEvent: -90,
        tasks: [
          { title: 'Confirm wedding date & venue contract', category: 'Venue', offsetDaysFromEvent: -90, durationDays: 7, priority: 'CRITICAL' },
          { title: 'Hire photographer & videographer', category: 'Media', offsetDaysFromEvent: -80, durationDays: 10, priority: 'HIGH' },
          { title: 'Finalize core catering style & tasting', category: 'Catering', offsetDaysFromEvent: -75, durationDays: 5, priority: 'HIGH' },
        ],
      },
      {
        title: 'Phase 2: Design, Styling & Invitations',
        offsetDaysFromEvent: -50,
        tasks: [
          { title: 'Finalize floral, lighting & table decor', category: 'Decor', offsetDaysFromEvent: -50, durationDays: 14, priority: 'MEDIUM' },
          { title: 'Dispatch digital & physical invitations', category: 'Guests', offsetDaysFromEvent: -45, durationDays: 5, priority: 'HIGH' },
          { title: 'Book ceremony music & reception DJ', category: 'Entertainment', offsetDaysFromEvent: -40, durationDays: 7, priority: 'MEDIUM' },
        ],
      },
      {
        title: 'Phase 3: RSVPs & Seating Logistics',
        offsetDaysFromEvent: -20,
        tasks: [
          { title: 'Close RSVP deadline & dietary tally', category: 'Guests', offsetDaysFromEvent: -20, durationDays: 3, priority: 'HIGH' },
          { title: 'Finalize seating arrangement chart', category: 'Guests', offsetDaysFromEvent: -14, durationDays: 4, priority: 'MEDIUM' },
          { title: 'Distribute timeline to all hired vendors', category: 'Coordination', offsetDaysFromEvent: -10, durationDays: 2, priority: 'HIGH' },
        ],
      },
      {
        title: 'Phase 4: Final Week & Execution',
        offsetDaysFromEvent: -3,
        tasks: [
          { title: 'Ceremony rehearsal walkthrough', category: 'Rehearsal', offsetDaysFromEvent: -2, durationDays: 1, priority: 'HIGH' },
          { title: 'Final balance settlements to vendors', category: 'Finance', offsetDaysFromEvent: -1, durationDays: 1, priority: 'CRITICAL' },
          { title: 'Event day load-in & celebration execution', category: 'Event Day', offsetDaysFromEvent: 0, durationDays: 1, priority: 'CRITICAL' },
        ],
      },
    ];
  }

  // Default celebration template (Corporate, Birthday, Anniversary, etc.)
  return [
    {
      title: 'Phase 1: Concept, Venue & Budget Lock',
      offsetDaysFromEvent: -45,
      tasks: [
        { title: 'Confirm celebration date & venue booking', category: 'Venue', offsetDaysFromEvent: -45, durationDays: 5, priority: 'CRITICAL' },
        { title: 'Lock entertainment / speaker lineup', category: 'Entertainment', offsetDaysFromEvent: -35, durationDays: 7, priority: 'HIGH' },
      ],
    },
    {
      title: 'Phase 2: Guest Invites & Production',
      offsetDaysFromEvent: -25,
      tasks: [
        { title: 'Send invitations with dietary RSVP options', category: 'Guests', offsetDaysFromEvent: -25, durationDays: 4, priority: 'HIGH' },
        { title: 'Approve catering menu & bar package', category: 'Catering', offsetDaysFromEvent: -20, durationDays: 5, priority: 'MEDIUM' },
        { title: 'Finalize AV lighting & sound requirements', category: 'Production', offsetDaysFromEvent: -15, durationDays: 3, priority: 'MEDIUM' },
      ],
    },
    {
      title: 'Phase 3: Final Preparations & Rundown',
      offsetDaysFromEvent: -5,
      tasks: [
        { title: 'Confirm final headcount with caterer', category: 'Catering', offsetDaysFromEvent: -5, durationDays: 1, priority: 'CRITICAL' },
        { title: 'Distribute day schedule to coordinators', category: 'Coordination', offsetDaysFromEvent: -2, durationDays: 1, priority: 'HIGH' },
        { title: 'Day-of celebration execution & hospitality', category: 'Event Day', offsetDaysFromEvent: 0, durationDays: 1, priority: 'CRITICAL' },
      ],
    },
  ];
}

export interface GeneratedSchedulePlan {
  isCompressedTimeline: boolean;
  isPastEvent: boolean;
  multiDayCount: number;
  milestones: {
    title: string;
    targetDate: Date;
    tasks: {
      title: string;
      category: string;
      startDate: Date;
      dueDate: Date;
      priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    }[];
  }[];
  itineraryDays: {
    dayNumber: number;
    date: Date;
    slots: {
      startTime: string;
      endTime: string;
      title: string;
      location: string;
      speakerOrHost: string;
      orderIndex: number;
    }[];
  }[];
}

/**
 * Deterministically generates milestone and task schedules calibrated to event date and duration.
 * Properly adapts to events in the past, near-term events (e.g. 3 days away), and multi-day gatherings.
 */
export function generateDeterministicSchedule(
  eventStartDate: Date,
  eventEndDate: Date,
  category: string,
  now: Date = new Date()
): GeneratedSchedulePlan {
  const startMs = eventStartDate.getTime();
  const endMs = eventEndDate.getTime();
  const nowMs = now.getTime();

  const isPastEvent = startMs < nowMs;
  const daysUntilEvent = Math.round((startMs - nowMs) / (1000 * 60 * 60 * 24));
  const isCompressedTimeline = !isPastEvent && daysUntilEvent < 14;

  // Calculate event span in calendar days (min 1)
  const durationMs = Math.max(0, endMs - startMs);
  const multiDayCount = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60 * 24)));

  const rawTemplates = getCategoryTimelineTemplates(category);

  // Compression factor for near-term events
  const compressionRatio = isCompressedTimeline
    ? Math.max(0.1, daysUntilEvent / 60)
    : 1;

  const milestones = rawTemplates.map((template) => {
    // Scale offset days if timeline is compressed
    const effectiveOffsetDays = Math.round(template.offsetDaysFromEvent * compressionRatio);
    const targetDate = new Date(startMs + effectiveOffsetDays * 86400000);

    const tasks = template.tasks.map((task) => {
      const taskOffset = Math.round(task.offsetDaysFromEvent * compressionRatio);
      const dueDate = new Date(startMs + taskOffset * 86400000);
      const startDate = new Date(dueDate.getTime() - Math.max(1, task.durationDays) * 86400000);

      // Escalate priority if timeline is compressed
      const priority = isCompressedTimeline && task.priority === 'HIGH' ? 'CRITICAL' : task.priority;

      return {
        title: task.title,
        category: task.category,
        startDate,
        dueDate,
        priority,
      };
    });

    return {
      title: template.title,
      targetDate,
      tasks,
    };
  });

  // Generate multi-day event itinerary slots
  const itineraryDays = [];
  for (let day = 1; day <= multiDayCount; day++) {
    const dayDate = new Date(startMs + (day - 1) * 86400000);
    const slots = [
      {
        startTime: '09:00',
        endTime: '10:00',
        title: `Day ${day} Welcome & Breakfast`,
        location: 'Main Foyer',
        speakerOrHost: 'Hospitality Team',
        orderIndex: 0,
      },
      {
        startTime: '10:30',
        endTime: '12:30',
        title: `Day ${day} Morning Session / Ceremony`,
        location: 'Grand Ballroom',
        speakerOrHost: 'Master of Ceremonies',
        orderIndex: 1,
      },
      {
        startTime: '13:00',
        endTime: '14:30',
        title: `Day ${day} Banquet Luncheon`,
        location: 'Dining Hall',
        speakerOrHost: 'Banquet Lead',
        orderIndex: 2,
      },
      {
        startTime: '16:00',
        endTime: '19:00',
        title: `Day ${day} Celebration & Evening Reception`,
        location: 'Terrace & Lawn',
        speakerOrHost: 'Host & DJ',
        orderIndex: 3,
      },
    ];

    itineraryDays.push({
      dayNumber: day,
      date: dayDate,
      slots,
    });
  }

  return {
    isCompressedTimeline,
    isPastEvent,
    multiDayCount,
    milestones,
    itineraryDays,
  };
}

/**
 * Shifts existing milestones and tasks when the event date is moved.
 * STRICTLY PRESERVES user-locked tasks (`isUserLocked === true`).
 */
export function shiftTimelineDates(
  oldEventDate: Date,
  newEventDate: Date,
  tasks: { id: string; startDate?: Date | null; dueDate: Date; isUserLocked: boolean }[],
  milestones: { id: string; targetDate: Date }[]
): {
  shiftedTasks: { id: string; startDate?: Date; dueDate: Date }[];
  shiftedMilestones: { id: string; targetDate: Date }[];
} {
  const deltaMs = newEventDate.getTime() - oldEventDate.getTime();

  const shiftedMilestones = milestones.map((m) => ({
    id: m.id,
    targetDate: new Date(m.targetDate.getTime() + deltaMs),
  }));

  const shiftedTasks = tasks
    .filter((t) => !t.isUserLocked) // NEVER shift user-locked tasks
    .map((t) => ({
      id: t.id,
      startDate: t.startDate ? new Date(t.startDate.getTime() + deltaMs) : undefined,
      dueDate: new Date(t.dueDate.getTime() + deltaMs),
    }));

  return {
    shiftedTasks,
    shiftedMilestones,
  };
}

/**
 * Detects overdue tasks and generates alerts.
 */
export function evaluateTaskOverdueStatus(
  tasks: { id: string; title: string; dueDate: Date; status: string }[],
  referenceDate: Date = new Date()
): { overdueTaskIds: string[]; overdueCount: number } {
  const overdue = tasks.filter(
    (t) => t.status !== 'COMPLETED' && t.dueDate < referenceDate
  );

  return {
    overdueTaskIds: overdue.map((t) => t.id),
    overdueCount: overdue.length,
  };
}

