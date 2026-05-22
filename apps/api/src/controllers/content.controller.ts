import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { uploadToS3, deleteFromS3, getSignedMediaUrl, signR2Url, getDownloadUrl, extractKey } from '../utils/s3';
import { AuthRequest } from '../middleware/auth';
import { notify, notifyFollowers } from '../utils/notifications';
import { getTranscodeQueue } from '../config/queue';

const CONTENT_SELECT = {
  id: true, title: true, description: true, type: true,
  status: true, thumbnailUrl: true, hlsUrl: true,
  duration: true, views: true, tags: true,
  privacy: true, createdAt: true, featured: true, rating: true,
  creator: { select: { username: true, displayName: true, avatar: true } },
  _count: { select: { likes: true, comments: true } },
} as const;

export async function listContent(req: AuthRequest, res: Response) {
  const { type, page = '1', limit = '12', creator, sort, tag } = req.query;
  const userId = req.user?.id;

  const where: any = { status: 'ACTIVE', privacy: { in: ['PUBLIC', 'SUBSCRIBERS_ONLY'] } };
  if (type) where.type = String(type).toUpperCase();
  if (creator) where.creator = { username: creator };
  if (tag) where.tags = { has: String(tag).toLowerCase() };
  if (userId) where.reports = { none: { reporterId: userId } };

  const orderBy = (sort === 'trending' || sort === 'popular') ? { views: 'desc' as const } : { createdAt: 'desc' as const };

  const [raw, total] = await Promise.all([
    prisma.content.findMany({
      where,
      orderBy,
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      select: CONTENT_SELECT,
    }),
    prisma.content.count({ where }),
  ]);

  const items = await Promise.all(raw.map(async (item) => ({
    ...item,
    thumbnailUrl: await signR2Url(item.thumbnailUrl),
  })));

  res.json({ items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
}

export async function getDiscovery(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  const notReported = userId ? { reports: { none: { reporterId: userId } } } : {};
  const base: any = { status: 'ACTIVE', privacy: { in: ['PUBLIC', 'SUBSCRIBERS_ONLY'] }, ...notReported };

  const [featured, trending, newReleases, music, film, podcast, spokenWord, daddymanIsms, topCreators] = await Promise.all([
    prisma.content.findMany({
      where: { ...base, featured: true }, orderBy: { createdAt: 'desc' }, take: 8, select: CONTENT_SELECT,
    }),
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
    prisma.content.findMany({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      where: { ...base, type: 'DADDYMAN_ISMS' as any }, orderBy: { createdAt: 'desc' }, take: 6, select: CONTENT_SELECT,
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

  const signList = (list: any[]) => Promise.all(list.map(async (i) => ({ ...i, thumbnailUrl: await signR2Url(i.thumbnailUrl) })));

  const [sFeatured, sTrending, sNew, sMusic, sFilm, sPodcast, sSpoken, sDaddyman] = await Promise.all([
    signList(featured), signList(trending), signList(newReleases), signList(music), signList(film),
    signList(podcast), signList(spokenWord), signList(daddymanIsms),
  ]);

  res.json({
    featured: sFeatured,
    trending: sTrending,
    newReleases: sNew,
    byType: { MUSIC: sMusic, FILM: sFilm, PODCAST: sPodcast, SPOKEN_WORD: sSpoken, DADDYMAN_ISMS: sDaddyman },
    creators: topCreators,
  });
}

export async function getContent(req: AuthRequest, res: Response) {
  const content = await prisma.content.findUnique({
    where: { id: req.params.id },
    include: {
      creator: { select: { username: true, displayName: true, avatar: true } },
      _count: { select: { likes: true, comments: true } },
      episode: {
        include: {
          season: {
            include: {
              series: { select: { id: true, title: true } },
            },
          },
        },
      },
    },
  });

  if (!content || content.status === 'DELETED') {
    return res.status(404).json({ error: 'Content not found' });
  }

  // Scheduled content is only visible to its creator
  if (content.status === 'SCHEDULED' && content.creatorId !== req.user?.id) {
    return res.status(404).json({ error: 'Content not found' });
  }

  // If the requesting user reported this content, block their access
  if (req.user && req.user.id !== content.creatorId && !req.user.isAdmin) {
    const report = await prisma.report.findUnique({
      where: { contentId_reporterId: { contentId: content.id, reporterId: req.user.id } },
      select: { id: true },
    });
    if (report) {
      return res.status(403).json({ hidden: true, reported: true, contentId: content.id });
    }
  }

  // Gate private content — only the creator or an admin can see it
  if (content.privacy === 'PRIVATE') {
    if (!req.user || (req.user.id !== content.creatorId && !req.user.isAdmin)) {
      return res.status(404).json({ error: 'Content not found' });
    }
  }

  // Gate subscriber-only content
  if (content.privacy === 'SUBSCRIBERS_ONLY') {
    // Creator and admins always have access
    const isOwner = req.user?.id === content.creatorId;
    if (!isOwner && !req.user?.isAdmin) {
      const plan = req.user?.subscription?.plan;
      const status = req.user?.subscription?.status;
      if (!plan || plan === 'FREE' || status !== 'ACTIVE') {
        return res.status(403).json({
          error: 'Subscriber-only content',
          requiresSubscription: true,
          preview: {
            title: content.title,
            description: content.description,
            type: content.type,
            thumbnailUrl: content.thumbnailUrl,
            duration: content.duration,
            tags: content.tags,
            createdAt: content.createdAt,
            views: content.views,
            creator: content.creator,
            _count: content._count,
          },
        });
      }
    }
  }

  // Increment view count + log for analytics (fire and forget)
  Promise.all([
    prisma.content.update({ where: { id: content.id }, data: { views: { increment: 1 } } }),
    prisma.viewLog.create({ data: { contentId: content.id } }),
  ]).catch(() => {});

  // Always sign URLs — R2 public access unreliable; signed URLs work regardless
  const mediaUrl    = await signR2Url(content.mediaUrl, 4 * 3600);
  const thumbnailUrl = await signR2Url(content.thumbnailUrl);

  let isLiked = false;
  let isSaved = false;
  let nextEpisodeContentId: string | null = null;

  const checks: Promise<any>[] = [
    req.user ? prisma.like.findUnique({ where: { userId_contentId: { userId: req.user.id, contentId: content.id } } }) : Promise.resolve(null),
    req.user ? prisma.savedContent.findUnique({ where: { userId_contentId: { userId: req.user.id, contentId: content.id } } }) : Promise.resolve(null),
    content.episode
      ? prisma.episode.findFirst({
          where: { seasonId: content.episode.seasonId, episodeNumber: { gt: content.episode.episodeNumber } },
          orderBy: { episodeNumber: 'asc' },
          select: { contentId: true },
        })
      : Promise.resolve(null),
  ];

  const [like, saved, nextEp] = await Promise.all(checks);
  if (req.user) { isLiked = !!like; isSaved = !!saved; }
  if (nextEp) nextEpisodeContentId = nextEp.contentId;

  res.json({ content: { ...content, mediaUrl, thumbnailUrl, nextEpisodeContentId }, isLiked, isSaved });
}

export async function uploadContent(req: AuthRequest, res: Response) {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  if (!files?.media?.[0]) {
    return res.status(400).json({ error: 'Media file required' });
  }

  const { title, description, type, privacy, tags, publishAt, rating } = req.body;

  const validTypes = ['FILM', 'MUSIC', 'PODCAST', 'SPOKEN_WORD', 'DADDYMAN_ISMS', 'BOOK'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: 'Invalid content type' });
  }

  const mediaUrl = await uploadToS3(files.media[0], `media/${type.toLowerCase()}`);
  let thumbnailUrl: string | null = null;
  if (files?.thumbnail?.[0]) {
    thumbnailUrl = await uploadToS3(files.thumbnail[0], 'thumbnails');
  }

  const scheduledAt = publishAt ? new Date(publishAt) : null;
  const isScheduled = scheduledAt && scheduledAt > new Date();

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
      status: isScheduled ? 'SCHEDULED' : 'ACTIVE',
      publishAt: isScheduled ? scheduledAt : null,
      rating: rating || null,
    },
  });

  // Mark user as creator if not already
  if (!req.user!.isCreator) {
    await prisma.user.update({ where: { id: req.user!.id }, data: { isCreator: true } });
  }

  // Only notify followers immediately for live content; scheduler handles scheduled content
  if (!isScheduled) notifyFollowers(req.user!.id, content.id);

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
  const { text, parentId } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'Comment text required' });

  if (parentId) {
    const parent = await prisma.comment.findFirst({
      where: { id: parentId, contentId: req.params.id, parentId: null },
    });
    if (!parent) return res.status(400).json({ error: 'Parent comment not found' });
  }

  const [comment, content] = await Promise.all([
    prisma.comment.create({
      data: { text: text.trim(), userId: req.user!.id, contentId: req.params.id, parentId: parentId ?? null },
      include: { user: { select: { id: true, username: true, displayName: true, avatar: true } } },
    }),
    prisma.content.findUnique({ where: { id: req.params.id }, select: { creatorId: true } }),
  ]);

  if (content && !parentId) {
    notify({ userId: content.creatorId, type: 'NEW_COMMENT', actorId: req.user!.id, contentId: req.params.id });
  }

  res.status(201).json({
    comment: { ...comment, isLiked: false, _count: { likes: 0, replies: 0 }, replies: [] },
  });
}

