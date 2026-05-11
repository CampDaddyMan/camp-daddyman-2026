'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Content, Comment } from '@/types';
import Button from '@/components/ui/Button';

const ReactPlayer = dynamic(() => import('react-player/lazy'), { ssr: false });

// Native HLS player using hls.js (falls back to native <video> on Safari)
function HlsVideoPlayer({
  hlsUrl,
  onReady,
  onProgress,
  videoRef,
}: {
  hlsUrl: string;
  onReady: () => void;
  onProgress: (seconds: number) => void;
  videoRef: React.RefObject<HTMLVideoElement>;
}) {
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: any;

    async function init() {
      if (!video) return;
      const Hls = (await import('hls.js')).default;
      if (Hls.isSupported()) {
        hls = new Hls({ enableWorker: true });
        hls.loadSource(hlsUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video!.play().catch(() => {});
          onReady();
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari native HLS
        video.src = hlsUrl;
        video.addEventListener('loadedmetadata', () => {
          video!.play().catch(() => {});
          onReady();
        }, { once: true });
      }
    }

    init();

    const handleTimeUpdate = () => onProgress(video.currentTime);
    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      hls?.destroy();
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [hlsUrl, onReady, onProgress, videoRef]);

  return (
    <video
      ref={videoRef}
      controls
      className="w-full h-full"
      playsInline
    />
  );
}

interface PreviewContent {
  title: string;
  description?: string;
  type: string;
  thumbnailUrl?: string;
  duration?: number;
  tags: string[];
  createdAt: string;
  views: number;
  creator: { username: string; displayName?: string; avatar?: string };
  _count?: { likes: number; comments: number };
}

const GATE_FEATURES = [
  { plan: 'Pro — $9.99/mo', href: '/subscribe', features: ['Members-only content', '100GB storage', 'HD quality', 'No ads'] },
  { plan: 'Premium — $24.99/mo', href: '/subscribe', features: ['Everything in Pro', '4K quality', 'Download for offline', '500GB storage'] },
];

