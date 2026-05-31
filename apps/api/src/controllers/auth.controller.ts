import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { validationResult } from 'express-validator';
import { prisma } from '../config/database';
import { signToken } from '../utils/jwt';
import { AuthRequest } from '../middleware/auth';
import { uploadToS3, deleteFromS3 } from '../utils/s3';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendTwoFactorEmail,
  sendNewDeviceLoginEmail,
} from '../utils/email';
import { sendReferralSignupEmail } from '../utils/email';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeToken() {
  return crypto.randomBytes(32).toString('hex');
}

function make6DigitCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function parseIp(req: Request): string {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

async function createSession(
  userId: string,
  deviceId: string,
  deviceLabel: string,
  ipAddress: string,
  userAgent: string | undefined,
): Promise<string> {
  // Remove any existing session for this device
  await prisma.session.deleteMany({ where: { userId, deviceId } });

  const jwtId = crypto.randomUUID();
  await prisma.session.create({
    data: {
      userId,
      jwtId,
      deviceId,
      deviceLabel,
      ipAddress,
      userAgent: userAgent || null,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });
  return jwtId;
}

async function createTwoFactorToken(
  userId: string,
  type: 'TWO_FACTOR_LOGIN' | 'TWO_FACTOR_REGISTER',
  deviceId: string,
  deviceLabel: string,
  ipAddress: string,
  userAgent: string | undefined,
): Promise<{ challengeId: string; code: string }> {
  // Delete any existing 2FA tokens of this type for this user
  await prisma.token.deleteMany({ where: { userId, type } });

  const code = make6DigitCode();
  const hashedCode = await bcrypt.hash(code, 4);
  const challengeId = makeToken();

  await prisma.token.create({
    data: {
      userId,
      type,
      token: challengeId,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
      metadata: JSON.stringify({ hashedCode, deviceId, deviceLabel, ipAddress, userAgent: userAgent || '' }),
    },
  });

  return { challengeId, code };
}

// ── Register ──────────────────────────────────────────────────────────────────

export async function register(req: Request, res: Response) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, username, password, displayName, deviceId, deviceLabel, referralCode } = req.body;

  const exists = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (exists) return res.status(400).json({ error: 'Email or username already taken' });

  // Resolve referral
  let referredById: string | undefined;
  if (referralCode?.trim()) {
    const referrer = await prisma.user.findUnique({
      where: { username: referralCode.trim().toLowerCase() },
      select: { id: true },
    });
    if (referrer) referredById = referrer.id;
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, username: username.toLowerCase(), password: hashed, displayName, referredById },
  });

  // Create free subscription
  await prisma.subscription.create({ data: { userId: user.id, plan: 'FREE', status: 'ACTIVE' } });

  // Notify referrer
  if (referredById) {
    const referrer = await prisma.user.findUnique({
      where: { id: referredById },
      select: { email: true, username: true, displayName: true, emailVerified: true },
    }).catch(() => null);
    if (referrer?.emailVerified) {
      sendReferralSignupEmail(
        referrer.email,
        referrer.displayName || referrer.username,
        user.displayName || user.username,
      ).catch(() => {});
    }
  }

  // Issue 2FA challenge to verify email ownership
  const ip = parseIp(req);
  const ua = req.headers['user-agent'];
  const { challengeId, code } = await createTwoFactorToken(
    user.id, 'TWO_FACTOR_REGISTER', deviceId || '', deviceLabel || 'Unknown browser', ip, ua,
  );

  sendTwoFactorEmail(email, displayName || username, code, 'register').catch(() => {});

  res.status(201).json({ requiresTwoFactor: true, challengeId });
}

// ── Login ─────────────────────────────────────────────────────────────────────

