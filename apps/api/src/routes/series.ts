import { Router } from 'express';
import multer from 'multer';
import {
  listSeries, getSeries,
  createSeries, updateSeries, deleteSeries,
  uploadSeriesCover, uploadSeriesTrailer,
  uploadSeasonCover,
  addSeason, updateSeason, deleteSeason,
  addEpisode, updateEpisode, removeEpisode, reorderEpisodes,
  uploadEpisodeThumbnail, uploadEpisodeVideo,
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

// Accept any file for video — MIME type is normalized from extension in the controller
const videoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 },
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
router.post('/',                            writeLimiter, createSeries);
router.patch('/:id',                        writeLimiter, updateSeries);
router.delete('/:id',                       writeLimiter, deleteSeries);
router.patch('/:id/cover',   imgUpload.single('cover'),    writeLimiter, uploadSeriesCover);
router.patch('/:id/trailer', videoUpload.single('trailer'), writeLimiter, uploadSeriesTrailer);

// Seasons
router.post('/:id/seasons',                                          writeLimiter, addSeason);
router.patch('/:id/seasons/:seasonId',                               writeLimiter, updateSeason);
router.delete('/:id/seasons/:seasonId',                              writeLimiter, deleteSeason);
router.patch('/:id/seasons/:seasonId/cover', imgUpload.single('cover'), writeLimiter, uploadSeasonCover);

// Episodes
router.post('/:id/seasons/:seasonId/episodes',                                        writeLimiter, addEpisode);
router.patch('/:id/seasons/:seasonId/episodes/reorder',                               writeLimiter, reorderEpisodes);
router.patch('/:id/seasons/:seasonId/episodes/:episodeId',                            writeLimiter, updateEpisode);
router.delete('/:id/seasons/:seasonId/episodes/:episodeId',                           writeLimiter, removeEpisode);
router.patch('/:id/seasons/:seasonId/episodes/:episodeId/thumbnail', imgUpload.single('thumbnail'),   writeLimiter, uploadEpisodeThumbnail);
router.patch('/:id/seasons/:seasonId/episodes/:episodeId/video',     videoUpload.single('video'),     writeLimiter, uploadEpisodeVideo);

export default router;
