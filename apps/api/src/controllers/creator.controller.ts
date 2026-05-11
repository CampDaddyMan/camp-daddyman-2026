import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { notify } from '../utils/notifications';

export async function getCreator(req: AuthRequest, res: Response) {
  const creator = await prisma.user.findUnique({
    where: { username: req.params.username },
    select: {
      id: true, username: true, displayName: true, avatar: true, bio: true,
      isCreator: true, createdAt: true,
      _count: { select: { content: true, followers: true } },
    },
  });

  if (!creator || !creator.isCreator) {
    return res.status(404).json({ error: 'Creator not found' });
  }

  // Check if the requesting user follows this creator
  let isFollowing = false;
  if (req.user) {
    const follow = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: req.user.id, followingId: creator.id } },
    });
    isFollowing = !!follow;
  }

  res.json({ creator: { ...creator, isFollowing } });
}

export async function toggleFollow(req: AuthRequest, res: Response) {
  const target = await prisma.user.findUnique({
    where: { username: req.params.username },
    select: { id: true, isCreator: true },
  });

  if (!target || !target.isCreator) {
    return res.status(404).json({ error: 'Creator not found' });
  }

  if (target.id === req.user!.id) {
    return res.status(400).json({ error: 'Cannot follow yourself' });
  }

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: req.user!.id, followingId: target.id } },
  });

  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
    const followerCount = await prisma.follow.count({ where: { followingId: target.id } });
    return res.json({ following: false, followerCount });
  }

  await prisma.follow.create({ data: { followerId: req.user!.id, followingId: target.id } });
  const followerCount = await prisma.follow.count({ where: { followingId: target.id } });

  notify({ userId: target.id, type: 'NEW_FOLLOWER', actorId: req.user!.id });

  res.json({ following: true, followerCount });
}

export async function getFollowingFeed(req: AuthRequest, res: Response) {
  const { page = '1', limit = '12' } = req.query;

  // Get IDs of creators the user follows
  const follows = await prisma.follow.findMany({
    where: { followerId: req.user!.id },
    select: { followingId: true },
  });

  const followingIds = follows.map((f) => f.followingId);

  if (followingIds.length === 0) {
    return res.json({ items: [], total: 0, page: 1, pages: 0 });
  }

  const where = {
    creatorId: { in: followingIds },
    status: 'ACTIVE' as const,
    privacy: 'PUBLIC' as const,
  };

  const [items, total] = await Promise.all([
    prisma.content.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      select: {
        id: true, title: true, description: true, type: true,
        thumbnailUrl: true, duration: true, views: true, tags: true, createdAt: true,
        creator: { select: { username: true, displayName: true, avatar: true } },
        _count: { select: { likes: true, comments: true } },
      },
    }),
    prisma.content.count({ where }),
  ]);

  res.json({ items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
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


export async function searchCreators(req: Request, res: Response) {
  const { q } = req.query;
  if (!q || String(q).trim().length < 2) {
    return res.status(400).json({ error: 'Query must be at least 2 characters' });
  }

  const term = String(q).trim();
  const creators = await prisma.user.findMany({
    where: {
      isCreator: true,
      OR: [
        { username:    { contains: term, mode: 'insensitive' } },
        { displayName: { contains: term, mode: 'insensitive' } },
        { bio:         { contains: term, mode: 'insensitive' } },
      ],
    },
    take: 6,
    select: {
      username: true, displayName: true, avatar: true, bio: true,
      _count: { select: { followers: true, content: true } },
    },
  });

  res.json({ creators });
}
