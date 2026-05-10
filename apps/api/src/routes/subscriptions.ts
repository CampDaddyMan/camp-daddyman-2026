import { Router } from 'express';
import {
  getPlans,
  getMySubscription,
  createCheckoutSession,
  cancelSubscription,
  stripeWebhook,
} from '../controllers/subscription.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Stripe webhooks must receive raw body
router.post('/webhook', express_raw(), stripeWebhook);

router.get('/plans', getPlans);
router.get('/me', authMiddleware, getMySubscription);
router.post('/checkout', authMiddleware, createCheckoutSession);
router.post('/cancel', authMiddleware, cancelSubscription);

// express.raw() helper inline
function express_raw() {
  const express = require('express');
  return express.raw({ type: 'application/json' });
}

export default router;
