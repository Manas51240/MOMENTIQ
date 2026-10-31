import { describe, it, expect } from 'vitest';
import db from '../src/lib/database';
import { AuthService } from '../src/services/auth-service';
import { EventService } from '../src/services/event-service';

describe('Event Domain, Transactional Seeding, & IDOR Multi-Tenant Isolation', () => {
  it('creates an event in an atomic transaction with default preferences, budget, categories, and audit log', async () => {
    // 1. Create a user
    const userA = await AuthService.register({
      email: `owner_${Date.now()}@example.com`,
      name: 'Owner Alice',
      password: 'StrongPassword123!',
    });

    // 2. Create an event
    const event = await EventService.createEvent(userA.user.id, {
      title: 'Grand Royal Gala 2026',
      description: 'Annual corporate celebration and awards gala',
      eventType: 'CORPORATE',
      startDate: new Date(Date.now() + 86400000 * 30).toISOString(),
      endDate: new Date(Date.now() + 86400000 * 31).toISOString(),
      venue: 'Metropolitan Grand Ballroom',
      city: 'San Francisco',
      country: 'USA',
      guestTarget: 250,
      budgetMinor: 5000000, // $50,000.00
      currency: 'USD',
    });

    expect(event.id).toBeDefined();
    expect(event.title).toBe('Grand Royal Gala 2026');
    expect(event.ownerId).toBe(userA.user.id);
    expect(event.budgetMinor).toBe(5000000);

    // Verify atomic relational records created
    const [preferences, budget, categories, activityLogs, member] = await Promise.all([
      db.eventPreference.findUnique({ where: { eventId: event.id } }),
      db.eventBudget.findUnique({ where: { eventId: event.id } }),
      db.budgetCategory.findMany({ where: { eventId: event.id } }),
      db.activityLog.findMany({ where: { eventId: event.id } }),
      db.eventMember.findUnique({
        where: {
          eventId_userId: { eventId: event.id, userId: userA.user.id },
        },
      }),
    ]);

    expect(preferences).toBeDefined();
    expect(budget).toBeDefined();
    expect(Number(budget?.totalBudgetMinor)).toBe(5000000);
    expect(categories.length).toBe(7); // 7 standard categories seeded
    expect(member?.role).toBe('OWNER');
    expect(activityLogs.some((l) => l.action === 'EVENT_CREATED')).toBe(true);
  });

  it('ENFORCES TENANT ISOLATION & IDOR DEFENSE: User B CANNOT view, modify, or delete User A event', async () => {
    const timestamp = Date.now();
    // Register User A
    const userA = await AuthService.register({
      email: `tenant_a_${timestamp}@example.com`,
      name: 'User A',
      password: 'StrongPassword123!',
    });

    // Register User B
    const userB = await AuthService.register({
      email: `tenant_b_${timestamp}@example.com`,
      name: 'User B',
      password: 'StrongPassword123!',
    });

    // User A creates an event
    const eventA = await EventService.createEvent(userA.user.id, {
      title: "User A Confidential Wedding",
      description: "Private wedding event",
      eventType: "WEDDING",
      startDate: new Date(Date.now() + 86400000 * 60).toISOString(),
      endDate: new Date(Date.now() + 86400000 * 61).toISOString(),
      venue: "Private Estate",
      city: "Napa",
      country: "USA",
      guestTarget: 100,
      budgetMinor: 7500000,
      currency: "USD",
    });

    // User B creates an event
    const eventB = await EventService.createEvent(userB.user.id, {
      title: "User B 30th Birthday",
      description: "Birthday celebration",
      eventType: "BIRTHDAY",
      startDate: new Date(Date.now() + 86400000 * 15).toISOString(),
      endDate: new Date(Date.now() + 86400000 * 16).toISOString(),
      venue: "Skyline Lounge",
      city: "New York",
      country: "USA",
      guestTarget: 40,
      budgetMinor: 1500000,
      currency: "USD",
    });

    // 1. User A can view their own event
    const userAView = await EventService.getEventDetails(userA.user.id, eventA.id);
    expect(userAView.id).toBe(eventA.id);
    expect(userAView.isOwner).toBe(true);

    // 2. User B can view their own event
    const userBView = await EventService.getEventDetails(userB.user.id, eventB.id);
    expect(userBView.id).toBe(eventB.id);
    expect(userBView.isOwner).toBe(true);

    // 3. IDOR TEST 1: User B tries to VIEW User A's event -> MUST BE DENIED
    await expect(
      EventService.getEventDetails(userB.user.id, eventA.id)
    ).rejects.toThrow(/Access denied/);

    // 4. IDOR TEST 2: User B tries to UPDATE User A's event -> MUST BE DENIED
    await expect(
      EventService.updateEvent(userB.user.id, eventA.id, {
        title: "Hacked by User B",
      })
    ).rejects.toThrow(/Access denied/);

    // 5. IDOR TEST 3: User B tries to DELETE User A's event -> MUST BE DENIED
    await expect(
      EventService.deleteEvent(userB.user.id, eventA.id)
    ).rejects.toThrow(/Access denied/);

    // 6. IDOR TEST 4: User B tries to ADD COLLABORATOR to User A's event -> MUST BE DENIED
    await expect(
      EventService.addCollaborator(userB.user.id, eventA.id, {
        email: userB.user.email,
        role: "PLANNER",
      })
    ).rejects.toThrow(/Access denied/);

    // 7. Verify User A's event was completely untouched
    const eventACheck = await db.event.findUnique({ where: { id: eventA.id } });
    expect(eventACheck?.title).toBe("User A Confidential Wedding");
  });

  it('enforces RBAC permissions among event collaborators', async () => {
    const timestamp = Date.now();
    const owner = await AuthService.register({
      email: `collab_owner_${timestamp}@example.com`,
      name: 'Owner Elena',
      password: 'StrongPassword123!',
    });

    const collaborator = await AuthService.register({
      email: `collab_viewer_${timestamp}@example.com`,
      name: 'Viewer Vance',
      password: 'StrongPassword123!',
    });

    const event = await EventService.createEvent(owner.user.id, {
      title: 'Family Reunion 2026',
      description: 'Summer gathering',
      eventType: 'COMMUNITY',
      startDate: new Date(Date.now() + 86400000 * 45).toISOString(),
      endDate: new Date(Date.now() + 86400000 * 46).toISOString(),
      venue: 'Lakeside Park',
      city: 'Lake Tahoe',
      country: 'USA',
      guestTarget: 80,
      budgetMinor: 2000000,
      currency: 'USD',
    });

    // 1. Owner invites collaborator as VIEWER
    await EventService.addCollaborator(owner.user.id, event.id, {
      email: collaborator.user.email,
      role: 'VIEWER',
    });

    // 2. Viewer can view the event
    const viewerEvent = await EventService.getEventDetails(collaborator.user.id, event.id);
    expect(viewerEvent.id).toBe(event.id);
    expect(viewerEvent.userRole).toBe('VIEWER');
    expect(viewerEvent.canEdit).toBe(false);

    // 3. Viewer attempts to edit the event -> MUST FAIL
    await expect(
      EventService.updateEvent(collaborator.user.id, event.id, {
        title: 'Unauthorized Edit by Viewer',
      })
    ).rejects.toThrow(/Forbidden/);

    // 4. Viewer attempts to delete the event -> MUST FAIL
    await expect(
      EventService.deleteEvent(collaborator.user.id, event.id)
    ).rejects.toThrow(/Forbidden/);

    // 5. Owner upgrades collaborator to PLANNER
    await EventService.addCollaborator(owner.user.id, event.id, {
      email: collaborator.user.email,
      role: 'PLANNER',
    });

    // 6. Planner can now edit event details
    const edited = await EventService.updateEvent(collaborator.user.id, event.id, {
      title: 'Family Reunion 2026 - Updated by Planner',
    });
    expect(edited.title).toBe('Family Reunion 2026 - Updated by Planner');

    // 7. Planner STILL CANNOT delete the event (strictly OWNER only)
    await expect(
      EventService.deleteEvent(collaborator.user.id, event.id)
    ).rejects.toThrow(/Forbidden/);
  });

  it('supports pagination and search filtering in listUserEvents', async () => {
    const timestamp = Date.now();
    const user = await AuthService.register({
      email: `pager_${timestamp}@example.com`,
      name: 'Pager Pete',
      password: 'StrongPassword123!',
    });

    // Create 3 events
    await EventService.createEvent(user.user.id, {
      title: 'Alpha Wedding',
      description: 'Beachside celebration',
      eventType: 'WEDDING',
      startDate: new Date(Date.now() + 86400000 * 10).toISOString(),
      endDate: new Date(Date.now() + 86400000 * 11).toISOString(),
      venue: 'Sunny Beach',
      city: 'Miami',
      country: 'USA',
      guestTarget: 50,
      budgetMinor: 1000000,
      currency: 'USD',
    });

    await EventService.createEvent(user.user.id, {
      title: 'Beta Corporate Conference',
      description: 'Tech symposium',
      eventType: 'CORPORATE',
      startDate: new Date(Date.now() + 86400000 * 20).toISOString(),
      endDate: new Date(Date.now() + 86400000 * 21).toISOString(),
      venue: 'Convention Center',
      city: 'Chicago',
      country: 'USA',
      guestTarget: 200,
      budgetMinor: 3000000,
      currency: 'USD',
    });

    await EventService.createEvent(user.user.id, {
      title: 'Gamma Birthday Bash',
      description: 'Surprise celebration',
      eventType: 'BIRTHDAY',
      startDate: new Date(Date.now() + 86400000 * 30).toISOString(),
      endDate: new Date(Date.now() + 86400000 * 31).toISOString(),
      venue: 'Rooftop Bar',
      city: 'Austin',
      country: 'USA',
      guestTarget: 30,
      budgetMinor: 500000,
      currency: 'USD',
    });

    // Page 1 with limit 2
    const page1 = await EventService.listUserEvents(user.user.id, {
      page: 1,
      limit: 2,
    });
    expect(page1.events.length).toBe(2);
    expect(page1.pagination.totalCount).toBe(3);
    expect(page1.pagination.totalPages).toBe(2);

    // Search filter
    const searchResult = await EventService.listUserEvents(user.user.id, {
      page: 1,
      limit: 10,
      search: 'Corporate',
    });
    expect(searchResult.events.length).toBe(1);
    expect(searchResult.events[0].title).toBe('Beta Corporate Conference');
  });
});