function SubscriberGate({ preview, user }: { preview: PreviewContent | null; user: any }) {
  const TYPE_EMOJI: Record<string, string> = { MUSIC: '🎵', FILM: '🎬', PODCAST: '🎙️', SPOKEN_WORD: '🎤' };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Blurred preview */}
      <div className="relative aspect-video bg-surface-800 rounded-2xl overflow-hidden mb-8">
        {preview?.thumbnailUrl ? (
          <>
            <Image src={preview.thumbnailUrl} alt={preview.title} fill className="object-cover blur-sm scale-105 opacity-40" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-20">
            {TYPE_EMOJI[preview?.type || ''] || '🎬'}
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-black/60 border border-white/20 flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">🔒</span>
            </div>
            <p className="text-white font-semibold text-sm">Members Only</p>
          </div>
        </div>
      </div>

      {/* Content info */}
      {preview && (
        <div className="mb-8">
          <h1 className="text-xl md:text-2xl font-bold text-white mb-2">{preview.title}</h1>
          <div className="flex items-center gap-3 text-sm text-gray-400 flex-wrap">
            <span>{preview.views.toLocaleString()} views</span>
            <span className="text-brand-400">{preview.type.replace('_', ' ')}</span>
            <Link href={`/creator/${preview.creator.username}`} className="hover:text-white transition-colors">
              {preview.creator.displayName || preview.creator.username}
            </Link>
          </div>
          {preview.description && (
            <p className="text-gray-500 text-sm mt-3 line-clamp-2">{preview.description}</p>
          )}
        </div>
      )}

      {/* Gate message */}
      <div className="bg-surface-800 border border-surface-700 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-bold text-white mb-1">
          {user ? 'Upgrade to unlock this content' : 'Join Camp DaddyMan to watch'}
        </h2>
        <p className="text-gray-400 text-sm mb-6">
          {user
            ? 'This content is available to Pro and Premium members. Upgrade your plan to get instant access.'
            : 'Create a free account and subscribe to access members-only content.'}
        </p>

        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          {GATE_FEATURES.map((p) => (
            <div key={p.plan} className="bg-surface-700 rounded-xl p-4">
              <p className="text-white font-semibold text-sm mb-3">{p.plan}</p>
              <ul className="space-y-1.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-gray-300">
                    <span className="text-brand-400">✓</span>{f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex gap-3 flex-wrap">
          {user ? (
            <Link href="/subscribe" className="flex-1">
              <Button size="lg" className="w-full">See membership plans</Button>
            </Link>
          ) : (
            <>
              <Link href="/register" className="flex-1">
                <Button size="lg" className="w-full">Create free account</Button>
              </Link>
              <Link href="/login">
                <Button variant="secondary" size="lg">Sign in</Button>
              </Link>
            </>
          )}
        </div>
      </div>

      <p className="text-center text-sm text-gray-500">
        <Link href="/browse" className="text-brand-400 hover:underline">← Back to browse</Link>
      </p>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
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
  const [preview, setPreview] = useState<PreviewContent | null>(null);
  const [loading, setLoading] = useState(true);

  // Resume playback state
  const [savedProgress, setSavedProgress] = useState(0);
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [hasResumed, setHasResumed] = useState(false);
  const playerRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const currentProgressRef = useRef(0);
  const saveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const saveProgress = useCallback((seconds: number) => {
    if (!user || seconds < 5) return;
    api.post(`/content/${id}/progress`, { progress: Math.floor(seconds) }).catch(() => {});
  }, [id, user]);

  useEffect(() => {
    api.get(`/content/${id}`)
      .then((r) => { setContent(r.data.content); setLiked(r.data.isLiked ?? false); })
      .catch((err) => {
        if (err.response?.data?.requiresSubscription) {
          setSubRequired(true);
          setPreview(err.response.data.preview || null);
        } else {
          setError('Content not found.');
        }
      })
      .finally(() => setLoading(false));

    api.get(`/content/${id}/comments`)
      .then((r) => setComments(r.data.comments))
      .catch(() => {});

    // Load saved progress if logged in
    if (user) {
      api.get(`/content/${id}/progress`)
        .then((r) => {
          const secs = r.data.progress as number;
          if (secs > 10) {
            setSavedProgress(secs);
            setShowResumeBanner(true);
          }
        })
        .catch(() => {});
    }

    // Save progress every 30 seconds
    saveIntervalRef.current = setInterval(() => {
      saveProgress(currentProgressRef.current);
    }, 30_000);

    return () => {
      if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
      saveProgress(currentProgressRef.current);
    };
  }, [id, user, saveProgress]);

  async function handleLike() {
    if (!user) return;
    const { data } = await api.post(`/content/${id}/like`);
    setLiked(data.liked);
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim() || !user) return;
    const { data } = await api.post(`/content/${id}/comment`, { text: commentText });
    setComments((prev) => [data.comment, ...prev]);
    setCommentText('');
  }

  async function handleDeleteComment(commentId: string) {
    await api.delete(`/content/${id}/comment/${commentId}`);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="aspect-video bg-surface-700 rounded-2xl animate-pulse mb-6" />
    </div>
  );

  if (subRequired) return <SubscriberGate preview={preview} user={user} />;

  if (error || !content) return (
    <div className="text-center py-20 text-gray-400">{error || 'Content not found.'}</div>
  );

  const isHls = !!(content.hlsUrl);

  function seekTo(seconds: number) {
    if (isHls) {
      if (videoRef.current) videoRef.current.currentTime = seconds;
    } else {
      playerRef.current?.seekTo(seconds, 'seconds');
    }
  }

  function handlePlayerReady() {
    if (hasResumed || savedProgress <= 0) return;
    if (!showResumeBanner) {
      seekTo(savedProgress);
      setHasResumed(true);
    }
  }

  function handleResume() {
    seekTo(savedProgress);
    setHasResumed(true);
    setShowResumeBanner(false);
  }

  function handleStartOver() {
    setShowResumeBanner(false);
    setHasResumed(true);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Player */}
      <div className="aspect-video bg-black rounded-2xl overflow-hidden mb-3 relative">
        {content.status === 'PROCESSING' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface-900">
            <div className="w-10 h-10 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400 text-sm">Processing video — check back in a few minutes</p>
          </div>
        ) : isHls ? (
          <HlsVideoPlayer
            hlsUrl={content.hlsUrl!}
            videoRef={videoRef}
            onReady={handlePlayerReady}
            onProgress={(s) => { currentProgressRef.current = s; }}
          />
        ) : (
          <ReactPlayer
            ref={playerRef}
            url={content.mediaUrl}
            controls
            width="100%"
            height="100%"
            playing
            onReady={handlePlayerReady}
            onProgress={({ playedSeconds }) => { currentProgressRef.current = playedSeconds; }}
          />
        )}
      </div>

      {/* Resume banner */}
      {showResumeBanner && (
        <div className="flex items-center justify-between bg-surface-700 border border-surface-600 rounded-xl px-4 py-3 mb-4 text-sm">
          <span className="text-gray-300">
            You left off at <strong className="text-white">{formatTime(savedProgress)}</strong>
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleStartOver}
              className="text-gray-400 hover:text-white transition-colors px-3 py-1.5"
            >
              Start over
            </button>
            <button
              onClick={handleResume}
              className="bg-brand-500 hover:bg-brand-600 text-black font-semibold px-4 py-1.5 rounded-lg transition-colors"
            >
              Resume
            </button>
          </div>
        </div>
      )}

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
                {user && (user.id === c.user.id || user.isAdmin) && (
                  <button
                    onClick={() => handleDeleteComment(c.id)}
                    className="ml-auto text-xs text-gray-500 hover:text-red-400 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
              <p className="text-sm text-gray-300">{c.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
