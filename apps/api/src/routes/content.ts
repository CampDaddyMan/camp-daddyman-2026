import { Router } from 'express';
import multer from 'multer';
import {
  listContent,
  getContent,
  uploadContent,
  deleteContent,
  likeContent,
  commentOnContent,
  getComments,
} from '../controllers/content.controller';
import { authMiddleware } from '../middleware/auth';

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
router.get('/', listContent);
router.get('/:id', getContent);
router.get('/:id/comments', getComments);

// Authenticated
router.post(
  '/upload',
  authMiddleware,
  upload.fields([{ name: 'media', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]),
  uploadContent,
);
router.delete('/:id', authMiddleware, deleteContent);
router.post('/:id/like', authMiddleware, likeContent);
router.post('/:id/comment', authMiddleware, commentOnContent);

export default router;
