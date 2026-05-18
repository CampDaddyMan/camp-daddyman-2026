import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { stripe } from '../config/stripe';
import { AuthRequest } from '../middleware/auth';
import { signR2Url } from '../utils/s3';

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://campdaddyman.com';

const MEMBER_DISCOUNTS: Record<string, number> = {
  PRO: 0.10,
  PREMIUM: 0.15,
  CREATOR: 0.15,
};

// ── Public ────────────────────────────────────────────────────────────────────

export async function listProducts(req: Request, res: Response) {
  const { type, featured } = req.query;

  const where: any = { status: 'ACTIVE' };
  if (type === 'PHYSICAL' || type === 'DIGITAL') where.type = type;
  if (featured === 'true') where.featured = true;

  const products = await prisma.product.findMany({
    where,
    orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
    include: { variants: true },
  });

  const signed = await Promise.all(products.map(async (p) => ({
    ...p,
    imageUrl: await signR2Url(p.imageUrl),
  })));

  res.json({ products: signed });
}

export async function getProduct(req: Request, res: Response) {
  const { idOrSlug } = req.params;

  const product = await prisma.product.findFirst({
    where: {
      status: 'ACTIVE',
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
    },
    include: { variants: true },
  });

  if (!product) return res.status(404).json({ error: 'Product not found' });

  const imageUrl = await signR2Url(product.imageUrl);
  res.json({ product: { ...product, imageUrl } });
}

// ── Coupon validation (public) ────────────────────────────────────────────────

export async function validateCoupon(req: Request, res: Response) {
  const { code, subtotal } = req.body;
  if (!code) return res.status(400).json({ valid: false, error: 'No code provided' });

  const coupon = await prisma.coupon.findUnique({
    where: { code: String(code).toUpperCase().trim() },
  });

  if (!coupon || !coupon.active) {
    return res.json({ valid: false, error: 'Invalid or inactive coupon code' });
  }
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return res.json({ valid: false, error: 'This coupon has expired' });
  }
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
    return res.json({ valid: false, error: 'This coupon has reached its usage limit' });
  }

  const orderSubtotal = Number(subtotal) || 0;
  if (coupon.minOrderAmount != null && orderSubtotal < coupon.minOrderAmount) {
    return res.json({
      valid: false,
      error: `Minimum order of $${coupon.minOrderAmount.toFixed(2)} required`,
    });
  }

  const discountAmount = coupon.type === 'PERCENTAGE'
    ? Math.round(orderSubtotal * coupon.value / 100 * 100) / 100
    : Math.round(Math.min(coupon.value, orderSubtotal) * 100) / 100;

  res.json({
    valid: true,
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    discountAmount,
  });
}

// ── Checkout ──────────────────────────────────────────────────────────────────

interface CartItemInput {
  productId: string;
  variantId?: string;
  options?: string; // e.g. "M / Black / Standard" for option-group products
  quantity: number;
}

