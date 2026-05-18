import { Router } from 'express';
import multer from 'multer';
import {
  getStats,
  listUsers,
  toggleAdmin,
  toggleBan,
  deleteUser,
  notifyUser,
  listAllContent,
  setContentStatus,
  listReports,
  resolveReport,
} from '../controllers/admin.controller';
import { adminGetSettings, adminUpdateSetting } from '../controllers/settings.controller';
import {
  adminUploadProductImage,
  adminCreateProduct,
  adminUpdateProduct,
  adminListProducts,
  adminListOrders,
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
router.post('/users/:id/notify',         writeLimiter, notifyUser);
router.delete('/users/:id',              writeLimiter, deleteUser);
router.get('/content',                   readLimiter,  listAllContent);
router.post('/content/:id/status',       writeLimiter, setContentStatus);
router.get('/reports',                   readLimiter,  listReports);
router.post('/reports/:id/resolve',      writeLimiter, resolveReport);

// Shop admin
router.post('/products/upload-image',    writeLimiter, imageUpload.single('image'), adminUploadProductImage);
router.get('/products',                  readLimiter,  adminListProducts);
router.post('/products',                 writeLimiter, adminCreateProduct);
router.patch('/products/:id',            writeLimiter, adminUpdateProduct);
router.get('/orders',                    readLimiter,  adminListOrders);
router.patch('/orders/:id',              writeLimiter, adminUpdateOrder);

// Coupon admin
router.get('/coupons',                   readLimiter,  adminListCoupons);
router.post('/coupons',                  writeLimiter, adminCreateCoupon);
router.patch('/coupons/:id',             writeLimiter, adminUpdateCoupon);
router.delete('/coupons/:id',            writeLimiter, adminDeleteCoupon);

// Site settings admin
router.get('/settings',                  readLimiter,  adminGetSettings);
router.put('/settings',                  writeLimiter, adminUpdateSetting);

export default router;
