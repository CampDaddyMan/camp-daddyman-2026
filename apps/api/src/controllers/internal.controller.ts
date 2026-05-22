import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { notifyFollowers } from '../utils/notifications';

export async function publishScheduled(req: Request, res: Response) {
  const secret = req.headers['x-cron-secret'];
  if (!secret || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const due = await prisma.content.findMany({
    where: { status: 'SCHEDULED', publishAt: { lte: new Date() } },
    select: { id: true, creatorId: true },
  });

  if (due.length === 0) return res.json({ published: 0 });

  await prisma.content.updateMany({
    where: { id: { in: due.map((c) => c.id) } },
    data: { status: 'ACTIVE' },
  });

  for (const c of due) {
    notifyFollowers(c.creatorId, c.id).catch(() => {});
  }

  console.log(`[cron] Published ${due.length} scheduled item(s): ${due.map((c) => c.id).join(', ')}`);
  res.json({ published: due.length });
}
