import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { uploadToS3, deleteFromS3, getSignedMediaUrl } from '../utils/s3';
import { AuthRequest } from '../middleware/auth';
import { notify, notifyFollowers } from '../utils/notifications';

const CONTENT_SELECT = {
  id: true, title: true, description: true, type: true,
  thumbnailUrl: true, duration: true, views: true, tags: true,
  privacy: true, createdAt: true,
  creator: { select: { username: true, displayName: true, avatar: true } },
  _count: { select: { likes: true, comments: true } },
} as const;

export async function listContent(req: Request, res: Response) {
  const { type, page = '1', limit = '12', creator, sort, tag } = req.query;

  const where: any = { status: 'ACTIVE', privacy: 'PUBLIC' };
  if (type) where.type = String(type).toUpperCase();
  if (creator) where.creator = { username: creator };
  if (tag) where.tags = { has: String(tag).toLowerCase() };

  const orderBy = sort === 'trending' ? { views: 'desc' as const } : { createdAt: 'desc' as const };

  const [items, total] = await Promise.all([
    prisma.content.findMany({
      where,
      orderBy,
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      select: CONTENT_SELECT,
    }),
    prisma.content.count({ where }),
  ]);

  res.json({ items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
}

export async function getDiscovery(_req: Request, res: Response) {
  const base = { status: 'ACTIVE' as const, privacy: 'PUBLIC' as const };

  const [trending, newReleases, music, film, podcast, spokenWord, topCreators] = await Promise.all([
    prisma.content.findMany({
      where: base, orderBy: { views: 'desc' }, take: 8, select: CONTENT_SELECT,
    }),
    prisma.content.findMany({
      where: base, orderBy: { createdAt: 'desc' }, take: 8, select: CONTENT_SELECT,
    }),
    prisma.content.findMany({
      where: { ...base, type: 'MUSIC' }, orderBy: { createdAt: 'desc' }, take: 6, select: CONTENT_SELECT,
    }),
    prisma.content.findMany({
      where: { ...base, type: 'FILM' }, orderBy: { createdAt: 'desc' }, take: 6, select: CONTENT_SELECT,
    }),
    prisma.content.findMany({
      where: { ...base, type: 'PODCAST' }, orderBy: { createdAt: 'desc' }, take: 6, select: CONTENT_SELECT,
    }),
    prisma.content.findMany({
      where: { ...base, type: 'SPOKEN_WORD' }, orderBy: { createdAt: 'desc' }, take: 6, select: CONTENT_SELECT,
    }),
    prisma.user.findMany({
      where: { isCreator: true },
      orderBy: { followers: { _count: 'desc' } },
      take: 8,
      select: {
        username: true, displayName: true, avatar: true, bio: true,
        _count: { select: { followers: true, content: true } },
      },
    }),
  ]);

  res.json({
    trending,
    newReleases,
    byType: { MUSIC: music, FILM: film, PODCAST: podcast, SPOKEN_WORD: spokenWord },
    creators: topCreators,
  });
}

export async function getContent(req: AuthRequest, res: Response) {
  const content = await prisma.content.findUnique({
    where: { id: req.params.id },
    include: {
      creator: { select: { username: true, displayName: true, avatar: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });

  if (!content || content.status === 'DELETED') {
    return res.status(404).json({ error: 'Content not found' });
  }

  // Gate subscriber-only content
  if (content.privacy === 'SUBSCRIBERS_ONLY') {
    const plan = req.user?.subscription?.plan;
    const status = req.user?.subscription?.status;
    if (!plan || plan === 'FREE' || status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Subscriber-only content', requiresSubscription: true });
    }
  }

  // Increment view count (fire and forget)
  prisma.content.update({ where: { id: content.id }, data: { views: { increment: 1 } } }).catch(() => {});

  // Return signed URL for private/subscriber content so the direct S3 URL isn't exposed
  let mediaUrl = content.mediaUrl;
  if (content.privacy !== 'PUBLIC' && mediaUrl) {
    mediaUrl = await getSignedMediaUrl(mediaUrl);
  }

  res.json({ content: { ...content, mediaUrl } });
}

export async function uploadContent(req: AuthRequest, res: Response) {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  if (!files?.media?.[0]) {
    return res.status(400).json({ error: 'Media file required' });
  }

  const { title, description, type, privacy, tags } = req.body;

  if (!['FILM', 'MUSIC', 'PODCAST', 'SPOKEN_WORD'].includes(type)) {
    return res.status(400).json({ error: 'Invalid content type' });
  }

  const mediaUrl = await uploadToS3(files.media[0], `media/${type.toLowerCase()}`);
  let thumbnailUrl: string | null = null;
  if (files?.thumbnail?.[0]) {
    thumbnailUrl = await uploadToS3(files.thumbnail[0], 'thumbnails');
  }

  const content = await prisma.content.create({
    data: {
      title,
      description,
      type,
      privacy: privacy || 'PUBLIC',
      mediaUrl,
      thumbnailUrl,
      tags: tags ? String(tags).split(',').map((t: string) => t.trim()) : [],
      creatorId: req.user!.id,
      status: 'ACTIVE',
    },
  });

  // Mark user as creator if not already
  if (!req.user!.isCreator) {
    await prisma.user.update({ where: { id: req.user!.id }, data: { isCreator: true } });
  }

  // Notify followers about new content (fire and forget)
  notifyFollowers(req.user!.id, content.id);

  res.status(201).json({ content });
}

export async function deleteContent(req: AuthRequest, res: Response) {
  const content = await prisma.content.findUnique({ where: { id: req.params.id } });

  if (!content) return res.status(404).json({ error: 'Content not found' });
  if (content.creatorId !== req.user!.id && !req.user!.isAdmin) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  if (content.mediaUrl) await deleteFromS3(content.mediaUrl).catch(() => {});
  if (content.thumbnailUrl) await deleteFromS3(content.thumbnailUrl).catch(() => {});

  await prisma.content.update({ where: { id: content.id }, data: { status: 'DELETED' } });

  res.json({ message: 'Content deleted' });
}

export async function likeContent(req: AuthRequest, res: Response) {
  const existing = await prisma.like.findUnique({
    where: { userId_contentId: { userId: req.user!.id, contentId: req.params.id } },
  });

  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
    return res.json({ liked: false });
  }

  const [like, content] = await Promise.all([
    prisma.like.create({ data: { userId: req.user!.id, contentId: req.params.id } }),
    prisma.content.findUnique({ where: { id: req.params.id }, select: { creatorId: true } }),
  ]);

  if (content) {
    notify({ userId: content.creatorId, type: 'NEW_LIKE', actorId: req.user!.id, contentId: req.params.id });
  }

  res.json({ liked: true });
}

export async function commentOnContent(req: AuthRequest, res: Response) {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'Comment text required' });

  const [comment, content] = await Promise.all([
    prisma.comment.create({
      data: { text: text.trim(), userId: req.user!.id, contentId: req.params.id },
      include: { user: { select: { username: true, displayName: true, avatar: true } } },
    }),
    prisma.content.findUnique({ where: { id: req.params.id }, select: { creatorId: true } }),
  ]);

  if (content) {
    notify({ userId: content.creatorId, type: 'NEW_COMMENT', actorId: req.user!.id, contentId: req.params.id });
  }

  res.status(201).json({ comment });
}

export async function saveProgress(req: AuthRequest, res: Response) {
  const { progress } = req.body;
  if (typeof progress !== 'number' || progress < 0) {
    return res.status(400).json({ error: 'progress must be a non-negative number (seconds)' });
  }

  const record = await prisma.watchHistory.upsert({
    where: { userId_contentId: { userId: req.user!.id, contentId: req.params.id } },
    update: { progress, watchedAt: new Date() },
    create: { userId: req.user!.id, contentId: req.params.id, progress },
  });

  res.json({ progress: record.progress });
}

export async function getProgress(req: AuthRequest, res: Response) {
  const record = await prisma.watchHistory.findUnique({
    where: { userId_contentId: { userId: req.user!.id, contentId: req.params.id } },
    select: { progress: true, watchedAt: true },
  });

  res.json({ progress: record?.progress ?? 0, watchedAt: record?.watchedAt ?? null });
}

export async function searchContent(req: Request, res: Response) {
  const { q, type, page = '1', limit = '12' } = req.query;

  if (!q || String(q).trim().length < 2) {
    return res.status(400).json({ error: 'Search query must be at least 2 characters' });
  }

  const term = String(q).trim();

  const where: any = {
    status: 'ACTIVE',
    privacy: 'PUBLIC',
    OR: [
      { title:       { contains: term, mode: 'insensitive' } },
      { description: { contains: term, mode: 'insensitive' } },
      { tags:        { has: term.toLowerCase() } },
      { creator: { username:    { contains: term, mode: 'insensitive' } } },
      { creator: { displayName: { contains: term, mode: 'insensitive' } } },
    ],
  };

  if (type) where.type = String(type).toUpperCase();

  const [items, total] = await Promise.all([
    prisma.content.findMany({
      where,
      orderBy: { views: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      select: {
        id: true, title: true, description: true, type: true,
        thumbnailUrl: true, duration: true, views: true, tags: true,
        createdAt: true,
        creator: { select: { username: true, displayName: true, avatar: true } },
        _count: { select: { likes: true, comments: true } },
      },
    }),
    prisma.content.count({ where }),
  ]);

  res.json({ items, total, query: term, page: Number(page), pages: Math.ceil(total / Number(limit)) });
}

export async function getComments(req: Request, res: Response) {
  const comments = await prisma.comment.findMany({
    where: { contentId: req.params.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { user: { select: { username: true, displayName: true, avatar: true } } },
  });

  res.json({ comments });
}
