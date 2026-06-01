import { Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/auth';

const VALID_TYPES = ['GOOD', 'CREATION', 'PRESERVATION', 'RECONCILIATION'] as const;

const TYPE_LABEL: Record<string, string> = {
  GOOD:           'Act of Good',
  CREATION:       'Act of Creation',
  PRESERVATION:   'Act of Preservation',
  RECONCILIATION: 'Act of Reconciliation',
};

// ── User: submit a Good Done act ──────────────────────────────────────────────

export async function submitGoodDone(req: AuthRequest, res: Response) {
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

  const act = await prisma.goodDone.create({
    data: { userId: req.user!.id, type, description: description.trim() },
    select: { id: true, type: true, description: true, status: true, createdAt: true },
  });

  res.status(201).json({ act });
}

// ── User: list own acts ───────────────────────────────────────────────────────

export async function listMyGoodDone(req: AuthRequest, res: Response) {
  const acts = await prisma.goodDone.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, type: true, description: true, status: true,
      witnessNote: true, verifiedAt: true, createdAt: true,
    },
  });
  res.json({ acts });
}

// ── Admin: list all Good Done acts (filterable by status) ─────────────────────

export async function adminListGoodDone(req: AuthRequest, res: Response) {
  const { status = 'PENDING', page = '1', limit = '30' } = req.query;

  const where: any = {};
  if (status && status !== 'ALL') where.status = String(status).toUpperCase();

  const [acts, total] = await Promise.all([
    prisma.goodDone.findMany({
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
    prisma.goodDone.count({ where }),
  ]);

  // Attach human-readable type labels
  const labelled = acts.map((a) => ({ ...a, typeLabel: TYPE_LABEL[a.type] ?? a.type }));

  res.json({ acts: labelled, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
}

// ── Admin: verify (approve or reject) a Good Done act ────────────────────────

export async function adminVerifyGoodDone(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { action, witnessNote } = req.body; // action: 'APPROVED' | 'REJECTED'

  if (!['APPROVED', 'REJECTED'].includes(action)) {
    return res.status(400).json({ error: 'action must be APPROVED or REJECTED' });
  }
  if (action === 'REJECTED' && !witnessNote?.trim()) {
    return res.status(400).json({ error: 'A witness note is required when rejecting' });
  }

  const existing = await prisma.goodDone.findUnique({ where: { id }, select: { status: true } });
  if (!existing) return res.status(404).json({ error: 'Act not found' });
  if (existing.status !== 'PENDING') {
    return res.status(400).json({ error: 'Only PENDING acts can be verified' });
  }

  const act = await prisma.goodDone.update({
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