export async function deleteComment(req: AuthRequest, res: Response) {
  const comment = await prisma.comment.findUnique({
    where: { id: req.params.commentId },
    select: { userId: true, contentId: true },
  });

  if (!comment) return res.status(404).json({ error: 'Comment not found' });
  if (comment.contentId !== req.params.id) return res.status(400).json({ error: 'Comment does not belong to this content' });
  if (comment.userId !== req.user!.id && !req.user!.isAdmin) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  await prisma.comment.delete({ where: { id: req.params.commentId } });
  res.json({ deleted: true });
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

export async function searchContent(req: AuthRequest, res: Response) {
  const { q, type, page = '1', limit = '12' } = req.query;
  const userId = req.user?.id;

  if (!q || String(q).trim().length < 2) {
    return res.status(400).json({ error: 'Search query must be at least 2 characters' });
  }

  const term = String(q).trim();

  const where: any = {
    status: 'ACTIVE',
    privacy: { in: ['PUBLIC', 'SUBSCRIBERS_ONLY'] },
    ...(userId && { reports: { none: { reporterId: userId } } }),
    OR: [
      { title:       { contains: term, mode: 'insensitive' } },
      { description: { contains: term, mode: 'insensitive' } },
      { tags:        { has: term.toLowerCase() } },
      { creator: { username:    { contains: term, mode: 'insensitive' } } },
      { creator: { displayName: { contains: term, mode: 'insensitive' } } },
    ],
  };

  if (type) where.type = String(type).toUpperCase();

  const [raw, total] = await Promise.all([
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

  const items = await Promise.all(raw.map(async (item) => ({
    ...item,
    thumbnailUrl: await signR2Url(item.thumbnailUrl),
  })));

  res.json({ items, total, query: term, page: Number(page), pages: Math.ceil(total / Number(limit)) });
}

export async function getComments(req: Request, res: Response) {
  const userId = (req as AuthRequest).user?.id;

  const comments = await prisma.comment.findMany({
    where: { contentId: req.params.id, parentId: null },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      user: { select: { id: true, username: true, displayName: true, avatar: true } },
      _count: { select: { likes: true, replies: true } },
      ...(userId && { likes: { where: { userId }, select: { id: true } } }),
      replies: {
        orderBy: { createdAt: 'asc' },
        take: 20,
        include: {
          user: { select: { id: true, username: true, displayName: true, avatar: true } },
          _count: { select: { likes: true } },
          ...(userId && { likes: { where: { userId }, select: { id: true } } }),
        },
      },
    },
  });

  const shaped = comments.map((c: any) => ({
    ...c,
    isLiked: userId ? (c.likes?.length ?? 0) > 0 : false,
    likes: undefined,
    replies: c.replies.map((r: any) => ({
      ...r,
      isLiked: userId ? (r.likes?.length ?? 0) > 0 : false,
      likes: undefined,
    })),
  }));

  res.json({ comments: shaped });
}

export async function toggleCommentLike(req: AuthRequest, res: Response) {
  const { commentId } = req.params;

  const existing = await prisma.commentLike.findUnique({
    where: { userId_commentId: { userId: req.user!.id, commentId } },
  });

  if (existing) {
    await prisma.commentLike.delete({ where: { id: existing.id } });
    return res.json({ liked: false });
  }

  await prisma.commentLike.create({ data: { userId: req.user!.id, commentId } });
  res.json({ liked: true });
}

export async function updateContent(req: AuthRequest, res: Response) {
  const content = await prisma.content.findUnique({
    where: { id: req.params.id },
    select: { creatorId: true },
  });

  if (!content) return res.status(404).json({ error: 'Content not found' });
  if (content.creatorId !== req.user!.id && !req.user!.isAdmin) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const { title, description, privacy, tags, thumbnailUrl, type, rating } = req.body;

  const data: any = {};
  if (title !== undefined)        data.title = String(title).trim();
  if (rating !== undefined)       data.rating = rating || null;
  if (description !== undefined)  data.description = String(description).trim() || null;
  if (thumbnailUrl !== undefined) data.thumbnailUrl = thumbnailUrl ? String(thumbnailUrl).trim() : null;
  if (privacy !== undefined && ['PUBLIC', 'PRIVATE', 'SUBSCRIBERS_ONLY'].includes(privacy)) {
    data.privacy = privacy;
  }
  if (type !== undefined && ['FILM', 'MUSIC', 'PODCAST', 'SPOKEN_WORD', 'DADDYMAN_ISMS', 'BOOK'].includes(type)) {
    data.type = type;
  }
  if (tags !== undefined) {
    data.tags = String(tags).split(',').map((t: string) => t.trim()).filter(Boolean);
  }

  if (!data.title && data.title !== undefined) {
    return res.status(400).json({ error: 'Title cannot be empty' });
  }

  const updated = await prisma.content.update({
    where: { id: req.params.id },
    data,
    select: { id: true, title: true, description: true, type: true, thumbnailUrl: true, privacy: true, tags: true },
  });

  res.json({ content: updated });
}

export async function uploadThumbnail(req: AuthRequest, res: Response) {
  try {
    const content = await prisma.content.findUnique({
      where: { id: req.params.id },
      select: { creatorId: true, thumbnailUrl: true },
    });
    if (!content) return res.status(404).json({ error: 'Content not found' });
    if (content.creatorId !== req.user!.id && !req.user!.isAdmin) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ error: 'Image file required' });

    if (content.thumbnailUrl?.startsWith('http')) {
      deleteFromS3(content.thumbnailUrl).catch(() => {});
    }

    const rawUrl = await uploadToS3(file, 'thumbnails');
    await prisma.content.update({ where: { id: req.params.id }, data: { thumbnailUrl: rawUrl } });
    const thumbnailUrl = await signR2Url(rawUrl);

    res.json({ thumbnailUrl });
  } catch (err: any) {
    console.error('[uploadThumbnail]', err.message);
    res.status(500).json({ error: 'Thumbnail upload failed', detail: err.message });
  }
}

