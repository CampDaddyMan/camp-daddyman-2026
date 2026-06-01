import { Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/auth';

const VALID_TYPES = ['GOOD', 'CREATION', 'PRESERVATION', 'RECONCILIATION'] as const;

const TYPE_LABEL: Record<string, string> = {
  GOOD:           'Conscious Living',
  CREATION:       'Creation',
  PRESERVATION:   'Preservation',
  RECONCILIATION: 'Healing',
};

// ── User: log an act of Livity ────────────────────────────────────────────────

export async function submitLivity(req: AuthRequest, res: Response) {
  const { type, description } = req.body;

  if (!VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` });
  }
  if (!description?.trim() || description.trim().length < 10) {
    return res.status(400).json({ error: 'description must be at least 10 characters' });
  }
  if (description.trim().length > 1000) {
    return res.status(400).json({ error: 'description must be under 1000 characters' });
  }

  const act = await prisma.livity.create({
    data: { userId: req.user!.id, type, description: description.trim() },
    select: { id: true, type: true, description: true, status: true, createdAt: true },
  });

  res.status(201).json({ act });
}

// ── User: list own Livity ─────────────────────────────────────────────────────

export async function listMyLivity(req: AuthRequest, res: Response) {
  const acts = await prisma.livity.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, type: true, description: true, status: true,
      witnessNote: true, verifiedAt: true, createdAt: true,
    },
  });
  res.json({ acts });
}

// ── Admin: list all Livity acts ───────────────────────────────────────────────

export async function adminListLivity(req: AuthRequest, res: Response) {
  const { status = 'PENDING', page = '1', limit = '30' } = req.query;

  const where: any = {};
  if (status && status !== 'ALL') where.status = String(status).toUpperCase();

  const [acts, total] = await Promise.all([
    prisma.livity.findMany({
      where,
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, type: true, description: true, status: true,
        witnessNote: true, verifiedAt: true, createdAt: true,
        user: { select: { id: true, username: true, displayName: true, xp: true, station: true } },
        verifiedBy: { select: { username: true } },
      },
    }),
    prisma.livity.count({ where }),
  ]);

  const labelled = acts.map((a) => ({ ...a, typeLabel: TYPE_LABEL[a.type] ?? a.type }));
  res.json({ acts: labelled, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
}

// ── Admin: witness (approve or reject) an act ─────────────────────────────────

export async function adminWitnessLivity(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { action, witnessNote } = req.body;

  if (!['APPROVED', 'REJECTED'].includes(action)) {
    return res.status(400).json({ error: 'action must be APPROVED or REJECTED' });
  }
  if (action === 'REJECTED' && !witnessNote?.trim()) {
    return res.status(400).json({ error: 'A witness note is required when rejecting' });
  }

  const existing = await prisma.livity.findUnique({ where: { id }, select: { status: true } });
  if (!existing) return res.status(404).json({ error: 'Act not found' });
  if (existing.status !== 'PENDING') {
    return res.status(400).json({ error: 'Only PENDING acts can be witnessed' });
  }

  const act = await prisma.livity.update({
    where: { id },
    data: {
      status:       action,
      witnessNote:  witnessNote?.trim() || null,
      verifiedById: req.user!.id,
      verifiedAt:   new Date(),
    },
    select: { id: true, status: true, witnessNote: true, verifiedAt: true },
  });

  res.json({ act });
}
