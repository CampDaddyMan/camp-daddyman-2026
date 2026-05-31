export const LEVELS = [
  { name: 'The Egg',         min: 0    },
  { name: 'The Caterpillar', min: 100  },
  { name: 'The Chrysalis',   min: 500  },
  { name: 'The Butterfly',   min: 2000 },
] as const;

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
    nextName:   next?.name ?? null,
    currentMin: level.min,
    nextMin:    next?.min ?? null,
    progress:   Math.min(progress, 1),
  };
}
