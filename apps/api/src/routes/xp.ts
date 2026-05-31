import { Router } from 'express';
import { getMyXp } from '../controllers/xp.controller';
import { authMiddleware } from '../middleware/auth';
import { readLimiter } from '../middleware/rateLimiter';

const router = Router();

router.get('/', authMiddleware, readLimiter, getMyXp);

export default router;
