import { prisma } from '../config/database';

// ── The Ark Constitution — Transformation Framework ───────────────────────────
//
// THE FOUR TESTS (design filter — every feature must clear all four):
//   1. Butterfly Test:  Does this help the butterfly fly?         (flawed — flight ≠ purpose)
//   2. Egg Test:        Does this help the butterfly pollinate?   (closer — but eggs need a field)
//   3. Field Test:      Does this improve the field?              (working test)
//   4. Father Test:     Does this help someone stand without us?  (the audit — passes all three)
//   Beneath all tests:  Does this create more life than it consumes?
//
// THE 5 CLIMBABLE STAGES (XP = honey/bait → Good Done = vinegar/medicine):
//   Egg → Caterpillar (XP bait layer)
//   Caterpillar → J-Shape (transition: XP stops being enough)
//   J-Shape → Chrysalis → Butterfly (Good Done layer — service, creation, witnessing)
//
// THE 3 CONFERRED STATIONS (set by Elder/admin — never by XP alone):
//   Ark Builder  — multiplies; sponsors and walks the next one through
//   Gardener     — protects all 5 stages; no badge, no announcement, cannot be performed
//   Faada        — not a rank; stewardship; becomes soil beneath the next Egg
//
// ─────────────────────────────────────────────────────────────────────────────

// ── XP Values ────────────────────────────────────────────────────────────────

export const XP_VALUES = {
  LIKE:     2,
  COMMENT:  5,
  FOLLOW:   10,
  WATCH:    10,
  PURCHASE: 25,
} as const;

export type XpEventType = keyof typeof XP_VALUES;

// ── The 5 Climbable Stages ────────────────────────────────────────────────────

export const LEVELS = [
  { name: 'The Egg',         min: 0,    identity: 'Discover',   emoji: '🥚' },
  { name: 'The Caterpillar', min: 100,  identity: 'Learn',      emoji: '🐛' },
  { name: 'The J-Shape',     min: 500,  identity: 'Surrender',  emoji: '🔄' },
  { name: 'The Chrysalis',   min: 2000, identity: 'Transform',  emoji: '🫘' },
  { name: 'The Butterfly',   min: 5000, identity: 'Serve',      emoji: '🦋' },
] as const;

// ── The 3 Conferred Stations (above the ladder) ───────────────────────────────

export const STATIONS: Record<string, { name: string; emoji: string; identity: string; hasBadge: boolean; public: boolean }> = {
  ARK_BUILDER: {
    name: 'Ark Builder',
    emoji: '🌱',
    identity: 'Multiply',
    hasBadge: true,
    public: true,  // visible on profile and dashboard
  },
  GARDENER: {
    name: 'Gardener',
    emoji: '🌿',
    identity: 'Protect',
    hasBadge: false,  // no badge by constitution — you cannot perform being soil
    public: false,    // not displayed publicly
  },
  FAADA: {
    name: 'Faada',
    emoji: '🌍',
    identity: 'Become the ground',
    hasBadge: false,  // not a rank — a stewardship
    public: false,    // becomes soil, not a title
  },
};

// ── Level calculator ──────────────────────────────────────────────────────────

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
    identity:   level.identity,
    emoji:      level.emoji,
    nextName:   next?.name ?? null,
    nextEmoji:  next?.emoji ?? null,
    currentMin: level.min,
    nextMin:    next?.min ?? null,
    progress:   Math.min(progress, 1),
    isJShape:   level.name === 'The J-Shape',
    isMaxLevel: idx === LEVELS.length - 1,
  };
}

// ── XP Award (fire-and-forget) ────────────────────────────────────────────────

/** Awards XP once per (userId, type, refId). Checks level badges after. */
export function awardXp(userId: string, type: XpEventType, refId: string) {
  const xpAmount = XP_VALUES[type];
  prisma.$transaction([
    prisma.userXpEvent.create({ data: { userId, type, refId, xp: xpAmount } }),
    prisma.user.update({ where: { id: userId }, data: { xp: { increment: xpAmount } }, select: { xp: true } }),
  ]).then(([, user]) => {
    const newXp = (user as { xp: number }).xp;
    if (newXp >= 100)  tryAwardBadge(userId, 'LEVEL_CATERPILLAR').catch(() => {});
    if (newXp >= 500)  tryAwardBadge(userId, 'LEVEL_JSHAPE').catch(() => {});
    if (newXp >= 2000) tryAwardBadge(userId, 'LEVEL_CHRYSALIS').catch(() => {});
    if (newXp >= 5000) tryAwardBadge(userId, 'LEVEL_BUTTERFLY').catch(() => {});
  }).catch(() => {});
}

// ── Streaks (fire-and-forget) ─────────────────────────────────────────────────

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
  // First actions
  FIRST_WATCH:       { name: 'First Step',        emoji: '👁️',  desc: 'Watched your first piece of content' },
  FIRST_COMMENT:     { name: 'First Words',        emoji: '💬',  desc: 'Left your first comment' },
  FIRST_FOLLOW:      { name: 'First Connection',   emoji: '🤝',  desc: 'Followed your first creator' },
  FIRST_PURCHASE:    { name: 'First Purchase',     emoji: '🛒',  desc: 'Bought something from The Ark' },
  // Streaks
  STREAK_3:          { name: 'On Fire',            emoji: '🔥',  desc: 'Kept a 3-day streak' },
  STREAK_7:          { name: 'In the Flow',        emoji: '🌊',  desc: 'Kept a 7-day streak' },
  STREAK_30:         { name: 'Camp Regular',       emoji: '🏕️', desc: 'Kept a 30-day streak' },
  // The 5 climbable lifecycle stages
  LEVEL_CATERPILLAR: { name: 'The Caterpillar',    emoji: '🐛',  desc: 'Stage 2 — Learning. You are consuming, growing, beginning to give.' },
  LEVEL_JSHAPE:      { name: 'The J-Shape',        emoji: '🔄',  desc: 'Stage 3 — Surrender. Hanging upside down. No visible progress. This is where people quit, which is why it is gold.' },
  LEVEL_CHRYSALIS:   { name: 'The Chrysalis',      emoji: '🫘',  desc: 'Stage 4 — Transform. The old identity dissolves. Nobody sees it, nobody applauds it. Everything changes here.' },
  LEVEL_BUTTERFLY:   { name: 'The Butterfly',      emoji: '🦋',  desc: 'Stage 5 — Serve. Not achievement — mission. The butterfly exists to pollinate and lay eggs, not to fly.' },
  // Conferred station badge (Ark Builder only — Gardener and Faada have no badge by constitution)
  LEVEL_ARK_BUILDER: { name: 'Ark Builder',        emoji: '🌱',  desc: 'Conferred — You multiply by sponsoring and walking the next one through. The butterfly lays eggs.' },
  // Engagement
  LIKES_10:          { name: 'Appreciator',        emoji: '❤️',  desc: 'Liked 10 pieces of content' },
  LIKES_50:          { name: 'Super Fan',          emoji: '💎',  desc: 'Liked 50 pieces of content' },
};

export type BadgeTrigger = 'WATCH' | 'COMMENT' | 'FOLLOW' | 'PURCHASE' | 'LIKE';

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
  await prisma.userBadge.create({ data: { userId, badge } }).catch(() => {});
}