export async function uploadMedia(req: AuthRequest, res: Response) {
  try {
    const content = await prisma.content.findUnique({
      where: { id: req.params.id },
      select: { creatorId: true, mediaUrl: true, type: true },
    });
    if (!content) return res.status(404).json({ error: 'Content not found' });
    if (content.creatorId !== req.user!.id && !req.user!.isAdmin) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ error: 'Media file required' });

    if (content.mediaUrl?.startsWith('http')) {
      deleteFromS3(content.mediaUrl).catch(() => {});
    }

    const folder = `media/${content.type.toLowerCase()}`;
    const rawMediaUrl = await uploadToS3(file, folder);
    await prisma.content.update({ where: { id: req.params.id }, data: { mediaUrl: rawMediaUrl } });
    const mediaUrl = await signR2Url(rawMediaUrl, 4 * 3600);

    res.json({ mediaUrl });
  } catch (err: any) {
    console.error('[uploadMedia]', err.message);
    res.status(500).json({ error: 'Media upload failed', detail: err.message });
  }
}

export async function getWatchHistory(req: AuthRequest, res: Response) {
  const records = await prisma.watchHistory.findMany({
    where: {
      userId: req.user!.id,
      progress: { gt: 5 },
      content: { status: 'ACTIVE', reports: { none: { reporterId: req.user!.id } } },
    },
    orderBy: { watchedAt: 'desc' },
    take: 20,
    include: {
      content: {
        select: {
          id: true, title: true, type: true, status: true, privacy: true,
          thumbnailUrl: true, duration: true, views: true, tags: true,
          createdAt: true, hlsUrl: true,
          creator: { select: { username: true, displayName: true, avatar: true } },
          _count: { select: { likes: true, comments: true } },
        },
      },
    },
  });

  const raw = records.map((r) => ({ ...r.content, watchProgress: r.progress, watchedAt: r.watchedAt }));

  const items = await Promise.all(raw.map(async (i) => ({
    ...i,
    thumbnailUrl: await signR2Url(i.thumbnailUrl),
  })));

  res.json({ items });
}

