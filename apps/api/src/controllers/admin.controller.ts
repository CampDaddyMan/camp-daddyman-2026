import { Request, Response } from 'express';
import { prisma } from '../config/database';

export async function getStats(_req: Request, res: Response) {
  const [totalUsers, totalContent, activeSubscriptions, totalViews] = await Promise.all([
    prisma.user.count(),
    prisma.content.count({ where: { status: 'ACTIVE' } }),
    prisma.subscription.count({ where: { status: 'ACTIVE', plan: { not: 'FREE' } } }),
    prisma.content.aggregate({ _sum: { views: true } }),
  ]);

  res.json({
    stats: {
      totalUsers,
      totalContent,
      activeSubscriptions,
      totalViews: totalViews._sum.views || 0,
    },
  });
}

export async function listUsers(req: Request, res: Response) {
  const { page = '1', limit = '50' } = req.query;

  const users = await prisma.user.findMany({
    skip: (Number(page) - 1) * Number(limit),
    take: Number(limit),
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, email: true, username: true, displayName: true,
      isAdmin: true, isCreator: true, createdAt: true,
      subscription: { select: { plan: true, status: true } },
      _count: { select: { content: true } },
    },
  });

  res.json({ users });
}

export async function toggleAdmin(req: Request, res: Response) {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { isAdmin: !user.isAdmin },
    select: { id: true, username: true, isAdmin: true },
  });

  res.json({ user: updated });
}

export async function listAllContent(req: Request, res: Response) {
  const { page = '1', limit = '50', status } = req.query;

  const where: any = {};
  if (status) where.status = String(status).toUpperCase();

  const content = await prisma.content.findMany({
    where,
    skip: (Number(page) - 1) * Number(limit),
    take: Number(limit),
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, title: true, type: true, status: true, privacy: true,
      views: true, createdAt: true,
      creator: { select: { username: true, email: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });

  res.json({ content });
}

export async function setContentStatus(req: Request, res: Response) {
  const { status } = req.body;
  const valid = ['ACTIVE', 'ARCHIVED', 'DELETED'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const content = await prisma.content.update({
    where: { id: req.params.id },
    data: { status },
    select: { id: true, title: true, status: true },
  });

  res.json({ content });
}
