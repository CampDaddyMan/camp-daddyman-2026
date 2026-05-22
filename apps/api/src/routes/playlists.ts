import { Router } from 'express';
import {
  listPlaylists, createPlaylist, getPlaylist,
  updatePlaylist, deletePlaylist, addToPlaylist, removeFromPlaylist,
} from '../controllers/playlist.controller';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import { readLimiter, writeLimiter } from '../middleware/rateLimiter';

const router = Router();

router.get('/',     authMiddleware,         readLimiter,  listPlaylists);
router.post('/',    authMiddleware,         writeLimiter, createPlaylist);
router.get('/:id',  optionalAuthMiddleware, readLimiter,  getPlaylist);
router.patch('/:id',               authMiddleware, writeLimiter, updatePlaylist);
router.delete('/:id',              authMiddleware, writeLimiter, deletePlaylist);
router.post('/:id/items',          authMiddleware, writeLimiter, addToPlaylist);
router.delete('/:id/items/:contentId', authMiddleware, writeLimiter, removeFromPlaylist);

export default router;
