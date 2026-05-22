import { Router } from 'express';
import multer from 'multer';
import {
  listSeries, getSeries,
  createSeries, updateSeries, deleteSeries,
  addSeason, updateSeason, deleteSeason,
  addEpisode, removeEpisode, reorderEpisodes,
  getSeriesComments, addSeriesComment, deleteSeriesComment,
} from '../controllers/series.controller';
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
router.get('/',    optionalAuthMiddleware, readLimiter, listSeries);
router.get('/:id', optionalAuthMiddleware, readLimiter, getSeries);

// Comments (auth required for write, optional for read)
router.get('/:id/comments',                optionalAuthMiddleware, readLimiter,  getSeriesComments);
router.post('/:id/comments',               authMiddleware,         writeLimiter, addSeriesComment);
router.delete('/:id/comments/:commentId',  authMiddleware,         writeLimiter, deleteSeriesComment);

// Admin only
router.use(authMiddleware, adminMiddleware);
router.post('/',         writeLimiter, createSeries);
router.patch('/:id',     writeLimiter, updateSeries);
router.delete('/:id',    writeLimiter, deleteSeries);

// Seasons
router.post('/:id/seasons',                writeLimiter, addSeason);
router.patch('/:id/seasons/:seasonId',     writeLimiter, updateSeason);
router.delete('/:id/seasons/:seasonId',    writeLimiter, deleteSeason);

// Episodes
router.post('/:id/seasons/:seasonId/episodes',                   writeLimiter, addEpisode);
router.delete('/:id/seasons/:seasonId/episodes/:contentId',      writeLimiter, removeEpisode);
router.patch('/:id/seasons/:seasonId/episodes/reorder',          writeLimiter, reorderEpisodes);

export default router;
