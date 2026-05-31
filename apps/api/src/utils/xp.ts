import { prisma } from '../config/database';

export const XP_VALUES = {
  LIKE:     2,
  COMMENT:  5,
  FOLLOW:   10,
  WATCH:    10,
  PURCHASE: 25,
} as const;

export type XpEventType = keyof typeof XP_VALUES;

export const LEVELS = [
  { name: 'The Egg',        min: 0,    max: 99   },
  { name: 'The Caterpillar', min: 100,  max: 499  },
  { name: 'The Chrysalis',  min: 500,  max: 1999 },
  { name: 'The Butterfly',  min: 2000, max: Infinity },
] as const;

export function getLevel(xp: number) {
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].min) idx = i;
  }
  const level = LEVELS[idx];
  const next  = LEVELS[idx + 1] ?? null;
  const progress = next
    ? (xp - level.min) / (next.min - level.min)
    : 1;
  return {
    index:         idx + 1,
    name:          level.name,
    nextName:      next?.name ?? null,
    currentMin:    level.min,
    nextMin:       next?.min ?? null,
    progress:      Math.min(progress, 1),
  };
}

/** Fire-and-forget streak update. Increments for a new day, resets on a missed day. Never throws. */
export function updateStreak(userId: string) {
  (async () => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { currentStreak: true, longestStreak: true, lastStreakDate: true },
    });
    if (!user) return;

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const last = user.lastStreakDate ? new Date(user.lastStreakDate) : null;
    if (last) last.setUTCHours(0, 0, 0, 0);

    // Already logged today
    if (last && last.getTime() === today.getTime()) return;

    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);

    const newStreak = last && last.getTime() === yesterday.getTime()
      ? user.currentStreak + 1   // consecutive day
      : 1;                        // first time or missed a day

    await prisma.user.update({
      where: { id: userId },
      data: {
        currentStreak: newStreak,
        longestStreak: Math.max(user.longestStreak, newStreak),
        lastStreakDate: today,
      },
    });
  })().catch(() => {});
}

/** Fire-and-forget — awards xp once per (userId, type, refId). Never throws. */
export function awardXp(userId: string, type: XpEventType, refId: string) {
  const xp = XP_VALUES[type];
  prisma.$transaction([
    prisma.userXpEvent.create({ data: { userId, type, refId, xp } }),
    prisma.user.update({ where: { id: userId }, data: { xp: { increment: xp } } }),
  ]).catch(() => {
    // P2002 unique constraint = already awarded; other errors silently ignored
  });
}
