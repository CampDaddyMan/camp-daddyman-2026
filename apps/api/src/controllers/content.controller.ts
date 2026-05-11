import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { uploadToS3, deleteFromS3, getSignedMediaUrl } from '../utils/s3';
import { AuthRequest } from '../middleware/auth';

export async function listContent(req: Request, res: Response) {
  const { type, page = '1', limit = '12', creator } = req.query;

  const where: any = { status: 'ACTIVE', privacy: 'PUBLIC' };
  if (type) where.type = String(type).toUpperCase();
  if (creator) where.creator = { username: creator };

  const [items, total] = await Promise.all([
    prisma.content.findMany({
      where,
      orderBy: { createdAt: 'desc' },
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

  res.json({ items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
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
    res.json({ liked: false });
  } else {
    await prisma.like.create({ data: { userId: req.user!.id, contentId: req.params.id } });
    res.json({ liked: true });
  }
}

export async function commentOnContent(req: AuthRequest, res: Response) {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'Comment text required' });

  const comment = await prisma.comment.create({
    data: { text: text.trim(), userId: req.user!.id, contentId: req.params.id },
    include: { user: { select: { username: true, displayName: true, avatar: true } } },
  });

  res.status(201).json({ comment });
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
