import { Router } from 'express';
import { submitGoodDone, listMyGoodDone } from '../controllers/goodDone.controller';
import { authMiddleware } from '../middleware/auth';
import { readLimiter, writeLimiter } from '../middleware/rateLimiter';

const router = Router();

router.get('/',  authMiddleware, readLimiter,  listMyGoodDone);
router.post('/', authMiddleware, writeLimiter, submitGoodDone);

export default router;
