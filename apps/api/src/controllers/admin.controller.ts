import { Request, Response } from 'express';
import { prisma } from '../config/database';

// ── Overview ──────────────────────────────────────────────────────────────────

export async function getStats(_req: Request, res: Response) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    totalContent,
    activeSubscriptions,
    viewsAgg,
    subscriptionBreakdown,
    recentUsers,
    usersPerDay,
    contentPerDay,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.content.count({ where: { status: 'ACTIVE' } }),
    prisma.subscription.count({ where: { status: 'ACTIVE', plan: { not: 'FREE' } } }),
    prisma.content.aggregate({ _sum: { views: true } }),

    // Subscription plan breakdown
    prisma.subscription.groupBy({
      by: ['plan'],
      where: { status: 'ACTIVE' },
      _count: { _all: true },
    }),

    // 10 most recent signups
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, username: true, displayName: true, createdAt: true,
                subscription: { select: { plan: true } } },
    }),

    // New users per day — last 30 days
    prisma.user.groupBy({
      by: ['createdAt'],
      where: { createdAt: { gte: thirtyDaysAgo } },
      _count: { _all: true },
    }),

    // New content per day — last 30 days
    prisma.content.groupBy({
      by: ['createdAt'],
      where: { createdAt: { gte: thirtyDaysAgo }, status: 'ACTIVE' },
      _count: { _all: true },
    }),
  ]);

  // Build 30-day growth map
  const growthMap: Record<string, { users: number; content: number }> = {};
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo.getTime() + i * 86_400_000);
    growthMap[d.toISOString().slice(0, 10)] = { users: 0, content: 0 };
  }
  for (const r of usersPerDay) {
    const key = new Date(r.createdAt).toISOString().slice(0, 10);
    if (growthMap[key]) growthMap[key].users += r._count._all;
  }
  for (const r of contentPerDay) {
    const key = new Date(r.createdAt).toISOString().slice(0, 10);
    if (growthMap[key]) growthMap[key].content += r._count._all;
  }
  const growth = Object.entries(growthMap).map(([date, counts]) => ({ date, ...counts }));

  // Subscription plan map
  const planCounts: Record<string, number> = { FREE: 0, PRO: 0, PREMIUM: 0 };
  for (const row of subscriptionBreakdown) planCounts[row.plan] = row._count._all;
  // Add free users (total users minus paid)
  planCounts.FREE = totalUsers - activeSubscriptions;

  res.json({
    stats: {
      totalUsers,
      totalContent,
      activeSubscriptions,
      totalViews: viewsAgg._sum.views || 0,
    },
    planCounts,
    growth,
    recentUsers,
  });
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function listUsers(req: Request, res: Response) {
  const { page = '1', limit = '20', search, plan } = req.query;

  const where: any = {};
  if (search) {
    const s = String(search);
    where.OR = [
      { username:    { contains: s, mode: 'insensitive' } },
      { email:       { contains: s, mode: 'insensitive' } },
      { displayName: { contains: s, mode: 'insensitive' } },
    ];
  }
  if (plan && plan !== 'ALL') {
    where.subscription = { plan: String(plan).toUpperCase() };
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, username: true, displayName: true,
        isAdmin: true, isCreator: true, isBanned: true, createdAt: true,
        subscription: { select: { plan: true, status: true } },
        _count: { select: { content: true, followers: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  res.json({ users, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
}

export async function toggleAdmin(req: Request, res: Response) {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { isAdmin: !user.isAdmin },
    select: { id: true, username: true, isAdmin: true },
  });
  res.json({ user: updated });
}

export async function toggleBan(req: Request, res: Response) {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.isAdmin) return res.status(400).json({ error: 'Cannot ban an admin' });

  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { isBanned: !user.isBanned },
    select: { id: true, username: true, isBanned: true },
  });
  res.json({ user: updated });
}

export async function deleteUser(req: Request, res: Response) {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.isAdmin) return res.status(400).json({ error: 'Cannot delete an admin account' });

  await prisma.user.delete({ where: { id: req.params.id } });
  res.json({ message: 'User deleted' });
}

// ── Content ───────────────────────────────────────────────────────────────────

export async function listAllContent(req: Request, res: Response) {
  const { page = '1', limit = '20', status, type, search } = req.query;

  const where: any = {};
  if (status && status !== 'ALL') where.status = String(status).toUpperCase();
  if (type   && type   !== 'ALL') where.type   = String(type).toUpperCase();
  if (search) {
    const s = String(search);
    where.OR = [
      { title:       { contains: s, mode: 'insensitive' } },
      { creator: { username: { contains: s, mode: 'insensitive' } } },
    ];
  }

  const [content, total] = await Promise.all([
    prisma.content.findMany({
      where,
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, title: true, type: true, status: true, privacy: true,
        views: true, createdAt: true,
        creator: { select: { username: true, email: true } },
        _count: { select: { likes: true, comments: true } },
      },
    }),
    prisma.content.count({ where }),
  ]);

  res.json({ content, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
}

export async function setContentStatus(req: Request, res: Response) {
  const { status } = req.body;
  if (!['ACTIVE', 'ARCHIVED', 'DELETED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const content = await prisma.content.update({
    where: { id: req.params.id },
    data: { status },
    select: { id: true, title: true, status: true },
  });
  res.json({ content });
}

// ── Reports ───────────────────────────────────────────────────────────────────

export async function listReports(req: Request, res: Response) {
  const { page = '1', limit = '20', status = 'PENDING' } = req.query;

  const where: any = {};
  if (status && status !== 'ALL') where.status = String(status).toUpperCase();

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where,
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        content: { select: { id: true, title: true, type: true, status: true, creator: { select: { username: true } } } },
        reporter: { select: { username: true, email: true } },
      },
    }),
    prisma.report.count({ where }),
  ]);

  res.json({ reports, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
}

export async function resolveReport(req: Request, res: Response) {
  const { action } = req.body; // 'REVIEWED' | 'DISMISSED'
  if (!['REVIEWED', 'DISMISSED'].includes(action)) {
    return res.status(400).json({ error: 'action must be REVIEWED or DISMISSED' });
  }

  const report = await prisma.report.update({
    where: { id: req.params.id },
    data: { status: action, resolvedAt: new Date() },
    select: { id: true, status: true },
  });
  res.json({ report });
}
