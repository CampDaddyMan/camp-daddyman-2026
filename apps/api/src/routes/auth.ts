import { Router } from 'express';
import multer from 'multer';
import { body } from 'express-validator';
import {
  register, login, verifyTwoFactor, forceLogin, logout,
  getMe, updateProfile, uploadAvatar,
  verifyEmail, resendVerification,
  forgotPassword, resetPassword,
  webHandoff, exchangeHandoff,
} from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth';
import { authLimiter, writeLimiter } from '../middleware/rateLimiter';

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype));
  },
});

const router = Router();

router.post('/register', authLimiter, [
  body('email').isEmail().withMessage('Valid email required'),
  body('username').isLength({ min: 3, max: 30 }).withMessage('Username must be 3–30 characters'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
], register);

router.post('/login', authLimiter, [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
], login);

router.post('/verify-2fa',  authLimiter, verifyTwoFactor);
router.post('/force-login', authLimiter, forceLogin);
router.post('/logout',      authMiddleware, logout);

router.get('/me',  authMiddleware, getMe);
router.put('/me',  authMiddleware, updateProfile);
router.post('/me/avatar', authMiddleware, writeLimiter, avatarUpload.single('avatar'), uploadAvatar);

router.get('/verify-email',         verifyEmail);
router.post('/resend-verification', authMiddleware, writeLimiter, resendVerification);
router.post('/forgot-password',     authLimiter, forgotPassword);
router.post('/reset-password',      authLimiter, resetPassword);

router.post('/web-handoff',      authMiddleware, webHandoff);
router.post('/exchange-handoff', authLimiter, exchangeHandoff);

export default router;
