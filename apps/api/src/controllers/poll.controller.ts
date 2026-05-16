import { Response } from 'express';
import { prisma } from '../config/database';
import { signR2Url } from '../utils/s3';
import { AuthRequest } from '../middleware/auth';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function signOptions(options: any[], isAdminOrCreator: boolean, pollClosed: boolean) {
  return Promise.all(
    options.map(async (opt) => ({
      ...opt,
      content: {
        ...opt.content,
        mediaUrl:     await signR2Url(opt.content.mediaUrl, 4 * 3600),
        thumbnailUrl: await signR2Url(opt.content.thumbnailUrl),
      },
      // Hide vote counts from voters while poll is open
      _count: isAdminOrCreator || pollClosed ? opt._count : undefined,
    })),
  );
}

// ── Create poll (admin only) ──────────────────────────────────────────────────

export async function createPoll(req: AuthRequest, res: Response) {
  const { title, description, endsAt, options } = req.body;

  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });
  if (!Array.isArray(options) || options.length < 2) {
    return res.status(400).json({ error: 'At least 2 options required' });
  }

  const poll = await prisma.poll.create({
    data: {
      title:       title.trim(),
      description: description?.trim() || null,
      endsAt:      endsAt ? new Date(endsAt) : null,
      creatorId:   req.user!.id,
      options: {
        create: options.map((opt: { contentId: string; label: string }, i: number) => ({
          contentId: opt.contentId,
          label:     opt.label?.trim() || `Version ${i + 1}`,
          order:     i,
        })),
      },
    },
    include: {
      options: {
        include: { content: { select: { id: true, title: true, type: true, mediaUrl: true, thumbnailUrl: true } } },
        orderBy: { order: 'asc' },
      },
    },
  });

  res.status(201).json({ poll });
}

// ── List polls (admin only) ───────────────────────────────────────────────────

export async function listPolls(req: AuthRequest, res: Response) {
  const { status } = req.query;
  const where: any = {};
  if (status && status !== 'ALL') where.status = String(status).toUpperCase();

  const polls = await prisma.poll.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { votes: true, options: true } },
      options: { orderBy: { order: 'asc' }, take: 1,
        include: { content: { select: { title: true } } } },
    },
  });

  res.json({ polls });
}

// ── Get single poll (public, auth optional) ───────────────────────────────────

export async function getPoll(req: AuthRequest, res: Response) {
  const poll = await prisma.poll.findUnique({
    where: { id: req.params.id },
    include: {
      creator: { select: { username: true, displayName: true } },
      options: {
        orderBy: { order: 'asc' },
        include: {
          content: { select: { id: true, title: true, type: true, mediaUrl: true, thumbnailUrl: true } },
          _count:  { select: { votes: true } },
        },
      },
      _count: { select: { votes: true } },
    },
  });

  if (!poll) return res.status(404).json({ error: 'Poll not found' });

  // Auto-close if past endsAt
  if (poll.status === 'ACTIVE' && poll.endsAt && poll.endsAt < new Date()) {
    await prisma.poll.update({ where: { id: poll.id }, data: { status: 'CLOSED' } });
    poll.status = 'CLOSED';
  }

  const userId = req.user?.id;
  const isAdminOrCreator = req.user?.isAdmin || poll.creatorId === userId;
  const pollClosed = poll.status === 'CLOSED';

  // Find caller's current vote
  const myVote = userId
    ? await prisma.pollVote.findUnique({
        where: { pollId_userId: { pollId: poll.id, userId } },
        select: { optionId: true },
      })
    : null;

  const signedOptions = await signOptions(poll.options, isAdminOrCreator, pollClosed);

  res.json({ poll: { ...poll, options: signedOptions }, myVoteOptionId: myVote?.optionId ?? null });
}

// ── Cast / change vote (paid subscribers only) ────────────────────────────────

export async function castVote(req: AuthRequest, res: Response) {
  const { optionId } = req.body;
  if (!optionId) return res.status(400).json({ error: 'optionId is required' });

  const poll = await prisma.poll.findUnique({
    where: { id: req.params.id },
    select: { id: true, status: true, endsAt: true, options: { select: { id: true } } },
  });
  if (!poll) return res.status(404).json({ error: 'Poll not found' });

  if (poll.status === 'CLOSED' || (poll.endsAt && poll.endsAt < new Date())) {
    return res.status(400).json({ error: 'This poll is closed' });
  }

  const validOption = poll.options.some((o) => o.id === optionId);
  if (!validOption) return res.status(400).json({ error: 'Invalid option' });

  await prisma.pollVote.upsert({
    where:  { pollId_userId: { pollId: poll.id, userId: req.user!.id } },
    create: { pollId: poll.id, optionId, userId: req.user!.id },
    update: { optionId },
  });

  res.json({ ok: true, optionId });
}

// ── Close poll (admin only) ───────────────────────────────────────────────────

export async function closePoll(req: AuthRequest, res: Response) {
  const poll = await prisma.poll.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!poll) return res.status(404).json({ error: 'Poll not found' });

  const updated = await prisma.poll.update({
    where: { id: req.params.id },
    data:  { status: 'CLOSED' },
    select: { id: true, status: true },
  });
  res.json({ poll: updated });
}

// ── Delete poll (admin only) ──────────────────────────────────────────────────

export async function deletePoll(req: AuthRequest, res: Response) {
  const poll = await prisma.poll.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!poll) return res.status(404).json({ error: 'Poll not found' });

  await prisma.poll.delete({ where: { id: req.params.id } });
  res.json({ message: 'Poll deleted' });
}
