import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/auth';

// ── Seed data — Days 1-3 ──────────────────────────────────────────────────────

export const SEED_DAYS = [
  {
    dayNumber: 1,
    phase: 'EGG',
    title: 'Welcome to the Ark',
    lie: "I don't matter.",
    truth: 'You do.',
    body: `Before we begin—

We don't know your name.

We don't know what city you're in, or what it cost you to get through today.

We don't know who hurt you.

We don't know who you hurt.

We don't know what you've tried and abandoned.

We don't know what they said about you when you weren't in the room.

We don't know what you say about yourself when no one else can hear.

But we know you're here.

And we know that matters.

—

You didn't come here because life is going well.

People don't find the Ark when everything is fine.

They find it when something in them is restless.

When the thing they've been carrying gets too heavy to carry quietly.

When the version of themselves that could have been keeps knocking.

—

There is a version of you the world has not seen yet.

Not a better you. Not a fixed you.

The one that was there before the damage.

Before the first time someone looked at you and found you wanting.

Before you learned to agree with them.

—

A butterfly is not built after the chrysalis.

It was hidden inside the caterpillar all along.

The wings were already there.

Sleeping.

Waiting.

—

We're not asking you to believe that today.

We're asking you to consider it possible.`,
    daddyManism: 'Di wings did inna yuh di whole time.',
    reflectionPrompt: 'What is one good thing about yourself that you stopped believing somewhere along the way? Not a skill. Not an achievement. A quality. Something about who you are.',
    challengePrompt: "Write down one thing you've done — in your whole life — that you're proud of. Not for anyone else. For yourself. If you can't think of one, write about a time you kept going when you could have stopped. That counts.",
    livityPrompt: "Encourage one person today before you sleep. Not because they earned it. Not because they asked. Because someone once needed exactly what you're about to give — and nobody came. You can be the one who comes.",
    journalPrompt: 'What have you stopped allowing yourself to hope for?',
    closingText: "You are not here to become someone else.\n\nYou are here to find out who was inside you all along.\n\n—\n\nSomebody tended this field before you arrived.\n\nOne day, someone will say the same of you.\n\nEvery forest begins with something small that stayed.",
    published: true,
  },
  {
    dayNumber: 2,
    phase: 'EGG',
    title: 'The Seed',
    lie: "Nothing I do matters.",
    truth: 'It does.',
    body: `You came back.

That's the first thing.

Some people read Day 1 and felt something shift.

Some felt nothing.

Some felt worse — because being seen can be more frightening than being invisible, if being seen has never been safe.

All of that is fine.

You came back.

That is the seed.

—

Most lives don't change because of breakthroughs.

They change because of something far less dramatic:

One small action, taken before the feeling arrives.

Fields don't grow from miracles.

Fields grow from seeds.

Seeds that look like nothing when they go in the ground.

Seeds that feel like nothing.

Seeds that go silent for weeks before anything shows.

Most seeds look ridiculous when they're planted.

But forests begin this way.

Movements begin this way.

Lives begin this way.

You do not have to change your whole life today.

You only have to plant one thing.`,
    daddyManism: 'Plant di seed before di season tell yuh to.',
    reflectionPrompt: "Where in your life have you stopped trying because you decided small actions don't count?",
    challengePrompt: "Choose one small action you've been avoiding. Something that can be completed in fifteen minutes or less. Do it before this day ends. Do not wait for motivation. Do not wait for confidence. The feeling comes after the seed is planted. Not before.",
    livityPrompt: "Do one helpful thing for someone today without telling anyone you did it. Not for recognition. Not for praise. The act is real whether anyone witnesses it or not. Log it here truthfully.",
    journalPrompt: 'What seed did I plant today?',
    closingText: "You are not here to change the world today.\n\nYou are here to plant one thing.\n\nA year from now, you may not remember this moment.\n\nBut the tree will.\n\nEvery forest begins with something small that stayed.",
    published: true,
  },
  {
    dayNumber: 3,
    phase: 'EGG',
    title: 'The Weight',
    lie: "I'm alone in this.",
    truth: 'You are not the first.',
    body: `There is a particular kind of alone that nobody talks about.

Not the kind that comes from being by yourself.

The kind that comes from being surrounded by people and still carrying something nobody else seems to see.

Where everyone around you is functioning — laughing, working, moving through their days —

and you are performing functioning while something else happens underneath.

If you know that feeling, this day is for you.

—

You are not the first person to carry it.

You are not an aberration.

You are not uniquely broken.

The Ark exists because people who carried heavy things refused to let those things have the final word.

They didn't find their way by becoming less alone.

They found it by discovering that the loneliness wasn't proof of their worthlessness.

It was just a feeling.

And underneath it — a lie.

The lie is this: the fact that I feel alone means something is wrong with me.

There isn't.

It means you're carrying something real.

Real things are heavy.`,
    daddyManism: 'Di heaviest load is di one nobody know yuh carrying.',
    reflectionPrompt: "When was the last time someone truly understood what you were carrying? Not what you showed them. What you were actually carrying.",
    challengePrompt: "Tell one true thing to one person today. Not all of it. Not the deepest thing. Just one thing that is real, that you haven't said out loud.",
    livityPrompt: "Ask one person how they're actually doing. Not as a greeting. As a question. Wait for the real answer.",
    journalPrompt: "What am I carrying that I've never said out loud?",
    closingText: "You are not the first to carry this.\n\nYou will not be the last.\n\nBut today — you carried it forward.\n\nAnd the field remembers every step.",
    published: true,
  },
];

// ── Seed utility (called once on startup if DB is empty) ──────────────────────

export async function seedJourneyDays() {
  const count = await prisma.journeyDay.count();
  if (count > 0) return;
  await prisma.journeyDay.createMany({ data: SEED_DAYS, skipDuplicates: true });
  console.log('[Journey] Seeded Days 1-3');
}

