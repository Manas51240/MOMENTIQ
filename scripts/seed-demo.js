/**
 * MOMENTIQ — Production & Demo Seeder
 * Populates essential demo users and rich showcase celebrations for Indian celebrations.
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
  console.log('[Seed] Seeding MOMENTIQ demo data (India / INR)...');

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

  // Clean up legacy USD events
  await prisma.event.deleteMany({
    where: { currency: 'USD' },
  }).catch(() => {});

  // 2. Upsert Showcase Wedding Celebration (INR)
  const weddingSlug = 'aarav-meera-royal-wedding';
  const wedding = await prisma.event.upsert({
    where: { slug: weddingSlug },
    update: {
      title: "Aarav & Meera's Royal Palace Wedding",
      description: 'A grand regal heritage celebration featuring Sangeet, traditional Vedic pheras, Sufi musical night, and authentic royal Rajasthani banquet.',
      eventType: 'WEDDING',
      venue: 'The Oberoi Udaivilas',
      city: 'Udaipur, Rajasthan',
      country: 'India',
      guestTarget: 350,
      budgetMinor: 250000000n, // ₹25,00,000.00 (25 Lakhs)
      currency: 'INR',
      status: 'PLANNING',
    },
    create: {
      slug: weddingSlug,
      title: "Aarav & Meera's Royal Palace Wedding",
      description: 'A grand regal heritage celebration featuring Sangeet, traditional Vedic pheras, Sufi musical night, and authentic royal Rajasthani banquet.',
      eventType: 'WEDDING',
      startDate: new Date('2026-11-20T16:00:00Z'),
      endDate: new Date('2026-11-21T02:30:00Z'),
      venue: 'The Oberoi Udaivilas',
      city: 'Udaipur, Rajasthan',
      country: 'India',
      guestTarget: 350,
      budgetMinor: 250000000n, // ₹25,00,000.00
      currency: 'INR',
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

  // Seed Budget Categories & Expenses for Wedding (in INR)
  const cateringCat = await prisma.budgetCategory.upsert({
    where: { id: `cat-catering-${wedding.id}` },
    update: {
      allocatedMinor: 100000000n, // ₹10,00,000
      spentMinor: 80000000n,
    },
    create: {
      id: `cat-catering-${wedding.id}`,
      eventId: wedding.id,
      name: 'Catering & Royal Sweets',
      allocatedMinor: 100000000n,
      spentMinor: 80000000n,
    },
  });

  const decorCat = await prisma.budgetCategory.upsert({
    where: { id: `cat-decor-${wedding.id}` },
    update: {
      allocatedMinor: 60000000n, // ₹6,00,000
      spentMinor: 50000000n,
    },
    create: {
      id: `cat-decor-${wedding.id}`,
      eventId: wedding.id,
      name: 'Mandap & Royal Floral Decor',
      allocatedMinor: 60000000n,
      spentMinor: 50000000n,
    },
  });

  const photoCat = await prisma.budgetCategory.upsert({
    where: { id: `cat-photo-${wedding.id}` },
    update: {
      allocatedMinor: 50000000n, // ₹5,00,000
      spentMinor: 35000000n,
    },
    create: {
      id: `cat-photo-${wedding.id}`,
      eventId: wedding.id,
      name: 'Photography & Cinema',
      allocatedMinor: 50000000n,
      spentMinor: 35000000n,
    },
  });

  await prisma.expense.createMany({
    data: [
      {
        id: `exp-catering-${wedding.id}`,
        eventId: wedding.id,
        categoryId: cateringCat.id,
        title: 'Authentic Royal Rajasthani Banquet & Mithai',
        baseAmountMinor: 80000000n,
        amountMinor: 80000000n,
        currency: 'INR',
        status: 'COMPLETED',
        notes: 'Includes traditional thali, live chaat counter, and Dal Baati Churma',
      },
      {
        id: `exp-decor-${wedding.id}`,
        eventId: wedding.id,
        categoryId: decorCat.id,
        title: 'Lakeside Mandap & Marigold Floral Chandelier',
        baseAmountMinor: 50000000n,
        amountMinor: 50000000n,
        currency: 'INR',
        status: 'COMPLETED',
        notes: 'Includes carved pillars, floating lotus pond, and ambient palace lighting',
      },
      {
        id: `exp-photo-${wedding.id}`,
        eventId: wedding.id,
        categoryId: photoCat.id,
        title: 'Cinematic 4K Wedding Film & Drone Coverage',
        baseAmountMinor: 35000000n,
        amountMinor: 35000000n,
        currency: 'INR',
        status: 'PARTIAL',
        notes: '3 cinematographers, traditional photobook, teaser trailer',
      },
    ],
  }).catch(() => {});

  // Seed Timeline Tasks
  await prisma.task.createMany({
    data: [
      {
        id: `task-1-${wedding.id}`,
        eventId: wedding.id,
        title: 'Mandap & Floral Arch Final Walkthrough',
        description: 'Verify fresh marigold and jasmine garlands with Udaipur florist',
        status: 'COMPLETED',
        priority: 'HIGH',
        dueDate: new Date('2026-11-05T12:00:00Z'),
        isMilestone: true,
      },
      {
        id: `task-2-${wedding.id}`,
        eventId: wedding.id,
        title: 'Sangeet Choreography & Audio Setup',
        description: 'Sound check with live Rajasthani folk troupe and Bollywood DJ',
        status: 'IN_PROGRESS',
        priority: 'CRITICAL',
        dueDate: new Date('2026-11-19T17:00:00Z'),
        isMilestone: true,
      },
      {
        id: `task-3-${wedding.id}`,
        eventId: wedding.id,
        title: 'Baraat Route & Dhol Tasha Procession Permit',
        description: 'Coordinate lakeside Baraat timing with hotel administration',
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
        title: 'Evening Lakeside Breeze & Cool Temperature',
        description: 'Lakeside temperature can drop after sunset in November.',
        probability: 3,
        impact: 3,
        riskScore: 9,
        severity: 'MEDIUM',
        mitigation: 'Outdoor patio heaters and bespoke pashmina shawls for guests.',
        contingency: 'Shift dinner to the enclosed palace courtyard if winds rise.',
        ownerName: 'Estate Coordinator',
        status: 'MITIGATED',
      },
      {
        id: `risk-2-${wedding.id}`,
        eventId: wedding.id,
        category: 'Transport',
        title: 'Udaipur Airport Arrival Congestion',
        description: 'Multiple flights arriving simultaneously on wedding eve.',
        probability: 2,
        impact: 3,
        riskScore: 6,
        severity: 'LOW',
        mitigation: 'Dedicated hospitality desk at airport with chartered AC coaches.',
        contingency: 'Standby fleet of backup Innova Crysta vehicles on call.',
        ownerName: 'Logistics Manager',
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
        name: 'Rohan Verma',
        email: 'rohan.verma@example.com',
        rsvpStatus: 'ATTENDING',
        attendingCount: 2,
        dietaryRequirements: 'Vegetarian',
        invitationCode: 'CELEB-DEMO-01',
      },
      {
        id: `guest-2-${wedding.id}`,
        eventId: wedding.id,
        name: 'Priya Iyer',
        email: 'priya.iyer@example.com',
        rsvpStatus: 'ATTENDING',
        attendingCount: 1,
        dietaryRequirements: 'Jain Vegetarian',
        invitationCode: 'CELEB-DEMO-02',
      },
      {
        id: `guest-3-${wedding.id}`,
        eventId: wedding.id,
        name: 'Vikramaditya Singhania',
        email: 'vikram.singhania@example.com',
        rsvpStatus: 'PENDING',
        attendingCount: 2,
        dietaryRequirements: 'None',
        invitationCode: 'CELEB-DEMO-03',
      },
    ],
  }).catch(() => {});

  // 3. Upsert Showcase Birthday Celebration (INR)
  const birthdaySlug = 'marcus-40th-skyline-jubilee';
  const birthday = await prisma.event.upsert({
    where: { slug: birthdaySlug },
    update: {
      title: "Marcus's 40th Skyline Jubilee",
      description: 'An electrifying skyline birthday celebration in Mumbai featuring live fusion music, craft mixology, and panoramic Arabian Sea views.',
      eventType: 'BIRTHDAY',
      venue: 'Aer Sky Lounge, Four Seasons',
      city: 'Mumbai, Maharashtra',
      country: 'India',
      guestTarget: 80,
      budgetMinor: 50000000n, // ₹5,00,000.00
      currency: 'INR',
      status: 'ACTIVE',
    },
    create: {
      slug: birthdaySlug,
      title: "Marcus's 40th Skyline Jubilee",
      description: 'An electrifying skyline birthday celebration in Mumbai featuring live fusion music, craft mixology, and panoramic Arabian Sea views.',
      eventType: 'BIRTHDAY',
      startDate: new Date('2026-12-12T19:00:00Z'),
      endDate: new Date('2026-12-13T01:00:00Z'),
      venue: 'Aer Sky Lounge, Four Seasons',
      city: 'Mumbai, Maharashtra',
      country: 'India',
      guestTarget: 80,
      budgetMinor: 50000000n, // ₹5,00,000.00
      currency: 'INR',
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

  console.log('[Seed] Seeding completed successfully (India / INR)!');
}

main()
  .catch((e) => {
    console.error('[Seed] Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
