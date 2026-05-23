import { Router } from 'express';
import {
  listLiveStreams, getLiveStream,
  createLiveStream, updateLiveStream, deleteLiveStream,
  refreshLiveStreamCredentials,
} from '../controllers/live.controller';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import { readLimiter, writeLimiter } from '../middleware/rateLimiter';

const router = Router();

router.get('/',     readLimiter, listLiveStreams);
router.get('/:id',  readLimiter, getLiveStream);

router.use(authMiddleware, adminMiddleware);
router.post('/',                writeLimiter, createLiveStream);
router.post('/:id/refresh',     writeLimiter, refreshLiveStreamCredentials);
router.patch('/:id',            writeLimiter, updateLiveStream);
router.delete('/:id',           writeLimiter, deleteLiveStream);

export default router;
