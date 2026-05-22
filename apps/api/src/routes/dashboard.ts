import { Router } from 'express';
import { getDashboard, getEarnings, getTipsSent } from '../controllers/dashboard.controller';
import { authMiddleware } from '../middleware/auth';
import { readLimiter } from '../middleware/rateLimiter';

const router = Router();

router.get('/', authMiddleware, readLimiter, getDashboard);
router.get('/earnings', authMiddleware, readLimiter, getEarnings);
router.get('/tips-sent', authMiddleware, readLimiter, getTipsSent);

export default router;
