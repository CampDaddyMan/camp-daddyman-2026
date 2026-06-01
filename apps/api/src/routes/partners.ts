import { Router } from 'express';
import multer from 'multer';
import {
  listPartners, getPartner, createPartner, updatePartner, uploadPartnerLogo, deletePartner,
  listPublicPartners, listPublicPlacements, submitInquiry, selfServeApply, confirmAdBooking,
  listPlacements, createPlacement, updatePlacement, deletePlacement,
  listAds, createAd, updateAd, uploadAdImage, deleteAd, approveAd, rejectAd,
  serveAd, trackAdClick,
} from '../controllers/partners.controller';
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

// ── Public ────────────────────────────────────────────────────────────────────
router.get('/public',                optionalAuthMiddleware, readLimiter,  listPublicPartners);
router.get('/placements/public',     readLimiter, listPublicPlacements);
router.post('/inquiry',              writeLimiter, submitInquiry);
router.post('/apply',                writeLimiter, selfServeApply);
router.post('/apply/confirm',        writeLimiter, confirmAdBooking);
router.get('/serve/:location',       optionalAuthMiddleware, readLimiter,  serveAd);
router.post('/ads/:id/click',        optionalAuthMiddleware, writeLimiter, trackAdClick);

// ── Admin only ────────────────────────────────────────────────────────────────
router.use(authMiddleware, adminMiddleware);

router.get('/',                                           readLimiter,  listPartners);
router.post('/',                                          writeLimiter, createPartner);

router.get('/placements/list',                            readLimiter,  listPlacements);
router.post('/placements',                                writeLimiter, createPlacement);
router.patch('/placements/:id',                           writeLimiter, updatePlacement);
router.delete('/placements/:id',                          writeLimiter, deletePlacement);

router.get('/ads/list',                                   readLimiter,  listAds);
router.post('/ads',                                       writeLimiter, createAd);
router.patch('/ads/:id',                                  writeLimiter, updateAd);
router.post('/ads/:id/approve',                           writeLimiter, approveAd);
router.post('/ads/:id/reject',                            writeLimiter, rejectAd);
router.post('/ads/:id/image', imgUpload.single('image'),  writeLimiter, uploadAdImage);
router.delete('/ads/:id',                                 writeLimiter, deleteAd);

router.get('/:id',                                        readLimiter,  getPartner);
router.patch('/:id',                                      writeLimiter, updatePartner);
router.post('/:id/logo', imgUpload.single('logo'),        writeLimiter, uploadPartnerLogo);
router.delete('/:id',                                     writeLimiter, deletePartner);

export default router;