// ── User: get or start journey ────────────────────────────────────────────────

export async function getMyJourney(req: AuthRequest, res: Response) {
  const userId = req.user!.id;

  let userJourney = await prisma.userJourney.findUnique({ where: { userId } });

  // Not started yet — return null so frontend shows the start screen
  if (!userJourney) {
    return res.json({ started: false });
  }

  // Calculate which day they're on based on entries and time
  const dayNumber = userJourney.currentDay;

  const [day, entry] = await Promise.all([
    prisma.journeyDay.findUnique({
      where: { dayNumber },
      select: {
        dayNumber: true, phase: true, title: true, lie: true, truth: true,
        body: true, daddyManism: true, reflectionPrompt: true,
        challengePrompt: true, livityPrompt: true, journalPrompt: true,
        closingText: true, published: true,
      },
    }),
    prisma.journeyEntry.findUnique({
      where: { userId_dayNumber: { userId, dayNumber } },
    }),
  ]);

  if (!day || !day.published) {
    return res.json({
      started: true,
      dayNumber,
      day: null,
      entry: null,
      message: "This day is being written. Check back soon.",
    });
  }

  res.json({ started: true, dayNumber, day, entry });
}

// ── User: begin journey ───────────────────────────────────────────────────────

export async function beginJourney(req: AuthRequest, res: Response) {
  const userId = req.user!.id;

  const existing = await prisma.userJourney.findUnique({ where: { userId } });
  if (existing) return res.json({ journey: existing });

  const journey = await prisma.userJourney.create({
    data: { userId },
  });

  res.status(201).json({ journey });
}

// ── User: save entry (reflection / challenge / journal) ───────────────────────

export async function saveEntry(req: AuthRequest, res: Response) {
  const userId = req.user!.id;
  const { reflectionText, challengeText, journalText } = req.body;

  const userJourney = await prisma.userJourney.findUnique({ where: { userId } });
  if (!userJourney) return res.status(400).json({ error: 'Journey not started' });

  const dayNumber = userJourney.currentDay;

  const entry = await prisma.journeyEntry.upsert({
    where: { userId_dayNumber: { userId, dayNumber } },
    update: { reflectionText, challengeText, journalText },
    create: { userId, dayNumber, reflectionText, challengeText, journalText },
  });

  res.json({ entry });
}

// ── User: complete a day → unlock the next ────────────────────────────────────

export async function completeDay(req: AuthRequest, res: Response) {
  const userId = req.user!.id;

  const userJourney = await prisma.userJourney.findUnique({ where: { userId } });
  if (!userJourney) return res.status(400).json({ error: 'Journey not started' });

  const dayNumber = userJourney.currentDay;

  // Mark entry as completed
  const entry = await prisma.journeyEntry.upsert({
    where: { userId_dayNumber: { userId, dayNumber } },
    update: { completedAt: new Date() },
    create: { userId, dayNumber, completedAt: new Date() },
  });

  // Advance to next day
  const nextDay = dayNumber + 1;
  const nextExists = await prisma.journeyDay.findUnique({
    where: { dayNumber: nextDay },
    select: { dayNumber: true, published: true },
  });

  await prisma.userJourney.update({
    where: { userId },
    data: {
      currentDay: nextExists?.published ? nextDay : dayNumber,
      updatedAt: new Date(),
    },
  });

  res.json({ entry, nextDay: nextExists?.published ? nextDay : null });
}

// ── Admin: list all days ──────────────────────────────────────────────────────

export async function adminListDays(_req: Request, res: Response) {
  const days = await prisma.journeyDay.findMany({
    orderBy: { dayNumber: 'asc' },
    select: {
      id: true, dayNumber: true, phase: true, title: true,
      lie: true, truth: true, published: true, updatedAt: true,
      _count: { select: { entries: true } },
    },
  });
  res.json({ days });
}

// ── Admin: get single day ─────────────────────────────────────────────────────

export async function adminGetDay(req: Request, res: Response) {
  const day = await prisma.journeyDay.findUnique({
    where: { dayNumber: Number(req.params.day) },
  });
  if (!day) return res.status(404).json({ error: 'Day not found' });
  res.json({ day });
}

// ── Admin: create or update a day ────────────────────────────────────────────

export async function adminUpsertDay(req: Request, res: Response) {
  const { dayNumber, phase, title, lie, truth, body, daddyManism,
          reflectionPrompt, challengePrompt, livityPrompt, journalPrompt,
          closingText, published } = req.body;

  if (!dayNumber || !title || !body) {
    return res.status(400).json({ error: 'dayNumber, title, and body are required' });
  }

  const day = await prisma.journeyDay.upsert({
    where: { dayNumber: Number(dayNumber) },
    update: { phase, title, lie, truth, body, daddyManism, reflectionPrompt,
              challengePrompt, livityPrompt, journalPrompt, closingText,
              published: published ?? false, updatedAt: new Date() },
    create: { dayNumber: Number(dayNumber), phase: phase ?? 'EGG', title,
              lie: lie ?? '', truth: truth ?? '', body, daddyManism: daddyManism ?? '',
              reflectionPrompt: reflectionPrompt ?? '', challengePrompt: challengePrompt ?? '',
              livityPrompt: livityPrompt ?? '', journalPrompt: journalPrompt ?? '',
              closingText: closingText ?? '', published: published ?? false },
  });

  res.json({ day });
}

// ── Admin: delete a day ───────────────────────────────────────────────────────

export async function adminDeleteDay(req: Request, res: Response) {
  await prisma.journeyDay.delete({ where: { dayNumber: Number(req.params.day) } });
  res.json({ ok: true });
}
