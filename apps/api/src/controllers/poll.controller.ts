import { Response } from 'express';
import { prisma } from '../config/database';
import { signR2Url, uploadToS3 } from '../utils/s3';
import { AuthRequest } from '../middleware/auth';

const VALID_TYPES = ['CONTENT_VOTE', 'ARTIST_VOTE', 'CUSTOM'] as const;

// ── Include shapes per poll type ───────────────────────────────────────────────

const contentOptionInclude = {
  content: { select: { id: true, title: true, type: true, mediaUrl: true, thumbnailUrl: true } },
  _count:  { select: { votes: true } },
};

const artistOptionInclude = {
  artist: {
    select: {
      id: true, username: true, displayName: true, avatar: true, bio: true,
      _count: { select: { followers: true, content: true } },
    },
  },
  _count: { select: { votes: true } },
};

const customOptionInclude = {
  _count: { select: { votes: true } },
};

function optionIncludeForType(pollType: string) {
  if (pollType === 'ARTIST_VOTE') return artistOptionInclude;
  if (pollType === 'CUSTOM')      return customOptionInclude;
  return contentOptionInclude;
}

// ── Sign URLs on options ───────────────────────────────────────────────────────

async function enrichOptions(options: any[], pollType: string, showCounts: boolean) {
  return Promise.all(options.map(async (opt) => {
    const base = {
      ...opt,
      _count: showCounts ? opt._count : undefined,
    };

    if (pollType === 'CONTENT_VOTE' && opt.content) {
      return {
        ...base,
        content: {
          ...opt.content,
          mediaUrl:     await signR2Url(opt.content.mediaUrl, 4 * 3600),
          thumbnailUrl: await signR2Url(opt.content.thumbnailUrl),
        },
      };
    }

    if (pollType === 'ARTIST_VOTE' && opt.artist) {
      // Pull artist's top 4 content items (by views)
      const topContent = await prisma.content.findMany({
        where: { creatorId: opt.artist.id, status: 'ACTIVE', privacy: 'PUBLIC' },
        orderBy: { views: 'desc' },
        take: 4,
        select: { id: true, title: true, type: true, thumbnailUrl: true, views: true },
      });
      const signedContent = await Promise.all(topContent.map(async (c) => ({
        ...c, thumbnailUrl: await signR2Url(c.thumbnailUrl),
      })));
      return {
        ...base,
        artist: {
          ...opt.artist,
          avatar:     await signR2Url(opt.artist.avatar),
          topContent: signedContent,
        },
      };
    }

    return base;
  }));
}

// ── Create poll (admin only) ──────────────────────────────────────────────────

export async function createPoll(req: AuthRequest, res: Response) {
  const { title, description, startsAt, endsAt, pollType = 'CONTENT_VOTE', allowMultiple = false, options } = req.body;

  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });
  if (!VALID_TYPES.includes(pollType)) return res.status(400).json({ error: 'Invalid poll type' });
  if (!Array.isArray(options) || options.length < 2) {
    return res.status(400).json({ error: 'At least 2 options required' });
  }
  if (options.length > 7) return res.status(400).json({ error: 'Maximum 7 options allowed' });

  const optionData = options.map((opt: any, i: number) => {
    const base = { label: opt.label?.trim() || `Option ${i + 1}`, order: i };
    if (pollType === 'CONTENT_VOTE') return { ...base, contentId: opt.contentId };
    if (pollType === 'ARTIST_VOTE')  return { ...base, artistId: opt.artistId };
    return { ...base, imageUrl: opt.imageUrl || null, body: opt.body || null };
  });

  const poll = await prisma.poll.create({
    data: {
      title:         title.trim(),
      description:   description?.trim() || null,
      startsAt:      startsAt ? new Date(startsAt) : null,
      endsAt:        endsAt ? new Date(endsAt) : null,
      allowMultiple: Boolean(allowMultiple),
      pollType,
      creatorId:     req.user!.id,
      options:       { create: optionData },
    },
    include: {
      _count: { select: { votes: true, options: true } },
      options: {
        orderBy: { order: 'asc' },
        include: optionIncludeForType(pollType),
      },
    },
  });

  res.status(201).json({ poll });
}