export async function getLikedContent(req: AuthRequest, res: Response) {
  const { page = '1', limit = '12' } = req.query;
  const take = Number(limit);
  const skip = (Number(page) - 1) * take;

  const [raw, total] = await Promise.all([
    prisma.like.findMany({
      where: { userId: req.user!.id, content: { status: 'ACTIVE' } },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      select: {
        createdAt: true,
        content: {
          select: {
            id: true, title: true, type: true, status: true, privacy: true,
            thumbnailUrl: true, mediaUrl: true, duration: true, views: true, tags: true, createdAt: true,
            creator: { select: { username: true, displayName: true, avatar: true } },
            _count: { select: { likes: true, comments: true } },
          },
        },
      },
    }),
    prisma.like.count({ where: { userId: req.user!.id, content: { status: 'ACTIVE' } } }),
  ]);

  const items = await Promise.all(raw.map(async ({ content: c }) => ({
    ...c,
    thumbnailUrl: await signR2Url(c.thumbnailUrl),
  })));

  res.json({ items, total, page: Number(page), pages: Math.ceil(total / take) });
}

export async function toggleSaved(req: AuthRequest, res: Response) {
  const userId = req.user!.id;
  const contentId = req.params.id;

  const existing = await prisma.savedContent.findUnique({
    where: { userId_contentId: { userId, contentId } },
  });

  if (existing) {
    await prisma.savedContent.delete({ where: { userId_contentId: { userId, contentId } } });
    return res.json({ saved: false });
  }

  await prisma.savedContent.create({ data: { userId, contentId } });
  return res.json({ saved: true });
}

