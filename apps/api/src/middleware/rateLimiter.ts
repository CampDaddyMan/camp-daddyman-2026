import rateLimit from 'express-rate-limit';

const isProd = process.env.NODE_ENV === 'production';

// ── Auth endpoints ─────────────────────────────────────────────────────────────
// Tight limit — protects against credential stuffing and brute force on login/register
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProd ? 20 : 100,
  message: { error: 'Too many attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Upload endpoint ────────────────────────────────────────────────────────────
// Very tight — uploads are expensive (storage + processing)
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isProd ? 20 : 200,
  message: { error: 'Upload limit reached. You can upload up to 20 files per hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Write actions (like, comment, follow) ─────────────────────────────────────
// Moderate — prevents spam but doesn't affect normal use
export const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProd ? 60 : 600,
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Public read endpoints ──────────────────────────────────────────────────────
// Generous — normal browsing should never hit this
export const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProd ? 900 : 9000, // polling endpoints (live, notifications) can fire every 5s
  message: { error: 'Too many requests. Please try again shortly.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Search ─────────────────────────────────────────────────────────────────────
// Moderate — search is heavier than a plain list query
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isProd ? 30 : 300,
  message: { error: 'Too many search requests. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
});