// ── List polls (admin only) ───────────────────────────────────────────────────

export async function listPolls(req: AuthRequest, res: Response) {
  const { status } = req.query;
  const isAdmin = req.user?.isAdmin;

  const where: any = {};
  if (isAdmin) {
    // Admins can filter by any status and see polls not yet started
    if (status && status !== 'ALL') where.status = String(status).toUpperCase();
  } else {
    // Public: only ACTIVE and CLOSED polls that have already started (or have no startsAt)
    where.status = status === 'CLOSED' ? 'CLOSED' : status === 'ACTIVE' ? 'ACTIVE' : { in: ['ACTIVE', 'CLOSED'] };
    where.OR = [{ startsAt: null }, { startsAt: { lte: new Date() } }];
  }

  const polls = await prisma.poll.findMany({
    where,
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    include: {
      _count: { select: { votes: true, options: true } },
    },
  });

  const signed = await Promise.all(polls.map(async (p) => ({
    ...p,
    imageUrl: await signR2Url(p.imageUrl),
  })));

  res.json({ polls: signed });
}

// ── Get single poll (public, auth optional) ───────────────────────────────────

export async function getPoll(req: AuthRequest, res: Response) {
  // Fetch without options first to know the type, then fetch with correct include
  const meta = await prisma.poll.findUnique({
    where: { id: req.params.id },
    select: { pollType: true },
  });
  if (!meta) return res.status(404).json({ error: 'Poll not found' });

  const poll = await prisma.poll.findUnique({
    where: { id: req.params.id },
    include: {
      creator: { select: { username: true, displayName: true } },
      _count:  { select: { votes: true } },
      options: {
        orderBy: { order: 'asc' },
        include: optionIncludeForType(meta.pollType),
      },
    },
  });
  if (!poll) return res.status(404).json({ error: 'Poll not found' });

  // Auto-close if past endsAt
  if (poll.status === 'ACTIVE' && poll.endsAt && poll.endsAt < new Date()) {
    await prisma.poll.update({ where: { id: poll.id }, data: { status: 'CLOSED' } });
    (poll as any).status = 'CLOSED';
  }

  const userId           = req.user?.id;
  const isAdminOrCreator = req.user?.isAdmin || poll.creatorId === userId;
  const pollClosed       = poll.status === 'CLOSED';
  const showCounts       = isAdminOrCreator || pollClosed;

  // Block non-admins from accessing polls that haven't started yet
  if (!isAdminOrCreator && (poll as any).startsAt && (poll as any).startsAt > new Date()) {
    return res.status(404).json({ error: 'Poll not found' });
  }

  const myVotes = userId
    ? await prisma.pollVote.findMany({
        where: { pollId: poll.id, userId },
        select: { optionId: true },
      })
    : [];

  const enriched = await enrichOptions(poll.options, poll.pollType, showCounts);
  const signedImageUrl = await signR2Url((poll as any).imageUrl);

  res.json({
    poll: { ...poll, imageUrl: signedImageUrl, options: enriched },
    myVoteOptionIds: myVotes.map((v) => v.optionId),
  });
}

// ── Cast / change vote (paid subscribers only) ────────────────────────────────

