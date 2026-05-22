import { Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/auth';

export async function getDashboard(req: AuthRequest, res: Response) {
  const userId = req.user!.id;
  const days = Math.min(90, Math.max(7, Number(req.query.days) || 30));
  const now = new Date();
  const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const [contentList, followerCount, likesRaw, commentsRaw, viewLogsRaw] = await Promise.all([
    prisma.content.findMany({
      where: { creatorId: userId, status: { not: 'DELETED' } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, title: true, type: true, status: true, privacy: true,
        views: true, thumbnailUrl: true, createdAt: true, publishAt: true,
        _count: { select: { likes: true, comments: true } },
      },
    }),

    prisma.follow.count({ where: { followingId: userId } }),

    prisma.like.findMany({
      where: { content: { creatorId: userId }, createdAt: { gte: since } },
      select: { createdAt: true },
    }),

    prisma.comment.findMany({
      where: { content: { creatorId: userId }, createdAt: { gte: since } },
      select: { createdAt: true },
    }),

    prisma.viewLog.findMany({
      where: { content: { creatorId: userId }, createdAt: { gte: since } },
      select: { createdAt: true },
    }),
  ]);

  const totalViews    = contentList.reduce((s, c) => s + c.views, 0);
  const totalLikes    = contentList.reduce((s, c) => s + c._count.likes, 0);
  const totalComments = contentList.reduce((s, c) => s + c._count.comments, 0);

  const topContent = [...contentList].sort((a, b) => b.views - a.views).slice(0, 5);

  // Build day-by-day activity map
  const activityMap: Record<string, { views: number; likes: number; comments: number }> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(since.getTime() + i * 24 * 60 * 60 * 1000);
    activityMap[toDateStr(d)] = { views: 0, likes: 0, comments: 0 };
  }

  for (const row of viewLogsRaw) {
    const key = toDateStr(new Date(row.createdAt));
    if (activityMap[key]) activityMap[key].views += 1;
  }
  for (const row of likesRaw) {
    const key = toDateStr(new Date(row.createdAt));
    if (activityMap[key]) activityMap[key].likes += 1;
  }
  for (const row of commentsRaw) {
    const key = toDateStr(new Date(row.createdAt));
    if (activityMap[key]) activityMap[key].comments += 1;
  }

  const activity = Object.entries(activityMap).map(([date, counts]) => ({ date, ...counts }));

  res.json({
    stats: { totalViews, totalLikes, totalComments, totalContent: contentList.length, followerCount },
    topContent,
    activity,
    content: contentList,
  });
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}