export async function login(req: Request, res: Response) {
  const { email, password, deviceId, deviceLabel } = req.body;

  const user = await prisma.user.findUnique({
    where: { email },
    include: { subscription: { select: { plan: true, status: true } } },
  });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  if (user.isBanned) return res.status(403).json({ error: 'Account suspended', banned: true });

  // Check account lockout
  if ((user as any).lockedUntil && (user as any).lockedUntil > new Date()) {
    const minutesLeft = Math.ceil(((user as any).lockedUntil.getTime() - Date.now()) / 60_000);
    return res.status(423).json({
      error: `Account locked due to too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? '' : 's'}.`,
    });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    const attempts = ((user as any).loginAttempts || 0) + 1;
    const lockout = attempts >= 5 ? { lockedUntil: new Date(Date.now() + 30 * 60_000) } : {};
    await prisma.user.update({
      where: { id: user.id },
      data: { loginAttempts: attempts, ...lockout } as any,
    });
    const remaining = Math.max(0, 5 - attempts);
    return res.status(401).json({
      error: remaining > 0
        ? `Invalid credentials. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before lockout.`
        : 'Invalid credentials. Account locked for 30 minutes.',
    });
  }

  // Successful auth — reset lockout counter
  await prisma.user.update({
    where: { id: user.id },
    data: { loginAttempts: 0, lockedUntil: null } as any,
  });

  const ip = parseIp(req);
  const ua = req.headers['user-agent'];
  const now = new Date();

  // Testers only: bypass 2FA and conflict detection (for QA multi-device testing)
  if (user.isTester) {
    const jwtId = await createSession(user.id, deviceId || '', deviceLabel || 'Unknown browser', ip, ua);
    const token = signToken({ id: user.id, isAdmin: user.isAdmin }, jwtId);
    return res.json({
      token,
      user: {
        id: user.id, email: user.email, username: user.username,
        displayName: user.displayName, isAdmin: user.isAdmin, isTester: user.isTester,
        emailVerified: user.emailVerified, subscription: user.subscription,
      },
    });
  }

  // Fetch all active sessions
  const activeSessions = await prisma.session.findMany({
    where: { userId: user.id, expiresAt: { gt: now } },
  });

  const sameDeviceSession = activeSessions.find((s) => s.deviceId === deviceId);
  const otherDeviceSessions = activeSessions.filter((s) => s.deviceId !== deviceId);

  // Happy path: known device, no conflicts
  if (sameDeviceSession && otherDeviceSessions.length === 0) {
    const jwtId = await createSession(user.id, deviceId, deviceLabel || 'Unknown browser', ip, ua);
    const token = signToken({ id: user.id, isAdmin: user.isAdmin }, jwtId);
    return res.json({
      token,
      user: {
        id: user.id, email: user.email, username: user.username,
        displayName: user.displayName, isAdmin: user.isAdmin, isTester: user.isTester,
        emailVerified: user.emailVerified, subscription: user.subscription,
      },
    });
  }

  // 2FA required: new device or conflict detected
  const { challengeId, code } = await createTwoFactorToken(
    user.id, 'TWO_FACTOR_LOGIN', deviceId || '', deviceLabel || 'Unknown browser', ip, ua,
  );

  sendTwoFactorEmail(email, user.displayName || user.username, code, 'login').catch(() => {});

  const hasConflict = otherDeviceSessions.length > 0;
  const conflictSession = otherDeviceSessions[0];

  res.json({
    requiresTwoFactor: true,
    challengeId,
    ...(hasConflict && {
      activeSession: {
        deviceLabel: conflictSession.deviceLabel,
        ipAddress: conflictSession.ipAddress,
        lastActiveAt: conflictSession.lastActiveAt,
      },
    }),
  });
}

// ── Verify 2FA ────────────────────────────────────────────────────────────────

