import { Router } from 'express';
import { submitLivity, listMyLivity } from '../controllers/livity.controller';
import { authMiddleware } from '../middleware/auth';
import { readLimiter, writeLimiter } from '../middleware/rateLimiter';

const router = Router();

router.get('/',  authMiddleware, readLimiter,  listMyLivity);
router.post('/', authMiddleware, writeLimiter, submitLivity);

export default router;
