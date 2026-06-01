import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { signR2Url, uploadToS3 } from '../utils/s3';
import { AuthRequest } from '../middleware/auth';

const SERIES_SELECT = {
  id: true, title: true, description: true, coverUrl: true, bannerUrl: true, trailerUrl: true,
  genre: true, tags: true, status: true, privacy: true, createdAt: true,
  creator: { select: { username: true, displayName: true, avatar: true } },
  _count: { select: { seasons: true } },
};

async function signSeries(s: any) {
  return {
    ...s,
    coverUrl:   await signR2Url(s.coverUrl),
    bannerUrl:  await signR2Url(s.bannerUrl),
    trailerUrl: await signR2Url(s.trailerUrl, 4 * 3600),
  };
}

async function signEpisode(ep: any) {
  return {
    ...ep,
    thumbnailUrl: await signR2Url(ep.thumbnailUrl),
    mediaUrl:     await signR2Url(ep.mediaUrl, 4 * 3600),
  };
}

// ── Public ────────────────────────────────────────────────────────────────────

export async function listSeries(req: AuthRequest, res: Response) {
  const { genre, creator } = req.query;
  const userId = req.user?.id;
  const isAdmin = (req.user as any)?.role === 'ADMIN';

  const where: any = {};
  if (!isAdmin) {
    where.status = 'ACTIVE';
    if (!userId) where.privacy = 'PUBLIC';
    else where.OR = [{ privacy: 'PUBLIC' }, { privacy: 'SUBSCRIBERS_ONLY' }];
  }
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
          },
        },
      },
    },
  });

  if (!series) return res.status(404).json({ error: 'Series not found' });
  if (series.privacy === 'PRIVATE' && series.creatorId !== userId) {
    return res.status(403).json({ error: 'Private series' });
  }

  const signedSeasons = await Promise.all(
    series.seasons.map(async (season) => ({
      ...season,
      coverUrl: await signR2Url((season as any).coverUrl),
      episodes: await Promise.all(season.episodes.map(signEpisode)),
    }))
  );

  res.json({
    series: {
      ...series,
      coverUrl:   await signR2Url(series.coverUrl),
      bannerUrl:  await signR2Url(series.bannerUrl),
      trailerUrl: await signR2Url((series as any).trailerUrl, 4 * 3600),
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
  const { title, description, genre, tags, privacy, status, coverUrl, bannerUrl, trailerUrl } = req.body;
  const data: any = {};
  if (title       !== undefined) data.title       = title.trim();
  if (description !== undefined) data.description = description || null;
  if (genre       !== undefined) data.genre       = genre || null;
  if (privacy     !== undefined) data.privacy     = privacy;
  if (status      !== undefined) data.status      = status;
  if (coverUrl    !== undefined) data.coverUrl    = coverUrl || null;
  if (bannerUrl   !== undefined) data.bannerUrl   = bannerUrl || null;
  if (trailerUrl  !== undefined) data.trailerUrl  = trailerUrl || null;
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

// ── Series media uploads ──────────────────────────────────────────────────────

export async function uploadSeriesCover(req: Request, res: Response) {
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) return res.status(400).json({ error: 'No file provided' });
  const url = await uploadToS3(file, 'series/covers');
  const series = await prisma.series.update({
    where: { id: req.params.id },
    data: { coverUrl: url },
    select: SERIES_SELECT,
  });
  res.json({ series: await signSeries(series) });
}

const VIDEO_MIME: Record<string, string> = {
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
  avi: 'video/x-msvideo', mkv: 'video/x-matroska', ogv: 'video/ogg',
};

export async function uploadSeriesTrailer(req: Request, res: Response) {
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) return res.status(400).json({ error: 'No file provided' });
  const ext = file.originalname.split('.').pop()?.toLowerCase() ?? '';
  if (VIDEO_MIME[ext]) file.mimetype = VIDEO_MIME[ext];
  if (!file.mimetype.startsWith('video/')) {
    return res.status(400).json({ error: 'File must be a video (mp4, webm, mov, etc.)' });
  }
  const url = await uploadToS3(file, 'series/trailers');
  const series = await prisma.series.update({
    where: { id: req.params.id },
    data: { trailerUrl: url },
    select: SERIES_SELECT,
  });
  res.json({ series: await signSeries(series) });
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

export async function uploadSeasonCover(req: Request, res: Response) {
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) return res.status(400).json({ error: 'No file provided' });
  const url = await uploadToS3(file, 'series/season-covers');
  const season = await prisma.season.update({
    where: { id: req.params.seasonId },
    data: { coverUrl: url },
  });
  res.json({ season: { ...season, coverUrl: await signR2Url(season.coverUrl) } });
}

// ── Episodes ──────────────────────────────────────────────────────────────────

export async function addEpisode(req: Request, res: Response) {
  const { title, description, episodeNumber } = req.body;
  if (!title?.trim())  return res.status(400).json({ error: 'title required' });
  if (!episodeNumber)  return res.status(400).json({ error: 'episodeNumber required' });

  try {
    const episode = await prisma.episode.create({
      data: {
        seasonId: req.params.seasonId,
        episodeNumber: Number(episodeNumber),
        title: title.trim(),
        description: description || null,
      },
    });
    res.status(201).json({ episode });
  } catch {
    res.status(409).json({ error: 'Episode number already taken in this season' });
  }
}

export async function updateEpisode(req: Request, res: Response) {
  const { title, description, rating } = req.body;
  const data: any = {};
  if (title       !== undefined) data.title       = title.trim();
  if (description !== undefined) data.description = description || null;
  if (rating      !== undefined) data.rating      = rating || null;
  const episode = await prisma.episode.update({ where: { id: req.params.episodeId }, data });
  res.json({ episode: await signEpisode(episode) });
}

export async function removeEpisode(req: Request, res: Response) {
  await prisma.episode.delete({ where: { id: req.params.episodeId } });
  res.json({ ok: true });
}

export async function reorderEpisodes(req: Request, res: Response) {
  const { order } = req.body; // [{ episodeId, episodeNumber }]
  if (!Array.isArray(order)) return res.status(400).json({ error: 'order array required' });

  await Promise.all(
    order.map(({ episodeId, episodeNumber }: { episodeId: string; episodeNumber: number }) =>
      prisma.episode.update({ where: { id: episodeId }, data: { episodeNumber } })
    )
  );
  res.json({ ok: true });
}

export async function uploadEpisodeThumbnail(req: Request, res: Response) {
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) return res.status(400).json({ error: 'No file provided' });
  const url = await uploadToS3(file, 'series/episode-thumbnails');
  const episode = await prisma.episode.update({
    where: { id: req.params.episodeId },
    data: { thumbnailUrl: url },
  });
  res.json({ episode: await signEpisode(episode) });
}

export async function uploadEpisodeVideo(req: Request, res: Response) {
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) return res.status(400).json({ error: 'No file provided' });
  const ext = file.originalname.split('.').pop()?.toLowerCase() ?? '';
  if (VIDEO_MIME[ext]) file.mimetype = VIDEO_MIME[ext];
  if (!file.mimetype.startsWith('video/')) {
    return res.status(400).json({ error: 'File must be a video (mp4, webm, mov, etc.)' });
  }
  const url = await uploadToS3(file, 'series/episode-videos');
  const episode = await prisma.episode.update({
    where: { id: req.params.episodeId },
    data: { mediaUrl: url },
  });
  res.json({ episode: await signEpisode(episode) });
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
