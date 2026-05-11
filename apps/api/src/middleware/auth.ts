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
    subscription?: { plan: string; status: string } | null;
  };
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  const decoded = verifyToken(token);
  if (!decoded) return res.status(401).json({ error: 'Invalid or expired token' });

  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    select: {
      id: true,
      email: true,
      username: true,
      isAdmin: true,
      isCreator: true,
      subscription: { select: { plan: true, status: true } },
    },
  });

  if (!user) return res.status(401).json({ error: 'User not found' });

  req.user = user;
  next();
}

// Decodes token if present but never blocks the request
export async function optionalAuthMiddleware(req: AuthRequest, _res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, email: true, username: true, isAdmin: true, isCreator: true, subscription: { select: { plan: true, status: true } } },
      });
      if (user) req.user = user;
    }
  }
  next();
}

export function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user?.isAdmin) return res.status(403).json({ error: 'Admin access required' });
  next();
}

// Ensures subscriber-only content is gated
export function subscriberMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const plan = req.user?.subscription?.plan;
  const status = req.user?.subscription?.status;
  if (!plan || plan === 'FREE' || status !== 'ACTIVE') {
    return res.status(403).json({ error: 'Active subscription required to access this content' });
  }
  next();
}
