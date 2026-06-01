export interface BadgeData {
  key: string;
  name: string;
  emoji: string;
  desc: string;
  earned: boolean;
  earnedAt: string | null;
}

// The 5 climbable stages (XP bait layer → Good Done medicine layer)
export const LEVELS = [
  { name: 'The Egg',         min: 0,    identity: 'Discover',  emoji: '🥚' },
  { name: 'The Caterpillar', min: 100,  identity: 'Learn',     emoji: '🐛' },
  { name: 'The J-Shape',     min: 500,  identity: 'Surrender', emoji: '🔄' },
  { name: 'The Chrysalis',   min: 2000, identity: 'Transform', emoji: '🫘' },
  { name: 'The Butterfly',   min: 5000, identity: 'Serve',     emoji: '🦋' },
] as const;

// The 3 conferred stations — set by Elder/admin, never by XP
// Gardener and Faada have no public badge and no announcement (Ark Constitution)
export const STATIONS: Record<string, { name: string; emoji: string; identity: string; hasBadge: boolean }> = {
  ARK_BUILDER: { name: 'Ark Builder', emoji: '🌱', identity: 'Multiply',          hasBadge: true  },
  GARDENER:    { name: 'Gardener',    emoji: '🌿', identity: 'Protect the field',  hasBadge: false },
  FAADA:       { name: 'Faada',       emoji: '🌍', identity: 'Become the ground',  hasBadge: false },
};

export function getLevel(xp: number) {
  let levelIdx = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].min) levelIdx = i;
  }
  const level = LEVELS[levelIdx];
  const next  = LEVELS[levelIdx + 1] ?? null;
  const progress = next
    ? (xp - level.min) / (next.min - level.min)
    : 1;
  return {
    index:      levelIdx + 1,
    name:       level.name,
    identity:   level.identity,
    emoji:      level.emoji,
    nextName:   next?.name ?? null,
    nextEmoji:  next?.emoji ?? null,
    currentMin: level.min,
    nextMin:    next?.min ?? null,
    progress:   Math.min(progress, 1),
    isJShape:   level.name === 'The J-Shape',
    isMaxLevel: levelIdx === LEVELS.length - 1,
  };
}