export async function getSavedContent(req: AuthRequest, res: Response) {
  const { page = '1', limit = '12' } = req.query;
  const take = Number(limit);
  const skip = (Number(page) - 1) * take;

  const [raw, total] = await Promise.all([
    prisma.savedContent.findMany({
      where: { userId: req.user!.id, content: { status: 'ACTIVE' } },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      select: {
        createdAt: true,
        content: {
          select: {
            id: true, title: true, type: true, status: true, privacy: true,
            thumbnailUrl: true, mediaUrl: true, duration: true, views: true, tags: true, createdAt: true,
            creator: { select: { username: true, displayName: true, avatar: true } },
            _count: { select: { likes: true, comments: true } },
          },
        },
      },
    }),
    prisma.savedContent.count({ where: { userId: req.user!.id, content: { status: 'ACTIVE' } } }),
  ]);

  const items = await Promise.all(raw.map(async ({ content: c }) => ({
    ...c,
    thumbnailUrl: await signR2Url(c.thumbnailUrl),
  })));

  res.json({ items, total, page: Number(page), pages: Math.ceil(total / take) });
}

export async function getRelatedContent(req: AuthRequest, res: Response) {
  const content = await prisma.content.findUnique({
    where: { id: req.params.id },
    select: { type: true, creatorId: true, tags: true },
  });

  if (!content) return res.status(404).json({ error: 'Content not found' });

  const userId = req.user?.id;
  const notReported = userId ? { reports: { none: { reporterId: userId } } } : {};
  const base: any = { status: 'ACTIVE', privacy: { in: ['PUBLIC', 'SUBSCRIBERS_ONLY'] }, id: { not: req.params.id }, ...notReported };

  // 1. More from the same creator
  // 2. Same type, exclude same creator
  const [fromCreator, sameType] = await Promise.all([
    prisma.content.findMany({
      where: { ...base, creatorId: content.creatorId },
      orderBy: { views: 'desc' },
      take: 4,
      select: {
        id: true, title: true, type: true, status: true, privacy: true,
        thumbnailUrl: true, duration: true, views: true, tags: true,
        createdAt: true, hlsUrl: true,
        creator: { select: { username: true, displayName: true, avatar: true } },
        _count: { select: { likes: true, comments: true } },
      },
    }),
    prisma.content.findMany({
      where: { ...base, type: content.type, creatorId: { not: content.creatorId } },
      orderBy: { views: 'desc' },
      take: 8,
      select: {
        id: true, title: true, type: true, status: true, privacy: true,
        thumbnailUrl: true, duration: true, views: true, tags: true,
        createdAt: true, hlsUrl: true,
        creator: { select: { username: true, displayName: true, avatar: true } },
        _count: { select: { likes: true, comments: true } },
      },
    }),
  ]);

  const signList = (list: any[]) => Promise.all(list.map(async (i) => ({ ...i, thumbnailUrl: await signR2Url(i.thumbnailUrl) })));
  const [sFromCreator, sSameType] = await Promise.all([signList(fromCreator), signList(sameType)]);

  res.json({ fromCreator: sFromCreator, sameType: sSameType });
}