export async function createCheckoutSession(req: AuthRequest, res: Response) {
  const { items, email, couponCode }: { items: CartItemInput[]; email?: string; couponCode?: string } = req.body;

  if (!items?.length) return res.status(400).json({ error: 'Cart is empty' });

  const customerEmail = req.user?.email || email;
  if (!customerEmail) return res.status(400).json({ error: 'Email required for guest checkout' });

  // Validate + price every item from DB
  const resolved = await Promise.all(items.map(async (ci) => {
    const product = await prisma.product.findUnique({
      where: { id: ci.productId },
      include: { variants: true },
    });
    if (!product || product.status !== 'ACTIVE') {
      throw new Error(`Product ${ci.productId} not available`);
    }

    let unitPrice = product.price;
    let variantName: string | undefined;

    if (ci.variantId) {
      const variant = product.variants.find((v) => v.id === ci.variantId);
      if (!variant) throw new Error(`Variant ${ci.variantId} not found`);
      if (variant.price != null) unitPrice = variant.price;
      variantName = variant.name;
      if (variant.inventory < ci.quantity) {
        throw new Error(`Not enough inventory for ${product.name} — ${variant.name}`);
      }
    }

    // Apply option group price modifiers (e.g. 2XL +$10) from stored product data
    if (!ci.variantId && ci.options && product.optionGroups) {
      const groups = product.optionGroups as Array<{ name: string; values: string[]; priceModifiers?: Record<string, number> }>;
      const selectedValues = ci.options.split(' / ');
      groups.forEach((group, idx) => {
        const val = selectedValues[idx]?.trim();
        if (val && group.priceModifiers?.[val]) {
          unitPrice += group.priceModifiers[val];
        }
      });
    }

    return {
      productId: product.id,
      variantId: ci.variantId,
      options: ci.options,
      name: product.name,
      variantName: ci.options ?? variantName,
      type: product.type,
      unitPrice,
      quantity: ci.quantity,
      imageUrl: product.imageUrl,
      memberDiscountEnabled: product.memberDiscountEnabled,
    };
  }));

  // Member discount — applied per-item only when product.memberDiscountEnabled is true
  const plan = req.user?.subscription?.plan;
  const memberDiscountRate = plan ? (MEMBER_DISCOUNTS[plan] ?? 0) : 0;

  const subtotal = resolved.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const discount = Math.round(
    resolved.reduce((sum, i) => {
      const rate = i.memberDiscountEnabled ? memberDiscountRate : 0;
      return sum + i.unitPrice * i.quantity * rate;
    }, 0) * 100,
  ) / 100;

  // Post-member-discount subtotal is the base for coupon calculation
  const memberDiscountedSubtotal = Math.round((subtotal - discount) * 100) / 100;

  // Validate coupon if provided
  let coupon: any = null;
  if (couponCode) {
    coupon = await prisma.coupon.findUnique({
      where: { code: String(couponCode).toUpperCase().trim() },
    });
    if (!coupon || !coupon.active) {
      return res.status(400).json({ error: 'Invalid or inactive coupon code' });
    }
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Coupon has expired' });
    }
    if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
      return res.status(400).json({ error: 'Coupon usage limit reached' });
    }
    if (coupon.minOrderAmount != null && subtotal < coupon.minOrderAmount) {
      return res.status(400).json({
        error: `Minimum order of $${coupon.minOrderAmount.toFixed(2)} required`,
      });
    }
  }

  // Coupon discount computed on the post-member subtotal
  const couponDiscount = coupon
    ? coupon.type === 'PERCENTAGE'
      ? Math.round(memberDiscountedSubtotal * coupon.value / 100 * 100) / 100
      : Math.round(Math.min(coupon.value, memberDiscountedSubtotal) * 100) / 100
    : 0;

  // Proportional multiplier distributes coupon across all line items
  const couponMultiplier = memberDiscountedSubtotal > 0
    ? (memberDiscountedSubtotal - couponDiscount) / memberDiscountedSubtotal
    : 1;

  const total = Math.round((memberDiscountedSubtotal - couponDiscount) * 100) / 100;
  const hasPhysical = resolved.some((i) => i.type === 'PHYSICAL');

  // Create pending order
  const order = await prisma.order.create({
    data: {
      userId: req.user?.id,
      email: customerEmail,
      subtotal,
      discount,
      couponId: coupon?.id ?? null,
      couponCode: coupon?.code ?? null,
      couponDiscount,
      total,
      items: {
        create: resolved.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          name: i.name,
          variantName: i.variantName,
          price: i.unitPrice,
          quantity: i.quantity,
        })),
      },
    },
  });

  // Build Stripe line items — member discount per-item, coupon distributed proportionally
  const lineItems = resolved.map((i) => {
    const mRate = i.memberDiscountEnabled ? memberDiscountRate : 0;
    return {
      price_data: {
        currency: 'usd',
        product_data: {
          name: i.variantName ? `${i.name} — ${i.variantName}` : i.name,
          ...(i.imageUrl && { images: [i.imageUrl] }),
        },
        unit_amount: Math.round(i.unitPrice * (1 - mRate) * couponMultiplier * 100),
      },
      quantity: i.quantity,
    };
  });

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: lineItems,
    customer_email: customerEmail,
    ...(hasPhysical && {
      shipping_address_collection: { allowed_countries: ['US', 'CA', 'GB', 'AU', 'JM'] },
    }),
    success_url: `${FRONTEND_URL}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${FRONTEND_URL}/shop/cart`,
    metadata: { orderId: order.id },
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { stripeSessionId: session.id },
  });

  res.json({ url: session.url, orderId: order.id });
}

// ── Webhook ───────────────────────────────────────────────────────────────────

