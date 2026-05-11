import { Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/auth';

export async function getDashboard(req: AuthRequest, res: Response) {
  const userId = req.user!.id;
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Run everything in parallel
  const [
    contentList,
    followerCount,
    likesPerDay,
    commentsPerDay,
  ] = await Promise.all([
    // All creator content with per-piece engagement counts
    prisma.content.findMany({
      where: { creatorId: userId, status: { not: 'DELETED' } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, title: true, type: true, status: true, privacy: true,
        views: true, thumbnailUrl: true, createdAt: true,
        _count: { select: { likes: true, comments: true } },
      },
    }),

    // Follower count
    prisma.follow.count({ where: { followingId: userId } }),

    // Likes on creator's content over the last 30 days, grouped by day
    prisma.like.groupBy({
      by: ['createdAt'],
      where: {
        content: { creatorId: userId },
        createdAt: { gte: thirtyDaysAgo },
      },
      _count: { _all: true },
    }),

    // Comments on creator's content over the last 30 days, grouped by day
    prisma.comment.groupBy({
      by: ['createdAt'],
      where: {
        content: { creatorId: userId },
        createdAt: { gte: thirtyDaysAgo },
      },
      _count: { _all: true },
    }),
  ]);

  // Aggregate stats
  const totalViews  = contentList.reduce((sum, c) => sum + c.views, 0);
  const totalLikes  = contentList.reduce((sum, c) => sum + c._count.likes, 0);
  const totalComments = contentList.reduce((sum, c) => sum + c._count.comments, 0);

  // Top 5 content by views
  const topContent = [...contentList]
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  // Build a 30-day activity map: date string → { likes, comments }
  const activityMap: Record<string, { likes: number; comments: number }> = {};

  // Populate with zeroes for every day in the window
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
    activityMap[toDateStr(d)] = { likes: 0, comments: 0 };
  }

  for (const row of likesPerDay) {
    const key = toDateStr(new Date(row.createdAt));
    if (activityMap[key]) activityMap[key].likes += row._count._all;
  }
  for (const row of commentsPerDay) {
    const key = toDateStr(new Date(row.createdAt));
    if (activityMap[key]) activityMap[key].comments += row._count._all;
  }

  const activity = Object.entries(activityMap).map(([date, counts]) => ({ date, ...counts }));

  res.json({
    stats: {
      totalViews,
      totalLikes,
      totalComments,
      totalContent: contentList.length,
      followerCount,
    },
    topContent,
    activity,
    content: contentList,
  });
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}
