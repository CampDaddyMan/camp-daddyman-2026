import { prisma } from '../config/database';

// ── XP ────────────────────────────────────────────────────────────────────────

export const XP_VALUES = {
  LIKE:     2,
  COMMENT:  5,
  FOLLOW:   10,
  WATCH:    10,
  PURCHASE: 25,
} as const;

export type XpEventType = keyof typeof XP_VALUES;

export const LEVELS = [
  { name: 'The Egg',         min: 0    },
  { name: 'The Caterpillar', min: 100  },
  { name: 'The Chrysalis',   min: 500  },
  { name: 'The Butterfly',   min: 2000 },
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
    index:      idx + 1,
    name:       level.name,
    nextName:   next?.name ?? null,
    currentMin: level.min,
    nextMin:    next?.min ?? null,
    progress:   Math.min(progress, 1),
  };
}

/** Fire-and-forget — awards xp once per (userId, type, refId). Checks level badges after. */
export function awardXp(userId: string, type: XpEventType, refId: string) {
  const xpAmount = XP_VALUES[type];
  prisma.$transaction([
    prisma.userXpEvent.create({ data: { userId, type, refId, xp: xpAmount } }),
    prisma.user.update({ where: { id: userId }, data: { xp: { increment: xpAmount } }, select: { xp: true } }),
  ]).then(([, user]) => {
    const newXp = (user as { xp: number }).xp;
    if (newXp >= 100)  tryAwardBadge(userId, 'LEVEL_CATERPILLAR').catch(() => {});
    if (newXp >= 500)  tryAwardBadge(userId, 'LEVEL_CHRYSALIS').catch(() => {});
    if (newXp >= 2000) tryAwardBadge(userId, 'LEVEL_BUTTERFLY').catch(() => {});
  }).catch(() => {});
}

// ── Streaks ───────────────────────────────────────────────────────────────────

/** Fire-and-forget streak update. Increments for a new day, resets on a missed day. */
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

    if (last && last.getTime() === today.getTime()) return;

    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);

    const newStreak = last && last.getTime() === yesterday.getTime()
      ? user.currentStreak + 1
      : 1;

    await prisma.user.update({
      where: { id: userId },
      data: {
        currentStreak: newStreak,
        longestStreak: Math.max(user.longestStreak, newStreak),
        lastStreakDate: today,
      },
    });

    if (newStreak >= 3)  tryAwardBadge(userId, 'STREAK_3').catch(() => {});
    if (newStreak >= 7)  tryAwardBadge(userId, 'STREAK_7').catch(() => {});
    if (newStreak >= 30) tryAwardBadge(userId, 'STREAK_30').catch(() => {});
  })().catch(() => {});
}

// ── Badges ────────────────────────────────────────────────────────────────────

export const BADGES: Record<string, { name: string; emoji: string; desc: string }> = {
  FIRST_WATCH:       { name: 'First Step',       emoji: '👁️',  desc: 'Watched your first piece of content' },
  FIRST_COMMENT:     { name: 'First Words',       emoji: '💬',  desc: 'Left your first comment' },
  FIRST_FOLLOW:      { name: 'First Connection',  emoji: '🤝',  desc: 'Followed your first creator' },
  FIRST_PURCHASE:    { name: 'First Purchase',    emoji: '🛒',  desc: 'Bought something from The Ark' },
  STREAK_3:          { name: 'On Fire',           emoji: '🔥',  desc: 'Kept a 3-day streak' },
  STREAK_7:          { name: 'In the Flow',       emoji: '🌊',  desc: 'Kept a 7-day streak' },
  STREAK_30:         { name: 'Camp Regular',      emoji: '🏕️', desc: 'Kept a 30-day streak' },
  LEVEL_CATERPILLAR: { name: 'The Caterpillar',   emoji: '🐛',  desc: 'Reached level 2 — still growing' },
  LEVEL_CHRYSALIS:   { name: 'The Chrysalis',     emoji: '🫘',  desc: 'Reached level 3 — transforming' },
  LEVEL_BUTTERFLY:   { name: 'The Butterfly',     emoji: '🦋',  desc: 'Reached level 4 — fully formed' },
  LIKES_10:          { name: 'Appreciator',       emoji: '❤️',  desc: 'Liked 10 pieces of content' },
  LIKES_50:          { name: 'Super Fan',         emoji: '💎',  desc: 'Liked 50 pieces of content' },
};

export type BadgeTrigger = 'WATCH' | 'COMMENT' | 'FOLLOW' | 'PURCHASE' | 'LIKE';

/** Fire-and-forget — checks and awards any newly earned badges for a given action. */
export function checkBadges(userId: string, trigger: BadgeTrigger) {
  (async () => {
    if (trigger === 'WATCH') {
      const count = await prisma.watchHistory.count({ where: { userId } });
      if (count >= 1) await tryAwardBadge(userId, 'FIRST_WATCH');
    }

    if (trigger === 'COMMENT') {
      const count = await prisma.comment.count({ where: { userId } });
      if (count >= 1) await tryAwardBadge(userId, 'FIRST_COMMENT');
    }

    if (trigger === 'FOLLOW') {
      const count = await prisma.follow.count({ where: { followerId: userId } });
      if (count >= 1) await tryAwardBadge(userId, 'FIRST_FOLLOW');
    }

    if (trigger === 'PURCHASE') {
      await tryAwardBadge(userId, 'FIRST_PURCHASE');
    }

    if (trigger === 'LIKE') {
      const count = await prisma.like.count({ where: { userId } });
      if (count >= 10) await tryAwardBadge(userId, 'LIKES_10');
      if (count >= 50) await tryAwardBadge(userId, 'LIKES_50');
    }
  })().catch(() => {});
}

async function tryAwardBadge(userId: string, badge: string) {
  await prisma.userBadge.create({ data: { userId, badge } }).catch(() => {
    // P2002 unique constraint = already awarded, skip silently
  });
}
