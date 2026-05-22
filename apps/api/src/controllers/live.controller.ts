import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/auth';

const CF_ACCOUNT_ID  = process.env.CLOUDFLARE_ACCOUNT_ID   || '';
const CF_STREAM_TOKEN = process.env.CLOUDFLARE_STREAM_TOKEN || '';
const CF_BASE = () => `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream/live_inputs`;

async function cfFetch(path: string, opts: RequestInit = {}) {
  return fetch(`${CF_BASE()}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${CF_STREAM_TOKEN}`,
      'Content-Type': 'application/json',
      ...(opts.headers ?? {}),
    },
  });
}

const CONTENT_SELECT = {
  id: true, title: true, description: true, status: true,
  thumbnailUrl: true, cfPlaybackUrl: true, cfStreamId: true,
  scheduledAt: true, startedAt: true, endedAt: true, createdAt: true,
  creator: { select: { username: true, displayName: true, avatar: true } },
};

export async function listLiveStreams(_req: Request, res: Response) {
  const streams = await prisma.liveStream.findMany({
    orderBy: { createdAt: 'desc' },
    select: CONTENT_SELECT,
  });
  res.json({ streams });
}

export async function getLiveStream(req: Request, res: Response) {
  const stream = await prisma.liveStream.findUnique({
    where: { id: req.params.id },
    select: { ...CONTENT_SELECT, cfStreamKey: true },
  });
  if (!stream) return res.status(404).json({ error: 'Stream not found' });
  res.json({ stream });
}

export async function createLiveStream(req: AuthRequest, res: Response) {
  if (!CF_ACCOUNT_ID || !CF_STREAM_TOKEN) {
    return res.status(503).json({ error: 'Live streaming not configured — set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_STREAM_TOKEN' });
  }

  const { title, description, scheduledAt } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Title required' });

  const cfRes = await cfFetch('', {
    method: 'POST',
    body: JSON.stringify({ meta: { name: title.trim() } }),
  });

  if (!cfRes.ok) {
    const err = await cfRes.json() as any;
    return res.status(502).json({ error: 'Cloudflare Stream error', details: err?.errors });
  }

  const cf = await cfRes.json() as any;
  const uid       = cf.result.uid as string;
  const streamKey = cf.result.rtmps.streamKey as string;
  const rtmpUrl   = (cf.result.rtmps.url as string) + streamKey;

  const playbackUrl = `https://videodelivery.net/${uid}/manifest/video.m3u8`;

  const stream = await prisma.liveStream.create({
    data: {
      title: title.trim(),
      description: description || null,
      cfStreamId:    uid,
      cfStreamKey:   streamKey,
      cfPlaybackUrl: playbackUrl,
      scheduledAt:   scheduledAt ? new Date(scheduledAt) : null,
      creatorId:     req.user!.id,
    },
    select: { ...CONTENT_SELECT, cfStreamKey: true },
  });

  res.status(201).json({ stream, rtmpUrl });
}

export async function updateLiveStream(req: AuthRequest, res: Response) {
  const { title, description, status, thumbnailUrl, scheduledAt } = req.body;
  const data: any = {};
  if (title       !== undefined) data.title       = title.trim();
  if (description !== undefined) data.description = description || null;
  if (thumbnailUrl !== undefined) data.thumbnailUrl = thumbnailUrl || null;
  if (scheduledAt !== undefined) data.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
  if (status !== undefined) {
    if (!['idle', 'live', 'ended'].includes(status)) {
      return res.status(400).json({ error: 'status must be idle | live | ended' });
    }
    data.status = status;
    if (status === 'live' && !data.startedAt)  data.startedAt = new Date();
    if (status === 'ended' && !data.endedAt)   data.endedAt   = new Date();
  }

  const stream = await prisma.liveStream.update({
    where: { id: req.params.id },
    data,
    select: CONTENT_SELECT,
  });
  res.json({ stream });
}

export async function deleteLiveStream(req: AuthRequest, res: Response) {
  const stream = await prisma.liveStream.findUnique({ where: { id: req.params.id }, select: { cfStreamId: true } });
  if (!stream) return res.status(404).json({ error: 'Not found' });

  if (CF_ACCOUNT_ID && CF_STREAM_TOKEN) {
    await cfFetch(`/${stream.cfStreamId}`, { method: 'DELETE' }).catch(() => {});
  }

  await prisma.liveStream.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}