export async function reportContent(req: AuthRequest, res: Response) {
  const VALID_REASONS = ['SPAM', 'INAPPROPRIATE', 'COPYRIGHT', 'HATE_SPEECH', 'MISINFORMATION', 'OTHER'];
  const { reason, detail } = req.body;

  if (!VALID_REASONS.includes(reason)) {
    return res.status(400).json({ error: 'Invalid report reason' });
  }

  const content = await prisma.content.findUnique({
    where: { id: req.params.id },
    select: { id: true, creatorId: true },
  });
  if (!content) return res.status(404).json({ error: 'Content not found' });
  if (content.creatorId === req.user!.id) {
    return res.status(400).json({ error: 'You cannot report your own content' });
  }

  // Upsert so a user can only report a piece once (update reason if they re-report)
  await prisma.report.upsert({
    where: { contentId_reporterId: { contentId: req.params.id, reporterId: req.user!.id } },
    create: {
      contentId: req.params.id,
      reporterId: req.user!.id,
      reason,
      detail: detail ? String(detail).slice(0, 500) : null,
    },
    update: {
      reason,
      detail: detail ? String(detail).slice(0, 500) : null,
      status: 'PENDING',
    },
  });

  res.json({ reported: true });
}

export async function downloadContent(req: AuthRequest, res: Response) {
  const plan   = req.user!.subscription?.plan;
  const status = req.user!.subscription?.status;
  const canDownload = req.user!.isAdmin || (
    (plan === 'PREMIUM' || plan === 'CREATOR') && status === 'ACTIVE'
  );

  if (!canDownload) {
    return res.status(403).json({ error: 'Premium subscription required to download content', requiresPremium: true });
  }

  const content = await prisma.content.findUnique({
    where: { id: req.params.id },
    select: { id: true, title: true, status: true, privacy: true, mediaUrl: true, creatorId: true },
  });

  if (!content || content.status === 'DELETED') {
    return res.status(404).json({ error: 'Content not found' });
  }

  if (content.privacy === 'PRIVATE' && req.user!.id !== content.creatorId && !req.user!.isAdmin) {
    return res.status(404).json({ error: 'Content not found' });
  }

  if (!content.mediaUrl) {
    return res.status(400).json({ error: 'No downloadable file for this content' });
  }

  const key  = extractKey(content.mediaUrl);
  const ext  = key.split('.').pop()?.toLowerCase() || 'bin';
  const safe = content.title.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-') || 'download';
  const url  = await getDownloadUrl(content.mediaUrl, `${safe}.${ext}`, 300);

  res.json({ url });
}

