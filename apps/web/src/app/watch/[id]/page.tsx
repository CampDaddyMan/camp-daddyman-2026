'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { usePlayer } from '@/context/PlayerContext';
import { Content, Comment } from '@/types';
import Button from '@/components/ui/Button';
import AdSlot from '@/components/ads/AdSlot';

const AUDIO_TYPES = ['MUSIC', 'PODCAST', 'SPOKEN_WORD', 'DADDYMAN_ISMS'];

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
      controlsList="nodownload noremoteplayback"
      disablePictureInPicture
      className="w-full h-full"
      playsInline
      onContextMenu={(e) => e.preventDefault()}
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
  const TYPE_EMOJI: Record<string, string> = { MUSIC: '🎵', FILM: '🎬', PODCAST: '🎙️', SPOKEN_WORD: '🎤', DADDYMAN_ISMS: '💡', BOOK: '📖' };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Blurred preview */}
      <div className="relative aspect-video bg-surface-800 rounded-2xl overflow-hidden mb-8">
        {preview?.thumbnailUrl ? (
          <>
            {preview.thumbnailUrl.startsWith('http')
              ? <img src={preview.thumbnailUrl} alt={preview.title} className="absolute inset-0 w-full h-full object-cover blur-sm scale-105 opacity-40" />
              : <Image src={preview.thumbnailUrl} alt={preview.title} fill className="object-cover blur-sm scale-105 opacity-40" />
            }
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

function timeAgo(iso: string) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60)    return 'just now';
  if (secs < 3600)  return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  if (secs < 604800) return `${Math.floor(secs / 86400)}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

interface RelatedContent extends Content {
  mediaUrl?: string;
}

const REPORT_REASONS = [
  { value: 'SPAM',           label: 'Spam or misleading' },
  { value: 'INAPPROPRIATE',  label: 'Inappropriate content' },
  { value: 'COPYRIGHT',      label: 'Copyright violation' },
  { value: 'HATE_SPEECH',    label: 'Hate speech' },
  { value: 'MISINFORMATION', label: 'Misinformation' },
  { value: 'OTHER',          label: 'Other' },
];

function ReportModal({ contentId, onClose, onReported }: { contentId: string; onClose: () => void; onReported: () => void }) {
  const [reason, setReason] = useState('INAPPROPRIATE');
  const [detail, setDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(`/content/${contentId}/report`, { reason, detail });
      setDone(true);
    } catch {}
    finally { setSubmitting(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div className="bg-surface-800 border border-surface-600 rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        {done ? (
          <div className="text-center py-4">
            <p className="text-3xl mb-3">🚫</p>
            <p className="text-white font-semibold">Content hidden</p>
            <p className="text-gray-400 text-sm mt-1 mb-4">This content has been removed from your feed. You can undo this anytime.</p>
            <Button size="sm" onClick={onReported}>Done</Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold">Report content</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-2">Reason</label>
                <div className="space-y-2">
                  {REPORT_REASONS.map((r) => (
                    <label key={r.value} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="radio"
                        name="reason"
                        value={r.value}
                        checked={reason === r.value}
                        onChange={() => setReason(r.value)}
                        className="accent-brand-500"
                      />
                      <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{r.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Additional details (optional)</label>
                <textarea
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  rows={3}
                  maxLength={500}
                  className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400 resize-none"
                  placeholder="Add more context..."
                />
              </div>
              <div className="flex gap-3 pt-1">
                <Button type="submit" size="sm" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit report'}</Button>
                <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function MiniContentCard({ item }: { item: RelatedContent }) {
  return (
    <Link href={`/watch/${item.id}`} className="group flex gap-3 items-start hover:bg-surface-800 rounded-xl p-2 -mx-2 transition-colors">
      <div className="relative w-28 flex-shrink-0 aspect-video bg-surface-700 rounded-lg overflow-hidden">
        {item.thumbnailUrl ? (
          item.thumbnailUrl.startsWith('http')
            ? <img src={item.thumbnailUrl} alt={item.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            : <Image src={item.thumbnailUrl} alt={item.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xl">🎬</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-xs font-medium line-clamp-2 group-hover:text-brand-400 transition-colors leading-relaxed">{item.title}</p>
        <p className="text-gray-500 text-[11px] mt-1">{item.creator.displayName || item.creator.username}</p>
        <p className="text-gray-600 text-[11px]">{item.views.toLocaleString()} views</p>
      </div>
    </Link>
  );
}

export default function WatchPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const player = usePlayer();
  const [content, setContent] = useState<Content | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [subRequired, setSubRequired] = useState(false);
  const [preview, setPreview] = useState<PreviewContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [related, setRelated] = useState<{ fromCreator: RelatedContent[]; sameType: RelatedContent[] }>({ fromCreator: [], sameType: [] });
  const [reportOpen, setReportOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Resume playback state
  const [savedProgress, setSavedProgress] = useState(0);
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [hasResumed, setHasResumed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const currentProgressRef = useRef(0);
  const saveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const saveProgress = useCallback((seconds: number) => {
    if (!user || seconds < 5) return;
    api.post(`/content/${id}/progress`, { progress: Math.floor(seconds) }).catch(() => {});
  }, [id, user]);

  useEffect(() => {
    api.get(`/content/${id}`)
      .then((r) => { setContent(r.data.content); setLiked(r.data.isLiked ?? false); setSaved(r.data.isSaved ?? false); })
      .catch((err) => {
        if (err.response?.data?.requiresSubscription) {
          setSubRequired(true);
          setPreview(err.response.data.preview || null);
        } else if (err.response?.data?.hidden) {
          setHidden(true);
        } else {
          setError('Content not found.');
        }
      })
      .finally(() => setLoading(false));

    api.get(`/content/${id}/comments`)
      .then((r) => setComments(r.data.comments))
      .catch(() => {});

    api.get(`/content/${id}/related`)
      .then((r) => setRelated(r.data))
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

  // Auto-load audio content into global mini-player
  useEffect(() => {
    if (!content || !AUDIO_TYPES.includes(content.type) || !content.mediaUrl) return;
    player.play({
      id: content.id,
      title: content.title,
      creator: content.creator.displayName || content.creator.username,
      mediaUrl: content.mediaUrl,
      thumbnailUrl: content.thumbnailUrl ?? null,
      type: content.type,
    });
  }, [content?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync global player progress → currentProgressRef so API progress saving works for audio
  useEffect(() => {
    if (content && AUDIO_TYPES.includes(content.type)) {
      currentProgressRef.current = player.progress;
    }
  }, [player.progress, content?.type]);

  async function handleLike() {
    if (!user) return;
    const { data } = await api.post(`/content/${id}/like`);
    setLiked(data.liked);
  }

  async function handleSave() {
    if (!user) return;
    const { data } = await api.post(`/content/${id}/save`);
    setSaved(data.saved);
  }

  async function handleDownload() {
    if (!user || downloading) return;
    setDownloading(true);
    try {
      const { data } = await api.get(`/content/${id}/download`);
      const a = document.createElement('a');
      a.href = data.url;
      a.download = '';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      if (err.response?.status === 403) {
        window.location.href = '/subscribe';
      }
    } finally {
      setDownloading(false);
    }
  }

  async function handleShare() {
    const url = window.location.href;
    const shareData = { title: content!.title, url };
    if (navigator.share && navigator.canShare?.(shareData)) {
      await navigator.share(shareData).catch(() => {});
    } else {
      await navigator.clipboard.writeText(url).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim() || !user) return;
    const { data } = await api.post(`/content/${id}/comment`, { text: commentText });
    setComments((prev) => [data.comment, ...prev]);
    setCommentText('');
  }

  async function handleReply(e: React.FormEvent, parentId: string) {
    e.preventDefault();
    if (!replyText.trim() || !user) return;
    const { data } = await api.post(`/content/${id}/comment`, { text: replyText, parentId });
    setComments((prev) => prev.map((c) =>
      c.id === parentId
        ? { ...c, replies: [...(c.replies ?? []), { ...data.comment, replies: [] }], _count: { ...c._count, replies: c._count.replies + 1 } }
        : c
    ));
    setReplyText('');
    setReplyingTo(null);
  }

  async function handleCommentLike(commentId: string, isReply: boolean, parentId?: string) {
    if (!user) return;
    const { data } = await api.post(`/content/${id}/comment/${commentId}/like`);
    const delta = data.liked ? 1 : -1;
    setComments((prev) => prev.map((c) => {
      if (!isReply && c.id === commentId) {
        return { ...c, isLiked: data.liked, _count: { ...c._count, likes: c._count.likes + delta } };
      }
      if (isReply && c.id === parentId) {
        return {
          ...c,
          replies: (c.replies ?? []).map((r) =>
            r.id === commentId ? { ...r, isLiked: data.liked, _count: { ...r._count, likes: r._count.likes + delta } } : r
          ),
        };
      }
      return c;
    }));
  }

  async function handleDeleteComment(commentId: string) {
    await api.delete(`/content/${id}/comment/${commentId}`);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }

  async function handleUnreport() {
    await api.delete(`/content/${id}/report`).catch(() => {});
    setHidden(false);
    setLoading(true);
    api.get(`/content/${id}`)
      .then((r) => { setContent(r.data.content); setLiked(r.data.isLiked ?? false); })
      .catch(() => setError('Content not found.'))
      .finally(() => setLoading(false));
  }

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="aspect-video bg-surface-700 rounded-2xl animate-pulse mb-6" />
    </div>
  );

  if (hidden) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <p className="text-5xl mb-5">🚫</p>
      <h1 className="text-white text-xl font-bold mb-2">You've hidden this content</h1>
      <p className="text-gray-400 text-sm mb-8 max-w-sm">It won't appear in your feed, search results, or watch history. You can undo this if you change your mind.</p>
      <div className="flex gap-3 flex-wrap justify-center">
        <button
          onClick={handleUnreport}
          className="px-4 py-2 text-sm border border-surface-500 hover:border-surface-400 text-gray-300 hover:text-white rounded-lg transition-colors"
        >
          Undo — show it again
        </button>
        <Link href="/browse"><Button variant="secondary" size="md">Browse other content</Button></Link>
      </div>
    </div>
  );

  if (subRequired) return <SubscriberGate preview={preview} user={user} />;

  if (!content) return (
    <div className="text-center py-20 text-gray-400">{error || 'Content not found.'}</div>
  );

  const isHls = !!(content.hlsUrl);

  function seekTo(seconds: number) {
    if (videoRef.current) videoRef.current.currentTime = seconds;
  }

  function handlePlayerReady() {
    if (hasResumed || savedProgress <= 0) return;
    if (!showResumeBanner) {
      seekTo(savedProgress);
      setHasResumed(true);
    }
  }

  function handleResume() {
    if (AUDIO_TYPES.includes(content!.type)) {
      player.seek(savedProgress);
    } else {
      seekTo(savedProgress);
    }
    setHasResumed(true);
    setShowResumeBanner(false);
  }

  function handleStartOver() {
    setShowResumeBanner(false);
    setHasResumed(true);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-start">
      {/* ── Left column ── */}
      <div>
      {/* Player */}
      <div className={`${content.type === 'BOOK' ? 'min-h-[75vh]' : 'aspect-video'} bg-black rounded-2xl overflow-hidden mb-3 relative`}>
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
        ) : content.type === 'BOOK' ? (
          content.mediaUrl ? (
            <iframe
              src={content.mediaUrl}
              className="absolute inset-0 w-full h-full border-0"
              title={content.title}
              allow="fullscreen"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-900 gap-4">
              {content.thumbnailUrl
                ? <img src={content.thumbnailUrl} alt={content.title} className="h-40 object-contain rounded-lg shadow-lg" />
                : <div className="text-6xl">📖</div>}
              <p className="text-white font-semibold text-center">{content.title}</p>
              <p className="text-gray-400 text-sm">No file available for this book.</p>
            </div>
          )
        ) : AUDIO_TYPES.includes(content.type) ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-900 px-6 gap-2">
            {content.thumbnailUrl ? (
              <img src={content.thumbnailUrl} alt={content.title}
                className="w-28 h-28 rounded-2xl object-cover mb-2 shadow-lg" />
            ) : (
              <div className="text-5xl mb-2">
                {content.type === 'MUSIC' ? '🎵' : content.type === 'PODCAST' ? '🎙️' : content.type === 'DADDYMAN_ISMS' ? '💡' : '🎤'}
              </div>
            )}
            <p className="text-white font-semibold text-center line-clamp-2">{content.title}</p>
            <p className="text-gray-400 text-sm">{content.creator.displayName || content.creator.username}</p>
            <button
              onClick={player.toggle}
              className="mt-3 w-14 h-14 rounded-full bg-brand-500 hover:bg-brand-400 text-black flex items-center justify-center text-xl font-bold transition-colors"
            >
              {player.playing && player.track?.id === content.id ? '❚❚' : '▶'}
            </button>
            {player.track?.id === content.id && player.duration > 0 && (
              <div className="w-full max-w-sm mt-4 flex items-center gap-3">
                <span className="text-gray-500 text-xs font-mono tabular-nums w-10 text-right">{formatTime(player.progress)}</span>
                <input
                  type="range" min={0} max={player.duration} step={1} value={player.progress}
                  onChange={(e) => player.seek(Number(e.target.value))}
                  className="flex-1 accent-brand-500 cursor-pointer h-1"
                />
                <span className="text-gray-500 text-xs font-mono tabular-nums w-10">{formatTime(player.duration)}</span>
              </div>
            )}
          </div>
        ) : (
          <>
            <video
              src={content.mediaUrl ?? undefined}
              controls
              controlsList="nodownload noremoteplayback"
              disablePictureInPicture
              playsInline
              className="w-full h-full"
              onContextMenu={(e) => e.preventDefault()}
              onLoadedMetadata={handlePlayerReady}
              onTimeUpdate={(e) => { currentProgressRef.current = (e.target as HTMLVideoElement).currentTime; }}
              onError={(e) => {
                const el = e.target as HTMLVideoElement;
                const code = el.error?.code;
                const isMov = el.src?.toLowerCase().includes('.mov') || content.mediaUrl?.toLowerCase().includes('.mov');
                if (code === 4 && isMov) {
                  setError('MOV_COMPAT');
                } else if (code === 2) {
                  setError(`Network error — file may be inaccessible.`);
                } else if (code === 3) {
                  setError(`Decode error — file may be corrupt. Try re-uploading as MP4.`);
                } else if (code === 4) {
                  setError(`File not found or access denied.`);
                } else {
                  setError(`Playback error (code ${code}).`);
                }
              }}
            />
          </>
        )}
      </div>

      {content.type === 'BOOK' && content.mediaUrl && (
        <div className="flex items-center justify-between bg-surface-800 border border-surface-700 rounded-xl px-4 py-2.5 mb-3 text-sm">
          <span className="text-gray-400">Having trouble viewing?</span>
          <a
            href={content.mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-400 hover:text-brand-300 font-medium transition-colors"
          >
            Open in new tab ↗
          </a>
        </div>
      )}

      {error === 'MOV_COMPAT' ? (
        <div className="bg-surface-800 border border-surface-700 rounded-xl px-5 py-4 mb-3">
          <p className="text-white font-medium mb-1">MOV file — limited browser support</p>
          <p className="text-gray-400 text-sm">
            MOV (QuickTime) plays natively on Safari and Apple devices. On Chrome or Firefox, please re-upload as MP4 for universal playback.
          </p>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl mb-3">
          <p>{error}</p>
        </div>
      ) : null}

      {/* Resume banner */}
      {showResumeBanner && (
        <div className="flex items-center justify-between bg-surface-700 border border-surface-600 rounded-xl px-4 py-3 mb-4 text-sm">
          <span className="text-gray-300">
            You left off at <strong className="text-white">{formatTime(savedProgress)}</strong>
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleStartOver}
              className="border border-surface-500 hover:border-surface-400 text-gray-300 hover:text-white transition-colors px-3 py-1.5 rounded-lg text-sm font-medium"
            >
              Start over
            </button>
            <button
              onClick={handleResume}
              className="bg-brand-500 hover:bg-brand-600 text-black font-semibold px-4 py-1.5 rounded-lg transition-colors text-sm"
            >
              Resume
            </button>
          </div>
        </div>
      )}

      <AdSlot location="watch-below-player" className="mb-4" />

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

      {/* Report modal */}
      {reportOpen && <ReportModal contentId={id} onClose={() => setReportOpen(false)} onReported={() => { setReportOpen(false); setHidden(true); }} />}

      {/* Actions */}
      <div className="flex items-center gap-3 mb-8 pb-8 border-b border-surface-700 flex-wrap">
        <Button variant={liked ? 'primary' : 'secondary'} size="sm" onClick={handleLike} disabled={!user}>
          {liked ? '👍 Liked' : '👍 Like'} · {(content._count?.likes || 0) + (liked ? 1 : 0)}
        </Button>
        <Button variant={saved ? 'primary' : 'secondary'} size="sm" onClick={handleSave} disabled={!user}>
          {saved ? '🔖 Saved' : '🔖 Save'}
        </Button>
        <Button variant="secondary" size="sm" onClick={handleShare}>
          {copied ? '✓ Copied!' : '↗ Share'}
        </Button>
        {content.mediaUrl && (
          user?.subscription?.plan === 'PREMIUM' || user?.subscription?.plan === 'CREATOR' || user?.isAdmin
            ? (
              <Button variant="secondary" size="sm" onClick={handleDownload} disabled={downloading}>
                {downloading ? '⏳' : '⬇ Download'}
              </Button>
            ) : (
              <Link href="/subscribe">
                <Button variant="ghost" size="sm" className="opacity-60 hover:opacity-100">
                  ⬇ Download
                </Button>
              </Link>
            )
        )}
        <Link href={`/creator/${content.creator.username}`}>
          <Button variant="ghost" size="sm">
            {content.creator.displayName || content.creator.username}
          </Button>
        </Link>
        <div className="ml-auto">
          {user && user.username !== content.creator.username && (
            <button
              onClick={() => setReportOpen(true)}
              className="text-xs text-gray-500 hover:text-red-400 transition-colors flex items-center gap-1"
            >
              <span>⚑</span> Report
            </button>
          )}
        </div>
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
        <h3 className="font-semibold text-white mb-4">
          Comments {comments.length > 0 && <span className="text-gray-500 font-normal text-sm ml-1">({comments.length})</span>}
        </h3>

        {user ? (
          <form onSubmit={handleComment} className="flex gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-surface-600 flex-shrink-0 flex items-center justify-center text-sm font-semibold text-white overflow-hidden">
              {user.avatar
                ? <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                : (user.displayName || user.username)[0].toUpperCase()
              }
            </div>
            <div className="flex-1 flex gap-2">
              <input
                value={commentText} onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 bg-surface-700 border border-surface-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400 transition-colors"
              />
              <Button type="submit" size="sm" disabled={!commentText.trim()}>Post</Button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-gray-500 mb-6">
            <Link href="/login" className="text-brand-400 hover:underline">Sign in</Link> to leave a comment.
          </p>
        )}

        {comments.length === 0 ? (
          <p className="text-gray-600 text-sm py-4">No comments yet — be the first.</p>
        ) : (
          <div className="space-y-4">
            {comments.map((c) => {
              const name = c.user.displayName || c.user.username;
              return (
                <div key={c.id}>
                  {/* Top-level comment */}
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-surface-600 flex-shrink-0 flex items-center justify-center text-sm font-semibold text-white overflow-hidden mt-0.5">
                      {c.user.avatar
                        ? <img src={c.user.avatar} alt="" className="w-full h-full object-cover" />
                        : name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-0.5 flex-wrap">
                        <span className="text-sm font-medium text-white">{name}</span>
                        <span className="text-xs text-gray-500">{timeAgo(c.createdAt)}</span>
                        {user && (user.id === c.user.id || user.isAdmin) && (
                          <button onClick={() => handleDeleteComment(c.id)} className="ml-auto text-xs text-gray-600 hover:text-red-400 transition-colors">Delete</button>
                        )}
                      </div>
                      <p className="text-sm text-gray-300 leading-relaxed mb-1.5">{c.text}</p>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => handleCommentLike(c.id, false)}
                          disabled={!user}
                          className={`flex items-center gap-1 text-xs transition-colors ${c.isLiked ? 'text-brand-400' : 'text-gray-500 hover:text-gray-300'} disabled:opacity-40`}
                        >
                          <span>{c.isLiked ? '♥' : '♡'}</span>
                          {c._count.likes > 0 && <span>{c._count.likes}</span>}
                        </button>
                        {user && (
                          <button
                            onClick={() => { setReplyingTo(replyingTo === c.id ? null : c.id); setReplyText(''); }}
                            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                          >
                            Reply
                          </button>
                        )}
                      </div>

                      {/* Inline reply input */}
                      {replyingTo === c.id && (
                        <form onSubmit={(e) => handleReply(e, c.id)} className="flex gap-2 mt-3">
                          <input
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder={`Reply to ${name}...`}
                            autoFocus
                            className="flex-1 bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400 transition-colors"
                          />
                          <button type="submit" disabled={!replyText.trim()}
                            className="bg-brand-500 hover:bg-brand-400 disabled:opacity-40 text-black font-semibold px-3 py-2 rounded-lg text-xs transition-colors">
                            Post
                          </button>
                          <button type="button" onClick={() => setReplyingTo(null)}
                            className="text-xs text-gray-500 hover:text-white transition-colors px-2">
                            ✕
                          </button>
                        </form>
                      )}
                    </div>
                  </div>

                  {/* Replies */}
                  {(c.replies ?? []).length > 0 && (
                    <div className="ml-11 mt-3 space-y-3 border-l border-surface-700 pl-4">
                      {(c.replies ?? []).map((r) => {
                        const rName = r.user.displayName || r.user.username;
                        return (
                          <div key={r.id} className="flex gap-3">
                            <div className="w-6 h-6 rounded-full bg-surface-600 flex-shrink-0 flex items-center justify-center text-xs font-semibold text-white overflow-hidden mt-0.5">
                              {r.user.avatar
                                ? <img src={r.user.avatar} alt="" className="w-full h-full object-cover" />
                                : rName[0].toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-2 mb-0.5 flex-wrap">
                                <span className="text-sm font-medium text-white">{rName}</span>
                                <span className="text-xs text-gray-500">{timeAgo(r.createdAt)}</span>
                                {user && (user.id === r.user.id || user.isAdmin) && (
                                  <button onClick={() => handleDeleteComment(r.id)} className="ml-auto text-xs text-gray-600 hover:text-red-400 transition-colors">Delete</button>
                                )}
                              </div>
                              <p className="text-sm text-gray-300 leading-relaxed mb-1">{r.text}</p>
                              <button
                                onClick={() => handleCommentLike(r.id, true, c.id)}
                                disabled={!user}
                                className={`flex items-center gap-1 text-xs transition-colors ${r.isLiked ? 'text-brand-400' : 'text-gray-500 hover:text-gray-300'} disabled:opacity-40`}
                              >
                                <span>{r.isLiked ? '♥' : '♡'}</span>
                                {r._count.likes > 0 && <span>{r._count.likes}</span>}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>{/* end left column */}

      {/* ── Right sidebar ── */}
      <div className="hidden lg:block space-y-6 sticky top-6">
        {related.fromCreator.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-300">
                More from {content.creator.displayName || content.creator.username}
              </h3>
              <Link href={`/creator/${content.creator.username}`} className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
                View all
              </Link>
            </div>
            <div className="space-y-1">
              {related.fromCreator.map((item) => <MiniContentCard key={item.id} item={item} />)}
            </div>
          </div>
        )}
        {related.sameType.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3">
              More {content.type.replace(/_/g, ' ').toLowerCase()}
            </h3>
            <div className="space-y-1">
              {related.sameType.slice(0, 5).map((item) => <MiniContentCard key={item.id} item={item} />)}
            </div>
          </div>
        )}
      </div>

      </div>{/* end grid */}
    </div>
  );
}
