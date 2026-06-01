import { Router } from 'express';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import { readLimiter, writeLimiter } from '../middleware/rateLimiter';
import {
  listRewards, redeemReward, myRedemptions,
  adminListRewards, adminCreateReward, adminUpdateReward, adminDeleteReward,
  globalLeaderboard, creatorLeaderboard,
} from '../controllers/loyalty.controller';

const router = Router();

// Public / user routes
router.get('/rewards',                   authMiddleware, readLimiter,  listRewards);
router.post('/rewards/:id/redeem',       authMiddleware, writeLimiter, redeemReward);
router.get('/my-redemptions',            authMiddleware, readLimiter,  myRedemptions);
router.get('/leaderboard',              readLimiter, globalLeaderboard);
router.get('/leaderboard/:username',    readLimiter, creatorLeaderboard);

// Admin routes (auth first, then admin check)
router.get('/admin/rewards',             authMiddleware, adminMiddleware, readLimiter,  adminListRewards);
router.post('/admin/rewards',            authMiddleware, adminMiddleware, writeLimiter, adminCreateReward);
router.patch('/admin/rewards/:id',       authMiddleware, adminMiddleware, writeLimiter, adminUpdateReward);
router.delete('/admin/rewards/:id',      authMiddleware, adminMiddleware, writeLimiter, adminDeleteReward);

export default router;
