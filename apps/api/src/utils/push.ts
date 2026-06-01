import webpush from 'web-push';
import Expo from 'expo-server-sdk';
import { prisma } from '../config/database';

const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY  || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_EMAIL   = process.env.VAPID_EMAIL || 'mailto:admin@campdaddyman.com';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
}

const expo = new Expo();

/** Broadcast push to all users with a registered push subscription. Fire-and-forget. */
export async function sendPushToAll(title: string, body: string, url = '/', tag = 'camp-daddyman') {
  const [webSubs, expoTokens] = await Promise.all([
    prisma.pushSubscription.findMany({ select: { userId: true } }),
    prisma.expoPushToken.findMany({ select: { userId: true } }),
  ]);
  const userIds = [...new Set([...webSubs.map((s) => s.userId), ...expoTokens.map((t) => t.userId)])];
  sendPushToUsers(userIds, title, body, url, tag);
}

/** Send push to a set of users via both web push (browser) and Expo (mobile). Fire-and-forget. */
export function sendPushToUsers(
  userIds: string[],
  title: string,
  body: string,
  url = '/',
  tag = 'camp-daddyman',
) {
  if (!userIds.length) return;
  _sendWebPush(userIds, title, body, url, tag).catch(() => {});
  _sendExpoPush(userIds, title, body, { url }).catch(() => {});
}

async function _sendWebPush(userIds: string[], title: string, body: string, url: string, tag: string) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;
  const subs = await prisma.pushSubscription.findMany({ where: { userId: { in: userIds } } });
  if (!subs.length) return;
  const payload = JSON.stringify({ title, body, url, tag });
  await Promise.allSettled(
    subs.map((sub) =>
      webpush
        .sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload)
        .catch(async (err: any) => {
          if (err.statusCode === 404 || err.statusCode === 410) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          }
        })
    )
  );
}

async function _sendExpoPush(userIds: string[], title: string, body: string, data: Record<string, string>) {
  const tokens = await prisma.expoPushToken.findMany({ where: { userId: { in: userIds } } });
  if (!tokens.length) return;

  const messages = tokens
    .filter((t) => Expo.isExpoPushToken(t.token))
    .map((t) => ({ to: t.token, title, body, data, sound: 'default' as const }));

  if (!messages.length) return;

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    const tickets = await expo.sendPushNotificationsAsync(chunk).catch(() => [] as typeof chunk);
    for (let i = 0; i < tickets.length; i++) {
      const ticket = (tickets as any)[i];
      if (ticket?.status === 'error' && ticket?.details?.error === 'DeviceNotRegistered') {
        const token = messages[i]?.to;
        if (token) await prisma.expoPushToken.deleteMany({ where: { token } }).catch(() => {});
      }
    }
  }
}
