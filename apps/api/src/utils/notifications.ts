import { prisma } from '../config/database';
import { NotificationType } from '@prisma/client';

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
}

/** Notify every follower of a creator that new content was posted */
export async function notifyFollowers(creatorId: string, contentId: string) {
  const followers = await prisma.follow.findMany({
    where: { followingId: creatorId },
    select: { followerId: true },
  });

  if (followers.length === 0) return;

  await prisma.notification.createMany({
    data: followers.map((f) => ({
      userId: f.followerId,
      type: NotificationType.NEW_CONTENT,
      actorId: creatorId,
      contentId,
    })),
    skipDuplicates: true,
  }).catch(() => {});
}
