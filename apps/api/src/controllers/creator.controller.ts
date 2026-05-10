import { Request, Response } from 'express';
import { prisma } from '../config/database';

export async function getCreator(req: Request, res: Response) {
  const creator = await prisma.user.findUnique({
    where: { username: req.params.username },
    select: {
      id: true, username: true, displayName: true, avatar: true, bio: true,
      isCreator: true, createdAt: true,
      _count: { select: { content: true } },
    },
  });

  if (!creator || !creator.isCreator) {
    return res.status(404).json({ error: 'Creator not found' });
  }

  res.json({ creator });
}

export async function getCreatorContent(req: Request, res: Response) {
  const { type, page = '1', limit = '12' } = req.query;

  const creator = await prisma.user.findUnique({
    where: { username: req.params.username },
    select: { id: true },
  });

  if (!creator) return res.status(404).json({ error: 'Creator not found' });

  const where: any = { creatorId: creator.id, status: 'ACTIVE', privacy: 'PUBLIC' };
  if (type) where.type = String(type).toUpperCase();

  const [items, total] = await Promise.all([
    prisma.content.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      select: {
        id: true, title: true, description: true, type: true,
        thumbnailUrl: true, duration: true, views: true, tags: true, createdAt: true,
        _count: { select: { likes: true, comments: true } },
      },
    }),
    prisma.content.count({ where }),
  ]);

  res.json({ items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
}
