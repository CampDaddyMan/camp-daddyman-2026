import { Router } from 'express';
import multer from 'multer';
import {
  getStats,
  listUsers,
  toggleAdmin,
  toggleBan,
  deleteUser,
  conferStation,
  notifyUser,
  listAllContent,
  setContentStatus,
  updateContent,
  setContentCredits,
  listReports,
  resolveReport,
} from '../controllers/admin.controller';
import { adminListLivity, adminWitnessLivity } from '../controllers/livity.controller';
import {
  adminListSubscribers,
  adminDeleteSubscriber,
  adminExportCsv,
} from '../controllers/newsletter.controller';
import { adminGetSettings, adminUpdateSetting, adminUploadSettingsImage } from '../controllers/settings.controller';
import { adminListBanners, createBanner, updateBanner, deleteBanner, uploadBannerImage } from '../controllers/banner.controller';
import {
  adminUploadProductImage,
  adminCreateProduct,
  adminUpdateProduct,
  adminListProducts,
  adminListOrders,
  adminGetOrder,
  adminUpdateOrder,
  adminListCoupons,
  adminCreateCoupon,
  adminUpdateCoupon,
  adminDeleteCoupon,
} from '../controllers/shop.controller';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import { readLimiter, writeLimiter } from '../middleware/rateLimiter';

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, file.mimetype.startsWith('image/'));
  },
});

const router = Router();
router.use(authMiddleware, adminMiddleware);

router.get('/stats',                     readLimiter,  getStats);
router.get('/users',                     readLimiter,  listUsers);
router.post('/users/:id/toggle-admin',   writeLimiter, toggleAdmin);
router.post('/users/:id/toggle-ban',     writeLimiter, toggleBan);
router.post('/users/:id/station',        writeLimiter, conferStation);
router.post('/users/:id/notify',         writeLimiter, notifyUser);
router.delete('/users/:id',              writeLimiter, deleteUser);
router.get('/content',                   readLimiter,  listAllContent);
router.post('/content/:id/status',       writeLimiter, setContentStatus);
router.patch('/content/:id',             writeLimiter, updateContent);
router.put('/content/:id/credits',       writeLimiter, setContentCredits);
router.get('/reports',                   readLimiter,  listReports);
router.post('/reports/:id/resolve',      writeLimiter, resolveReport);

// Shop admin
router.post('/products/upload-image',    writeLimiter, imageUpload.single('image'), adminUploadProductImage);
router.get('/products',                  readLimiter,  adminListProducts);
router.post('/products',                 writeLimiter, adminCreateProduct);
router.patch('/products/:id',            writeLimiter, adminUpdateProduct);
router.get('/orders',                    readLimiter,  adminListOrders);
router.get('/orders/:id',               readLimiter,  adminGetOrder);
router.patch('/orders/:id',              writeLimiter, adminUpdateOrder);

// Coupon admin
router.get('/coupons',                   readLimiter,  adminListCoupons);
router.post('/coupons',                  writeLimiter, adminCreateCoupon);
router.patch('/coupons/:id',             writeLimiter, adminUpdateCoupon);
router.delete('/coupons/:id',            writeLimiter, adminDeleteCoupon);

// Site settings admin
router.get('/settings',                  readLimiter,  adminGetSettings);
router.put('/settings',                  writeLimiter, adminUpdateSetting);
router.post('/settings/upload',          writeLimiter, imageUpload.single('image'), adminUploadSettingsImage);

// Newsletter subscribers admin
router.get('/newsletter',              readLimiter,  adminListSubscribers);
router.get('/newsletter/export',       readLimiter,  adminExportCsv);
router.delete('/newsletter/:id',       writeLimiter, adminDeleteSubscriber);

// Banner slides admin
router.get('/banners',                   readLimiter,  adminListBanners);
router.post('/banners/upload',           writeLimiter, imageUpload.single('image'), uploadBannerImage);
router.post('/banners',                  writeLimiter, createBanner);
router.patch('/banners/:id',             writeLimiter, updateBanner);
router.delete('/banners/:id',            writeLimiter, deleteBanner);

// Livity witnessing (Elder workflow)
router.get('/livity',                readLimiter,  adminListLivity);
router.post('/livity/:id/witness',   writeLimiter, adminWitnessLivity);

export default router;
