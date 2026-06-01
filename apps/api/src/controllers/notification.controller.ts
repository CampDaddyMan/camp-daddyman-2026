import { Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/auth';

export async function listNotifications(req: AuthRequest, res: Response) {
  const { page = '1', limit = '20' } = req.query;

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      include: {
        actor: { select: { username: true, displayName: true, avatar: true } },
        content: { select: { id: true, title: true, type: true, thumbnailUrl: true } },
      },
    }),
    prisma.notification.count({ where: { userId: req.user!.id, read: false } }),
  ]);

  res.json({ notifications, unreadCount });
}

export async function markRead(req: AuthRequest, res: Response) {
  await prisma.notification.updateMany({
    where: { id: req.params.id, userId: req.user!.id },
    data: { read: true },
  });
  res.json({ ok: true });
}

export async function markAllRead(req: AuthRequest, res: Response) {
  await prisma.notification.updateMany({
    where: { userId: req.user!.id, read: false },
    data: { read: true },
  });
  res.json({ ok: true });
}

export async function getUnreadCount(req: AuthRequest, res: Response) {
  const count = await prisma.notification.count({
    where: { userId: req.user!.id, read: false },
  });
  res.json({ count });
}

const PREF_FIELDS = [
  'emailNewFollower', 'emailNewContent', 'emailNewComment', 'emailNewTip',
  'pushNewFollower',  'pushNewContent',  'pushNewComment',  'pushNewTip',
] as const;

export async function getPreferences(req: AuthRequest, res: Response) {
  const select = Object.fromEntries(PREF_FIELDS.map((f) => [f, true]));
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select });
  res.json(user ?? Object.fromEntries(PREF_FIELDS.map((f) => [f, true])));
}

export async function updatePreferences(req: AuthRequest, res: Response) {
  const data: Record<string, boolean> = {};
  for (const field of PREF_FIELDS) {
    if (typeof req.body[field] === 'boolean') data[field] = req.body[field];
  }
  const select = Object.fromEntries(PREF_FIELDS.map((f) => [f, true]));
  const user = await prisma.user.update({ where: { id: req.user!.id }, data, select });
  res.json(user);
}
