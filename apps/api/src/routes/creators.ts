import { Router } from 'express';
import { getCreator, getCreatorContent } from '../controllers/creator.controller';

const router = Router();

router.get('/:username', getCreator);
router.get('/:username/content', getCreatorContent);

export default router;
