import jwt, { SignOptions } from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET!;
const EXPIRY = (process.env.JWT_EXPIRY || '7d') as SignOptions['expiresIn'];

export function signToken(payload: { id: string; isAdmin: boolean }, jti: string): string {
  return jwt.sign({ ...payload, jti }, SECRET, { expiresIn: EXPIRY });
}

export function verifyToken(token: string): { id: string; isAdmin: boolean; jti: string } | null {
  try {
    return jwt.verify(token, SECRET) as { id: string; isAdmin: boolean; jti: string };
  } catch {
    return null;
  }
}
