import express, { Router } from 'express';
import {
  getPlans,
  getMySubscription,
  createCheckoutSession,
  createPortalSession,
  cancelSubscription,
  stripeWebhook,
} from '../controllers/subscription.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Webhook must receive the raw body — registered before any JSON middleware
router.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

router.get('/plans', getPlans);
router.get('/me', authMiddleware, getMySubscription);
router.post('/checkout', authMiddleware, createCheckoutSession);
router.post('/portal', authMiddleware, createPortalSession);
router.post('/cancel', authMiddleware, cancelSubscription);

export default router;
