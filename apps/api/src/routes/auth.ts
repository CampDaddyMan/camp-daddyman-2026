import { Router } from 'express';
import { body } from 'express-validator';
import {
  register, login, getMe, updateProfile,
  verifyEmail, resendVerification,
  forgotPassword, resetPassword,
} from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth';
import { authLimiter, writeLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/register', authLimiter, [
  body('email').isEmail().withMessage('Valid email required'),
  body('username').isLength({ min: 3, max: 30 }).withMessage('Username must be 3–30 characters'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], register);

router.post('/login', authLimiter, [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
], login);

router.get('/me',  authMiddleware, getMe);
router.put('/me',  authMiddleware, updateProfile);

router.get('/verify-email',        verifyEmail);
router.post('/resend-verification', authMiddleware, writeLimiter, resendVerification);
router.post('/forgot-password',    authLimiter, forgotPassword);
router.post('/reset-password',     authLimiter, resetPassword);

export default router;
