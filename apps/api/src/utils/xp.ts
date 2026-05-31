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
