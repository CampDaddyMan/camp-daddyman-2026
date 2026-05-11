import { Router } from 'express';
import multer from 'multer';
import {
  listContent,
  getDiscovery,
  searchContent,
  getContent,
  uploadContent,
  deleteContent,
  updateContent,
  likeContent,
  commentOnContent,
  deleteComment,
  getComments,
  saveProgress,
  getProgress,
  getWatchHistory,
  getRelatedContent,
  reportContent,
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
router.get('/history', authMiddleware, readLimiter, getWatchHistory);
router.get('/:id', optionalAuthMiddleware, readLimiter, getContent);
router.get('/:id/comments', readLimiter, getComments);
router.get('/:id/related', readLimiter, getRelatedContent);

// Authenticated
router.post(
  '/upload',
  authMiddleware,
  uploadLimiter,
  upload.fields([{ name: 'media', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]),
  uploadContent,
);
router.patch('/:id', authMiddleware, writeLimiter, updateContent);
router.delete('/:id', authMiddleware, writeLimiter, deleteContent);
router.post('/:id/like', authMiddleware, writeLimiter, likeContent);
router.post('/:id/comment', authMiddleware, writeLimiter, commentOnContent);
router.delete('/:id/comment/:commentId', authMiddleware, writeLimiter, deleteComment);
router.post('/:id/progress', authMiddleware, saveProgress);
router.get('/:id/progress', authMiddleware, getProgress);
router.post('/:id/report', authMiddleware, writeLimiter, reportContent);

export default router;
