import { Router } from 'express';
import { subscribe, unsubscribe } from '../controllers/newsletter.controller';
import { writeLimiter, readLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/subscribe',   writeLimiter, subscribe);
router.get('/unsubscribe',  readLimiter,  unsubscribe);

export default router;
