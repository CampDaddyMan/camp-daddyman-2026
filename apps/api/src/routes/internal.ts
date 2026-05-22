import { Router } from 'express';
import { publishScheduled } from '../controllers/internal.controller';

const router = Router();

router.post('/publish-scheduled', publishScheduled);

export default router;
