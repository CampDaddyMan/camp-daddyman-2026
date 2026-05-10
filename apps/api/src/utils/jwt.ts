import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET!;
const EXPIRY = process.env.JWT_EXPIRY || '7d';

export function signToken(payload: { id: string; isAdmin: boolean }): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRY });
}

export function verifyToken(token: string): { id: string; isAdmin: boolean } | null {
  try {
    return jwt.verify(token, SECRET) as { id: string; isAdmin: boolean };
  } catch {
    return null;
  }
}
