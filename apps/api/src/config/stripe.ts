import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export const PLANS = {
  FREE: {
    name: 'Free',
    price: 0,
    priceId: null,
    features: ['Browse public content', '1GB storage', 'Standard quality'],
  },
  PRO: {
    name: 'Pro',
    price: 19.99,
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    features: ['All public + subscriber content', '100GB storage', 'HD quality', 'No ads'],
  },
  PREMIUM: {
    name: 'Premium',
    price: 99.99,
    priceId: process.env.STRIPE_PREMIUM_PRICE_ID,
    features: ['All content', '500GB storage', '4K quality', 'No ads', 'Priority support', 'Download for offline'],
  },
  CREATOR: {
    name: 'Creator',
    price: 29.99,
    priceId: process.env.STRIPE_CREATOR_PRICE_ID,
    features: ['Everything in Premium', 'Upload & publish content', 'Creator analytics dashboard', 'Subscriber-only content gating', 'Custom creator profile page', 'Revenue from paid content'],
  },
} as const;
