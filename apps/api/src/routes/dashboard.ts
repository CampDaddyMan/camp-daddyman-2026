import { Router } from 'express';
import { getDashboard } from '../controllers/dashboard.controller';
import { authMiddleware } from '../middleware/auth';
import { readLimiter } from '../middleware/rateLimiter';

const router = Router();

router.get('/', authMiddleware, readLimiter, getDashboard);

export default router;
