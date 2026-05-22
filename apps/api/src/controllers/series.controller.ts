import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { signR2Url } from '../utils/s3';
import { AuthRequest } from '../middleware/auth';

const SERIES_SELECT = {
  id: true, title: true, description: true, coverUrl: true, bannerUrl: true,
  genre: true, tags: true, status: true, privacy: true, createdAt: true,
  creator: { select: { username: true, displayName: true, avatar: true } },
  _count: { select: { seasons: true } },
};

async function signSeries(s: any) {
  return {
    ...s,
    coverUrl:  await signR2Url(s.coverUrl),
    bannerUrl: await signR2Url(s.bannerUrl),
  };
}

// ── Public ────────────────────────────────────────────────────────────────────

export async function listSeries(req: AuthRequest, res: Response) {
  const { genre, creator } = req.query;
  const userId = req.user?.id;

  const where: any = { status: 'ACTIVE' };
  if (!userId) where.privacy = 'PUBLIC';
  else where.OR = [{ privacy: 'PUBLIC' }, { privacy: 'SUBSCRIBERS_ONLY' }];
  if (genre)   where.genre   = String(genre);
  if (creator) where.creator = { username: String(creator) };

  const series = await prisma.series.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      ...SERIES_SELECT,
      seasons: {
        select: {
          id: true, number: true,
          _count: { select: { episodes: true } },
        },
        orderBy: { number: 'asc' },
      },
    },
  });

  const signed = await Promise.all(series.map(signSeries));
  res.json({ series: signed });
}

