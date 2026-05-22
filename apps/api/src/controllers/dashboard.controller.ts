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

export async function getEarnings(req: AuthRequest, res: Response) {
  const userId = req.user!.id;
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [recentTips, chartTips, aggregate] = await Promise.all([
    prisma.tip.findMany({
      where: { recipientId: userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        amountCents: true,
        message: true,
        createdAt: true,
        sender: { select: { username: true, displayName: true, avatar: true } },
      },
    }),
    prisma.tip.findMany({
      where: { recipientId: userId, createdAt: { gte: sixMonthsAgo } },
      select: { amountCents: true, createdAt: true },
    }),
    prisma.tip.aggregate({
      where: { recipientId: userId },
      _sum: { amountCents: true },
      _count: { id: true },
    }),
  ]);

  // Build 6-month buckets
  const monthlyTotals: { label: string; cents: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end   = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const label = start.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    const cents = chartTips
      .filter((t) => { const d = new Date(t.createdAt); return d >= start && d < end; })
      .reduce((s, t) => s + t.amountCents, 0);
    monthlyTotals.push({ label, cents });
  }

  res.json({
    totalCents:    aggregate._sum.amountCents ?? 0,
    tipCount:      aggregate._count.id,
    recentTips,
    monthlyTotals,
  });
}
