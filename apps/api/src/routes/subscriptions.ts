import express, { Router } from 'express';
import {
  getPlans,
  getMySubscription,
  createCheckoutSession,
  createGiftCheckout,
  createPortalSession,
  cancelSubscription,
  createSupporterCheckout,
  createTipCheckout,
  stripeWebhook,
} from '../controllers/subscription.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Webhook must receive the raw body — registered before any JSON middleware
router.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

router.get('/plans', getPlans);
router.get('/me', authMiddleware, getMySubscription);
router.post('/checkout', authMiddleware, createCheckoutSession);
router.post('/gift', authMiddleware, createGiftCheckout);
router.post('/checkout/supporter', authMiddleware, createSupporterCheckout);
router.post('/tip/:username', authMiddleware, createTipCheckout);
router.post('/portal', authMiddleware, createPortalSession);
router.post('/cancel', authMiddleware, cancelSubscription);

export default router;
