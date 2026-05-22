import webpush from 'web-push';
import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/auth';

const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY  || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_EMAIL   = process.env.VAPID_EMAIL       || 'mailto:admin@campdaddyman.com';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
}

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

export async function broadcastPush(req: AuthRequest, res: Response) {
  const { title, body, url, tag } = req.body;
  if (!title?.trim() || !body?.trim()) {
    return res.status(400).json({ error: 'title and body required' });
  }
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return res.status(503).json({ error: 'VAPID keys not configured' });
  }

  const subs = await prisma.pushSubscription.findMany();
  const payload = JSON.stringify({ title, body, url: url || '/', tag: tag || 'camp-daddyman' });

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush
        .sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload)
        .catch(async (err: any) => {
          if (err.statusCode === 404 || err.statusCode === 410) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          }
          throw err;
        })
    )
  );

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  res.json({ sent, total: subs.length });
}
