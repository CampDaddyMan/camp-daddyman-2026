import { Response } from 'express';
import { prisma } from '../config/database';
import { uploadToS3, signR2Url } from '../utils/s3';
import { AuthRequest } from '../middleware/auth';

// ── Partners ──────────────────────────────────────────────────────────────────

export async function listPartners(req: AuthRequest, res: Response) {
  const { status, type } = req.query;
  const where: any = {};
  if (status && status !== 'ALL') where.status = String(status).toUpperCase();
  if (type   && type   !== 'ALL') where.type   = String(type).toUpperCase();

  const partners = await prisma.partner.findMany({
    where,
    orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
    include: { _count: { select: { ads: true } } },
  });

  res.json({ partners });
}

export async function getPartner(req: AuthRequest, res: Response) {
  const partner = await prisma.partner.findUnique({
    where: { id: req.params.id },
    include: {
      ads: {
        include: { placement: { select: { id: true, name: true, location: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  if (!partner) return res.status(404).json({ error: 'Partner not found' });

  const logo = partner.logo ? await signR2Url(partner.logo) : null;
  res.json({ partner: { ...partner, logo } });
}

export async function createPartner(req: AuthRequest, res: Response) {
  const { name, email, website, description, type, contactName, phone } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
  if (!email?.trim()) return res.status(400).json({ error: 'Email is required' });

  const partner = await prisma.partner.create({
    data: {
      name:        name.trim(),
      email:       email.trim().toLowerCase(),
      website:     website?.trim() || null,
      description: description?.trim() || null,
      type:        type || 'ADVERTISER',
      contactName: contactName?.trim() || null,
      phone:       phone?.trim() || null,
    },
  });
  res.status(201).json({ partner });
}

export async function updatePartner(req: AuthRequest, res: Response) {
  const partner = await prisma.partner.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!partner) return res.status(404).json({ error: 'Partner not found' });

  const { name, email, website, description, type, status, contactName, phone, featured } = req.body;
  const data: any = {};
  if (name        !== undefined) data.name        = String(name).trim();
  if (email       !== undefined) data.email       = String(email).trim().toLowerCase();
  if (website     !== undefined) data.website     = website?.trim() || null;
  if (description !== undefined) data.description = description?.trim() || null;
  if (type        !== undefined) data.type        = type;
  if (status      !== undefined) data.status      = status;
  if (contactName !== undefined) data.contactName = contactName?.trim() || null;
  if (phone       !== undefined) data.phone       = phone?.trim() || null;
  if (featured    !== undefined) data.featured    = Boolean(featured);

  const updated = await prisma.partner.update({ where: { id: req.params.id }, data });
  res.json({ partner: updated });
}

export async function uploadPartnerLogo(req: AuthRequest, res: Response) {
  const partner = await prisma.partner.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!partner) return res.status(404).json({ error: 'Partner not found' });
  if (!req.file) return res.status(400).json({ error: 'No image provided' });

  const publicUrl = await uploadToS3(req.file, `partners/${req.params.id}`);
  await prisma.partner.update({ where: { id: req.params.id }, data: { logo: publicUrl } });
  const signed = await signR2Url(publicUrl);
  res.json({ logo: signed });
}

export async function deletePartner(req: AuthRequest, res: Response) {
  const partner = await prisma.partner.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!partner) return res.status(404).json({ error: 'Partner not found' });

  await prisma.partner.delete({ where: { id: req.params.id } });
  res.json({ message: 'Partner deleted' });
}

// ── Public partners list ───────────────────────────────────────────────────────

export async function listPublicPartners(_req: AuthRequest, res: Response) {
  const partners = await prisma.partner.findMany({
    where: { status: 'APPROVED' },
    orderBy: [{ featured: 'desc' }, { name: 'asc' }],
    select: {
      id: true, name: true, website: true, logo: true, description: true, type: true, featured: true,
    },
  });

  const signed = await Promise.all(partners.map(async (p) => ({
    ...p,
    logo: p.logo ? await signR2Url(p.logo) : null,
  })));

  res.json({ partners: signed });
}

// ── Placements ────────────────────────────────────────────────────────────────

export async function listPlacements(req: AuthRequest, res: Response) {
  const placements = await prisma.adPlacement.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { ads: true } } },
  });
  res.json({ placements });
}

export async function createPlacement(req: AuthRequest, res: Response) {
  const { name, location, description, pricePerDay, width, height } = req.body;
  if (!name?.trim())     return res.status(400).json({ error: 'Name is required' });
  if (!location?.trim()) return res.status(400).json({ error: 'Location is required' });

  const placement = await prisma.adPlacement.create({
    data: {
      name:        name.trim(),
      location:    location.trim(),
      description: description?.trim() || null,
      pricePerDay: parseFloat(pricePerDay) || 0,
      width:       width  ? parseInt(width)  : null,
      height:      height ? parseInt(height) : null,
    },
  });
  res.status(201).json({ placement });
}

export async function updatePlacement(req: AuthRequest, res: Response) {
  const placement = await prisma.adPlacement.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!placement) return res.status(404).json({ error: 'Placement not found' });

  const { name, location, description, pricePerDay, width, height, active } = req.body;
  const data: any = {};
  if (name        !== undefined) data.name        = String(name).trim();
  if (location    !== undefined) data.location    = String(location).trim();
  if (description !== undefined) data.description = description?.trim() || null;
  if (pricePerDay !== undefined) data.pricePerDay = parseFloat(pricePerDay) || 0;
  if (width       !== undefined) data.width       = width  ? parseInt(width)  : null;
  if (height      !== undefined) data.height      = height ? parseInt(height) : null;
  if (active      !== undefined) data.active      = Boolean(active);

  const updated = await prisma.adPlacement.update({ where: { id: req.params.id }, data });
  res.json({ placement: updated });
}

