import { Request, Response } from 'express';
import { prisma } from '../config/database';

// GET /shop/products/:id/reviews
export async function listReviews(req: Request, res: Response) {
  const reviews = await prisma.productReview.findMany({
    where: { productId: req.params.id },
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { username: true, displayName: true, avatar: true } } },
  });

  const total = reviews.length;
  const avg = total > 0
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / total) * 10) / 10
    : null;

  const breakdown = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  res.json({ reviews, total, avg, breakdown });
}

// POST /shop/products/:id/reviews
export async function createReview(req: Request, res: Response) {
  const userId = (req as any).user.id;
  const { rating, title, body } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be 1–5' });
  }

  // Must have purchased the product
  const hasPurchased = await prisma.orderItem.findFirst({
    where: {
      productId: req.params.id,
      order: { userId, status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] } },
    },
  });
  if (!hasPurchased) {
    return res.status(403).json({ error: 'You must purchase this item before reviewing it' });
  }

  try {
    const review = await prisma.productReview.create({
      data: { productId: req.params.id, userId, rating: Number(rating), title: title || null, body: body || null },
      include: { user: { select: { username: true, displayName: true, avatar: true } } },
    });
    res.status(201).json({ review });
  } catch {
    res.status(409).json({ error: 'You have already reviewed this product' });
  }
}

// DELETE /shop/products/:id/reviews/:reviewId
export async function deleteReview(req: Request, res: Response) {
  const userId = (req as any).user.id;
  const review = await prisma.productReview.findUnique({ where: { id: req.params.reviewId } });
  if (!review) return res.status(404).json({ error: 'Not found' });
  if (review.userId !== userId) return res.status(403).json({ error: 'Forbidden' });
  await prisma.productReview.delete({ where: { id: req.params.reviewId } });
  res.json({ ok: true });
}
