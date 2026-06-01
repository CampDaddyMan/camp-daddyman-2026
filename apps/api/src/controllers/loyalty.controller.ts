import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/auth';

// ── Loyalty Shop ──────────────────────────────────────────────────────────────

export async function listRewards(req: AuthRequest, res: Response) {
  const rewards = await prisma.loyaltyReward.findMany({
    where: { active: true },
    orderBy: { xpCost: 'asc' },
  });

  const redeemedIds = req.user
    ? (await prisma.loyaltyRedemption.findMany({
        where: { userId: req.user.id },
        select: { rewardId: true },
      })).map((r) => r.rewardId)
    : [];

  res.json({
    rewards: rewards.map((r) => ({
      ...r,
      redeemed: redeemedIds.includes(r.id),
      soldOut: r.stock !== null && r.stock <= 0,
    })),
  });
}

export async function redeemReward(req: AuthRequest, res: Response) {
  const { id } = req.params;

  const reward = await prisma.loyaltyReward.findUnique({ where: { id } });
  if (!reward || !reward.active) {
    return res.status(404).json({ error: 'Reward not found' });
  }
  if (reward.stock !== null && reward.stock <= 0) {
    return res.status(400).json({ error: 'This reward is sold out' });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { xp: true },
  });
  if (!user || user.xp < reward.xpCost) {
    return res.status(400).json({ error: `Not enough XP. You need ${reward.xpCost} XP.` });
  }

  const existing = await prisma.loyaltyRedemption.findUnique({
    where: { userId_rewardId: { userId: req.user!.id, rewardId: id } },
  });
  if (existing) {
    return res.status(400).json({ error: 'You have already redeemed this reward' });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: req.user!.id },
      data: { xp: { decrement: reward.xpCost } },
    }),
    prisma.loyaltyRedemption.create({
      data: { userId: req.user!.id, rewardId: id, xpSpent: reward.xpCost },
    }),
    ...(reward.stock !== null
      ? [prisma.loyaltyReward.update({ where: { id }, data: { stock: { decrement: 1 } } })]
      : []),
  ]);

  res.json({ success: true, value: reward.value, type: reward.type });
}

export async function myRedemptions(req: AuthRequest, res: Response) {
  const redemptions = await prisma.loyaltyRedemption.findMany({
    where: { userId: req.user!.id },
    include: { reward: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ redemptions });
}

// ── Admin: Reward CRUD ────────────────────────────────────────────────────────

export async function adminListRewards(req: Request, res: Response) {
  const rewards = await prisma.loyaltyReward.findMany({ orderBy: { createdAt: 'desc' } });
  res.json({ rewards });
}

export async function adminCreateReward(req: Request, res: Response) {
  const { name, description, xpCost, type, value, stock } = req.body;
  if (!name || !xpCost || !type) {
    return res.status(400).json({ error: 'name, xpCost, and type are required' });
  }
  const reward = await prisma.loyaltyReward.create({
    data: {
      name, description: description || null,
      xpCost: Number(xpCost), type,
      value: value || null,
      stock: stock != null ? Number(stock) : null,
    },
  });
  res.status(201).json({ reward });
}

export async function adminUpdateReward(req: Request, res: Response) {
  const { name, description, xpCost, type, value, stock, active } = req.body;
  const data: any = {};
  if (name !== undefined)        data.name        = name;
  if (description !== undefined) data.description = description || null;
  if (xpCost !== undefined)      data.xpCost      = Number(xpCost);
  if (type !== undefined)        data.type        = type;
  if (value !== undefined)       data.value       = value || null;
  if (stock !== undefined)       data.stock       = stock != null ? Number(stock) : null;
  if (active !== undefined)      data.active      = Boolean(active);

  const reward = await prisma.loyaltyReward.update({ where: { id: req.params.id }, data });
  res.json({ reward });
}

export async function adminDeleteReward(req: Request, res: Response) {
  await prisma.loyaltyReward.delete({ where: { id: req.params.id } });
  res.json({ success: true });
}

// ── Leaderboards ──────────────────────────────────────────────────────────────

export async function globalLeaderboard(req: Request, res: Response) {
  const limit = Math.min(Number(req.query.limit) || 20, 50);

  const users = await prisma.user.findMany({
    where: { xp: { gt: 0 }, isBanned: false },
    orderBy: { xp: 'desc' },
    take: limit,
    select: {
      id: true, username: true, displayName: true, avatar: true,
      xp: true, currentStreak: true,
      badges: { select: { badge: true } },
    },
  });

  res.json({
    leaderboard: users.map((u, i) => ({
      rank: i + 1,
      username: u.username,
      displayName: u.displayName,
      avatar: u.avatar,
      xp: u.xp,
      currentStreak: u.currentStreak,
      badgeCount: u.badges.length,
    })),
  });
}

export async function creatorLeaderboard(req: Request, res: Response) {
  const { username } = req.params;
  const limit = Math.min(Number(req.query.limit) || 20, 50);

  const creator = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });
  if (!creator) return res.status(404).json({ error: 'Creator not found' });

  // Top fans = users who have watched/liked/commented on this creator's content most
  const events = await prisma.userXpEvent.groupBy({
    by: ['userId'],
    where: {
      type: { in: ['WATCH', 'LIKE', 'COMMENT'] },
      refId: {
        in: (await prisma.content.findMany({
          where: { creatorId: creator.id },
          select: { id: true },
        })).map((c) => c.id),
      },
    },
    _sum: { xp: true },
    orderBy: { _sum: { xp: 'desc' } },
    take: limit,
  });

  const userIds = events.map((e) => e.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, isBanned: false },
    select: { id: true, username: true, displayName: true, avatar: true, xp: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  res.json({
    leaderboard: events
      .map((e, i) => {
        const u = userMap.get(e.userId);
        if (!u) return null;
        return {
          rank: i + 1,
          username: u.username,
          displayName: u.displayName,
          avatar: u.avatar,
          xpEarned: e._sum.xp ?? 0,
        };
      })
      .filter(Boolean),
  });
}
