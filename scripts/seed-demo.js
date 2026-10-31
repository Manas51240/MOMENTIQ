/**
 * MOMENTIQ — Production & Demo Seeder
 * Populates essential demo users and rich showcase celebrations for Vercel deployment.
 */
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

const SCRYPT_KEYLEN = 64;
const SCRYPT_PARAMS = {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 32 * 1024 * 1024,
};

function hashPasswordSync(password, salt) {
  const derivedKey = crypto.scryptSync(password, salt, SCRYPT_KEYLEN, SCRYPT_PARAMS);
  return derivedKey.toString('hex');
}

async function main() {
  console.log('[Seed] Seeding MOMENTIQ demo data...');

  const demoEmail = 'demo@momentiq.com';
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPasswordSync('Password123!', salt);

  // 1. Upsert Demo User
  const user = await prisma.user.upsert({
    where: { email: demoEmail },
    update: {
      name: 'MOMENTIQ Organizer',
      passwordHash,
      salt,
      role: 'ADMIN',
    },
    create: {
      name: 'MOMENTIQ Organizer',
      email: demoEmail,
      passwordHash,
      salt,
      role: 'ADMIN',
      emailVerified: true,
    },
  });

  console.log(`[Seed] Demo user ready: ${user.email} (ID: ${user.id})`);

  // 2. Upsert Showcase Wedding Celebration
  const weddingSlug = 'aurora-liam-vineyard-wedding';
  const wedding = await prisma.event.upsert({
    where: { slug: weddingSlug },
    update: {},
    create: {
      slug: weddingSlug,
      title: "Aurora & Liam's Grand Vineyard Wedding",
      description: 'A romantic outdoor vineyard celebration with sunset ceremony, live acoustic quartet, and bespoke farm-to-table cuisine.',
      eventType: 'WEDDING',
      startDate: new Date('2026-11-20T16:00:00Z'),
      endDate: new Date('2026-11-20T23:30:00Z'),
      venue: 'Meadowood Napa Valley Estate',
      city: 'St. Helena, California',
      country: 'USA',
      guestTarget: 150,
      budgetMinor: 4500000n, // $45,000.00
      currency: 'USD',
      status: 'PLANNING',
      ownerId: user.id,
    },
  });

  // Ensure owner is added to event members
  await prisma.eventMember.upsert({
    where: {
      eventId_userId: {
        eventId: wedding.id,
        userId: user.id,
      },
    },
    update: { role: 'OWNER' },
    create: {
      eventId: wedding.id,
      userId: user.id,
      role: 'OWNER',
    },
  });

  // Seed Budget Categories & Expenses for Wedding
  const cateringCat = await prisma.budgetCategory.upsert({
    where: { id: `cat-catering-${wedding.id}` },
    update: {},
    create: {
      id: `cat-catering-${wedding.id}`,
      eventId: wedding.id,
      name: 'Catering & Beverages',
      allocatedMinor: 1800000n,
      spentMinor: 1400000n,
    },
  });

  const photoCat = await prisma.budgetCategory.upsert({
    where: { id: `cat-photo-${wedding.id}` },
    update: {},
    create: {
      id: `cat-photo-${wedding.id}`,
      eventId: wedding.id,
      name: 'Photography & Cinema',
      allocatedMinor: 800000n,
      spentMinor: 650000n,
    },
  });

  await prisma.expense.createMany({
    data: [
      {
        id: `exp-catering-${wedding.id}`,
        eventId: wedding.id,
        categoryId: cateringCat.id,
        title: 'Artisan 4-Course Plated Dinner',
        baseAmountMinor: 1400000n,
        amountMinor: 1400000n,
        currency: 'USD',
        status: 'COMPLETED',
        notes: 'Includes wine pairings and passed hors d\'oeuvres',
      },
      {
        id: `exp-photo-${wedding.id}`,
        eventId: wedding.id,
        categoryId: photoCat.id,
        title: 'Full-Day Photo & Drone Coverage',
        baseAmountMinor: 650000n,
        amountMinor: 650000n,
        currency: 'USD',
        status: 'PARTIAL',
        notes: '2 photographers, full color grading, highlight reel',
      },
    ],
  }).catch(() => {});

  // Seed Timeline Tasks
  await prisma.task.createMany({
    data: [
      {
        id: `task-1-${wedding.id}`,
        eventId: wedding.id,
        title: 'Final Floral Mockup Approval',
        description: 'Review ceremony arch and tablescape floral centerpieces',
        status: 'COMPLETED',
        priority: 'HIGH',
        dueDate: new Date('2026-11-05T12:00:00Z'),
        isMilestone: true,
      },
      {
        id: `task-2-${wedding.id}`,
        eventId: wedding.id,
        title: 'Rehearsal Dinner Walkthrough',
        description: 'Sound check with live quartet and bridal party positioning',
        status: 'IN_PROGRESS',
        priority: 'CRITICAL',
        dueDate: new Date('2026-11-19T17:00:00Z'),
        isMilestone: true,
      },
      {
        id: `task-3-${wedding.id}`,
        eventId: wedding.id,
        title: 'Guest Transportation Shuttle Confirmation',
        description: 'Coordinate luxury coach departures from hotel to estate',
        status: 'TODO',
        priority: 'MEDIUM',
        dueDate: new Date('2026-11-15T10:00:00Z'),
        isMilestone: false,
      },
    ],
  }).catch(() => {});

  // Seed Risks
  await prisma.riskItem.createMany({
    data: [
      {
        id: `risk-1-${wedding.id}`,
        eventId: wedding.id,
        category: 'Weather',
        title: 'Late Afternoon Autumn Rain Shower',
        description: 'Outdoor vineyard lawn may become damp during ceremony.',
        probability: 2,
        impact: 4,
        riskScore: 8,
        severity: 'MEDIUM',
        mitigation: 'Covered glass pavilion on standby with heating lamps.',
        contingency: 'Pivot ceremony to heated glass pavilion within 30 minutes.',
        ownerName: 'Estate Coordinator',
        status: 'MITIGATED',
      },
      {
        id: `risk-2-${wedding.id}`,
        eventId: wedding.id,
        category: 'Vendors',
        title: 'Custom Wine Delivery Delay',
        description: 'Special reserve vintage shipment from Sonoma.',
        probability: 1,
        impact: 3,
        riskScore: 3,
        severity: 'LOW',
        mitigation: 'Confirmed tracking; backup estate cellar selections reserved.',
        contingency: 'Serve estate reserve Cabernet.',
        ownerName: 'Lead Sommelier',
        status: 'IDENTIFIED',
      },
    ],
  }).catch(() => {});

  // Seed Guests
  await prisma.guest.createMany({
    data: [
      {
        id: `guest-1-${wedding.id}`,
        eventId: wedding.id,
        name: 'Eleanor Vance',
        email: 'eleanor.vance@example.com',
        rsvpStatus: 'ATTENDING',
        attendingCount: 2,
        dietaryRequirements: 'Gluten-Free',
        invitationCode: 'CELEB-DEMO-01',
      },
      {
        id: `guest-2-${wedding.id}`,
        eventId: wedding.id,
        name: 'Julian Sterling',
        email: 'julian.sterling@example.com',
        rsvpStatus: 'ATTENDING',
        attendingCount: 1,
        dietaryRequirements: 'None',
        invitationCode: 'CELEB-DEMO-02',
      },
      {
        id: `guest-3-${wedding.id}`,
        eventId: wedding.id,
        name: 'Sophia Montgomery',
        email: 'sophia.m@example.com',
        rsvpStatus: 'PENDING',
        attendingCount: 2,
        dietaryRequirements: 'Vegetarian',
        invitationCode: 'CELEB-DEMO-03',
      },
    ],
  }).catch(() => {});

  // 3. Upsert Showcase Birthday Celebration
  const birthdaySlug = 'marcus-40th-rooftop-jubilee';
  const birthday = await prisma.event.upsert({
    where: { slug: birthdaySlug },
    update: {},
    create: {
      slug: birthdaySlug,
      title: "Marcus's 40th Rooftop Jubilee",
      description: 'An electrifying skyline birthday celebration featuring craft mixology, live funk DJ, and panoramic sunset views.',
      eventType: 'BIRTHDAY',
      startDate: new Date('2026-12-12T19:00:00Z'),
      endDate: new Date('2026-12-13T01:00:00Z'),
      venue: 'Penthouse 88 Sky Lounge',
      city: 'Manhattan, New York',
      country: 'USA',
      guestTarget: 80,
      budgetMinor: 1500000n, // $15,000.00
      currency: 'USD',
      status: 'ACTIVE',
      ownerId: user.id,
    },
  });

  await prisma.eventMember.upsert({
    where: {
      eventId_userId: {
        eventId: birthday.id,
        userId: user.id,
      },
    },
    update: { role: 'OWNER' },
    create: {
      eventId: birthday.id,
      userId: user.id,
      role: 'OWNER',
    },
  });

  console.log('[Seed] Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('[Seed] Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
