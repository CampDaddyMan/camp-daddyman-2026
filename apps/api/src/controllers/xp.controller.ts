import { Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { getLevel, BADGES } from '../utils/xp';

export async function getMyXp(req: AuthRequest, res: Response) {
  const [user, badgeRows] = await Promise.all([
    prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { xp: true, currentStreak: true, longestStreak: true },
    }),
    prisma.userBadge.findMany({
      where: { userId: req.user!.id },
      select: { badge: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const xp = user?.xp ?? 0;
  const earnedKeys = new Set(badgeRows.map((b) => b.badge));

  const badges = Object.entries(BADGES).map(([key, meta]) => ({
    key,
    ...meta,
    earned: earnedKeys.has(key),
    earnedAt: badgeRows.find((b) => b.badge === key)?.createdAt ?? null,
  }));

  res.json({
    xp,
    currentStreak: user?.currentStreak ?? 0,
    longestStreak: user?.longestStreak ?? 0,
    ...getLevel(xp),
    badges,
  });
}
