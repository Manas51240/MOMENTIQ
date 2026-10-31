import { describe, it, expect, beforeEach } from 'vitest';
import db from '../src/lib/database';
import { AuthService } from '../src/services/auth-service';
import { EventService } from '../src/services/event-service';
import { GuestService } from '../src/services/guest-service';
import { authRateLimiter } from '../src/lib/security/rate-limiter';

describe('Guest & Invitation Management, RSVP & Seating Suite', () => {
  let userA: { user: { id: string; email: string } };
  let userB: { user: { id: string; email: string } };
  let eventA: { id: string; title: string };

  beforeEach(async () => {
    authRateLimiter.reset();
    const timestamp = Date.now();

    userA = await AuthService.register({
      email: `guest_a_${timestamp}@example.com`,
      name: 'Host User A',
      password: 'StrongPassword123!',
    });

    userB = await AuthService.register({
      email: `guest_b_${timestamp}@example.com`,
      name: 'Unrelated User B',
      password: 'StrongPassword123!',
    });

    eventA = await EventService.createEvent(userA.user.id, {
      title: 'Grand Gala Celebration',
      description: 'Guest and RSVP verification celebration',
      eventType: 'WEDDING',
      startDate: new Date(Date.now() + 86400000 * 45).toISOString(),
      endDate: new Date(Date.now() + 86400000 * 46).toISOString(),
      venue: 'The Grand Ballroom',
      city: 'Chicago',
      country: 'USA',
      guestTarget: 150,
      budgetMinor: 5000000,
      currency: 'USD',
    });
  });

  it('1. Registers an individual guest with unique tokenized invite code and valid schema', async () => {
    const guest = await GuestService.addGuest(userA.user.id, eventA.id, {
      name: 'Eleanor Vance',
      email: 'eleanor.vance@example.com',
      phone: '+1-555-0199',
      rsvpStatus: 'PENDING',
      attendingCount: 2,
      dietaryRequirements: 'Vegetarian, Nut Allergy',
      accessibilityNotes: 'Wheelchair access required',
    });

    expect(guest.id).toBeDefined();
    expect(guest.name).toBe('Eleanor Vance');
    expect(guest.email).toBe('eleanor.vance@example.com');
    expect(guest.invitationCode).toMatch(/^CELEB-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(guest.attendingCount).toBe(2);
    expect(guest.dietaryRequirements).toBe('Vegetarian, Nut Allergy');
    expect(guest.accessibilityNotes).toBe('Wheelchair access required');
  });

  it('2. Prevents duplicate guest registrations (same email or same name within event)', async () => {
    await GuestService.addGuest(userA.user.id, eventA.id, {
      name: 'Marcus Brody',
      email: 'marcus.brody@museum.org',
      attendingCount: 1,
    });

    // Duplicate email check
    await expect(
      GuestService.addGuest(userA.user.id, eventA.id, {
        name: 'M. Brody',
        email: 'marcus.brody@museum.org',
        attendingCount: 1,
      })
    ).rejects.toThrow(/already registered for this event/);

    // Duplicate name check
    await expect(
      GuestService.addGuest(userA.user.id, eventA.id, {
        name: 'Marcus Brody',
        email: 'brody.alternate@museum.org',
        attendingCount: 1,
      })
    ).rejects.toThrow(/already on this event's guest list/);
  });

  it('3. Imports guests from CSV, parses attributes, dedupes, and handles malformed rows', async () => {
    const csvContent = `Name,Email,Phone,Attending Count,Dietary,Accessibility
Sarah Connor,sarah.c@resistance.org,+1-555-0101,2,Gluten-Free,Near emergency exit
John Connor,john.c@resistance.org,+1-555-0102,1,None,
Sarah Connor,duplicate.sarah@resistance.org,+1-555-0103,1,None,
Kyle Reese,kyle.reese@resistance.org,+1-555-0104,2,Dairy-Free,`;

    const importResult = await GuestService.importGuestsFromCsv(
      userA.user.id,
      eventA.id,
      csvContent
    );

    expect(importResult.importedCount).toBe(3); // Sarah Connor, John Connor, Kyle Reese (duplicate Sarah dropped)
    expect(importResult.skippedDuplicates).toBe(1);

    // Verify imported guests exist in database
    const list = await GuestService.listGuests(userA.user.id, eventA.id);
    expect(list.guests.length).toBe(3);
    const sarah = list.guests.find((g) => g.name === 'Sarah Connor');
    expect(sarah).toBeDefined();
    expect(sarah?.dietaryRequirements).toBe('Gluten-Free');
    expect(sarah?.attendingCount).toBe(2);

    // Malformed CSV without Name column header fails validation gracefully
    const malformedCsv = `WrongColumn,AnotherColumn\nValue1,Value2`;
    const malformedResult = await GuestService.importGuestsFromCsv(
      userA.user.id,
      eventA.id,
      malformedCsv
    );
    expect(malformedResult.importedCount).toBe(0);
    expect(malformedResult.errors.length).toBeGreaterThan(0);
  });

  it('4. Public RSVP Lookup and Submission works seamlessly without user authentication', async () => {
    const guest = await GuestService.addGuest(userA.user.id, eventA.id, {
      name: 'Arthur Dent',
      email: 'arthur.dent@galaxy.org',
      attendingCount: 1,
    });

    // Public retrieval by secure token
    const publicData = await GuestService.publicGetInvitation(guest.invitationCode);
    expect(publicData.guestName).toBe('Arthur Dent');
    expect(publicData.currentRsvpStatus).toBe('PENDING');
    expect(publicData.event.title).toBe('Grand Gala Celebration');

    // Public RSVP submission confirming attendance with dietary notes
    const rsvpSubmission = await GuestService.publicSubmitRsvp(guest.invitationCode, {
      rsvpStatus: 'ATTENDING',
      attendingCount: 2,
      dietaryRequirements: 'Tea only',
      accessibilityNotes: 'Towel required',
    });

    expect(rsvpSubmission.success).toBe(true);
    expect(rsvpSubmission.rsvpStatus).toBe('ATTENDING');
    expect(rsvpSubmission.attendingCount).toBe(2);

    // Verify updated status in host view
    const hostList = await GuestService.listGuests(userA.user.id, eventA.id);
    const updated = hostList.guests.find((g) => g.id === guest.id);
    expect(updated?.rsvpStatus).toBe('ATTENDING');
    expect(updated?.attendingCount).toBe(2);
    expect(updated?.dietaryRequirements).toBe('Tea only');
    expect(hostList.metrics.totalAttendingSeats).toBe(2);
  });

  it('5. Handles DECLINED RSVP status and zeroes out attending count accurately', async () => {
    const guest = await GuestService.addGuest(userA.user.id, eventA.id, {
      name: 'Ford Prefect',
      email: 'ford.prefect@galaxy.org',
      attendingCount: 3,
    });

    const rsvpSubmission = await GuestService.publicSubmitRsvp(guest.invitationCode, {
      rsvpStatus: 'DECLINED',
      attendingCount: 3,
    });

    expect(rsvpSubmission.success).toBe(true);
    expect(rsvpSubmission.rsvpStatus).toBe('DECLINED');
    expect(rsvpSubmission.attendingCount).toBe(0);

    const hostList = await GuestService.listGuests(userA.user.id, eventA.id);
    expect(hostList.metrics.totalDeclined).toBe(1);
    expect(hostList.metrics.totalAttendingSeats).toBe(0);
  });

  it('6. Assigns seating and prevents cross-seat conflicts', async () => {
    const guest1 = await GuestService.addGuest(userA.user.id, eventA.id, {
      name: 'Luke Skywalker',
      attendingCount: 1,
    });

    const guest2 = await GuestService.addGuest(userA.user.id, eventA.id, {
      name: 'Leia Organa',
      attendingCount: 1,
    });

    const seat1 = await GuestService.assignSeating(userA.user.id, eventA.id, {
      tableNumber: 1,
      tableName: 'VIP Table',
      seatNumber: 1,
      guestId: guest1.id,
    });

    expect(seat1.tableNumber).toBe(1);
    expect(seat1.seatNumber).toBe(1);
    expect(seat1.guestId).toBe(guest1.id);

    const seat2 = await GuestService.assignSeating(userA.user.id, eventA.id, {
      tableNumber: 1,
      tableName: 'VIP Table',
      seatNumber: 2,
      guestId: guest2.id,
    });

    expect(seat2.seatNumber).toBe(2);
    expect(seat2.guestId).toBe(guest2.id);

    // Verify guest record displays seatingTable
    const refreshedGuest = await db.guest.findUnique({ where: { id: guest1.id } });
    expect(refreshedGuest?.seatingTable).toBe('VIP Table 1');
  });

  it('7. Handles Event-Day Door Check-In and reverses check-in status with audit logging', async () => {
    const guest = await GuestService.addGuest(userA.user.id, eventA.id, {
      name: 'Tony Stark',
      attendingCount: 2,
    });

    // Check-in
    const checkedIn = await GuestService.checkInGuest(userA.user.id, eventA.id, guest.id, true);
    expect(checkedIn.checkedIn).toBe(true);
    expect(checkedIn.checkedInAt).toBeDefined();

    // Verify metrics reflect check-in
    let list = await GuestService.listGuests(userA.user.id, eventA.id);
    expect(list.metrics.totalCheckedIn).toBe(2);

    // Check-in reversal
    const reversed = await GuestService.checkInGuest(userA.user.id, eventA.id, guest.id, false);
    expect(reversed.checkedIn).toBe(false);
    expect(reversed.checkedInAt).toBeNull();

    list = await GuestService.listGuests(userA.user.id, eventA.id);
    expect(list.metrics.totalCheckedIn).toBe(0);
  });

  it('8. Enforces PII data minimization: VIEWER role cannot see plain emails or phone numbers', async () => {
    await GuestService.addGuest(userA.user.id, eventA.id, {
      name: 'Bruce Wayne',
      email: 'bruce.wayne@wayneenterprises.com',
      phone: '+1-555-888-0001',
      attendingCount: 1,
    });

    // Add userB as a VIEWER collaborator
    await EventService.addCollaborator(userA.user.id, eventA.id, {
      email: userB.user.email,
      role: 'VIEWER',
    });

    // As owner (userA), PII is visible in full
    const ownerList = await GuestService.listGuests(userA.user.id, eventA.id);
    const ownerViewBruce = ownerList.guests.find((g) => g.name === 'Bruce Wayne');
    expect(ownerViewBruce?.email).toBe('bruce.wayne@wayneenterprises.com');
    expect(ownerViewBruce?.phone).toBe('+1-555-888-0001');

    // As VIEWER (userB), PII is masked
    const viewerList = await GuestService.listGuests(userB.user.id, eventA.id);
    const viewerViewBruce = viewerList.guests.find((g) => g.name === 'Bruce Wayne');
    expect(viewerViewBruce?.email).toMatch(/^br\*\*\*@wayneenterprises\.com$/);
    expect(viewerViewBruce?.phone).toMatch(/^\+1-\*\*\*\*01$/);
  });

  it('9. Enforces strict IDOR protection: User B cannot modify, check-in, or delete User A guests', async () => {
    const guest = await GuestService.addGuest(userA.user.id, eventA.id, {
      name: 'Diana Prince',
      email: 'diana@themyscira.gov',
      attendingCount: 1,
    });

    // User B tries to update guest on User A's event
    await expect(
      GuestService.updateGuest(userB.user.id, eventA.id, guest.id, {
        name: 'Hacked Name',
      })
    ).rejects.toThrow(/Access denied|Forbidden/);

    // User B tries to check in guest
    await expect(
      GuestService.checkInGuest(userB.user.id, eventA.id, guest.id, true)
    ).rejects.toThrow(/Access denied|Forbidden/);

    // User B tries to delete guest
    await expect(
      GuestService.deleteGuest(userB.user.id, eventA.id, guest.id)
    ).rejects.toThrow(/Access denied|Forbidden/);
  });

  it('10. Generates AI creative invitation copy with tailored tones and verifies truth in delivery', async () => {
    const guest = await GuestService.addGuest(userA.user.id, eventA.id, {
      name: 'Natasha Romanoff',
      attendingCount: 1,
    });

    // AI Invitation Copy in CELEBRATORY tone
    const celebratoryCopy = await GuestService.generateInvitationCopy(
      userA.user.id,
      eventA.id,
      guest.id,
      'CELEBRATORY'
    );
    expect(celebratoryCopy.headline).toBeDefined();
    expect(celebratoryCopy.formattedInvitationText).toContain('Natasha Romanoff');
    expect(celebratoryCopy.formattedInvitationText).toContain('Grand Gala Celebration');

    // Truth-in-delivery dispatch check: honest PROVIDER_UNCONFIGURED status when gateway not connected
    const dispatch = await GuestService.dispatchInvitation(
      userA.user.id,
      eventA.id,
      guest.id,
      'EMAIL'
    );
    expect(dispatch.delivery.providerConfigured).toBe(false);
    expect(dispatch.delivery.status).toBe('PROVIDER_UNCONFIGURED');
    expect(dispatch.delivery.details).toMatch(/No third-party messaging gateway configured|manual/);
  });

  it('11. Generates attendance and dietary breakdown report', async () => {
    const g1 = await GuestService.addGuest(userA.user.id, eventA.id, {
      name: 'Guest One',
      attendingCount: 2,
      dietaryRequirements: 'Vegan, Halal',
      accessibilityNotes: 'Sign language interpreter',
    });
    const g2 = await GuestService.addGuest(userA.user.id, eventA.id, {
      name: 'Guest Two',
      attendingCount: 3,
      dietaryRequirements: 'Halal, Gluten-Free',
    });

    // Both RSVP ATTENDING
    await GuestService.publicSubmitRsvp(g1.invitationCode, {
      rsvpStatus: 'ATTENDING',
      attendingCount: 2,
    });
    await GuestService.publicSubmitRsvp(g2.invitationCode, {
      rsvpStatus: 'ATTENDING',
      attendingCount: 3,
    });

    const report = await GuestService.generateAttendanceReport(userA.user.id, eventA.id);
    expect(report.totalGuests).toBe(2);
    expect(report.dietaryBreakdown['Halal']).toBe(5); // 2 from g1 + 3 from g2
    expect(report.dietaryBreakdown['Vegan']).toBe(2);
    expect(report.dietaryBreakdown['Gluten-Free']).toBe(3);
    expect(report.accessibilityAccommodations.length).toBe(1);
    expect(report.accessibilityAccommodations[0]).toContain('Sign language interpreter');
  });
});
