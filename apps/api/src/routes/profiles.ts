import { Router } from 'express';
import { listProfiles, createProfile, updateProfile, deleteProfile } from '../controllers/profiles.controller';
import { authMiddleware } from '../middleware/auth';
import { readLimiter, writeLimiter } from '../middleware/rateLimiter';

const router = Router();

router.get('/', authMiddleware, readLimiter, listProfiles);
router.post('/', authMiddleware, writeLimiter, createProfile);
router.patch('/:id', authMiddleware, writeLimiter, updateProfile);
router.delete('/:id', authMiddleware, writeLimiter, deleteProfile);

export default router;
