import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { prisma } from '../config/database';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
    isAdmin: boolean;
    isCreator: boolean;
    isBanned: boolean;
    subscription?: { plan: string; status: string } | null;
  };
}

// Throttle lastActiveAt DB writes to once per 5 min per session
const lastActiveUpdated = new Map<string, number>();
const ACTIVE_UPDATE_INTERVAL = 5 * 60 * 1000;

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  const decoded = verifyToken(token);
  if (!decoded) return res.status(401).json({ error: 'Invalid or expired token' });

  // Reject tokens issued before sessions were introduced
  if (!decoded.jti) {
    return res.status(401).json({ error: 'Session expired — please sign in again' });
  }

  // Validate session exists and is not expired
  const session = await prisma.session.findUnique({ where: { jwtId: decoded.jti } });
  if (!session || session.expiresAt < new Date()) {
    return res.status(401).json({ error: 'Session expired — please sign in again', sessionExpired: true });
  }

  // Update lastActiveAt throttled
  const now = Date.now();
  const lastUpdate = lastActiveUpdated.get(decoded.jti) || 0;
  if (now - lastUpdate > ACTIVE_UPDATE_INTERVAL) {
    lastActiveUpdated.set(decoded.jti, now);
    prisma.session.update({
      where: { jwtId: decoded.jti },
      data: { lastActiveAt: new Date() },
    }).catch(() => {});
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    select: {
      id: true,
      email: true,
      username: true,
      isAdmin: true,
      isCreator: true,
      isBanned: true,
      subscription: { select: { plan: true, status: true } },
    },
  });

  if (!user) return res.status(401).json({ error: 'User not found' });
  if (user.isBanned) return res.status(403).json({ error: 'Account suspended', banned: true });

  req.user = user;
  next();
}

// Decodes token if present but never blocks the request
export async function optionalAuthMiddleware(req: AuthRequest, _res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    const decoded = verifyToken(token);
    if (decoded?.jti) {
      const session = await prisma.session.findUnique({ where: { jwtId: decoded.jti } });
      if (session && session.expiresAt >= new Date()) {
        const user = await prisma.user.findUnique({
          where: { id: decoded.id },
          select: { id: true, email: true, username: true, isAdmin: true, isCreator: true, isBanned: true, subscription: { select: { plan: true, status: true } } },
        });
        if (user) req.user = user;
      }
    }
  }
  next();
}

export function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user?.isAdmin) return res.status(403).json({ error: 'Admin access required' });
  next();
}

export function subscriberMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const plan = req.user?.subscription?.plan;
  const status = req.user?.subscription?.status;
  if (!plan || plan === 'FREE' || status !== 'ACTIVE') {
    return res.status(403).json({ error: 'Active subscription required to access this content' });
  }
  next();
}