export async function castVote(req: AuthRequest, res: Response) {
  const { optionId } = req.body;
  if (!optionId) return res.status(400).json({ error: 'optionId is required' });

  const poll = await prisma.poll.findUnique({
    where: { id: req.params.id },
    select: { id: true, status: true, startsAt: true, endsAt: true, allowMultiple: true, options: { select: { id: true } } },
  });
  if (!poll) return res.status(404).json({ error: 'Poll not found' });

  if (poll.status === 'CLOSED' || (poll.endsAt && poll.endsAt < new Date())) {
    return res.status(400).json({ error: 'This poll is closed' });
  }
  if (poll.startsAt && poll.startsAt > new Date()) {
    return res.status(400).json({ error: 'This poll has not started yet' });
  }
  if (!poll.options.some((o) => o.id === optionId)) {
    return res.status(400).json({ error: 'Invalid option' });
  }

  const userId = req.user!.id;

  if (poll.allowMultiple) {
    // Toggle the specific option — add if not voted, remove if already voted
    const existing = await prisma.pollVote.findFirst({
      where: { pollId: poll.id, userId, optionId },
    });
    if (existing) {
      await prisma.pollVote.delete({ where: { id: existing.id } });
      return res.json({ ok: true, optionId, action: 'removed' });
    } else {
      await prisma.pollVote.create({ data: { pollId: poll.id, optionId, userId } });
      return res.json({ ok: true, optionId, action: 'added' });
    }
  } else {
    // Single-select: delete all existing votes for this user, then create the new one
    await prisma.$transaction([
      prisma.pollVote.deleteMany({ where: { pollId: poll.id, userId } }),
      prisma.pollVote.create({ data: { pollId: poll.id, optionId, userId } }),
    ]);
    res.json({ ok: true, optionId });
  }
}

// ── Update poll metadata (admin only) ────────────────────────────────────────

export async function updatePoll(req: AuthRequest, res: Response) {
  try {
    const existing = await prisma.poll.findUnique({ where: { id: req.params.id }, select: { id: true, pollType: true } });
    if (!existing) return res.status(404).json({ error: 'Poll not found' });

    const { title, description, startsAt, endsAt, imageUrl, pollType, allowMultiple, options } = req.body;
    const data: Record<string, any> = {};
    if (title         !== undefined) data.title         = String(title).trim();
    if (description   !== undefined) data.description   = description?.trim() || null;
    if (startsAt      !== undefined) data.startsAt      = startsAt ? new Date(startsAt) : null;
    if (endsAt        !== undefined) data.endsAt        = endsAt ? new Date(endsAt) : null;
    if (imageUrl      !== undefined) data.imageUrl      = imageUrl || null;
    if (pollType      !== undefined) data.pollType      = pollType;
    if (allowMultiple !== undefined) data.allowMultiple = Boolean(allowMultiple);

    if (options !== undefined && Array.isArray(options)) {
      const newType: string = pollType ?? existing.pollType;
      const optionData = (options as any[]).map((opt: any, i: number) => {
        const base = { label: opt.label?.trim() || `Option ${i + 1}`, order: i };
        if (newType === 'CONTENT_VOTE') return { ...base, contentId: opt.contentId };
        if (newType === 'ARTIST_VOTE')  return { ...base, artistId: opt.artistId };
        return { ...base, imageUrl: opt.imageUrl || null, body: opt.body || null };
      });
      // Delete votes first (FK constraint: PollVote → PollOption), then options, then recreate
      await prisma.pollVote.deleteMany({ where: { pollId: req.params.id } });
      data.options = { deleteMany: {}, create: optionData };
    }

    const updated = await prisma.poll.update({
      where: { id: req.params.id },
      data,
      include: { _count: { select: { votes: true, options: true } } },
    });
    res.json({ poll: updated });
  } catch (err: any) {
    console.error('[updatePoll]', err?.message);
    res.status(500).json({ error: 'Failed to update poll', detail: err?.message });
  }
}

// ── Upload poll cover image (admin only) ──────────────────────────────────────

export async function uploadPollImage(req: AuthRequest, res: Response) {
  const poll = await prisma.poll.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!poll) return res.status(404).json({ error: 'Poll not found' });
  if (!req.file) return res.status(400).json({ error: 'No image provided' });

  const publicUrl = await uploadToS3(req.file, `polls/${req.params.id}`);
  await prisma.poll.update({ where: { id: req.params.id }, data: { imageUrl: publicUrl } });
  const signed = await signR2Url(publicUrl);
  res.json({ imageUrl: signed });
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
