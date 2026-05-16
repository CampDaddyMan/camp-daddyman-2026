import { Router } from 'express';
import { createPoll, listPolls, getPoll, castVote, closePoll, deletePoll } from '../controllers/poll.controller';
import { authMiddleware, adminMiddleware, optionalAuthMiddleware, subscriberMiddleware } from '../middleware/auth';
import { readLimiter, writeLimiter } from '../middleware/rateLimiter';

const router = Router();

// Public — optional auth so we can see if user voted
router.get('/:id', optionalAuthMiddleware, readLimiter, getPoll);

// Paid subscribers only — cast / change vote
router.post('/:id/vote', authMiddleware, subscriberMiddleware, writeLimiter, castVote);

// Admin only
router.use(authMiddleware, adminMiddleware);
router.get('/',              readLimiter,  listPolls);
router.post('/',             writeLimiter, createPoll);
router.post('/:id/close',   writeLimiter, closePoll);
router.delete('/:id',       writeLimiter, deletePoll);

export default router;
