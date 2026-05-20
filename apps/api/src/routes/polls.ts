import { Router } from 'express';
import multer from 'multer';
import { createPoll, listPolls, getPoll, castVote, closePoll, deletePoll, updatePoll, uploadPollImage } from '../controllers/poll.controller';
import { authMiddleware, adminMiddleware, optionalAuthMiddleware, subscriberMiddleware } from '../middleware/auth';
import { readLimiter, writeLimiter } from '../middleware/rateLimiter';

const router = Router();
const imgUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype));
  },
});

// Public — list active/closed polls (no auth needed)
router.get('/', optionalAuthMiddleware, readLimiter, listPolls);

// Public — single poll with optional auth to detect user's vote
router.get('/:id', optionalAuthMiddleware, readLimiter, getPoll);

// Paid subscribers only — cast / change vote
router.post('/:id/vote', authMiddleware, subscriberMiddleware, writeLimiter, castVote);

// Admin only
router.use(authMiddleware, adminMiddleware);
router.post('/',                                              writeLimiter, createPoll);
router.patch('/:id',                                          writeLimiter, updatePoll);
router.post('/:id/image', imgUpload.single('image'),          writeLimiter, uploadPollImage);
router.post('/:id/close',                                     writeLimiter, closePoll);
router.delete('/:id',                                         writeLimiter, deletePoll);

export default router;
