import { Router } from 'express';
import {
  getStats,
  listUsers,
  toggleAdmin,
  toggleBan,
  deleteUser,
  notifyUser,
  listAllContent,
  setContentStatus,
  listReports,
  resolveReport,
} from '../controllers/admin.controller';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import { readLimiter, writeLimiter } from '../middleware/rateLimiter';

const router = Router();
router.use(authMiddleware, adminMiddleware);

router.get('/stats',                     readLimiter,  getStats);
router.get('/users',                     readLimiter,  listUsers);
router.post('/users/:id/toggle-admin',   writeLimiter, toggleAdmin);
router.post('/users/:id/toggle-ban',     writeLimiter, toggleBan);
router.post('/users/:id/notify',         writeLimiter, notifyUser);
router.delete('/users/:id',              writeLimiter, deleteUser);
router.get('/content',                   readLimiter,  listAllContent);
router.post('/content/:id/status',       writeLimiter, setContentStatus);
router.get('/reports',                   readLimiter,  listReports);
router.post('/reports/:id/resolve',      writeLimiter, resolveReport);

export default router;
