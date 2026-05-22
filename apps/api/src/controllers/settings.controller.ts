import { Request, Response } from 'express';
import { prisma } from '../config/database';
import type { AuthRequest } from '../middleware/auth';

export const adminGetSettings = async (_req: Request, res: Response) => {
  const rows = await prisma.siteSetting.findMany();
  const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  res.json({ settings });
};

export const adminUpdateSetting = async (req: Request, res: Response) => {
  const { key, value } = req.body as { key: string; value: string };
  if (!key) { res.status(400).json({ error: 'key required' }); return; }
  const setting = await prisma.siteSetting.upsert({
    where: { key },
    update: { value: value ?? '' },
    create: { key, value: value ?? '' },
  });
  res.json({ setting });
};

export const getPublicCss = async (_req: Request, res: Response) => {
  const rows = await prisma.siteSetting.findMany();
  const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  const classBlocks: Record<string, string[]> = {};

  const addDecl = (rawKey: string, suffix: string, decl: (v: string) => string) => {
    const value = settings[rawKey]?.trim();
    if (!value) return;
    const className = rawKey.slice(0, -suffix.length).replace(/_/g, '-');
    if (!classBlocks[className]) classBlocks[className] = [];
    classBlocks[className].push(decl(value));
  };

  for (const key of Object.keys(settings)) {
    if (key.endsWith('_css'))         addDecl(key, '_css',         (v) => v);
    else if (key.endsWith('_font_size'))   addDecl(key, '_font_size',   (v) => `font-size:${v};`);
    else if (key.endsWith('_line_height')) addDecl(key, '_line_height', (v) => `line-height:${v};`);
  }

  const rules = Object.entries(classBlocks)
    .map(([cls, decls]) => `.${cls}{${decls.join('')}}`)
    .join('\n');

  const custom = settings['custom_css']?.trim() ?? '';
  res.json({ css: [rules, custom].filter(Boolean).join('\n') });
};

export const adminUploadSettingsImage = async (req: AuthRequest, res: Response) => {
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) { res.status(400).json({ error: 'No image file provided' }); return; }
  const { uploadToS3 } = await import('../utils/s3');
  const url = await uploadToS3(file, 'settings');
  res.json({ url });
};

export const getPublicSettings = async (_req: Request, res: Response) => {
  const rows = await prisma.siteSetting.findMany();
  const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  res.json({ settings });
};
