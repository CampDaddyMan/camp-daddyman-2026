import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { validationResult } from 'express-validator';
import { prisma } from '../config/database';
import { signToken } from '../utils/jwt';
import { AuthRequest } from '../middleware/auth';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from '../utils/email';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeToken() {
  return crypto.randomBytes(32).toString('hex');
}

// ── Register ──────────────────────────────────────────────────────────────────

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

  // Free subscription + verification token in parallel
  const verifyToken = makeToken();
  await Promise.all([
    prisma.subscription.create({ data: { userId: user.id, plan: 'FREE', status: 'ACTIVE' } }),
    prisma.token.create({
      data: {
        userId: user.id,
        type: 'EMAIL_VERIFICATION',
        token: verifyToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    }),
  ]);

  // Fire-and-forget — don't block registration if email fails
  sendVerificationEmail(email, user.displayName || user.username, verifyToken).catch(() => {});

  const jwt = signToken({ id: user.id, isAdmin: user.isAdmin });

  res.status(201).json({
    token: jwt,
    user: {
      id: user.id, email: user.email, username: user.username,
      displayName: user.displayName, isAdmin: user.isAdmin, emailVerified: false,
    },
  });
}

// ── Login ─────────────────────────────────────────────────────────────────────

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  if (user.isBanned) return res.status(403).json({ error: 'Account suspended', banned: true });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ error: 'Invalid credentials' });

  const jwt = signToken({ id: user.id, isAdmin: user.isAdmin });

  res.json({
    token: jwt,
    user: {
      id: user.id, email: user.email, username: user.username,
      displayName: user.displayName, isAdmin: user.isAdmin,
      emailVerified: user.emailVerified,
    },
  });
}

// ── Get me ────────────────────────────────────────────────────────────────────

export async function getMe(req: AuthRequest, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true, email: true, username: true, displayName: true,
      avatar: true, bio: true, isAdmin: true, isCreator: true,
      emailVerified: true, createdAt: true,
      subscription: { select: { plan: true, status: true, currentPeriodEnd: true } },
      _count: { select: { content: true, likes: true } },
    },
  });
  res.json({ user });
}

// ── Update profile ────────────────────────────────────────────────────────────

export async function updateProfile(req: AuthRequest, res: Response) {
  const { displayName, bio, avatar } = req.body;

  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: { displayName, bio, avatar },
    select: { id: true, email: true, username: true, displayName: true, avatar: true, bio: true },
  });

  res.json({ user });
}

// ── Verify email ──────────────────────────────────────────────────────────────

export async function verifyEmail(req: Request, res: Response) {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Token required' });

  const record = await prisma.token.findUnique({
    where: { token: String(token) },
    include: { user: true },
  });

  if (!record || record.type !== 'EMAIL_VERIFICATION') {
    return res.status(400).json({ error: 'Invalid or expired verification link' });
  }
  if (record.expiresAt < new Date()) {
    await prisma.token.delete({ where: { id: record.id } });
    return res.status(400).json({ error: 'Verification link has expired' });
  }

  await Promise.all([
    prisma.user.update({ where: { id: record.userId }, data: { emailVerified: true } }),
    prisma.token.delete({ where: { id: record.id } }),
  ]);

  res.json({ message: 'Email verified successfully' });
}

// ── Resend verification ───────────────────────────────────────────────────────

export async function resendVerification(req: AuthRequest, res: Response) {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.emailVerified) return res.status(400).json({ error: 'Email already verified' });

  // Delete any existing verification tokens for this user
  await prisma.token.deleteMany({ where: { userId: user.id, type: 'EMAIL_VERIFICATION' } });

  const token = makeToken();
  await prisma.token.create({
    data: {
      userId: user.id,
      type: 'EMAIL_VERIFICATION',
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  await sendVerificationEmail(user.email, user.displayName || user.username, token);
  res.json({ message: 'Verification email sent' });
}

// ── Forgot password ───────────────────────────────────────────────────────────

export async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const user = await prisma.user.findUnique({ where: { email } });

  // Always return success — don't reveal whether email exists
  if (!user) return res.json({ message: 'If that email exists, a reset link is on its way.' });

  // Delete any existing reset tokens
  await prisma.token.deleteMany({ where: { userId: user.id, type: 'PASSWORD_RESET' } });

  const token = makeToken();
  await prisma.token.create({
    data: {
      userId: user.id,
      type: 'PASSWORD_RESET',
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    },
  });

  await sendPasswordResetEmail(user.email, user.displayName || user.username, token);
  res.json({ message: 'If that email exists, a reset link is on its way.' });
}

// ── Reset password ────────────────────────────────────────────────────────────

export async function resetPassword(req: Request, res: Response) {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const record = await prisma.token.findUnique({
    where: { token: String(token) },
  });

  if (!record || record.type !== 'PASSWORD_RESET') {
    return res.status(400).json({ error: 'Invalid or expired reset link' });
  }
  if (record.expiresAt < new Date()) {
    await prisma.token.delete({ where: { id: record.id } });
    return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
  }

  const hashed = await bcrypt.hash(password, 12);
  await Promise.all([
    prisma.user.update({ where: { id: record.userId }, data: { password: hashed } }),
    prisma.token.delete({ where: { id: record.id } }),
  ]);

  res.json({ message: 'Password updated successfully' });
}
