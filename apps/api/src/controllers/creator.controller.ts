import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { notify, checkFollowerMilestone } from '../utils/notifications';
import { signR2Url } from '../utils/s3';
import { awardXp } from '../utils/xp';

export async function getCreator(req: AuthRequest, res: Response) {
  const creator = await prisma.user.findUnique({
    where: { username: req.params.username },
    select: {
      id: true, username: true, displayName: true, avatar: true, bio: true,
      isCreator: true, createdAt: true,
      _count: {
        select: {
          content: { where: { status: 'ACTIVE', privacy: { in: ['PUBLIC', 'SUBSCRIBERS_ONLY'] } } },
          followers: true,
        },
      },
    },
  });

  if (!creator || !creator.isCreator) {
    return res.status(404).json({ error: 'Creator not found' });
  }

  let isFollowing = false;
  if (req.user) {
    const follow = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: req.user.id, followingId: creator.id } },
    });
    isFollowing = !!follow;
  }

  const signedAvatar = await signR2Url(creator.avatar ?? null);
  res.json({ creator: { ...creator, avatar: signedAvatar, isFollowing } });
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
  checkFollowerMilestone(target.id).catch(() => {});
  awardXp(req.user!.id, 'FOLLOW', target.id);

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

  // Paid subscribers can also see SUBSCRIBERS_ONLY content in their feed
  const userSub = await prisma.subscription.findUnique({
    where: { userId: req.user!.id },
    select: { plan: true, status: true },
  });
  const isPaid = userSub && userSub.plan !== 'FREE' && userSub.status === 'ACTIVE';

  const where: any = {
    creatorId: { in: followingIds },
    status: 'ACTIVE' as const,
    privacy: isPaid ? { in: ['PUBLIC', 'SUBSCRIBERS_ONLY'] } : 'PUBLIC' as const,
  };

  const [raw, total] = await Promise.all([
    prisma.content.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      select: {
        id: true, title: true, description: true, type: true, status: true, privacy: true,
        thumbnailUrl: true, hlsUrl: true, duration: true, views: true, tags: true, createdAt: true,
        creator: { select: { username: true, displayName: true, avatar: true } },
        _count: { select: { likes: true, comments: true } },
      },
    }),
    prisma.content.count({ where }),
  ]);

  const items = await Promise.all(raw.map(async (item) => ({
    ...item,
    thumbnailUrl: await signR2Url(item.thumbnailUrl),
    creator: { ...item.creator, avatar: await signR2Url(item.creator.avatar ?? null) },
  })));

  res.json({ items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
}

export async function getCreatorContent(req: Request, res: Response) {
  const { type, page = '1', limit = '12', sort = 'latest' } = req.query;

  const creator = await prisma.user.findUnique({
    where: { username: req.params.username },
    select: { id: true },
  });

  if (!creator) return res.status(404).json({ error: 'Creator not found' });

  const where: any = { creatorId: creator.id, status: 'ACTIVE', privacy: { in: ['PUBLIC', 'SUBSCRIBERS_ONLY'] } };
  if (type) {
    const types = String(type).split(',').map((t) => t.trim().toUpperCase()).filter(Boolean);
    where.type = types.length === 1 ? types[0] : { in: types };
  }

  const orderBy = sort === 'popular' ? { views: 'desc' as const } : { createdAt: 'desc' as const };

  const [raw, total] = await Promise.all([
    prisma.content.findMany({
      where,
      orderBy,
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      select: {
        id: true, title: true, description: true, type: true, status: true, privacy: true,
        thumbnailUrl: true, mediaUrl: true, hlsUrl: true, duration: true, views: true, tags: true, createdAt: true,
        creator: { select: { username: true, displayName: true, avatar: true } },
        _count: { select: { likes: true, comments: true } },
      },
    }),
    prisma.content.count({ where }),
  ]);

  const items = await Promise.all(raw.map(async (item) => ({
    ...item,
    thumbnailUrl: await signR2Url(item.thumbnailUrl),
    creator: { ...item.creator, avatar: await signR2Url(item.creator.avatar ?? null) },
  })));

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
