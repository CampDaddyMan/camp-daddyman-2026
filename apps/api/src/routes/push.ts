import { Router } from 'express';
import {
  getVapidPublicKey, subscribePush, unsubscribePush,
  registerExpoToken, deregisterExpoToken, broadcastPush,
} from '../controllers/push.controller';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import { readLimiter, writeLimiter } from '../middleware/rateLimiter';

const router = Router();

router.get('/vapid-public-key', readLimiter, getVapidPublicKey);
router.post('/subscribe',            authMiddleware, writeLimiter, subscribePush);
router.post('/unsubscribe',          authMiddleware, writeLimiter, unsubscribePush);
router.post('/register-expo-token',  authMiddleware, writeLimiter, registerExpoToken);
router.post('/deregister-expo-token', authMiddleware, writeLimiter, deregisterExpoToken);
router.post('/broadcast',            authMiddleware, adminMiddleware, writeLimiter, broadcastPush);

export default router;