export async function deletePlacement(req: AuthRequest, res: Response) {
  const placement = await prisma.adPlacement.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!placement) return res.status(404).json({ error: 'Placement not found' });

  await prisma.adPlacement.delete({ where: { id: req.params.id } });
  res.json({ message: 'Placement deleted' });
}

// ── Ads ───────────────────────────────────────────────────────────────────────

export async function listAds(req: AuthRequest, res: Response) {
  const { status, partnerId, placementId } = req.query;
  const where: any = {};
  if (status      && status      !== 'ALL') where.status      = String(status).toUpperCase();
  if (partnerId)                            where.partnerId   = String(partnerId);
  if (placementId)                          where.placementId = String(placementId);

  const ads = await prisma.ad.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      partner:   { select: { id: true, name: true, logo: true } },
      placement: { select: { id: true, name: true, location: true } },
    },
  });

  res.json({ ads });
}

export async function createAd(req: AuthRequest, res: Response) {
  const { partnerId, placementId, title, body, imageUrl, linkUrl, startsAt, endsAt, paidAmount, notes } = req.body;
  if (!partnerId)   return res.status(400).json({ error: 'partnerId is required' });
  if (!placementId) return res.status(400).json({ error: 'placementId is required' });
  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });
  if (!linkUrl?.trim()) return res.status(400).json({ error: 'linkUrl is required' });
  if (!startsAt || !endsAt) return res.status(400).json({ error: 'startsAt and endsAt are required' });

  const ad = await prisma.ad.create({
    data: {
      partnerId,
      placementId,
      title:      title.trim(),
      body:       body?.trim() || null,
      imageUrl:   imageUrl || null,
      linkUrl:    linkUrl.trim(),
      startsAt:   new Date(startsAt),
      endsAt:     new Date(endsAt),
      paidAmount: parseFloat(paidAmount) || 0,
      notes:      notes?.trim() || null,
    },
    include: {
      partner:   { select: { id: true, name: true } },
      placement: { select: { id: true, name: true, location: true } },
    },
  });
  res.status(201).json({ ad });
}

export async function updateAd(req: AuthRequest, res: Response) {
  const ad = await prisma.ad.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!ad) return res.status(404).json({ error: 'Ad not found' });

  const { title, body, imageUrl, linkUrl, startsAt, endsAt, status, paidAmount, notes } = req.body;
  const data: any = {};
  if (title      !== undefined) data.title      = String(title).trim();
  if (body       !== undefined) data.body       = body?.trim() || null;
  if (imageUrl   !== undefined) data.imageUrl   = imageUrl || null;
  if (linkUrl    !== undefined) data.linkUrl    = String(linkUrl).trim();
  if (startsAt   !== undefined) data.startsAt   = new Date(startsAt);
  if (endsAt     !== undefined) data.endsAt     = new Date(endsAt);
  if (status     !== undefined) data.status     = status;
  if (paidAmount !== undefined) data.paidAmount = parseFloat(paidAmount) || 0;
  if (notes      !== undefined) data.notes      = notes?.trim() || null;

  const updated = await prisma.ad.update({
    where: { id: req.params.id },
    data,
    include: {
      partner:   { select: { id: true, name: true } },
      placement: { select: { id: true, name: true, location: true } },
    },
  });
  res.json({ ad: updated });
}

export async function uploadAdImage(req: AuthRequest, res: Response) {
  const ad = await prisma.ad.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!ad) return res.status(404).json({ error: 'Ad not found' });
  if (!req.file) return res.status(400).json({ error: 'No image provided' });

  const publicUrl = await uploadToS3(req.file, `ads/${req.params.id}`);
  await prisma.ad.update({ where: { id: req.params.id }, data: { imageUrl: publicUrl } });
  res.json({ imageUrl: publicUrl });
}

export async function deleteAd(req: AuthRequest, res: Response) {
  const ad = await prisma.ad.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!ad) return res.status(404).json({ error: 'Ad not found' });

  await prisma.ad.delete({ where: { id: req.params.id } });
  res.json({ message: 'Ad deleted' });
}

// ── Public: serve active ad for a placement ────────────────────────────────────

export async function serveAd(req: AuthRequest, res: Response) {
  const { location } = req.params;
  const now = new Date();

  const placement = await prisma.adPlacement.findFirst({
    where: { location, active: true },
    select: { id: true },
  });
  if (!placement) return res.json({ ad: null });

  const ad = await prisma.ad.findFirst({
    where: {
      placementId: placement.id,
      status:      'ACTIVE',
      startsAt:    { lte: now },
      endsAt:      { gte: now },
    },
    include: {
      partner: { select: { name: true, website: true } },
    },
    orderBy: { startsAt: 'desc' },
  });

  if (!ad) return res.json({ ad: null });

  await prisma.ad.update({
    where: { id: ad.id },
    data:  { impressions: { increment: 1 } },
  });

  res.json({ ad });
}

// ── Track click ───────────────────────────────────────────────────────────────

export async function trackAdClick(req: AuthRequest, res: Response) {
  const ad = await prisma.ad.findUnique({ where: { id: req.params.id }, select: { id: true, linkUrl: true } });
  if (!ad) return res.status(404).json({ error: 'Ad not found' });

  await prisma.ad.update({ where: { id: ad.id }, data: { clicks: { increment: 1 } } });
  res.json({ ok: true, linkUrl: ad.linkUrl });
}
