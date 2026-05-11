import { Router } from 'express';
import { getCreator, getCreatorContent, toggleFollow, getFollowingFeed, searchCreators } from '../controllers/creator.controller';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import { readLimiter, writeLimiter } from '../middleware/rateLimiter';

const router = Router();

router.get('/feed', authMiddleware, readLimiter, getFollowingFeed);
router.get('/search', readLimiter, searchCreators);
router.get('/:username', optionalAuthMiddleware, readLimiter, getCreator);
router.get('/:username/content', readLimiter, getCreatorContent);
router.post('/:username/follow', authMiddleware, writeLimiter, toggleFollow);

export default router;
