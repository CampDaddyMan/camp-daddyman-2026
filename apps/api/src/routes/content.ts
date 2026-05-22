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
  uploadThumbnail,
  uploadMedia,
  likeContent,
  commentOnContent,
  deleteComment,
  getComments,
  saveProgress,
  getProgress,
  getWatchHistory,
  getRelatedContent,
  getLikedContent,
  toggleSaved,
  getSavedContent,
  reportContent,
  unreportContent,
  downloadContent,
} from '../controllers/content.controller';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import { readLimiter, searchLimiter, uploadLimiter, writeLimiter } from '../middleware/rateLimiter';

const router = Router();

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    cb(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype));
  },
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2GB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'video/mp4', 'video/webm', 'video/quicktime',
      'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/aac', 'audio/flac', 'audio/ogg', 'audio/mp4',
      'application/pdf', 'application/epub+zip',
      'image/jpeg', 'image/png', 'image/webp',
    ];
    cb(null, allowed.includes(file.mimetype));
  },
});

// Public
router.get('/', optionalAuthMiddleware, readLimiter, listContent);
router.get('/discover', optionalAuthMiddleware, readLimiter, getDiscovery);
router.get('/search', optionalAuthMiddleware, searchLimiter, searchContent);
router.get('/history', authMiddleware, readLimiter, getWatchHistory);
router.get('/liked', authMiddleware, readLimiter, getLikedContent);
router.get('/saved', authMiddleware, readLimiter, getSavedContent);
router.get('/:id', optionalAuthMiddleware, readLimiter, getContent);
router.get('/:id/comments', readLimiter, getComments);
router.get('/:id/related', optionalAuthMiddleware, readLimiter, getRelatedContent);

// Authenticated
router.post(
  '/upload',
  authMiddleware,
  uploadLimiter,
  upload.fields([{ name: 'media', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]),
  uploadContent,
);
router.patch('/:id', authMiddleware, writeLimiter, updateContent);
router.post('/:id/thumbnail', authMiddleware, writeLimiter, imageUpload.single('thumbnail'), uploadThumbnail);
router.post('/:id/media', authMiddleware, writeLimiter, upload.single('media'), uploadMedia);
router.delete('/:id', authMiddleware, writeLimiter, deleteContent);
router.post('/:id/like', authMiddleware, writeLimiter, likeContent);
router.post('/:id/comment', authMiddleware, writeLimiter, commentOnContent);
router.delete('/:id/comment/:commentId', authMiddleware, writeLimiter, deleteComment);
router.post('/:id/progress', authMiddleware, saveProgress);
router.get('/:id/progress', authMiddleware, getProgress);
router.post('/:id/save', authMiddleware, writeLimiter, toggleSaved);
router.get('/:id/download', authMiddleware, readLimiter, downloadContent);
router.post('/:id/report', authMiddleware, writeLimiter, reportContent);
router.delete('/:id/report', authMiddleware, writeLimiter, unreportContent);

export default router;