export async function verifyTwoFactor(req: Request, res: Response) {
  const { challengeId, code } = req.body;
  if (!challengeId || !code) return res.status(400).json({ error: 'challengeId and code are required' });

  const record = await prisma.token.findUnique({ where: { token: challengeId } });
  if (!record) return res.status(400).json({ error: 'Invalid or expired code' });
  if (record.type !== 'TWO_FACTOR_LOGIN' && record.type !== 'TWO_FACTOR_REGISTER') {
    return res.status(400).json({ error: 'Invalid token type' });
  }
  if (record.expiresAt < new Date()) {
    await prisma.token.delete({ where: { id: record.id } });
    return res.status(400).json({ error: 'Code expired — please request a new one' });
  }

  const meta = JSON.parse(record.metadata || '{}');
  const codeMatch = await bcrypt.compare(String(code), meta.hashedCode || '');
  if (!codeMatch) return res.status(400).json({ error: 'Incorrect code' });

  // Code is valid — consume it
  await prisma.token.delete({ where: { id: record.id } });

  const user = await prisma.user.findUnique({
    where: { id: record.userId },
    select: {
      id: true, email: true, username: true, displayName: true,
      isAdmin: true, isTester: true, emailVerified: true,
      subscription: { select: { plan: true, status: true } },
    },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { deviceId, deviceLabel, ipAddress, userAgent } = meta;
  const now = new Date();

  // Check for active sessions on other devices
  const conflictSessions = await prisma.session.findMany({
    where: { userId: user.id, deviceId: { not: deviceId }, expiresAt: { gt: now } },
  });

  if (conflictSessions.length > 0) {
    // Issue a short-lived force token so the client can finalize after conflict resolution
    const forceId = makeToken();
    await prisma.token.create({
      data: {
        userId: user.id,
        type: 'FORCE_SESSION',
        token: forceId,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min
        metadata: JSON.stringify({ deviceId, deviceLabel, ipAddress, userAgent }),
      },
    });

    return res.json({
      requiresForce: true,
      forceId,
      activeSession: {
        deviceLabel: conflictSessions[0].deviceLabel,
        ipAddress: conflictSessions[0].ipAddress,
        lastActiveAt: conflictSessions[0].lastActiveAt,
      },
    });
  }

  // No conflict — create session immediately
  const jwtId = await createSession(user.id, deviceId, deviceLabel, ipAddress, userAgent);

  // For registration: send email verification link now
  if (record.type === 'TWO_FACTOR_REGISTER') {
    const verifyToken = makeToken();
    await prisma.token.create({
      data: {
        userId: user.id,
        type: 'EMAIL_VERIFICATION',
        token: verifyToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    sendVerificationEmail(user.email, user.displayName || user.username, verifyToken).catch(() => {});
  } else {
    // Login from new device — notify user
    sendNewDeviceLoginEmail(user.email, user.displayName || user.username, deviceLabel, ipAddress).catch(() => {});
  }

  const token = signToken({ id: user.id, isAdmin: user.isAdmin }, jwtId);
  const isRegistration = record.type === 'TWO_FACTOR_REGISTER';

  res.status(isRegistration ? 201 : 200).json({
    token,
    user: {
      id: user.id, email: user.email, username: user.username,
      displayName: user.displayName, isAdmin: user.isAdmin, isTester: user.isTester,
      emailVerified: user.emailVerified, subscription: user.subscription,
    },
  });
}

// ── Force Login (after conflict resolution) ───────────────────────────────────

export async function forceLogin(req: Request, res: Response) {
  const { forceId } = req.body;
  if (!forceId) return res.status(400).json({ error: 'forceId is required' });

  const record = await prisma.token.findUnique({ where: { token: forceId } });
  if (!record || record.type !== 'FORCE_SESSION') {
    return res.status(400).json({ error: 'Invalid or expired session token' });
  }
  if (record.expiresAt < new Date()) {
    await prisma.token.delete({ where: { id: record.id } });
    return res.status(400).json({ error: 'Session token expired — please sign in again' });
  }

  await prisma.token.delete({ where: { id: record.id } });

  const meta = JSON.parse(record.metadata || '{}');
  const { deviceId, deviceLabel, ipAddress, userAgent } = meta;

  // Revoke ALL other sessions for this user
  await prisma.session.deleteMany({ where: { userId: record.userId } });

  const user = await prisma.user.findUnique({
    where: { id: record.userId },
    select: {
      id: true, email: true, username: true, displayName: true,
      isAdmin: true, isTester: true, emailVerified: true,
      subscription: { select: { plan: true, status: true } },
    },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const jwtId = await createSession(user.id, deviceId, deviceLabel, ipAddress, userAgent);
  sendNewDeviceLoginEmail(user.email, user.displayName || user.username, deviceLabel, ipAddress).catch(() => {});

  const token = signToken({ id: user.id, isAdmin: user.isAdmin }, jwtId);
  res.json({
    token,
    user: {
      id: user.id, email: user.email, username: user.username,
      displayName: user.displayName, isAdmin: user.isAdmin, isTester: user.isTester,
      emailVerified: user.emailVerified, subscription: user.subscription,
    },
  });
}

// ── Logout ────────────────────────────────────────────────────────────────────

export async function logout(req: AuthRequest, res: Response) {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    const { verifyToken } = await import('../utils/jwt');
    const decoded = verifyToken(token);
    if (decoded?.jti) {
      await prisma.session.deleteMany({ where: { jwtId: decoded.jti } }).catch(() => {});
    }
  }
  res.json({ ok: true });
}

// ── Get me ────────────────────────────────────────────────────────────────────

export async function getMe(req: AuthRequest, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true, email: true, username: true, displayName: true,
      avatar: true, bio: true, isAdmin: true, isCreator: true,
      emailVerified: true, createdAt: true, xp: true,
      subscription: { select: { plan: true, status: true, currentPeriodEnd: true } },
      _count: { select: { content: true, likes: true } },
    },
  });
  res.json({ user });
}

// ── Update profile ────────────────────────────────────────────────────────────

export async function updateProfile(req: AuthRequest, res: Response) {
  const { displayName, bio } = req.body;

  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: { displayName, bio },
    select: { id: true, email: true, username: true, displayName: true, avatar: true, bio: true },
  });

  res.json({ user });
}

export async function uploadAvatar(req: AuthRequest, res: Response) {
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) return res.status(400).json({ error: 'Image file required' });

  const existing = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { avatar: true },
  });
  if (existing?.avatar) {
    deleteFromS3(existing.avatar).catch(() => {});
  }

  const avatarUrl = await uploadToS3(file, 'avatars');

  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: { avatar: avatarUrl },
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
  if (!user) return res.json({ message: 'If that email exists, a reset link is on its way.' });

  await prisma.token.deleteMany({ where: { userId: user.id, type: 'PASSWORD_RESET' } });

  const token = makeToken();
  await prisma.token.create({
    data: {
      userId: user.id,
      type: 'PASSWORD_RESET',
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  await sendPasswordResetEmail(user.email, user.displayName || user.username, token);
  res.json({ message: 'If that email exists, a reset link is on its way.' });
}

// ── Web Handoff (one-time admin panel deep-link) ──────────────────────────────

export async function webHandoff(req: AuthRequest, res: Response) {
  const code = crypto.randomUUID();
  await prisma.token.create({
    data: {
      userId: req.user!.id,
      type: 'WEB_HANDOFF',
      token: code,
      expiresAt: new Date(Date.now() + 60_000), // 60s TTL, single-use
    },
  });
  res.json({ code });
}

export async function exchangeHandoff(req: Request, res: Response) {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Code required' });

  const record = await prisma.token.findUnique({ where: { token: String(code) } });
  if (!record || record.type !== 'WEB_HANDOFF' || record.expiresAt < new Date()) {
    if (record) await prisma.token.delete({ where: { id: record.id } }).catch(() => {});
    return res.status(400).json({ error: 'Invalid or expired handoff code' });
  }

  // Consume immediately — single-use
  await prisma.token.delete({ where: { id: record.id } });

  const user = await prisma.user.findUnique({
    where: { id: record.userId },
    select: {
      id: true, email: true, username: true, displayName: true,
      isAdmin: true, isTester: true, emailVerified: true,
      subscription: { select: { plan: true, status: true } },
    },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const ip = parseIp(req);
  const ua = req.headers['user-agent'];
  const jwtId = await createSession(user.id, 'web-admin-handoff', 'Web browser (admin)', ip, ua);
  const token = signToken({ id: user.id, isAdmin: user.isAdmin }, jwtId);

  res.json({
    token,
    user: {
      id: user.id, email: user.email, username: user.username,
      displayName: user.displayName, isAdmin: user.isAdmin, isTester: user.isTester,
      emailVerified: user.emailVerified, subscription: user.subscription,
    },
  });
}

// ── Reset password ────────────────────────────────────────────────────────────

export async function resetPassword(req: Request, res: Response) {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  if (!/[A-Z]/.test(password)) return res.status(400).json({ error: 'Password must contain at least one uppercase letter' });
  if (!/[0-9]/.test(password)) return res.status(400).json({ error: 'Password must contain at least one number' });

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
    // Revoke all sessions on password reset
    prisma.session.deleteMany({ where: { userId: record.userId } }),
  ]);

  res.json({ message: 'Password updated successfully. Please sign in again.' });
}
