import { Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/auth';

const MAX_PROFILES = 5;
const PROFILE_COLORS = ['#e8b800', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#f97316', '#ec4899'];

const PROFILE_SELECT = {
  id: true, name: true, avatar: true, isKids: true, order: true, createdAt: true,
} as const;

export async function listProfiles(req: AuthRequest, res: Response) {
  const profiles = await prisma.profile.findMany({
    where: { userId: req.user!.id },
    orderBy: { order: 'asc' },
    select: PROFILE_SELECT,
  });
  res.json({ profiles });
}

export async function createProfile(req: AuthRequest, res: Response) {
  const count = await prisma.profile.count({ where: { userId: req.user!.id } });
  if (count >= MAX_PROFILES) {
    return res.status(400).json({ error: `Maximum of ${MAX_PROFILES} profiles allowed` });
  }

  const { name, avatar, isKids } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });

  const profile = await prisma.profile.create({
    data: {
      userId: req.user!.id,
      name: String(name).trim().slice(0, 30),
      avatar: avatar || PROFILE_COLORS[count % PROFILE_COLORS.length],
      isKids: !!isKids,
      order: count,
    },
    select: PROFILE_SELECT,
  });

  res.status(201).json({ profile });
}

export async function updateProfile(req: AuthRequest, res: Response) {
  const profile = await prisma.profile.findUnique({
    where: { id: req.params.id },
    select: { userId: true },
  });
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  if (profile.userId !== req.user!.id) return res.status(403).json({ error: 'Not authorized' });

  const { name, avatar, isKids } = req.body;
  const data: any = {};
  if (name !== undefined) data.name = String(name).trim().slice(0, 30);
  if (avatar !== undefined) data.avatar = avatar;
  if (isKids !== undefined) data.isKids = !!isKids;

  const updated = await prisma.profile.update({
    where: { id: req.params.id },
    data,
    select: PROFILE_SELECT,
  });

  res.json({ profile: updated });
}

export async function deleteProfile(req: AuthRequest, res: Response) {
  const profile = await prisma.profile.findUnique({
    where: { id: req.params.id },
    select: { userId: true },
  });
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  if (profile.userId !== req.user!.id) return res.status(403).json({ error: 'Not authorized' });

  const count = await prisma.profile.count({ where: { userId: req.user!.id } });
  if (count <= 1) return res.status(400).json({ error: 'Cannot delete the only profile' });

  await prisma.profile.delete({ where: { id: req.params.id } });
  res.json({ deleted: true });
}
