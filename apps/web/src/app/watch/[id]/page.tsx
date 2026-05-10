'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Content, Comment } from '@/types';
import Button from '@/components/ui/Button';

const ReactPlayer = dynamic(() => import('react-player/lazy'), { ssr: false });

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function WatchPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [content, setContent] = useState<Content | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [liked, setLiked] = useState(false);
  const [error, setError] = useState('');
  const [subRequired, setSubRequired] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/content/${id}`)
      .then((r) => { setContent(r.data.content); })
      .catch((err) => {
        if (err.response?.data?.requiresSubscription) setSubRequired(true);
        else setError('Content not found.');
      })
      .finally(() => setLoading(false));

    api.get(`/content/${id}/comments`)
      .then((r) => setComments(r.data.comments))
      .catch(() => {});
  }, [id]);

  async function handleLike() {
    if (!user) return;
    await api.post(`/content/${id}/like`);
    setLiked(!liked);
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim() || !user) return;
    const { data } = await api.post(`/content/${id}/comment`, { text: commentText });
    setComments((prev) => [data.comment, ...prev]);
    setCommentText('');
  }

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="aspect-video bg-surface-700 rounded-2xl animate-pulse mb-6" />
    </div>
  );

  if (subRequired) return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <p className="text-4xl mb-4">🔒</p>
      <h2 className="text-xl font-bold text-white mb-2">Members Only Content</h2>
      <p className="text-gray-400 mb-6">This content is available to Pro and Premium members.</p>
      <Link href="/subscribe"><Button size="lg">See membership plans</Button></Link>
    </div>
  );

  if (error || !content) return (
    <div className="text-center py-20 text-gray-400">{error || 'Content not found.'}</div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Player */}
      <div className="aspect-video bg-black rounded-2xl overflow-hidden mb-6">
        <ReactPlayer url={content.mediaUrl} controls width="100%" height="100%" playing />
      </div>

      {/* Meta */}
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-white mb-2">{content.title}</h1>
        <div className="flex items-center gap-4 text-sm text-gray-400 flex-wrap">
          <span>{content.views.toLocaleString()} views</span>
          <span>{formatDate(content.createdAt)}</span>
          <span className="text-brand-400">{content.type.replace('_', ' ')}</span>
          {content.tags.map((tag) => (
            <span key={tag} className="bg-surface-700 text-gray-300 px-2 py-0.5 rounded-full text-xs">#{tag}</span>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 mb-8 pb-8 border-b border-surface-700">
        <Button variant={liked ? 'primary' : 'secondary'} size="sm" onClick={handleLike} disabled={!user}>
          {liked ? '👍 Liked' : '👍 Like'} · {(content._count?.likes || 0) + (liked ? 1 : 0)}
        </Button>
        <Link href={`/creator/${content.creator.username}`}>
          <Button variant="ghost" size="sm">
            {content.creator.displayName || content.creator.username}
          </Button>
        </Link>
      </div>

      {/* Description */}
      {content.description && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">About</h3>
          <p className="text-gray-400 text-sm whitespace-pre-wrap">{content.description}</p>
        </div>
      )}

      {/* Comments */}
      <div>
        <h3 className="font-semibold text-white mb-4">Comments ({comments.length})</h3>

        {user && (
          <form onSubmit={handleComment} className="flex gap-3 mb-6">
            <input
              value={commentText} onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 bg-surface-700 border border-surface-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400 transition-colors"
            />
            <Button type="submit" size="sm" disabled={!commentText.trim()}>Post</Button>
          </form>
        )}

        <div className="space-y-4">
          {comments.map((c) => (
            <div key={c.id} className="bg-surface-800 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-white">{c.user.displayName || c.user.username}</span>
                <span className="text-xs text-gray-500">{formatDate(c.createdAt)}</span>
              </div>
              <p className="text-sm text-gray-300">{c.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
