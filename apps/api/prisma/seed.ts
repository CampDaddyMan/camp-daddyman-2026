import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Camp DaddyMan database...');

  // ── Creators ───────────────────────────────────────────────────────────────

  const hash = (pw: string) => bcrypt.hash(pw, 10);

  const [daddyman, , kingsword, truthspeaker] = await Promise.all([
    prisma.user.upsert({
      where: { username: 'daddyman' },
      update: {},
      create: {
        username:    'daddyman',
        email:       process.env.ADMIN_EMAIL || 'campdaddyman@gmail.com',
        password:    await hash('Camp2026!'),
        displayName: 'DaddyMan',
        bio:         'Discipline. Identity. Legacy. Est. 2023. Founder of Camp DaddyMan.',
        isCreator:   true,
        isAdmin:     true,
        emailVerified: true,
        subscription: {
          create: { plan: 'PREMIUM', status: 'ACTIVE' },
        },
      },
    }),
    prisma.user.upsert({
      where: { username: 'cdm-tester' },
      update: {},
      create: {
        username:    'cdm-tester',
        email:       process.env.TESTER_EMAIL || 'tester@campdaddyman.com',
        password:    await hash('Test2026!'),
        displayName: 'CDM Tester',
        isAdmin:     true,
        isTester:    true,
        emailVerified: true,
        subscription: {
          create: { plan: 'PREMIUM', status: 'ACTIVE' },
        },
      },
    }),
    prisma.user.upsert({
      where: { username: 'kingsword' },
      update: {},
      create: {
        username:    'kingsword',
        email:       'kingsword@campdaddyman.com',
        password:    await hash('Camp2026!'),
        displayName: 'King Sword',
        bio:         'Gospel rap. Kingdom music. Building legacy through sound.',
        isCreator:   true,
        emailVerified: true,
        subscription: {
          create: { plan: 'PRO', status: 'ACTIVE' },
        },
      },
    }),
    prisma.user.upsert({
      where: { username: 'truthspeaker' },
      update: {},
      create: {
        username:    'truthspeaker',
        email:       'truthspeaker@campdaddyman.com',
        password:    await hash('Camp2026!'),
        displayName: 'Truth Speaker',
        bio:         'Long-form conversations about fatherhood, identity, and purpose.',
        isCreator:   true,
        emailVerified: true,
        subscription: {
          create: { plan: 'PRO', status: 'ACTIVE' },
        },
      },
    }),
  ]);

  console.log('  Created creators:', daddyman.username, kingsword.username, truthspeaker.username);
  console.log('  Note: cdm-tester account seeded separately (admin-tester role)');

  // ── Content ────────────────────────────────────────────────────────────────

  const music = await Promise.all([
    prisma.content.upsert({
      where: { id: 'seed-music-001' },
      update: { thumbnailUrl: '/images/thumbnails/CampDaddyman_Media_Music_Descipline_Walk.jpg' },
      create: {
        id: 'seed-music-001',
        title: 'Discipline Walk',
        description: 'The opening track from the Camp DaddyMan debut project. Built for early mornings and late nights.',
        type: 'MUSIC', status: 'ACTIVE', privacy: 'PUBLIC',
        duration: 272, views: 4812,
        tags: ['hip-hop', 'discipline', 'original'],
        thumbnailUrl: '/images/thumbnails/CampDaddyman_Media_Music_Descipline_Walk.jpg',
        creatorId: daddyman.id,
      },
    }),
    prisma.content.upsert({
      where: { id: 'seed-music-002' },
      update: {},
      create: {
        id: 'seed-music-002',
        title: 'Crown Season',
        description: 'Members-only drop. The album cut with extended verse and alternate outro.',
        type: 'MUSIC', status: 'ACTIVE', privacy: 'SUBSCRIBERS_ONLY',
        duration: 225, views: 1930,
        tags: ['hip-hop', 'exclusive', 'album'],
        creatorId: daddyman.id,
      },
    }),
    prisma.content.upsert({
      where: { id: 'seed-music-003' },
      update: { thumbnailUrl: '/images/thumbnails/CampDaddyman_Media_Fathers_Anthem.jpg' },
      create: {
        id: 'seed-music-003',
        title: "Father's Anthem",
        description: 'A tribute to fatherhood — the most important role a man can carry.',
        type: 'MUSIC', status: 'ACTIVE', privacy: 'PUBLIC',
        duration: 310, views: 3201,
        tags: ['gospel-rap', 'fatherhood', 'kingdom'],
        thumbnailUrl: '/images/thumbnails/CampDaddyman_Media_Fathers_Anthem.jpg',
        creatorId: kingsword.id,
      },
    }),
    prisma.content.upsert({
      where: { id: 'seed-music-004' },
      update: {},
      create: {
        id: 'seed-music-004',
        title: 'Identity Bars',
        description: 'Who are you when no one is watching? King Sword answers in bars.',
        type: 'MUSIC', status: 'ACTIVE', privacy: 'PUBLIC',
        duration: 202, views: 2744,
        tags: ['identity', 'rap', 'original'],
        creatorId: kingsword.id,
      },
    }),
    prisma.content.upsert({
      where: { id: 'seed-music-005' },
      update: {},
      create: {
        id: 'seed-music-005',
        title: 'Legacy Sound',
        description: 'Instrumental. No words needed — the beat carries the message.',
        type: 'MUSIC', status: 'ACTIVE', privacy: 'PUBLIC',
        duration: 375, views: 1588,
        tags: ['instrumental', 'legacy', 'beats'],
        creatorId: daddyman.id,
      },
    }),
    prisma.content.upsert({
      where: { id: 'seed-music-006' },
      update: {},
      create: {
        id: 'seed-music-006',
        title: 'Kingdom Keys (Members Cut)',
        description: 'Extended version with stripped-back vocals and full production breakdown.',
        type: 'MUSIC', status: 'ACTIVE', privacy: 'SUBSCRIBERS_ONLY',
        duration: 248, views: 987,
        tags: ['gospel', 'exclusive', 'kingdom'],
        creatorId: kingsword.id,
      },
    }),
  ]);

  const films = await Promise.all([
    prisma.content.upsert({
      where: { id: 'seed-film-001' },
      update: { thumbnailUrl: '/images/thumbnails/CampDaddyman_Media_Documentary_The_Camp.jpg' },
      create: {
        id: 'seed-film-001',
        title: 'The Camp Documentary',
        description: 'An inside look at how Camp DaddyMan was built — the vision, the struggle, and the community.',
        type: 'FILM', status: 'ACTIVE', privacy: 'PUBLIC',
        duration: 2520, views: 6103,
        tags: ['documentary', 'camp', 'origin-story'],
        thumbnailUrl: '/images/thumbnails/CampDaddyman_Media_Documentary_The_Camp.jpg',
        creatorId: daddyman.id,
      },
    }),
    prisma.content.upsert({
      where: { id: 'seed-film-002' },
      update: {},
      create: {
        id: 'seed-film-002',
        title: 'Identity Crisis',
        description: 'Short film. A man on the edge of two worlds — who does he choose to be?',
        type: 'FILM', status: 'ACTIVE', privacy: 'SUBSCRIBERS_ONLY',
        duration: 1110, views: 2234,
        tags: ['short-film', 'identity', 'drama'],
        creatorId: daddyman.id,
      },
    }),
    prisma.content.upsert({
      where: { id: 'seed-film-003' },
      update: { thumbnailUrl: '/images/thumbnails/CampDaddyman_Media_Father_Figures.jpg' },
      create: {
        id: 'seed-film-003',
        title: 'Father Figures',
        description: 'A documentary short exploring what it means to be a present father in today\'s world.',
        type: 'FILM', status: 'ACTIVE', privacy: 'PUBLIC',
        duration: 1335, views: 3877,
        tags: ['documentary', 'fatherhood', 'men'],
        thumbnailUrl: '/images/thumbnails/CampDaddyman_Media_Father_Figures.jpg',
        creatorId: kingsword.id,
      },
    }),
    prisma.content.upsert({
      where: { id: 'seed-film-004' },
      update: {},
      create: {
        id: 'seed-film-004',
        title: 'The Legacy Project',
        description: 'What will you leave behind? A visual meditation on building something that outlasts you.',
        type: 'FILM', status: 'ACTIVE', privacy: 'PUBLIC',
        duration: 945, views: 1654,
        tags: ['short-film', 'legacy', 'visuals'],
        creatorId: daddyman.id,
      },
    }),
  ]);

  const podcasts = await Promise.all([
    prisma.content.upsert({
      where: { id: 'seed-podcast-001' },
      update: {},
      create: {
        id: 'seed-podcast-001',
        title: 'Discipline Daily — Episode 1',
        description: 'The first episode. Why discipline isn\'t punishment — and why most men confuse the two.',
        type: 'PODCAST', status: 'ACTIVE', privacy: 'PUBLIC',
        duration: 3500, views: 5421,
        tags: ['discipline', 'mindset', 'ep1'],
        creatorId: truthspeaker.id,
      },
    }),
    prisma.content.upsert({
      where: { id: 'seed-podcast-002' },
      update: {},
      create: {
        id: 'seed-podcast-002',
        title: 'The DaddyMan Talks: Identity (Members)',
        description: 'Full unedited session. DaddyMan breaks down the Identity pillar — where it comes from and how to build it.',
        type: 'PODCAST', status: 'ACTIVE', privacy: 'SUBSCRIBERS_ONLY',
        duration: 4554, views: 1832,
        tags: ['identity', 'daddyman', 'exclusive'],
        creatorId: daddyman.id,
      },
    }),
    prisma.content.upsert({
      where: { id: 'seed-podcast-003' },
      update: {},
      create: {
        id: 'seed-podcast-003',
        title: 'Building Your Legacy',
        description: 'Step-by-step conversation on what legacy actually looks like in daily life — not just big moments.',
        type: 'PODCAST', status: 'ACTIVE', privacy: 'PUBLIC',
        duration: 2730, views: 3109,
        tags: ['legacy', 'purpose', 'daily'],
        creatorId: truthspeaker.id,
      },
    }),
    prisma.content.upsert({
      where: { id: 'seed-podcast-004' },
      update: { thumbnailUrl: '/images/thumbnails/CampDaddyman_Media_Fatherhood_In_2026.jpg' },
      create: {
        id: 'seed-podcast-004',
        title: 'Fatherhood in 2025',
        description: 'The culture is against fathers. Here\'s how to be one anyway.',
        type: 'PODCAST', status: 'ACTIVE', privacy: 'PUBLIC',
        duration: 2295, views: 4088,
        tags: ['fatherhood', 'culture', 'men'],
        thumbnailUrl: '/images/thumbnails/CampDaddyman_Media_Fatherhood_In_2026.jpg',
        creatorId: daddyman.id,
      },
    }),
  ]);

  const spokenWord = await Promise.all([
    prisma.content.upsert({
      where: { id: 'seed-spoken-001' },
      update: { thumbnailUrl: '/images/thumbnails/CampDaddyman_Media_Who_I_Am.jpg' },
      create: {
        id: 'seed-spoken-001',
        title: 'Who I Am',
        description: 'A declaration. Written at 3am and performed once. This is the version.',
        type: 'SPOKEN_WORD', status: 'ACTIVE', privacy: 'PUBLIC',
        duration: 262, views: 3344,
        tags: ['spoken-word', 'identity', 'poetry'],
        thumbnailUrl: '/images/thumbnails/CampDaddyman_Media_Who_I_Am.jpg',
        creatorId: daddyman.id,
      },
    }),
    prisma.content.upsert({
      where: { id: 'seed-spoken-002' },
      update: { thumbnailUrl: '/images/thumbnails/CampDaddyman_Media_To_My_Sons.jpg' },
      create: {
        id: 'seed-spoken-002',
        title: 'To My Sons',
        description: 'Members only. Written for the next generation — a letter in verse.',
        type: 'SPOKEN_WORD', status: 'ACTIVE', privacy: 'SUBSCRIBERS_ONLY',
        duration: 375, views: 1211,
        tags: ['spoken-word', 'fatherhood', 'legacy'],
        thumbnailUrl: '/images/thumbnails/CampDaddyman_Media_To_My_Sons.jpg',
        creatorId: daddyman.id,
      },
    }),
    prisma.content.upsert({
      where: { id: 'seed-spoken-003' },
      update: { thumbnailUrl: '/images/thumbnails/CampDaddyman_Media_Video_The_Crown_Speaks.jpg' },
      create: {
        id: 'seed-spoken-003',
        title: 'The Crown Speaks',
        description: 'King Sword in spoken word form — raw, no production, just the word.',
        type: 'SPOKEN_WORD', status: 'ACTIVE', privacy: 'PUBLIC',
        duration: 228, views: 1876,
        tags: ['spoken-word', 'kingdom', 'raw'],
        thumbnailUrl: '/images/thumbnails/CampDaddyman_Media_Video_The_Crown_Speaks.jpg',
        creatorId: kingsword.id,
      },
    }),
  ]);

  const daddymanIsms = await Promise.all([
    prisma.content.upsert({
      where: { id: 'seed-ism-001' },
      update: { thumbnailUrl: '/images/thumbnails/CampDaddyman_Media_DaddyManIsms.jpg' },
      create: {
        id: 'seed-ism-001',
        title: 'Discipline is not punishment.',
        description: 'Most men fear discipline because they were raised to see it as a weapon. Discipline is a gift you give yourself — the proof that you trust your own future.',
        type: 'DADDYMAN_ISMS', status: 'ACTIVE', privacy: 'PUBLIC',
        duration: 0, views: 2187,
        tags: ['discipline', 'mindset', 'teaching'],
        thumbnailUrl: '/images/thumbnails/CampDaddyman_Media_DaddyManIsms.jpg',
        cardAspect: 'square',
        cardWidth: 280,
        creatorId: daddyman.id,
      },
    }),
    prisma.content.upsert({
      where: { id: 'seed-ism-002' },
      update: { thumbnailUrl: '/images/thumbnails/CampDaddyman_Media_DaddyManIsms.jpg' },
      create: {
        id: 'seed-ism-002',
        title: 'You cannot lead where you have not been.',
        description: 'A father who has never faced himself cannot guide his son through the wilderness. Do the work first.',
        type: 'DADDYMAN_ISMS', status: 'ACTIVE', privacy: 'PUBLIC',
        duration: 0, views: 1943,
        tags: ['fatherhood', 'legacy', 'parable'],
        thumbnailUrl: '/images/thumbnails/CampDaddyman_Media_DaddyManIsms.jpg',
        cardAspect: 'square',
        cardWidth: 280,
        creatorId: daddyman.id,
      },
    }),
    prisma.content.upsert({
      where: { id: 'seed-ism-003' },
      update: { thumbnailUrl: '/images/thumbnails/CampDaddyman_Media_DaddyManIsms.jpg' },
      create: {
        id: 'seed-ism-003',
        title: 'Identity is not found. It is forged.',
        description: "The world will tell you who you are every single day. Stop listening. Identity doesn't fall from the sky — you build it, one decision at a time.",
        type: 'DADDYMAN_ISMS', status: 'ACTIVE', privacy: 'PUBLIC',
        duration: 0, views: 3102,
        tags: ['identity', 'teaching', 'wisdom'],
        thumbnailUrl: '/images/thumbnails/CampDaddyman_Media_DaddyManIsms.jpg',
        cardAspect: 'square',
        cardWidth: 280,
        creatorId: daddyman.id,
      },
    }),
  ]);

  const allContent = [...music, ...films, ...podcasts, ...spokenWord, ...daddymanIsms];
  console.log(`  Created ${allContent.length} content items`);

  // ── Follows ────────────────────────────────────────────────────────────────

  await Promise.all([
    prisma.follow.upsert({
      where: { followerId_followingId: { followerId: kingsword.id,     followingId: daddyman.id } },
      update: {},
      create: { followerId: kingsword.id,     followingId: daddyman.id },
    }),
    prisma.follow.upsert({
      where: { followerId_followingId: { followerId: truthspeaker.id,  followingId: daddyman.id } },
      update: {},
      create: { followerId: truthspeaker.id,  followingId: daddyman.id },
    }),
    prisma.follow.upsert({
      where: { followerId_followingId: { followerId: daddyman.id,      followingId: kingsword.id } },
      update: {},
      create: { followerId: daddyman.id,      followingId: kingsword.id },
    }),
    prisma.follow.upsert({
      where: { followerId_followingId: { followerId: daddyman.id,      followingId: truthspeaker.id } },
      update: {},
      create: { followerId: daddyman.id,      followingId: truthspeaker.id },
    }),
  ]);

  console.log('  Created follow relationships');
  console.log('\nSeed complete.');
  console.log('\nLogin credentials:');
  console.log('  [ADMIN EMAIL] / Camp2026!  (daddyman — admin)');
  console.log('  cdm-tester / Test2026!  (admin-tester — multi-device)');
  console.log('  kingsword@campdaddyman.com / Camp2026!');
  console.log('  truthspeaker@campdaddyman.com / Camp2026!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
