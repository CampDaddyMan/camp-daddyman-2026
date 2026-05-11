import { prisma } from '../config/database';
import { NotificationType } from '@prisma/client';
import { sendNewFollowerEmail, sendNewContentEmail } from './email';

interface CreateNotificationArgs {
  userId: string;       // recipient
  type: NotificationType;
  actorId?: string;
  contentId?: string;
}

/** Fire-and-forget — never throws, never blocks the response */
export function notify(args: CreateNotificationArgs) {
  // Don't notify users about their own actions
  if (args.actorId && args.actorId === args.userId) return;

  prisma.notification.create({ data: args }).catch(() => {});

  // Send email for high-signal events
  if (args.type === 'NEW_FOLLOWER' && args.actorId) {
    sendFollowerEmail(args.userId, args.actorId).catch(() => {});
  }
}

/** Notify every follower of a creator that new content was posted */
export async function notifyFollowers(creatorId: string, contentId: string) {
  const [followers, content, creator] = await Promise.all([
    prisma.follow.findMany({
      where: { followingId: creatorId },
      select: { followerId: true },
    }),
    prisma.content.findUnique({ where: { id: contentId }, select: { title: true } }),
    prisma.user.findUnique({ where: { id: creatorId }, select: { username: true, displayName: true } }),
  ]);

  if (followers.length === 0 || !content || !creator) return;

  await prisma.notification.createMany({
    data: followers.map((f) => ({
      userId: f.followerId,
      type: NotificationType.NEW_CONTENT,
      actorId: creatorId,
      contentId,
    })),
    skipDuplicates: true,
  }).catch(() => {});

  // Email each follower (fire-and-forget per user)
  for (const { followerId } of followers) {
    sendContentEmail(followerId, creator, content.title, contentId).catch(() => {});
  }
}

// ── Email helpers (look up recipient then send) ───────────────────────────────

async function sendFollowerEmail(recipientId: string, actorId: string) {
  const [recipient, actor] = await Promise.all([
    prisma.user.findUnique({ where: { id: recipientId }, select: { email: true, username: true, emailVerified: true } }),
    prisma.user.findUnique({ where: { id: actorId },    select: { username: true, displayName: true } }),
  ]);
  if (!recipient?.emailVerified || !actor) return;
  await sendNewFollowerEmail(
    recipient.email,
    recipient.username,
    actor.username,
    actor.displayName || actor.username,
  );
}

async function sendContentEmail(
  recipientId: string,
  creator: { username: string; displayName?: string | null },
  contentTitle: string,
  contentId: string,
) {
  const recipient = await prisma.user.findUnique({
    where: { id: recipientId },
    select: { email: true, username: true, emailVerified: true },
  });
  if (!recipient?.emailVerified) return;
  await sendNewContentEmail(
    recipient.email,
    recipient.username,
    creator.displayName || creator.username,
    creator.username,
    contentTitle,
    contentId,
  );
}
