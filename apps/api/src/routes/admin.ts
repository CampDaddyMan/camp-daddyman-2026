import { Router } from 'express';
import {
  getStats,
  listUsers,
  toggleAdmin,
  listAllContent,
  setContentStatus,
} from '../controllers/admin.controller';
import { authMiddleware, adminMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware, adminMiddleware);

router.get('/stats', getStats);
router.get('/users', listUsers);
router.post('/users/:id/toggle-admin', toggleAdmin);
router.get('/content', listAllContent);
router.post('/content/:id/status', setContentStatus);

export default router;
