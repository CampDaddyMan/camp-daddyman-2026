import { Request, Response } from 'express';
import { prisma } from '../config/database';

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
  const row = await prisma.siteSetting.findUnique({ where: { key: 'custom_css' } });
  res.json({ css: row?.value ?? '' });
};

export const getPublicSettings = async (_req: Request, res: Response) => {
  const rows = await prisma.siteSetting.findMany();
  const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  res.json({ settings });
};