export async function handleWebhook(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'] as string;
  const secret = process.env.STRIPE_SHOP_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET || '';

  let event: any;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err: any) {
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any;
    const orderId = session.metadata?.orderId;
    if (!orderId) return res.json({ received: true });

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } } },
    });
    if (!order) return res.json({ received: true });

    // Populate shipping from Stripe if provided
    const addr = session.shipping_details?.address;
    const shippingData = addr ? {
      shippingName: session.shipping_details?.name,
      shippingLine1: addr.line1,
      shippingLine2: addr.line2,
      shippingCity: addr.city,
      shippingState: addr.state,
      shippingZip: addr.postal_code,
      shippingCountry: addr.country,
    } : {};

    // Generate download URLs for digital items (7-day expiry)
    await Promise.all(order.items.map(async (item) => {
      if (item.product.type === 'DIGITAL' && item.product.fileUrl) {
        const downloadUrl = await signR2Url(item.product.fileUrl, 7 * 24 * 3600);
        await prisma.orderItem.update({
          where: { id: item.id },
          data: {
            downloadUrl,
            downloadExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });
      }
    }));

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'PAID',
        stripePaymentId: session.payment_intent,
        ...shippingData,
      },
    });

    // Increment coupon usage on confirmed payment
    if (order.couponId) {
      await prisma.coupon.update({
        where: { id: order.couponId },
        data: { usedCount: { increment: 1 } },
      });
    }
  }

  res.json({ received: true });
}

// ── Orders (authenticated) ────────────────────────────────────────────────────

export async function getMyOrders(req: AuthRequest, res: Response) {
  const orders = await prisma.order.findMany({
    where: { userId: req.user!.id, status: { not: 'PENDING' } },
    orderBy: { createdAt: 'desc' },
    include: {
      items: {
        include: { product: { select: { id: true, name: true, imageUrl: true, type: true } } },
      },
    },
  });
  res.json({ orders });
}

export async function getOrder(req: AuthRequest, res: Response) {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: {
      items: {
        include: { product: { select: { id: true, name: true, imageUrl: true, type: true } } },
      },
    },
  });

  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.userId !== req.user!.id && !req.user!.isAdmin) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  res.json({ order });
}

