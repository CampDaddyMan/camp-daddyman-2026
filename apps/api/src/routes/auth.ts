import { Router } from 'express';
import { body } from 'express-validator';
import { register, login, getMe, updateProfile } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/register', [
  body('email').isEmail().withMessage('Valid email required'),
  body('username').isLength({ min: 3, max: 30 }).withMessage('Username must be 3–30 characters'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], register);

router.post('/login', [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
], login);

router.get('/me', authMiddleware, getMe);
router.put('/me', authMiddleware, updateProfile);

export default router;
