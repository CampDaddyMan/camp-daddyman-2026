import { Router, raw } from 'express';
import {
  listProducts,
  listPerkItems,
  getProduct,
  createCheckoutSession,
  validateCoupon,
  handleWebhook,
  getMyOrders,
  getOrder,
  getOrderBySession,
} from '../controllers/shop.controller';
import { listReviews, createReview, deleteReview } from '../controllers/review.controller';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import { readLimiter, writeLimiter } from '../middleware/rateLimiter';

const router = Router();

// Stripe webhook — raw body required before JSON parsing
router.post('/webhook', raw({ type: 'application/json' }), handleWebhook);

// Public
router.get('/products',            readLimiter, listProducts);
router.get('/perk-items',          readLimiter, listPerkItems);
router.get('/products/:idOrSlug',  readLimiter, getProduct);

// Coupon validation (public — no auth needed to validate a code)
router.post('/coupons/validate', writeLimiter, validateCoupon);

// Checkout — optional auth (members get discount, guests can still checkout)
router.post('/checkout', optionalAuthMiddleware, writeLimiter, createCheckoutSession);

// Reviews
router.get('/products/:id/reviews',              readLimiter,  listReviews);
router.post('/products/:id/reviews',             authMiddleware, writeLimiter, createReview);
router.delete('/products/:id/reviews/:reviewId', authMiddleware, writeLimiter, deleteReview);

// Orders — auth required
router.get('/orders',                  authMiddleware,         readLimiter, getMyOrders);
router.get('/orders/session/:sessionId', optionalAuthMiddleware, readLimiter, getOrderBySession);
router.get('/orders/:id',              authMiddleware,         readLimiter, getOrder);

export default router;
