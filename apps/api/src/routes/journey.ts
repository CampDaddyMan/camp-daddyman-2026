import { Router } from 'express';
import {
  getMyJourney, beginJourney, saveEntry, completeDay,
  adminListDays, adminGetDay, adminUpsertDay, adminDeleteDay,
} from '../controllers/journey.controller';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import { readLimiter, writeLimiter } from '../middleware/rateLimiter';

const router = Router();

// User routes
router.get('/',           authMiddleware, readLimiter,  getMyJourney);
router.post('/begin',     authMiddleware, writeLimiter, beginJourney);
router.post('/entry',     authMiddleware, writeLimiter, saveEntry);
router.post('/complete',  authMiddleware, writeLimiter, completeDay);

// Admin routes
router.get('/admin/days',        authMiddleware, adminMiddleware, readLimiter,  adminListDays);
router.get('/admin/days/:day',   authMiddleware, adminMiddleware, readLimiter,  adminGetDay);
router.put('/admin/days',        authMiddleware, adminMiddleware, writeLimiter, adminUpsertDay);
router.delete('/admin/days/:day',authMiddleware, adminMiddleware, writeLimiter, adminDeleteDay);

export default router;
