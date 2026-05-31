import { Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { getLevel } from '../utils/xp';

export async function getMyXp(req: AuthRequest, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { xp: true },
  });
  const xp = user?.xp ?? 0;
  res.json({ xp, ...getLevel(xp) });
}
