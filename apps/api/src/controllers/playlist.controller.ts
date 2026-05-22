import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { signR2Url } from '../utils/s3';

const PLAYLIST_SELECT = {
  id: true,
  name: true,
  description: true,
  coverUrl: true,
  isPublic: true,
  createdAt: true,
  updatedAt: true,
  userId: true,
  _count: { select: { items: true } },
};

async function signPlaylist(p: any) {
  return { ...p, coverUrl: await signR2Url(p.coverUrl) };
}

// GET /playlists — current user's playlists
export async function listPlaylists(req: Request, res: Response) {
  const userId = (req as any).user.id;
  const playlists = await prisma.playlist.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: PLAYLIST_SELECT,
  });
  const signed = await Promise.all(playlists.map(signPlaylist));
  res.json({ playlists: signed });
}

// POST /playlists — create playlist
export async function createPlaylist(req: Request, res: Response) {
  const userId = (req as any).user.id;
  const { name, description, isPublic } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });

  const playlist = await prisma.playlist.create({
    data: { userId, name: name.trim(), description: description || null, isPublic: Boolean(isPublic) },
    select: PLAYLIST_SELECT,
  });
  res.status(201).json({ playlist: await signPlaylist(playlist) });
}

// GET /playlists/:id — playlist detail with tracks
export async function getPlaylist(req: Request, res: Response) {
  const userId = (req as any).user?.id;
  const playlist = await prisma.playlist.findUnique({
    where: { id: req.params.id },
    include: {
      _count: { select: { items: true } },
      items: {
        orderBy: { position: 'asc' },
        include: {
          content: {
            select: {
              id: true, title: true, type: true, duration: true,
              thumbnailUrl: true, mediaUrl: true, hlsUrl: true,
              views: true, privacy: true,
              creator: { select: { username: true, displayName: true } },
            },
          },
        },
      },
    },
  });

  if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
  if (!playlist.isPublic && playlist.userId !== userId) {
    return res.status(403).json({ error: 'Private playlist' });
  }

  const signedItems = await Promise.all(
    playlist.items.map(async (item) => ({
      ...item,
      content: {
        ...item.content,
        thumbnailUrl: await signR2Url(item.content.thumbnailUrl),
        mediaUrl: await signR2Url(item.content.mediaUrl, 4 * 3600),
      },
    }))
  );

  res.json({ playlist: { ...playlist, coverUrl: await signR2Url(playlist.coverUrl), items: signedItems } });
}

// PATCH /playlists/:id — rename / update playlist
export async function updatePlaylist(req: Request, res: Response) {
  const userId = (req as any).user.id;
  const { name, description, isPublic } = req.body;

  const playlist = await prisma.playlist.findUnique({ where: { id: req.params.id } });
  if (!playlist) return res.status(404).json({ error: 'Not found' });
  if (playlist.userId !== userId) return res.status(403).json({ error: 'Forbidden' });

  const data: any = {};
  if (name !== undefined) data.name = name.trim();
  if (description !== undefined) data.description = description || null;
  if (isPublic !== undefined) data.isPublic = Boolean(isPublic);

  const updated = await prisma.playlist.update({ where: { id: req.params.id }, data, select: PLAYLIST_SELECT });
  res.json({ playlist: await signPlaylist(updated) });
}

// DELETE /playlists/:id
export async function deletePlaylist(req: Request, res: Response) {
  const userId = (req as any).user.id;
  const playlist = await prisma.playlist.findUnique({ where: { id: req.params.id } });
  if (!playlist) return res.status(404).json({ error: 'Not found' });
  if (playlist.userId !== userId) return res.status(403).json({ error: 'Forbidden' });

  await prisma.playlist.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}

// POST /playlists/:id/items — add content to playlist
export async function addToPlaylist(req: Request, res: Response) {
  const userId = (req as any).user.id;
  const { contentId } = req.body;
  if (!contentId) return res.status(400).json({ error: 'contentId required' });

  const playlist = await prisma.playlist.findUnique({ where: { id: req.params.id } });
  if (!playlist) return res.status(404).json({ error: 'Not found' });
  if (playlist.userId !== userId) return res.status(403).json({ error: 'Forbidden' });

  // Check content exists
  const content = await prisma.content.findUnique({ where: { id: contentId }, select: { id: true } });
  if (!content) return res.status(404).json({ error: 'Content not found' });

  // Get next position
  const last = await prisma.playlistItem.findFirst({
    where: { playlistId: req.params.id },
    orderBy: { position: 'desc' },
    select: { position: true },
  });
  const position = (last?.position ?? 0) + 1;

  try {
    await prisma.playlistItem.create({ data: { playlistId: req.params.id, contentId, position } });
    await prisma.playlist.update({ where: { id: req.params.id }, data: { updatedAt: new Date() } });
    res.json({ ok: true, position });
  } catch {
    // Duplicate — already in playlist
    res.status(409).json({ error: 'Already in playlist' });
  }
}

// DELETE /playlists/:id/items/:contentId — remove from playlist
export async function removeFromPlaylist(req: Request, res: Response) {
  const userId = (req as any).user.id;
  const playlist = await prisma.playlist.findUnique({ where: { id: req.params.id } });
  if (!playlist) return res.status(404).json({ error: 'Not found' });
  if (playlist.userId !== userId) return res.status(403).json({ error: 'Forbidden' });

  await prisma.playlistItem.deleteMany({
    where: { playlistId: req.params.id, contentId: req.params.contentId },
  });
  res.json({ ok: true });
}
