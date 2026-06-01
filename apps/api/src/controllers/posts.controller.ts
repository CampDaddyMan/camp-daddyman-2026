import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../config/database';

const POST_SELECT = {
  id: true, text: true, imageUrl: true, createdAt: true,
  creator: { select: { username: true, displayName: true, avatar: true } },
};

export async function listPosts(req: AuthRequest, res: Response) {
  const { username } = req.params;
  const creator = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!creator) return res.status(404).json({ error: 'Creator not found' });

  const posts = await prisma.post.findMany({
    where: { creatorId: creator.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: POST_SELECT,
  });
  res.json({ posts });
}

export async function createPost(req: AuthRequest, res: Response) {
  const { username } = req.params;
  const creator = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!creator) return res.status(404).json({ error: 'Creator not found' });
  if (creator.id !== req.user!.id && !req.user!.isAdmin) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const { text, imageUrl } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'Text is required' });

  const post = await prisma.post.create({
    data: {
      text: String(text).trim().slice(0, 2000),
      imageUrl: imageUrl ? String(imageUrl).trim() : null,
      creatorId: creator.id,
    },
    select: POST_SELECT,
  });
  res.status(201).json({ post });
}

export async function deletePost(req: AuthRequest, res: Response) {
  const post = await prisma.post.findUnique({
    where: { id: req.params.postId },
    select: { id: true, creatorId: true },
  });
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (post.creatorId !== req.user!.id && !req.user!.isAdmin) {
    return res.status(403).json({ error: 'Not authorized' });
  }
  await prisma.post.delete({ where: { id: post.id } });
  res.json({ ok: true });
}

export async function getFollowingPosts(req: AuthRequest, res: Response) {
  const follows = await prisma.follow.findMany({
    where: { followerId: req.user!.id },
    select: { followingId: true },
  });
  const creatorIds = follows.map((f) => f.followingId);
  if (creatorIds.length === 0) return res.json({ posts: [] });

  const posts = await prisma.post.findMany({
    where: { creatorId: { in: creatorIds } },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: POST_SELECT,
  });
  res.json({ posts });
}
