import { Router } from 'express';
import { getCreator, getCreatorContent, toggleFollow, getFollowingFeed, searchCreators } from '../controllers/creator.controller';
import { listPosts, createPost, deletePost, getFollowingPosts } from '../controllers/posts.controller';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import { readLimiter, writeLimiter } from '../middleware/rateLimiter';

const router = Router();

router.get('/feed', authMiddleware, readLimiter, getFollowingFeed);
router.get('/feed/posts', authMiddleware, readLimiter, getFollowingPosts);
router.get('/search', readLimiter, searchCreators);
router.get('/:username', optionalAuthMiddleware, readLimiter, getCreator);
router.get('/:username/content', readLimiter, getCreatorContent);
router.post('/:username/follow', authMiddleware, writeLimiter, toggleFollow);
router.get('/:username/posts', readLimiter, listPosts);
router.post('/:username/posts', authMiddleware, writeLimiter, createPost);
router.delete('/:username/posts/:postId', authMiddleware, writeLimiter, deletePost);

export default router;
