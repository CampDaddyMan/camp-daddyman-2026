import { prisma } from '../config/database';
import { NotificationType } from '@prisma/client';
import { sendNewFollowerEmail, sendNewContentEmail, sendNewCommentEmail, sendTipReceivedEmail } from './email';
import { sendPushToUsers } from './push';

interface CreateNotificationArgs {
  userId: string;       // recipient
  type: NotificationType;
  actorId?: string;
  contentId?: string;
}

/** Fire-and-forget — never throws, never blocks the response */
export function notify(args: CreateNotificationArgs) {
  if (args.actorId && args.actorId === args.userId) return;

  prisma.notification.create({ data: args }).catch(() => {});

  if (args.type === 'NEW_FOLLOWER' && args.actorId) {
    sendFollowerEmail(args.userId, args.actorId).catch(() => {});
    sendFollowerPush(args.userId, args.actorId).catch(() => {});
  }
  if (args.type === 'NEW_COMMENT' && args.actorId && args.contentId) {
    sendCommentEmail(args.userId, args.actorId, args.contentId).catch(() => {});
    sendCommentPush(args.userId, args.actorId, args.contentId).catch(() => {});
  }
  if (args.type === 'NEW_LIKE' && args.actorId && args.contentId) {
    sendLikePush(args.userId, args.actorId, args.contentId).catch(() => {});
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

  const followerIds = followers.map((f) => f.followerId);

  await prisma.notification.createMany({
    data: followerIds.map((userId) => ({
      userId,
      type: NotificationType.NEW_CONTENT,
      actorId: creatorId,
      contentId,
    })),
    skipDuplicates: true,
  }).catch(() => {});

  const creatorName = creator.displayName || creator.username;

  // Push to all followers who have push enabled (batch)
  const pushEligible = await prisma.user.findMany({
    where: { id: { in: followerIds }, pushNewContent: true },
    select: { id: true },
  });
  if (pushEligible.length) {
    sendPushToUsers(
      pushEligible.map((u) => u.id),
      `New from ${creatorName}`,
      `"${content.title}" is now available`,
      `/watch/${contentId}`,
      'new-content',
    );
  }

  // Email each follower (fire-and-forget per user)
  for (const followerId of followerIds) {
    sendContentEmail(followerId, creator, content.title, contentId).catch(() => {});
  }
}

// ── Milestone checks ──────────────────────────────────────────────────────────

const FOLLOWER_MILESTONES = [10, 25, 50, 100, 250, 500, 1000, 5000, 10000, 50000, 100000];
const VIEW_MILESTONES     = [100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000];

/** Call after a new follow is created — notifies creator if they just hit a milestone */
export async function checkFollowerMilestone(creatorId: string) {
  const [count, creator, followers] = await Promise.all([
    prisma.follow.count({ where: { followingId: creatorId } }),
    prisma.user.findUnique({ where: { id: creatorId }, select: { username: true, displayName: true } }),
    prisma.follow.findMany({ where: { followingId: creatorId }, select: { followerId: true } }),
  ]);
  if (!FOLLOWER_MILESTONES.includes(count)) return;
  const exists = await prisma.notification.findFirst({
    where: { userId: creatorId, type: 'MILESTONE', milestone: count, milestoneKind: 'FOLLOWERS' },
  });
  if (exists) return;

  const creatorName = creator?.displayName || creator?.username || 'Your creator';
  const formattedCount = formatMilestone(count);

  // Notify the creator
  prisma.notification.create({
    data: { userId: creatorId, type: NotificationType.MILESTONE, milestone: count, milestoneKind: 'FOLLOWERS' },
  }).catch(() => {});
  sendPushToUsers(
    [creatorId],
    `You're growing! 🎉`,
    `You hit ${formattedCount} followers — keep going!`,
    '/notifications',
    'milestone',
  );

  // Notify all followers — celebrate the milestone with the community
  const followerIds = followers.map((f) => f.followerId);
  if (followerIds.length > 0) {
    sendPushToUsers(
      followerIds,
      `${creatorName} just hit ${formattedCount} fans! 🎊`,
      `Be part of the movement — show some love.`,
      `/creator/${creator?.username}`,
      'milestone',
    );
  }
}

/** Call after a view is incremented — notifies creator if total views just hit a milestone */
export async function checkViewMilestone(creatorId: string) {
  const agg = await prisma.content.aggregate({
    where: { creatorId, status: 'ACTIVE' },
    _sum: { views: true },
  });
  const total = agg._sum.views ?? 0;
  if (!VIEW_MILESTONES.includes(total)) return;
  const exists = await prisma.notification.findFirst({
    where: { userId: creatorId, type: 'MILESTONE', milestone: total, milestoneKind: 'VIEWS' },
  });
  if (exists) return;
  prisma.notification.create({
    data: { userId: creatorId, type: NotificationType.MILESTONE, milestone: total, milestoneKind: 'VIEWS' },
  }).catch(() => {});
  sendPushToUsers(
    [creatorId],
    `You're on fire! 🔥`,
    `${formatMilestone(total)} total views — the people love it!`,
    '/notifications',
    'milestone',
  );
}

// ── Email helpers (look up recipient then send) ───────────────────────────────

async function sendFollowerEmail(recipientId: string, actorId: string) {
  const [recipient, actor] = await Promise.all([
    prisma.user.findUnique({
      where: { id: recipientId },
      select: { email: true, username: true, emailVerified: true, emailNewFollower: true },
    }),
    prisma.user.findUnique({ where: { id: actorId }, select: { username: true, displayName: true } }),
  ]);
  if (!recipient?.emailVerified || !recipient.emailNewFollower || !actor) return;
  await sendNewFollowerEmail(
    recipient.email,
    recipient.username,
    actor.username,
    actor.displayName || actor.username,
  );
}

async function sendCommentEmail(recipientId: string, actorId: string, contentId: string) {
  const [recipient, actor, content] = await Promise.all([
    prisma.user.findUnique({
      where: { id: recipientId },
      select: { email: true, username: true, emailVerified: true, emailNewComment: true },
    }),
    prisma.user.findUnique({ where: { id: actorId }, select: { username: true, displayName: true } }),
    prisma.content.findUnique({ where: { id: contentId }, select: { title: true } }),
  ]);
  if (!recipient?.emailVerified || !recipient.emailNewComment || !actor || !content) return;
  await sendNewCommentEmail(
    recipient.email,
    recipient.username,
    actor.displayName || actor.username,
    actor.username,
    content.title,
    contentId,
  );
}

/** Fire-and-forget tip notification + email + push */
export function notifyTip(recipientId: string, senderId: string, amountCents: number, message?: string | null) {
  if (recipientId === senderId) return;

  prisma.notification.create({
    data: { userId: recipientId, type: NotificationType.NEW_TIP, actorId: senderId },
  }).catch(() => {});

  sendTipEmail(recipientId, senderId, amountCents, message).catch(() => {});
  sendTipPush(recipientId, senderId).catch(() => {});
}

async function sendTipEmail(recipientId: string, senderId: string, amountCents: number, message?: string | null) {
  const [recipient, sender] = await Promise.all([
    prisma.user.findUnique({
      where: { id: recipientId },
      select: { email: true, username: true, emailVerified: true, emailNewTip: true },
    }),
    prisma.user.findUnique({ where: { id: senderId }, select: { username: true, displayName: true } }),
  ]);
  if (!recipient?.emailVerified || !recipient.emailNewTip || !sender) return;
  await sendTipReceivedEmail(
    recipient.email,
    recipient.username,
    sender.displayName || sender.username,
    sender.username,
    (amountCents / 100).toFixed(2),
    message,
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
    select: { email: true, username: true, emailVerified: true, emailNewContent: true },
  });
  if (!recipient?.emailVerified || !recipient.emailNewContent) return;
  await sendNewContentEmail(
    recipient.email,
    recipient.username,
    creator.displayName || creator.username,
    creator.username,
    contentTitle,
    contentId,
  );
}

