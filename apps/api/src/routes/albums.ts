import { Router } from 'express';
import multer from 'multer';
import {
  listAlbums, getAlbum, createAlbum, updateAlbum,
  uploadAlbumCover, addTrack, removeTrack, reorderTracks, deleteAlbum,
} from '../controllers/album.controller';
import { authMiddleware, adminMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import { readLimiter, writeLimiter } from '../middleware/rateLimiter';

const router = Router();
const imgUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype));
  },
});

// Public
router.get('/',    optionalAuthMiddleware, readLimiter, listAlbums);
router.get('/:id', optionalAuthMiddleware, readLimiter, getAlbum);

// Admin only
router.use(authMiddleware, adminMiddleware);
router.post('/',                                            writeLimiter, createAlbum);
router.patch('/:id',                                        writeLimiter, updateAlbum);
router.post('/:id/cover', imgUpload.single('cover'),        writeLimiter, uploadAlbumCover);
router.post('/:id/tracks',                                  writeLimiter, addTrack);
router.delete('/:id/tracks/:contentId',                     writeLimiter, removeTrack);
router.patch('/:id/tracks/reorder',                         writeLimiter, reorderTracks);
router.delete('/:id',                                       writeLimiter, deleteAlbum);

export default router;
