import { Response } from 'express';
import { prisma } from '../config/database';
import { signR2Url, uploadToS3 } from '../utils/s3';
import { AuthRequest } from '../middleware/auth';

const trackInclude = {
  content: {
    select: {
      id: true, title: true, type: true, duration: true,
      thumbnailUrl: true, mediaUrl: true, hlsUrl: true,
      views: true, privacy: true, status: true,
      creator: { select: { id: true, username: true, displayName: true } },
    },
  },
};

async function enrichTrack(track: any, locked: boolean) {
  const c = track.content;
  return {
    ...track,
    content: {
      ...c,
      thumbnailUrl: await signR2Url(c.thumbnailUrl),
      mediaUrl: locked ? null : (c.mediaUrl ? await signR2Url(c.mediaUrl, 4 * 3600) : null),
      hlsUrl:   locked ? null : (c.hlsUrl   ? await signR2Url(c.hlsUrl,   4 * 3600) : null),
      locked,
    },
  };
}

// ── List albums ───────────────────────────────────────────────────────────────

export async function listAlbums(req: AuthRequest, res: Response) {
  const { creatorId, genre } = req.query;
  const where: any = { privacy: { in: ['PUBLIC', 'SUBSCRIBERS_ONLY'] } };
  if (creatorId) where.creatorId = String(creatorId);
  if (genre)     where.genre     = String(genre);

  const albums = await prisma.album.findMany({
    where,
    orderBy: [{ releaseDate: 'desc' }, { createdAt: 'desc' }],
    include: {
      creator: { select: { id: true, username: true, displayName: true } },
      _count:  { select: { tracks: true } },
    },
  });

  const enriched = await Promise.all(albums.map(async (a) => ({
    ...a,
    coverUrl: await signR2Url(a.coverUrl),
  })));

  res.json({ albums: enriched });
}

// ── Get single album with tracks ──────────────────────────────────────────────

export async function getAlbum(req: AuthRequest, res: Response) {
  const album = await prisma.album.findUnique({
    where: { id: req.params.id },
    include: {
      creator: { select: { id: true, username: true, displayName: true } },
      _count:  { select: { tracks: true } },
      tracks: {
        orderBy: [{ discNumber: 'asc' }, { trackNumber: 'asc' }],
        include: trackInclude,
      },
    },
  });
  if (!album) return res.status(404).json({ error: 'Album not found' });

  const isAdmin      = req.user?.isAdmin || false;
  const isSubscriber = !!(req.user?.subscription?.plan && req.user.subscription.plan !== 'FREE' && req.user.subscription.status === 'ACTIVE');
  const hasAccess    = isAdmin || isSubscriber;

  if (album.privacy === 'PRIVATE' && !isAdmin) {
    return res.status(404).json({ error: 'Album not found' });
  }

  const albumLocked = album.privacy === 'SUBSCRIBERS_ONLY' && !hasAccess;

  const signedTracks = await Promise.all(album.tracks.map((t) => {
    const trackLocked = albumLocked || (t.content.privacy === 'SUBSCRIBERS_ONLY' && !hasAccess);
    return enrichTrack(t, trackLocked);
  }));

  res.json({
    album: {
      ...album,
      coverUrl: await signR2Url(album.coverUrl),
      tracks: signedTracks,
      locked: albumLocked,
    },
  });
}

// ── Create album (admin only) ─────────────────────────────────────────────────

export async function createAlbum(req: AuthRequest, res: Response) {
  const { title, description, releaseDate, genre, privacy = 'PUBLIC', releaseType = 'ALBUM' } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });

  const album = await prisma.album.create({
    data: {
      title:       title.trim(),
      description: description?.trim() || null,
      releaseDate: releaseDate ? new Date(releaseDate) : null,
      genre:       genre?.trim() || null,
      privacy,
      releaseType,
      creatorId:   req.user!.id,
    },
    include: {
      creator: { select: { id: true, username: true, displayName: true } },
      _count:  { select: { tracks: true } },
    },
  });

  res.status(201).json({ album });
}

// ── Update album metadata (admin only) ────────────────────────────────────────

