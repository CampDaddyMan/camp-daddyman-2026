import { Router } from 'express';
import { listNotifications, markRead, markAllRead, getUnreadCount, getPreferences, updatePreferences } from '../controllers/notification.controller';
import { authMiddleware } from '../middleware/auth';
import { readLimiter, writeLimiter } from '../middleware/rateLimiter';

const router = Router();

router.use(authMiddleware);

router.get('/', readLimiter, listNotifications);
router.get('/unread-count', readLimiter, getUnreadCount);
router.post('/:id/read', writeLimiter, markRead);
router.post('/read-all', writeLimiter, markAllRead);
router.get('/preferences', readLimiter, getPreferences);
router.put('/preferences', writeLimiter, updatePreferences);

export default router;
