import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { sendNewsletterWelcomeEmail } from '../utils/email';

export async function subscribe(req: Request, res: Response) {
  const { email, name, source } = req.body as { email?: string; name?: string; source?: string };

  if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: 'Valid email address required' });
  }

  const normalized = email.trim().toLowerCase();

  const existing = await prisma.emailSubscriber.findUnique({ where: { email: normalized } });

  if (existing) {
    if (existing.unsubscribed) {
      // Re-subscribe
      await prisma.emailSubscriber.update({
        where: { email: normalized },
        data: { unsubscribed: false, unsubscribedAt: null, name: name?.trim() || existing.name },
      });
      return res.json({ ok: true, resubscribed: true });
    }
    return res.json({ ok: true, alreadySubscribed: true });
  }

  const subscriber = await prisma.emailSubscriber.create({
    data: {
      email: normalized,
      name: name?.trim() || null,
      source: source?.trim() || 'website',
    },
  });

  sendNewsletterWelcomeEmail(normalized, name?.trim() || null, subscriber.unsubscribeToken).catch(() => {});

  res.json({ ok: true });
}

export async function unsubscribe(req: Request, res: Response) {
  const { token } = req.query as { token?: string };
  if (!token) return res.status(400).json({ error: 'Missing token' });

  const sub = await prisma.emailSubscriber.findUnique({ where: { unsubscribeToken: token } });
  if (!sub) return res.status(404).json({ error: 'Invalid token' });

  if (!sub.unsubscribed) {
    await prisma.emailSubscriber.update({
      where: { id: sub.id },
      data: { unsubscribed: true, unsubscribedAt: new Date() },
    });
  }

  res.json({ ok: true, email: sub.email });
}

// ── Admin ──────────────────────────────────────────────────────────────────────

export async function adminListSubscribers(req: AuthRequest, res: Response) {
  const { page = '1', limit = '50', q = '', status = 'active' } = req.query as Record<string, string>;

  const where: any = {};
  if (status === 'active')       where.unsubscribed = false;
  else if (status === 'unsub')   where.unsubscribed = true;
  if (q.trim()) where.email = { contains: q.trim().toLowerCase() };

  const [subscribers, total] = await Promise.all([
    prisma.emailSubscriber.findMany({
      where,
      orderBy: { subscribedAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      select: { id: true, email: true, name: true, source: true, unsubscribed: true, subscribedAt: true },
    }),
    prisma.emailSubscriber.count({ where }),
  ]);

  res.json({ subscribers, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
}

export async function adminDeleteSubscriber(req: AuthRequest, res: Response) {
  await prisma.emailSubscriber.delete({ where: { id: req.params.id } }).catch(() => {});
  res.json({ ok: true });
}

export async function adminExportCsv(req: AuthRequest, res: Response) {
  const subscribers = await prisma.emailSubscriber.findMany({
    where: { unsubscribed: false },
    orderBy: { subscribedAt: 'desc' },
    select: { email: true, name: true, source: true, subscribedAt: true },
  });

  const rows = [
    'email,name,source,subscribedAt',
    ...subscribers.map((s) =>
      [s.email, s.name ?? '', s.source, s.subscribedAt.toISOString()].map((v) => `"${v}"`).join(',')
    ),
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="newsletter-subscribers.csv"');
  res.send(rows);
}
