import { Router } from 'express';
import multer from 'multer';
import {
  listContent,
  getDiscovery,
  searchContent,
  getContent,
  uploadContent,
  deleteContent,
  likeContent,
  commentOnContent,
  getComments,
  saveProgress,
  getProgress,
} from '../controllers/content.controller';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import { readLimiter, searchLimiter, uploadLimiter, writeLimiter } from '../middleware/rateLimiter';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2GB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm',
      'audio/mpeg', 'audio/wav', 'audio/aac', 'audio/flac', 'audio/ogg',
      'image/jpeg', 'image/png', 'image/webp',
    ];
    cb(null, allowed.includes(file.mimetype));
  },
});

// Public
router.get('/', readLimiter, listContent);
router.get('/discover', readLimiter, getDiscovery);
router.get('/search', searchLimiter, searchContent);
router.get('/:id', optionalAuthMiddleware, readLimiter, getContent);
router.get('/:id/comments', readLimiter, getComments);

// Authenticated
router.post(
  '/upload',
  authMiddleware,
  uploadLimiter,
  upload.fields([{ name: 'media', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]),
  uploadContent,
);
router.delete('/:id', authMiddleware, writeLimiter, deleteContent);
router.post('/:id/like', authMiddleware, writeLimiter, likeContent);
router.post('/:id/comment', authMiddleware, writeLimiter, commentOnContent);
router.post('/:id/progress', authMiddleware, saveProgress);
router.get('/:id/progress', authMiddleware, getProgress);

export default router;
