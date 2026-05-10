import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { stripe, PLANS } from '../config/stripe';
import { AuthRequest } from '../middleware/auth';

export function getPlans(_req: Request, res: Response) {
  res.json({ plans: PLANS });
}

export async function getMySubscription(req: AuthRequest, res: Response) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId: req.user!.id },
  });
  res.json({ subscription });
}

export async function createCheckoutSession(req: AuthRequest, res: Response) {
  const { plan } = req.body as { plan: 'PRO' | 'PREMIUM' };

  const planConfig = PLANS[plan];
  if (!planConfig || !planConfig.priceId) {
    return res.status(400).json({ error: 'Invalid plan' });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: planConfig.priceId, quantity: 1 }],
    success_url: `${process.env.FRONTEND_URL}/dashboard?subscribed=true`,
    cancel_url: `${process.env.FRONTEND_URL}/subscribe`,
    metadata: { userId: req.user!.id, plan },
  });

  res.json({ url: session.url });
}

export async function cancelSubscription(req: AuthRequest, res: Response) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId: req.user!.id },
  });

  if (!subscription?.stripeSubscriptionId) {
    return res.status(400).json({ error: 'No active paid subscription found' });
  }

  await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);

  await prisma.subscription.update({
    where: { userId: req.user!.id },
    data: { status: 'CANCELLED', plan: 'FREE' },
  });

  res.json({ message: 'Subscription cancelled' });
}

export async function stripeWebhook(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'] as string;
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return res.status(400).send('Webhook signature invalid');
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as any;
      const { userId, plan } = session.metadata;

      await prisma.subscription.upsert({
        where: { userId },
        update: {
          plan,
          status: 'ACTIVE',
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
        },
        create: {
          userId,
          plan,
          status: 'ACTIVE',
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
        },
      });
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as any;
      await prisma.subscription.updateMany({
        where: { stripeCustomerId: invoice.customer },
        data: { status: 'PAST_DUE' },
      });
      break;
    }
  }

  res.json({ received: true });
}
