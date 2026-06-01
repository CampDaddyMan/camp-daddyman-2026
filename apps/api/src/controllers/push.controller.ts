import webpush from 'web-push';
import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { sendPushToUsers } from '../utils/push';

const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY  || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_EMAIL   = process.env.VAPID_EMAIL       || 'mailto:admin@campdaddyman.com';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
}

// ── Web Push (browser) ────────────────────────────────────────────────────────

export function getVapidPublicKey(_req: Request, res: Response) {
  res.json({ publicKey: VAPID_PUBLIC });
}

export async function subscribePush(req: AuthRequest, res: Response) {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: 'Invalid subscription object' });
  }
  await prisma.pushSubscription.upsert({
    where:  { endpoint },
    update: { p256dh: keys.p256dh, auth: keys.auth, userId: req.user!.id },
    create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, userId: req.user!.id },
  });
  res.json({ ok: true });
}

export async function unsubscribePush(req: AuthRequest, res: Response) {
  const { endpoint } = req.body;
  if (endpoint) {
    await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: req.user!.id } });
  }
  res.json({ ok: true });
}

// ── Expo Push (mobile) ────────────────────────────────────────────────────────

export async function registerExpoToken(req: AuthRequest, res: Response) {
  const { token, platform } = req.body;
  if (!token || !platform) {
    return res.status(400).json({ error: 'token and platform required' });
  }
  await prisma.expoPushToken.upsert({
    where:  { token },
    update: { userId: req.user!.id, platform },
    create: { token, platform, userId: req.user!.id },
  });
  res.json({ ok: true });
}

export async function deregisterExpoToken(req: AuthRequest, res: Response) {
  const { token } = req.body;
  if (token) {
    await prisma.expoPushToken.deleteMany({ where: { token, userId: req.user!.id } });
  }
  res.json({ ok: true });
}

// ── Admin broadcast ───────────────────────────────────────────────────────────

export async function broadcastPush(req: AuthRequest, res: Response) {
  const { title, body, url, tag } = req.body;
  if (!title?.trim() || !body?.trim()) {
    return res.status(400).json({ error: 'title and body required' });
  }

  const [webSubs, expoTokens] = await Promise.all([
    prisma.pushSubscription.findMany({ select: { userId: true } }),
    prisma.expoPushToken.findMany({ select: { userId: true } }),
  ]);

  const userIds = [...new Set([
    ...webSubs.map((s) => s.userId),
    ...expoTokens.map((t) => t.userId),
  ])];

  sendPushToUsers(userIds, title.trim(), body.trim(), url || '/', tag || 'camp-daddyman');
  res.json({ queued: userIds.length });
}
