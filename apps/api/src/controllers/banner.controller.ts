import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { uploadToS3, signR2Url } from '../utils/s3';

export async function listPublicBanners(req: Request, res: Response) {
  try {
    const page = ((req.query.page as string) || 'HOME').toUpperCase();
    const raw = await prisma.bannerSlide.findMany({
      where: { page, active: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, imageUrl: true, linkUrl: true, caption: true, objectPosition: true, objectFit: true },
    });
    const slides = await Promise.all(
      raw.map(async (s) => ({
        ...s,
        imageUrl: (await signR2Url(s.imageUrl, 86400)) ?? s.imageUrl,
      }))
    );
    res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
    res.json({ slides });
  } catch {
    res.json({ slides: [] });
  }
}

export async function adminListBanners(req: Request, res: Response) {
  try {
    const page = ((req.query.page as string) || 'HOME').toUpperCase();
    const raw = await prisma.bannerSlide.findMany({
      where: { page },
      orderBy: { sortOrder: 'asc' },
    });
    const slides = await Promise.all(
      raw.map(async (s) => ({
        ...s,
        imageUrl: (await signR2Url(s.imageUrl, 86400)) ?? s.imageUrl,
      }))
    );
    res.json({ slides });
  } catch {
    res.status(500).json({ error: 'Failed to load slides' });
  }
}

export async function createBanner(req: Request, res: Response) {
  try {
    const { page, imageUrl, linkUrl, caption } = req.body;
    if (!page || !imageUrl) {
      res.status(400).json({ error: 'page and imageUrl required' });
      return;
    }
    const count = await prisma.bannerSlide.count({ where: { page: page.toUpperCase() } });
    const { objectPosition, objectFit } = req.body;
    const slide = await prisma.bannerSlide.create({
      data: {
        page: page.toUpperCase(),
        imageUrl,
        linkUrl: linkUrl || null,
        caption: caption || null,
        objectPosition: objectPosition || 'center',
        objectFit: objectFit || 'cover',
        sortOrder: count,
      },
    });
    res.status(201).json({ slide });
  } catch (err) {
    console.error('createBanner error:', err);
    res.status(500).json({ error: 'Failed to create slide' });
  }
}

export async function updateBanner(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { linkUrl, caption, sortOrder, active, imageUrl, objectPosition, objectFit } = req.body;
    const slide = await prisma.bannerSlide.update({
      where: { id },
      data: {
        ...(linkUrl !== undefined && { linkUrl: linkUrl || null }),
        ...(caption !== undefined && { caption: caption || null }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(active !== undefined && { active }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(objectPosition !== undefined && { objectPosition }),
        ...(objectFit !== undefined && { objectFit }),
      },
    });
    res.json({ slide });
  } catch (err) {
    console.error('updateBanner error:', err);
    res.status(500).json({ error: 'Failed to update slide' });
  }
}

export async function deleteBanner(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await prisma.bannerSlide.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    console.error('deleteBanner error:', err);
    res.status(500).json({ error: 'Failed to delete slide' });
  }
}

export async function uploadBannerImage(req: Request, res: Response) {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) { res.status(400).json({ error: 'No image file provided' }); return; }
    const url = await uploadToS3(file, 'banners');
    res.json({ url });
  } catch (err) {
    console.error('uploadBannerImage error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
}
