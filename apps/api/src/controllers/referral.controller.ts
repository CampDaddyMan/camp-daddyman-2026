import { Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/auth';

export async function getReferralStats(req: AuthRequest, res: Response) {
  const userId = req.user!.id;
  const username = req.user!.username;

  const [count, recent] = await Promise.all([
    prisma.user.count({ where: { referredById: userId } }),
    prisma.user.findMany({
      where: { referredById: userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { username: true, displayName: true, createdAt: true },
    }),
  ]);

  res.json({
    referralCode: username,
    count,
    recent,
  });
}
