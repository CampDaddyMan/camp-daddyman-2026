import { Router } from 'express';
import { getReferralStats } from '../controllers/referral.controller';
import { authMiddleware } from '../middleware/auth';
import { readLimiter } from '../middleware/rateLimiter';

const router = Router();
router.get('/', authMiddleware, readLimiter, getReferralStats);

export default router;