export async function unreportContent(req: AuthRequest, res: Response) {
  await prisma.report.deleteMany({
    where: { contentId: req.params.id, reporterId: req.user!.id },
  });
  res.json({ reported: false });
}

// ── Personalised Recommendations ──────────────────────────────────────────────

const CONTENT_LIGHT = {
  id: true, title: true, type: true, status: true, privacy: true,
  thumbnailUrl: true, duration: true, views: true, tags: true,
  createdAt: true, hlsUrl: true,
  creator: { select: { username: true, displayName: true, avatar: true } },
  _count: { select: { likes: true, comments: true } },
};

export async function getRecommended(req: AuthRequest, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    // Guest: return trending
    const items = await prisma.content.findMany({
      where: { status: 'ACTIVE', privacy: 'PUBLIC' },
      orderBy: { views: 'desc' },
      take: 20,
      select: CONTENT_LIGHT,
    });
    const signed = await Promise.all(items.map(async (i) => ({ ...i, thumbnailUrl: await signR2Url(i.thumbnailUrl) })));
    return res.json({ items: signed });
  }

  // Get last 30 items from watch history, extract their tags + types
  const history = await prisma.watchHistory.findMany({
    where: { userId },
    orderBy: { watchedAt: 'desc' },
    take: 30,
    include: { content: { select: { id: true, type: true, tags: true } } },
  });

  const watchedIds = history.map((h) => h.contentId);
  const tagFreq: Record<string, number> = {};
  const typeFreq: Record<string, number> = {};

  for (const h of history) {
    for (const tag of h.content.tags) {
      tagFreq[tag] = (tagFreq[tag] ?? 0) + 1;
    }
    typeFreq[h.content.type] = (typeFreq[h.content.type] ?? 0) + 1;
  }

  const topTags  = Object.entries(tagFreq).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t]) => t);
  const topTypes = Object.entries(typeFreq).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t);

  // Fetch candidate pool: match tags or type, not already watched
  const [byTags, byType] = await Promise.all([
    topTags.length > 0
      ? prisma.content.findMany({
          where: {
            status: 'ACTIVE',
            privacy: { in: ['PUBLIC', 'SUBSCRIBERS_ONLY'] },
            id: { notIn: watchedIds },
            tags: { hasSome: topTags },
          },
          orderBy: { views: 'desc' },
          take: 40,
          select: CONTENT_LIGHT,
        })
      : Promise.resolve([]),
    topTypes.length > 0
      ? prisma.content.findMany({
          where: {
            status: 'ACTIVE',
            privacy: { in: ['PUBLIC', 'SUBSCRIBERS_ONLY'] },
            id: { notIn: watchedIds },
            type: { in: topTypes as any[] },
          },
          orderBy: { views: 'desc' },
          take: 20,
          select: CONTENT_LIGHT,
        })
      : Promise.resolve([]),
  ]);

  // Score: tag overlap * 3 + type match * 2, deduplicate
  const seen = new Set<string>();
  const scored: Array<{ item: typeof byTags[0]; score: number }> = [];

  for (const item of [...byTags, ...byType]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    const tagScore  = item.tags.filter((t) => topTags.includes(t)).length * 3;
    const typeScore = topTypes.includes(item.type) ? 2 : 0;
    scored.push({ item, score: tagScore + typeScore });
  }

  scored.sort((a, b) => b.score - a.score || b.item.views - a.item.views);
  const items = scored.slice(0, 20).map((s) => s.item);

  const signed = await Promise.all(items.map(async (i) => ({ ...i, thumbnailUrl: await signR2Url(i.thumbnailUrl) })));
  res.json({ items: signed });
}