export async function getSeries(req: AuthRequest, res: Response) {
  const userId = req.user?.id;

  const series = await prisma.series.findUnique({
    where: { id: req.params.id },
    include: {
      creator: { select: { username: true, displayName: true, avatar: true } },
      seasons: {
        orderBy: { number: 'asc' },
        include: {
          episodes: {
            orderBy: { episodeNumber: 'asc' },
            include: {
              content: {
                select: {
                  id: true, title: true, description: true, type: true,
                  thumbnailUrl: true, hlsUrl: true, mediaUrl: true,
                  duration: true, views: true, privacy: true, rating: true,
                  createdAt: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!series) return res.status(404).json({ error: 'Series not found' });
  if (series.privacy === 'PRIVATE' && series.creatorId !== userId) {
    return res.status(403).json({ error: 'Private series' });
  }

  // Sign media URLs
  const signedSeasons = await Promise.all(
    series.seasons.map(async (season) => ({
      ...season,
      episodes: await Promise.all(
        season.episodes.map(async (ep) => ({
          ...ep,
          content: {
            ...ep.content,
            thumbnailUrl: await signR2Url(ep.content.thumbnailUrl),
            mediaUrl:     await signR2Url(ep.content.mediaUrl, 4 * 3600),
          },
        }))
      ),
    }))
  );

  res.json({
    series: {
      ...series,
      coverUrl:  await signR2Url(series.coverUrl),
      bannerUrl: await signR2Url(series.bannerUrl),
      seasons: signedSeasons,
    },
  });
}

// ── Admin CRUD ────────────────────────────────────────────────────────────────

export async function createSeries(req: Request, res: Response) {
  const { title, description, genre, tags, privacy, status, creatorId } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Title required' });

  const adminId = (req as any).user.id;
  const series = await prisma.series.create({
    data: {
      title: title.trim(),
      description: description || null,
      genre: genre || null,
      tags: Array.isArray(tags) ? tags : String(tags || '').split(',').map((t: string) => t.trim()).filter(Boolean),
      privacy: privacy || 'PUBLIC',
      status: status || 'ACTIVE',
      creatorId: creatorId || adminId,
    },
    select: SERIES_SELECT,
  });
  res.status(201).json({ series: await signSeries(series) });
}

export async function updateSeries(req: Request, res: Response) {
  const { title, description, genre, tags, privacy, status, coverUrl, bannerUrl } = req.body;
  const data: any = {};
  if (title       !== undefined) data.title       = title.trim();
  if (description !== undefined) data.description = description || null;
  if (genre       !== undefined) data.genre       = genre || null;
  if (privacy     !== undefined) data.privacy     = privacy;
  if (status      !== undefined) data.status      = status;
  if (coverUrl    !== undefined) data.coverUrl    = coverUrl || null;
  if (bannerUrl   !== undefined) data.bannerUrl   = bannerUrl || null;
  if (tags        !== undefined) {
    data.tags = Array.isArray(tags) ? tags : String(tags).split(',').map((t: string) => t.trim()).filter(Boolean);
  }

  const series = await prisma.series.update({ where: { id: req.params.id }, data, select: SERIES_SELECT });
  res.json({ series: await signSeries(series) });
}

export async function deleteSeries(req: Request, res: Response) {
  await prisma.series.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}

// ── Seasons ───────────────────────────────────────────────────────────────────

export async function addSeason(req: Request, res: Response) {
  const { number, title, description } = req.body;
  if (!number) return res.status(400).json({ error: 'Season number required' });

  try {
    const season = await prisma.season.create({
      data: { seriesId: req.params.id, number: Number(number), title: title || null, description: description || null },
    });
    res.status(201).json({ season });
  } catch {
    res.status(409).json({ error: `Season ${number} already exists` });
  }
}

export async function updateSeason(req: Request, res: Response) {
  const { title, description } = req.body;
  const season = await prisma.season.update({
    where: { id: req.params.seasonId },
    data: { title: title || null, description: description || null },
  });
  res.json({ season });
}

export async function deleteSeason(req: Request, res: Response) {
  await prisma.season.delete({ where: { id: req.params.seasonId } });
  res.json({ ok: true });
}

// ── Episodes ──────────────────────────────────────────────────────────────────

export async function addEpisode(req: Request, res: Response) {
  const { contentId, episodeNumber } = req.body;
  if (!contentId || !episodeNumber) return res.status(400).json({ error: 'contentId and episodeNumber required' });

  try {
    const episode = await prisma.episode.create({
      data: { seasonId: req.params.seasonId, contentId, episodeNumber: Number(episodeNumber) },
      include: { content: { select: { id: true, title: true, type: true, duration: true } } },
    });
    res.status(201).json({ episode });
  } catch {
    res.status(409).json({ error: 'Episode number already taken or content already assigned to a series' });
  }
}

export async function removeEpisode(req: Request, res: Response) {
  await prisma.episode.deleteMany({ where: { seasonId: req.params.seasonId, contentId: req.params.contentId } });
  res.json({ ok: true });
}

export async function reorderEpisodes(req: Request, res: Response) {
  const { order } = req.body; // [{ contentId, episodeNumber }]
  if (!Array.isArray(order)) return res.status(400).json({ error: 'order array required' });

  await Promise.all(
    order.map(({ contentId, episodeNumber }: { contentId: string; episodeNumber: number }) =>
      prisma.episode.updateMany({
        where: { seasonId: req.params.seasonId, contentId },
        data: { episodeNumber },
      })
    )
  );
  res.json({ ok: true });
}

// ── Series Comments ───────────────────────────────────────────────────────────

export async function getSeriesComments(req: AuthRequest, res: Response) {
  const comments = await prisma.seriesComment.findMany({
    where: { seriesId: req.params.id, parentId: null },
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, username: true, displayName: true, avatar: true } },
      replies: {
        orderBy: { createdAt: 'asc' },
        include: { user: { select: { id: true, username: true, displayName: true, avatar: true } } },
      },
    },
  });
  res.json({ comments });
}

export async function addSeriesComment(req: AuthRequest, res: Response) {
  const { text, parentId } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'Text required' });

  if (parentId) {
    const parent = await prisma.seriesComment.findUnique({ where: { id: parentId } });
    if (!parent || parent.seriesId !== req.params.id) {
      return res.status(400).json({ error: 'Invalid parent comment' });
    }
  }

  const comment = await prisma.seriesComment.create({
    data: { text: text.trim(), userId: req.user!.id, seriesId: req.params.id, parentId: parentId || null },
    include: {
      user: { select: { id: true, username: true, displayName: true, avatar: true } },
      replies: { include: { user: { select: { id: true, username: true, displayName: true, avatar: true } } } },
    },
  });
  res.status(201).json({ comment });
}

export async function deleteSeriesComment(req: AuthRequest, res: Response) {
  const comment = await prisma.seriesComment.findUnique({ where: { id: req.params.commentId } });
  if (!comment) return res.status(404).json({ error: 'Comment not found' });

  const isOwner = comment.userId === req.user!.id;
  const isAdmin = (req.user as any)?.role === 'ADMIN';
  if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Forbidden' });

  await prisma.seriesComment.delete({ where: { id: req.params.commentId } });
  res.json({ ok: true });
}