// ── Push helpers ──────────────────────────────────────────────────────────────

async function sendFollowerPush(recipientId: string, actorId: string) {
  const [recipient, actor] = await Promise.all([
    prisma.user.findUnique({ where: { id: recipientId }, select: { pushNewFollower: true } }),
    prisma.user.findUnique({ where: { id: actorId }, select: { username: true, displayName: true } }),
  ]);
  if (!recipient?.pushNewFollower || !actor) return;
  sendPushToUsers([recipientId], 'New Follower', `${actor.displayName || actor.username} started following you`, '/notifications', 'new-follower');
}

async function sendCommentPush(recipientId: string, actorId: string, contentId: string) {
  const [recipient, actor, content] = await Promise.all([
    prisma.user.findUnique({ where: { id: recipientId }, select: { pushNewComment: true } }),
    prisma.user.findUnique({ where: { id: actorId }, select: { username: true, displayName: true } }),
    prisma.content.findUnique({ where: { id: contentId }, select: { title: true } }),
  ]);
  if (!recipient?.pushNewComment || !actor || !content) return;
  sendPushToUsers([recipientId], 'New Comment', `${actor.displayName || actor.username} commented on "${content.title}"`, `/watch/${contentId}`, 'new-comment');
}

async function sendLikePush(recipientId: string, actorId: string, contentId: string) {
  const [recipient, actor, content] = await Promise.all([
    prisma.user.findUnique({ where: { id: recipientId }, select: { pushNewContent: true } }),
    prisma.user.findUnique({ where: { id: actorId }, select: { username: true, displayName: true } }),
    prisma.content.findUnique({ where: { id: contentId }, select: { title: true } }),
  ]);
  if (!recipient?.pushNewContent || !actor || !content) return;
  sendPushToUsers([recipientId], 'New Like', `${actor.displayName || actor.username} liked "${content.title}"`, `/watch/${contentId}`, 'new-like');
}

async function sendTipPush(recipientId: string, senderId: string) {
  const [recipient, sender] = await Promise.all([
    prisma.user.findUnique({ where: { id: recipientId }, select: { pushNewTip: true } }),
    prisma.user.findUnique({ where: { id: senderId }, select: { username: true, displayName: true } }),
  ]);
  if (!recipient?.pushNewTip || !sender) return;
  sendPushToUsers([recipientId], 'You got a Strength! 💛', `${sender.displayName || sender.username} sent you a Strength`, '/notifications', 'new-tip');
}

function formatMilestone(n: number) {
  if (n >= 1_000_000) return `${n / 1_000_000}M`;
  if (n >= 1_000) return `${n / 1_000}K`;
  return String(n);
}
