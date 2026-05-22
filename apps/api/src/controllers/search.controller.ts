import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { signR2Url } from '../utils/s3';
import { AuthRequest } from '../middleware/auth';

export async function unifiedSearch(req: Request, res: Response) {
  const { q, type, page = '1', limit = '12', sort = 'popular' } = req.query;
  const userId = (req as AuthRequest).user?.id;

  if (!q || String(q).trim().length < 2) {
    return res.status(400).json({ error: 'Search query must be at least 2 characters' });
  }

  const term = String(q).trim();
  const pageNum = Number(page);
  const take = Number(limit);
  const skip = (pageNum - 1) * take;

  const contentWhere: any = {
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
  if (type) contentWhere.type = String(type).toUpperCase();

  // When filtering by type, skip creator/album results — user is drilling into content
  const wideSearch = !type;

  const [rawContent, contentTotal, rawCreators, rawAlbums] = await Promise.all([
    prisma.content.findMany({
      where: contentWhere,
      orderBy: sort === 'latest' ? { createdAt: 'desc' as const } : { views: 'desc' as const },
      skip,
      take,
      select: {
        id: true, title: true, description: true, type: true,
        thumbnailUrl: true, duration: true, views: true, tags: true,
        createdAt: true,
        creator: { select: { username: true, displayName: true, avatar: true } },
        _count: { select: { likes: true, comments: true } },
      },
    }),
    prisma.content.count({ where: contentWhere }),

    wideSearch ? prisma.user.findMany({
      where: {
        isCreator: true,
        isBanned: false,
        OR: [
          { username:    { contains: term, mode: 'insensitive' } },
          { displayName: { contains: term, mode: 'insensitive' } },
          { bio:         { contains: term, mode: 'insensitive' } },
        ],
      },
      take: 4,
      select: {
        id: true, username: true, displayName: true, avatar: true, bio: true,
        _count: { select: { followers: true, content: true } },
      },
    }) : Promise.resolve([]),

    wideSearch ? prisma.album.findMany({
      where: {
        privacy: { in: ['PUBLIC', 'SUBSCRIBERS_ONLY'] },
        OR: [
          { title:       { contains: term, mode: 'insensitive' } },
          { description: { contains: term, mode: 'insensitive' } },
          { creator: { username:    { contains: term, mode: 'insensitive' } } },
          { creator: { displayName: { contains: term, mode: 'insensitive' } } },
        ],
      },
      take: 4,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, title: true, coverUrl: true, releaseType: true, createdAt: true,
        creator: { select: { username: true, displayName: true } },
        _count: { select: { tracks: true } },
      },
    }) : Promise.resolve([]),
  ]);

  const content = await Promise.all(rawContent.map(async (item) => ({
    ...item,
    thumbnailUrl: await signR2Url(item.thumbnailUrl),
  })));

  const creators = await Promise.all(rawCreators.map(async (c) => ({
    ...c,
    avatar: await signR2Url(c.avatar ?? null),
  })));

  const albums = await Promise.all(rawAlbums.map(async (a) => ({
    ...a,
    coverUrl: await signR2Url(a.coverUrl ?? null),
  })));

  res.json({
    query: term,
    creators,
    albums,
    content: { items: content, total: contentTotal, page: pageNum, pages: Math.ceil(contentTotal / take) },
  });
}