export async function updateAlbum(req: AuthRequest, res: Response) {
  const album = await prisma.album.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!album) return res.status(404).json({ error: 'Album not found' });

  const { title, description, releaseDate, genre, privacy, releaseType } = req.body;
  const data: Record<string, any> = {};
  if (title       !== undefined) data.title       = String(title).trim();
  if (description !== undefined) data.description = description?.trim() || null;
  if (releaseDate !== undefined) data.releaseDate  = releaseDate ? new Date(releaseDate) : null;
  if (genre       !== undefined) data.genre        = genre?.trim() || null;
  if (privacy     !== undefined) data.privacy      = privacy;
  if (releaseType !== undefined) data.releaseType  = releaseType;

  const updated = await prisma.album.update({
    where: { id: req.params.id },
    data,
    include: {
      creator: { select: { id: true, username: true, displayName: true } },
      _count:  { select: { tracks: true } },
    },
  });
  res.json({ album: { ...updated, coverUrl: await signR2Url(updated.coverUrl) } });
}

// ── Upload cover image (admin only) ──────────────────────────────────────────

export async function uploadAlbumCover(req: AuthRequest, res: Response) {
  const album = await prisma.album.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!album)    return res.status(404).json({ error: 'Album not found' });
  if (!req.file) return res.status(400).json({ error: 'No image provided' });

  const publicUrl = await uploadToS3(req.file, `albums/${req.params.id}`);
  await prisma.album.update({ where: { id: req.params.id }, data: { coverUrl: publicUrl } });
  res.json({ coverUrl: await signR2Url(publicUrl) });
}

// ── Add track (admin only) ────────────────────────────────────────────────────

export async function addTrack(req: AuthRequest, res: Response) {
  const album = await prisma.album.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!album) return res.status(404).json({ error: 'Album not found' });

  const { contentId, trackNumber, discNumber = 1 } = req.body;
  if (!contentId)               return res.status(400).json({ error: 'contentId is required' });
  if (trackNumber === undefined) return res.status(400).json({ error: 'trackNumber is required' });

  const content = await prisma.content.findUnique({
    where: { id: contentId },
    select: { id: true, type: true },
  });
  if (!content)                  return res.status(404).json({ error: 'Content not found' });
  if (content.type !== 'MUSIC')  return res.status(400).json({ error: 'Only MUSIC content can be added to albums' });

  const track = await prisma.albumTrack.upsert({
    where:  { albumId_contentId: { albumId: req.params.id, contentId } },
    create: { albumId: req.params.id, contentId, trackNumber: Number(trackNumber), discNumber: Number(discNumber) },
    update: { trackNumber: Number(trackNumber), discNumber: Number(discNumber) },
    include: trackInclude,
  });

  res.json({ track: await enrichTrack(track, false) });
}

// ── Remove track (admin only) ─────────────────────────────────────────────────

export async function removeTrack(req: AuthRequest, res: Response) {
  const { id, contentId } = req.params;
  const track = await prisma.albumTrack.findUnique({
    where: { albumId_contentId: { albumId: id, contentId } },
  });
  if (!track) return res.status(404).json({ error: 'Track not in album' });

  await prisma.albumTrack.delete({ where: { albumId_contentId: { albumId: id, contentId } } });
  res.json({ ok: true });
}

// ── Reorder tracks (admin only) ───────────────────────────────────────────────

export async function reorderTracks(req: AuthRequest, res: Response) {
  const album = await prisma.album.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!album) return res.status(404).json({ error: 'Album not found' });

  // tracks: [{ contentId, trackNumber, discNumber? }]
  const { tracks } = req.body;
  if (!Array.isArray(tracks)) return res.status(400).json({ error: 'tracks array required' });

  await Promise.all(tracks.map((t: any) =>
    prisma.albumTrack.update({
      where:  { albumId_contentId: { albumId: req.params.id, contentId: t.contentId } },
      data:   { trackNumber: Number(t.trackNumber), discNumber: Number(t.discNumber ?? 1) },
    })
  ));

  res.json({ ok: true });
}

// ── Delete album (admin only) ─────────────────────────────────────────────────

export async function deleteAlbum(req: AuthRequest, res: Response) {
  const album = await prisma.album.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!album) return res.status(404).json({ error: 'Album not found' });

  await prisma.album.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}