export async function getOrderBySession(req: AuthRequest, res: Response) {
  const { sessionId } = req.params;

  const order = await prisma.order.findFirst({
    where: { stripeSessionId: sessionId },
    include: {
      items: {
        include: { product: { select: { id: true, name: true, imageUrl: true, type: true } } },
      },
    },
  });

  if (!order) return res.status(404).json({ error: 'Order not found' });

  // Allow owner or admin; also allow unauthenticated lookup for guest orders
  if (order.userId && req.user && order.userId !== req.user.id && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  res.json({ order });
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export async function adminUploadProductImage(req: AuthRequest, res: Response) {
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) return res.status(400).json({ error: 'No image file provided' });

  const { uploadToS3 } = await import('../utils/s3');
  const url = await uploadToS3(file, 'products');
  res.json({ url });
}

async function signOptionGroupImages(optionGroups: any): Promise<any> {
  if (!Array.isArray(optionGroups)) return null;
  return Promise.all(optionGroups.map(async (g: any) => {
    if (!g.images || typeof g.images !== 'object') return g;
    const images: Record<string, string> = {};
    for (const [k, v] of Object.entries(g.images as Record<string, string>)) {
      images[k] = (await signR2Url(v)) ?? v;
    }
    return { ...g, images };
  }));
}

export async function adminListProducts(req: AuthRequest, res: Response) {
  const { status, type } = req.query;
  const where: any = {};
  if (status && status !== 'ALL') where.status = String(status).toUpperCase();
  if (type && type !== 'ALL') where.type = String(type).toUpperCase();

  const products = await prisma.product.findMany({
    where,
    orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
    include: { variants: true },
  });

  const signed = await Promise.all(products.map(async (p) => ({
    ...p,
    imagePreviewUrl: await signR2Url(p.imageUrl),
    optionGroupsPreview: await signOptionGroupImages(p.optionGroups),
  })));

  res.json({ products: signed });
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function adminCreateProduct(req: AuthRequest, res: Response) {
  const { name, description, type, price, comparePrice, imageUrl, images, status, featured, tags, fileUrl, variants, optionGroups, memberDiscountEnabled } = req.body;

  if (!name || !type || !price) return res.status(400).json({ error: 'name, type, and price are required' });

  let slug = slugify(name);
  const existing = await prisma.product.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now()}`;

  const product = await prisma.product.create({
    data: {
      name,
      slug,
      description,
      type,
      price: Number(price),
      comparePrice: comparePrice ? Number(comparePrice) : null,
      imageUrl,
      images: images || [],
      status: status || 'DRAFT',
      featured: featured ?? false,
      tags: tags || [],
      fileUrl,
      optionGroups: optionGroups ?? null,
      memberDiscountEnabled: memberDiscountEnabled ?? false,
      variants: variants?.length ? {
        create: variants.map((v: any) => ({
          name: v.name,
          sku: v.sku,
          price: v.price != null ? Number(v.price) : null,
          inventory: Number(v.inventory || 0),
          options: v.options || {},
        })),
      } : undefined,
    },
    include: { variants: true },
  });

  res.status(201).json({ product });
}

export async function adminUpdateProduct(req: AuthRequest, res: Response) {
  const { name, description, price, comparePrice, imageUrl, images, status, featured, tags, fileUrl, variants, optionGroups, memberDiscountEnabled } = req.body;

  const data: any = {};
  if (name !== undefined) { data.name = name; data.slug = slugify(name); }
  if (description !== undefined) data.description = description;
  if (price !== undefined) data.price = Number(price);
  if (comparePrice !== undefined) data.comparePrice = comparePrice ? Number(comparePrice) : null;
  if (imageUrl !== undefined) data.imageUrl = imageUrl;
  if (images !== undefined) data.images = images;
  if (status !== undefined) data.status = status;
  if (featured !== undefined) data.featured = featured;
  if (tags !== undefined) data.tags = tags;
  if (fileUrl !== undefined) data.fileUrl = fileUrl;
  if (optionGroups !== undefined) data.optionGroups = optionGroups ?? null;
  if (memberDiscountEnabled !== undefined) data.memberDiscountEnabled = memberDiscountEnabled;

  if (variants !== undefined) {
    await prisma.productVariant.deleteMany({ where: { productId: req.params.id } });
    if (variants.length) {
      data.variants = {
        create: variants.map((v: any) => ({
          name: v.name,
          sku: v.sku,
          price: v.price != null ? Number(v.price) : null,
          inventory: Number(v.inventory || 0),
          options: v.options || {},
        })),
      };
    }
  }

  const product = await prisma.product.update({
    where: { id: req.params.id },
    data,
    include: { variants: true },
  });

  res.json({ product });
}

export async function adminListOrders(req: AuthRequest, res: Response) {
  const { status, page = '1', limit = '20' } = req.query;

  const where: any = {};
  if (status && status !== 'ALL') where.status = String(status).toUpperCase();

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      include: {
        items: { select: { name: true, quantity: true, price: true } },
        user: { select: { username: true, email: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  res.json({ orders, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
}

export async function adminUpdateOrder(req: AuthRequest, res: Response) {
  const { status, trackingNumber, notes } = req.body;

  const data: any = {};
  if (status) data.status = status;
  if (trackingNumber !== undefined) data.trackingNumber = trackingNumber;
  if (notes !== undefined) data.notes = notes;
  if (status === 'SHIPPED' && !data.shippedAt) data.shippedAt = new Date();

  const order = await prisma.order.update({
    where: { id: req.params.id },
    data,
  });

  res.json({ order });
}

// ── Admin: Coupons ────────────────────────────────────────────────────────────

export async function adminListCoupons(req: AuthRequest, res: Response) {
  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { orders: true } } },
  });
  res.json({ coupons });
}

export async function adminCreateCoupon(req: AuthRequest, res: Response) {
  const { code, type, value, minOrderAmount, maxUses, active, expiresAt } = req.body;

  if (!code || !type || value == null) {
    return res.status(400).json({ error: 'code, type, and value are required' });
  }
  if (!['PERCENTAGE', 'FIXED'].includes(type)) {
    return res.status(400).json({ error: 'type must be PERCENTAGE or FIXED' });
  }
  if (type === 'PERCENTAGE' && (Number(value) <= 0 || Number(value) > 100)) {
    return res.status(400).json({ error: 'Percentage value must be 1–100' });
  }

  const coupon = await prisma.coupon.create({
    data: {
      code: String(code).toUpperCase().trim(),
      type,
      value: Number(value),
      minOrderAmount: minOrderAmount ? Number(minOrderAmount) : null,
      maxUses: maxUses ? Number(maxUses) : null,
      active: active ?? true,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  res.status(201).json({ coupon });
}

export async function adminUpdateCoupon(req: AuthRequest, res: Response) {
  const { code, type, value, minOrderAmount, maxUses, active, expiresAt } = req.body;

  const data: any = {};
  if (code !== undefined) data.code = String(code).toUpperCase().trim();
  if (type !== undefined) data.type = type;
  if (value !== undefined) data.value = Number(value);
  if (minOrderAmount !== undefined) data.minOrderAmount = minOrderAmount ? Number(minOrderAmount) : null;
  if (maxUses !== undefined) data.maxUses = maxUses ? Number(maxUses) : null;
  if (active !== undefined) data.active = active;
  if (expiresAt !== undefined) data.expiresAt = expiresAt ? new Date(expiresAt) : null;

  const coupon = await prisma.coupon.update({
    where: { id: req.params.id },
    data,
  });

  res.json({ coupon });
}

export async function adminDeleteCoupon(req: AuthRequest, res: Response) {
  await prisma.coupon.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}
