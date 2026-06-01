import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { stripe, PLANS } from '../config/stripe';
import { AuthRequest } from '../middleware/auth';
import { notifyTip } from '../utils/notifications';
import { sendGiftReceivedEmail, sendGiftConfirmedEmail } from '../utils/email';

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
  const { plan } = req.body as { plan: 'PRO' | 'PREMIUM' | 'CREATOR' };

  const planConfig = PLANS[plan as keyof typeof PLANS];
  if (!planConfig || !planConfig.priceId) {
    return res.status(400).json({ error: 'Invalid plan or price not configured' });
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

export async function createPortalSession(req: AuthRequest, res: Response) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId: req.user!.id },
    select: { stripeCustomerId: true },
  });

  if (!subscription?.stripeCustomerId) {
    return res.status(400).json({ error: 'No billing account found' });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${process.env.FRONTEND_URL}/dashboard`,
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

export async function createTipCheckout(req: AuthRequest, res: Response) {
  const { username } = req.params as { username: string };
  const { amount, message } = req.body as { amount: number; message?: string };

  if (!amount || amount < 1 || amount > 500) {
    return res.status(400).json({ error: 'Tip amount must be between $1 and $500' });
  }

  const creator = await prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true, displayName: true, isCreator: true },
  });

  if (!creator || !creator.isCreator) {
    return res.status(404).json({ error: 'Creator not found' });
  }

  if (creator.id === req.user!.id) {
    return res.status(400).json({ error: 'Cannot tip yourself' });
  }

  const unitAmount = Math.round(amount * 100);
  const creatorName = creator.displayName || creator.username;

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'usd',
        product_data: { name: `Tip for ${creatorName} — Camp DaddyMan` },
        unit_amount: unitAmount,
      },
    }],
    success_url: `${process.env.FRONTEND_URL}/creator/${username}?tipped=true`,
    cancel_url:  `${process.env.FRONTEND_URL}/creator/${username}`,
    metadata: {
      type:        'TIP',
      senderId:    req.user!.id,
      recipientId: creator.id,
      message:     message?.slice(0, 200) ?? '',
    },
  });

  res.json({ url: session.url });
}

export async function createGiftCheckout(req: AuthRequest, res: Response) {
  const { recipientEmail, plan, message } = req.body as { recipientEmail: string; plan: string; message?: string };

  if (!['PRO', 'PREMIUM'].includes(plan)) {
    return res.status(400).json({ error: 'Invalid plan. Choose PRO or PREMIUM.' });
  }

  const planConfig = PLANS[plan as 'PRO' | 'PREMIUM'];

  const recipient = await prisma.user.findUnique({
    where: { email: recipientEmail.toLowerCase().trim() },
    select: { id: true, username: true, displayName: true },
  });

  if (!recipient) {
    return res.status(404).json({ error: 'No Camp DaddyMan account found for that email. They need to sign up first.' });
  }

  if (recipient.id === req.user!.id) {
    return res.status(400).json({ error: 'You cannot gift a subscription to yourself.' });
  }

  const recipientName = recipient.displayName || recipient.username;
  const label = plan === 'PRO' ? 'Monthly Membership' : 'Annual Membership';

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'usd',
        product_data: {
          name: `Camp DaddyMan ${label} — Gift for ${recipientName}`,
          description: `A gift subscription for ${recipientEmail}`,
        },
        unit_amount: Math.round(planConfig.price * 100),
      },
    }],
    success_url: `${process.env.FRONTEND_URL}/gift/success?plan=${plan}&for=${encodeURIComponent(recipientEmail)}`,
    cancel_url:  `${process.env.FRONTEND_URL}/gift`,
    metadata: {
      type:          'GIFT',
      plan,
      recipientId:   recipient.id,
      buyerId:       req.user!.id,
      recipientEmail,
      message:       message?.trim().slice(0, 500) || '',
    },
  });

  res.json({ url: session.url });
}

export async function createSupporterCheckout(req: AuthRequest, res: Response) {
  const { amount, recurring } = req.body as { amount: number; recurring: boolean };

  const MIN = 99.99;
  if (!amount || amount < MIN) {
    return res.status(400).json({ error: `Minimum amount is $${MIN}` });
  }

  const unitAmount = Math.round(amount * 100);
  const productData = { name: 'Camp DaddyMan — Uncs & Aunties' };

  const session = await stripe.checkout.sessions.create({
    mode: recurring ? 'subscription' : 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        quantity: 1,
        price_data: recurring
          ? {
              currency: 'usd',
              product_data: productData,
              unit_amount: unitAmount,
              recurring: { interval: 'month' },
            }
          : {
              currency: 'usd',
              product_data: productData,
              unit_amount: unitAmount,
            },
      },
    ],
    success_url: `${process.env.FRONTEND_URL}/dashboard?supported=true`,
    cancel_url: `${process.env.FRONTEND_URL}/membership`,
    metadata: { userId: req.user!.id, plan: 'SUPPORTER' },
  });

  res.json({ url: session.url });
}

export async function stripeWebhook(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'] as string;

  if (!sig) return res.status(400).send('Missing stripe-signature header');

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return res.status(400).send(`Webhook signature invalid: ${err.message}`);
  }

  try {
    switch (event.type) {
      // Payment succeeded — activate / upgrade the subscription
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const meta = session.metadata ?? {};

        // Gift subscription
        if (meta.type === 'GIFT') {
          const { plan, recipientId, buyerId, recipientEmail, message } = meta;
          if (plan && recipientId) {
            const now = new Date();
            const end = new Date(now);
            if (plan === 'PRO') end.setMonth(end.getMonth() + 1);
            else end.setFullYear(end.getFullYear() + 1);
            await prisma.subscription.upsert({
              where:  { userId: recipientId },
              update: { plan, status: 'ACTIVE', currentPeriodStart: now, currentPeriodEnd: end },
              create: { userId: recipientId, plan, status: 'ACTIVE', currentPeriodStart: now, currentPeriodEnd: end },
            }).catch(() => {});

            const planLabel = plan === 'PRO' ? 'Monthly Membership (1 month)' : 'Annual Membership (1 year)';

            // Email recipient
            const recipient = await prisma.user.findUnique({
              where: { id: recipientId },
              select: { email: true, username: true, displayName: true },
            }).catch(() => null);

            // Email buyer
            const buyer = await prisma.user.findUnique({
              where: { id: buyerId },
              select: { email: true, username: true, displayName: true },
            }).catch(() => null);

            const buyerDisplay = buyer?.displayName || buyer?.username || 'Someone';

            if (recipient) {
              sendGiftReceivedEmail(
                recipient.email,
                recipient.displayName || recipient.username,
                buyerDisplay,
                planLabel,
                message || null,
              ).catch(() => {});
            }

            if (buyer) {
              sendGiftConfirmedEmail(
                buyer.email,
                buyer.displayName || buyer.username,
                recipientEmail || recipient?.email || '',
                planLabel,
              ).catch(() => {});
            }
          }
          break;
        }

        // Creator tip
        if (meta.type === 'TIP') {
          const { senderId, recipientId, message } = meta;
          if (senderId && recipientId) {
            const amountCents = session.amount_total ?? 0;
            await prisma.tip.create({
              data: {
                amountCents,
                message:         message || null,
                stripeSessionId: session.id,
                senderId,
                recipientId,
              },
            }).catch(() => {}); // ignore duplicate webhook replays
            notifyTip(recipientId, senderId, amountCents, message || null);
          }
          break;
        }

        // Subscription checkout
        const { userId, plan } = meta;
        if (!userId || !plan) break;

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
        if (plan === 'CREATOR') {
          await prisma.user.update({ where: { id: userId }, data: { isCreator: true } });
        }
        break;
      }

      // Subscription renewed or plan changed from Stripe dashboard
      case 'customer.subscription.updated': {
        const sub = event.data.object as any;
        const priceId: string = sub.items?.data?.[0]?.price?.id;
        const plan = priceId ? getPlanByPriceId(priceId) : null;

        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: {
            status: sub.status === 'active' ? 'ACTIVE'
                  : sub.status === 'past_due' ? 'PAST_DUE'
                  : sub.status === 'trialing' ? 'TRIALING'
                  : 'CANCELLED',
            ...(plan && { plan }),
            currentPeriodStart: new Date(sub.current_period_start * 1000),
            currentPeriodEnd:   new Date(sub.current_period_end   * 1000),
          },
        });
        break;
      }

      // Subscription was deleted (cancelled and period ended)
      case 'customer.subscription.deleted': {
        const sub = event.data.object as any;
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: { status: 'CANCELLED', plan: 'FREE' },
        });
        break;
      }

      // Payment failed on renewal
      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        await prisma.subscription.updateMany({
          where: { stripeCustomerId: invoice.customer },
          data: { status: 'PAST_DUE' },
        });
        break;
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }

  res.json({ received: true });
}

function getPlanByPriceId(priceId: string): 'PRO' | 'PREMIUM' | 'CREATOR' | null {
  for (const [key, plan] of Object.entries(PLANS)) {
    if ((plan as any).priceId === priceId) return key as 'PRO' | 'PREMIUM' | 'CREATOR';
  }
  return null;
}
