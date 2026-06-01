// 5 climbable stages — mirrors apps/api/src/utils/xp.ts and apps/web/src/lib/xp.ts
export const LEVELS = [
  { name: 'The Egg',         min: 0,    identity: 'Discover',  emoji: '🥚' },
  { name: 'The Caterpillar', min: 100,  identity: 'Learn',     emoji: '🐛' },
  { name: 'The J-Shape',     min: 500,  identity: 'Surrender', emoji: '🔄' },
  { name: 'The Chrysalis',   min: 2000, identity: 'Transform', emoji: '🫘' },
  { name: 'The Butterfly',   min: 5000, identity: 'Serve',     emoji: '🦋' },
] as const;

export function getLevel(xp: number) {
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].min) idx = i;
  }
  const level = LEVELS[idx];
  const next  = LEVELS[idx + 1] ?? null;
  const progress = next ? (xp - level.min) / (next.min - level.min) : 1;
  return {
    index:      idx + 1,
    name:       level.name,
    identity:   level.identity,
    emoji:      level.emoji,
    nextName:   next?.name ?? null,
    nextMin:    next?.min ?? null,
    progress:   Math.min(progress, 1),
    isJShape:   level.name === 'The J-Shape',
    isMaxLevel: idx === LEVELS.length - 1,
  };
}
