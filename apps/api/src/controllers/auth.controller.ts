import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { validationResult } from 'express-validator';
import { prisma } from '../config/database';
import { signToken } from '../utils/jwt';
import { AuthRequest } from '../middleware/auth';

export async function register(req: Request, res: Response) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, username, password, displayName } = req.body;

  const exists = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (exists) return res.status(400).json({ error: 'Email or username already taken' });

  const hashed = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { email, username: username.toLowerCase(), password: hashed, displayName },
  });

  // Give every new user a free subscription record
  await prisma.subscription.create({
    data: { userId: user.id, plan: 'FREE', status: 'ACTIVE' },
  });

  const token = signToken({ id: user.id, isAdmin: user.isAdmin });

  res.status(201).json({
    token,
    user: { id: user.id, email: user.email, username: user.username, displayName: user.displayName, isAdmin: user.isAdmin },
  });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ error: 'Invalid credentials' });

  const token = signToken({ id: user.id, isAdmin: user.isAdmin });

  res.json({
    token,
    user: { id: user.id, email: user.email, username: user.username, displayName: user.displayName, isAdmin: user.isAdmin },
  });
}

export async function getMe(req: AuthRequest, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true, email: true, username: true, displayName: true,
      avatar: true, bio: true, isAdmin: true, isCreator: true,
      createdAt: true,
      subscription: { select: { plan: true, status: true, currentPeriodEnd: true } },
      _count: { select: { content: true, likes: true } },
    },
  });
  res.json({ user });
}

export async function updateProfile(req: AuthRequest, res: Response) {
  const { displayName, bio, avatar } = req.body;

  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: { displayName, bio, avatar },
    select: { id: true, email: true, username: true, displayName: true, avatar: true, bio: true },
  });

  res.json({ user });
}
