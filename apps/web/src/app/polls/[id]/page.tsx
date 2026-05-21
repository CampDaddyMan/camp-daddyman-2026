'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { usePlayer } from '@/context/PlayerContext';

// ── Types ─────────────────────────────────────────────────────────────────────

type PollType = 'CONTENT_VOTE' | 'ARTIST_VOTE' | 'CUSTOM';

interface TopTrack { id: string; title: string; type: string; thumbnailUrl: string | null; views: number }

interface PollOption {
  id: string;
  label: string;
  order: number;
  _count?: { votes: number };
  // CONTENT_VOTE
  content?: { id: string; title: string; type: string; mediaUrl: string | null; thumbnailUrl: string | null } | null;
  // ARTIST_VOTE
  artist?: {
    id: string; username: string; displayName: string | null; avatar: string | null; bio: string | null;
    _count: { followers: number; content: number };
    topContent: TopTrack[];
  } | null;
  // CUSTOM
  imageUrl?: string | null;
  body?: string | null;
}

interface Poll {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  pollType: PollType;
  status: 'ACTIVE' | 'CLOSED';
  startsAt: string | null;
  endsAt: string | null;
  allowMultiple: boolean;
  createdAt: string;
  creator: { username: string; displayName: string | null };
  options: PollOption[];
  _count: { votes: number };
}

// ── Mini audio player ─────────────────────────────────────────────────────────

function AudioPlayer({
  contentId, src, label, thumbnailUrl, type, creator,
}: {
  contentId: string; src: string; label: string;
  thumbnailUrl: string | null; type: string; creator: string;
}) {
  const player = usePlayer();
  const isThis = player.track?.id === contentId;
  const isPlaying = isThis && player.playing;
  const pct = isThis && player.duration > 0 ? (player.progress / player.duration) * 100 : 0;

  function toggle() {
    if (isThis) {
      player.toggle();
    } else {
      player.play({ id: contentId, title: label, creator, mediaUrl: src, thumbnailUrl, type });
    }
  }

  return (
    <div className="flex items-center gap-3 bg-surface-900 rounded-lg px-3 py-2">
      <button onClick={toggle}
        className="w-9 h-9 rounded-full bg-brand-500 hover:bg-brand-400 text-black flex items-center justify-center flex-shrink-0 transition-colors text-sm">
        {isPlaying ? '❚❚' : '▶'}
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 truncate">{label}</p>
        <div className="h-1 bg-surface-600 rounded-full mt-1 overflow-hidden">
          <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

// ── Lightbox ──────────────────────────────────────────────────────────────────

function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
      onClick={onClose}>
      <div className="relative max-w-4xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose}
          className="absolute -top-10 right-0 text-white/70 hover:text-white text-2xl leading-none transition-colors">
          ✕
        </button>
        <img src={src} alt="" className="w-full max-h-[85vh] object-contain rounded-xl shadow-2xl" />
      </div>
    </div>
  );
}

// ── Option card variants ──────────────────────────────────────────────────────

function ResultBar({ votes, total, isMyPick }: { votes: number; total: number; isMyPick: boolean }) {
  const pct = total > 0 ? Math.round((votes / total) * 100) : 0;
  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>{votes} vote{votes !== 1 ? 's' : ''}</span>
        <span className="font-semibold text-white">{pct}%</span>
      </div>
      <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${isMyPick ? 'bg-brand-500' : 'bg-camp-500'}`}
          style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ContentOptionBody({ opt, canVote, creator, onExpand }: {
  opt: PollOption; canVote: boolean; creator: string; onExpand: (src: string) => void;
}) {
  const thumb = opt.content?.thumbnailUrl;
  return (
    <>
      {thumb ? (
        <button type="button" onClick={() => onExpand(thumb)}
          className="mt-3 w-full rounded-lg overflow-hidden aspect-video bg-surface-700 relative group block text-left">
          <img src={thumb} alt={opt.content?.title ?? opt.label} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-2xl drop-shadow">🔍</span>
          </div>
          {opt.content?.title && (
            <p className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/70 to-transparent text-white text-xs truncate">
              {opt.content.title}
            </p>
          )}
        </button>
      ) : (
        <p className="text-gray-500 text-xs mt-0.5">{opt.content?.title}</p>
      )}
      {canVote && opt.content?.mediaUrl && (
        <div className="mt-3">
          <AudioPlayer
            contentId={opt.content.id}
            src={opt.content.mediaUrl}
            label={opt.content.title}
            thumbnailUrl={opt.content.thumbnailUrl}
            type={opt.content.type}
            creator={creator}
          />
        </div>
      )}
    </>
  );
}

function ArtistOptionBody({ opt }: { opt: PollOption }) {
  const a = opt.artist;
  if (!a) return null;
  return (
    <div className="mt-3 space-y-3">
      {/* Artist header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-surface-600 overflow-hidden flex-shrink-0">
          {a.avatar
            ? <img src={a.avatar} alt={a.username} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-lg text-gray-400">🎤</div>
          }
        </div>
        <div>
          <p className="text-white font-semibold text-sm">{a.displayName || `@${a.username}`}</p>
          <p className="text-gray-500 text-xs">@{a.username} · {a._count.followers.toLocaleString()} followers · {a._count.content} tracks</p>
        </div>
      </div>

      {/* Bio */}
      {a.bio && <p className="text-gray-400 text-xs leading-relaxed line-clamp-3">{a.bio}</p>}

      {/* Top tracks */}
      {a.topContent.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Top Tracks / Videos</p>
          <div className="grid grid-cols-2 gap-2">
            {a.topContent.map((track) => (
              <Link key={track.id} href={`/watch/${track.id}`}
                className="group rounded-lg overflow-hidden bg-surface-700 hover:bg-surface-600 transition-colors">
                <div className="aspect-video bg-surface-600 relative">
                  {track.thumbnailUrl
                    ? <img src={track.thumbnailUrl} alt={track.title} className="w-full h-full object-cover" />
                    : <div className="absolute inset-0 flex items-center justify-center text-2xl">🎵</div>
                  }
                </div>
                <p className="px-2 py-1.5 text-xs text-gray-300 line-clamp-1 group-hover:text-white transition-colors">{track.title}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      <Link href={`/creator/${a.username}`}
        className="inline-block text-xs text-brand-400 hover:text-brand-300 transition-colors">
        View full profile →
      </Link>
    </div>
  );
}

function CustomOptionBody({ opt, onExpand }: { opt: PollOption; onExpand: (src: string) => void }) {
  return (
    <>
      {opt.imageUrl && (
        <button type="button" onClick={() => onExpand(opt.imageUrl!)}
          className="mt-3 w-full rounded-lg overflow-hidden aspect-video bg-surface-700 relative group block text-left">
          <img src={opt.imageUrl} alt={opt.label} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-2xl drop-shadow">🔍</span>
          </div>
        </button>
      )}
      {opt.body && <p className="text-gray-400 text-sm mt-2 leading-relaxed">{opt.body}</p>}
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PollPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [poll, setPoll]         = useState<Poll | null>(null);
  const [myVotes, setMyVotes]   = useState<string[]>([]);
  const [voting, setVoting]     = useState<string | null>(null);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(true);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    api.get(`/polls/${id}`)
      .then(({ data }) => {
        setPoll(data.poll);
        // Support both old (myVoteOptionId) and new (myVoteOptionIds) API shape
        if (Array.isArray(data.myVoteOptionIds)) setMyVotes(data.myVoteOptionIds);
        else if (data.myVoteOptionId) setMyVotes([data.myVoteOptionId]);
      })
      .catch(() => setError('Poll not found'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleVote(optionId: string) {
    if (!poll || poll.status === 'CLOSED') return;
    setVoting(optionId);
    setError('');
    try {
      const { data } = await api.post(`/polls/${id}/vote`, { optionId });
      if (poll.allowMultiple) {
        // Toggle: server returns action 'added' | 'removed'
        setMyVotes((prev) =>
          data.action === 'removed'
            ? prev.filter((id) => id !== optionId)
            : [...prev, optionId]
        );
      } else {
        setMyVotes([optionId]);
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Vote failed');
    } finally {
      setVoting(null);
    }
  }

  const isPaid   = !!(user?.subscription?.plan && user.subscription.plan !== 'FREE');
  const canVote  = isPaid || !!user?.isAdmin;
  const isClosed = poll?.status === 'CLOSED';
  const notStarted = !!(poll?.startsAt && new Date(poll.startsAt) > new Date());
  const totalVotes = poll?._count.votes ?? 0;

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-16 space-y-4">
      {[1,2,3].map((i) => <div key={i} className="h-32 bg-surface-800 rounded-xl animate-pulse" />)}
    </div>
  );

  if (error || !poll) return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center text-gray-400">
      <p className="text-4xl mb-3">🗳️</p>
      <p>{error || 'Poll not found'}</p>
      <Link href="/" className="mt-4 inline-block text-brand-400 hover:underline text-sm">Back to home</Link>
    </div>
  );

  const TYPE_LABEL: Record<PollType, string> = {
    CONTENT_VOTE: '🎵 Listening Poll',
    ARTIST_VOTE:  '🌟 Artist Poll',
    CUSTOM:       '🗳️ Poll',
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        {poll.imageUrl && (
          <div className="rounded-2xl overflow-hidden aspect-video bg-surface-800 mb-6">
            <img src={poll.imageUrl} alt={poll.title} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs px-2.5 py-1 rounded-full bg-surface-700 text-gray-400 font-medium">
            {TYPE_LABEL[poll.pollType]}
          </span>
          {poll.allowMultiple && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-camp-500/20 text-camp-400 font-medium">
              Multi-select
            </span>
          )}
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
            isClosed ? 'bg-surface-600 text-gray-400' : notStarted ? 'bg-surface-600 text-gray-500' : 'bg-brand-500/20 text-brand-400'
          }`}>
            {isClosed ? 'Closed' : notStarted ? 'Not started' : 'Voting Open'}
          </span>
          {notStarted && poll.startsAt && (
            <span className="text-xs text-gray-500">
              Opens {new Date(poll.startsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </span>
          )}
          {poll.endsAt && !isClosed && !notStarted && (
            <span className="text-xs text-gray-500">
              Ends {new Date(poll.endsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-white">{poll.title}</h1>
        {poll.description && <p className="text-gray-400 mt-2 text-sm">{poll.description}</p>}
        <p className="text-xs text-gray-600 mt-2">
          by @{poll.creator.username} · {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Auth / subscriber gates */}
      {!user && (
        <div className="bg-surface-800 border border-surface-700 rounded-xl p-6 text-center mb-6">
          <p className="text-white font-medium mb-1">Members only</p>
          <p className="text-gray-400 text-sm mb-4">Sign in with a paid membership to vote.</p>
          <Link href="/login" className="inline-block px-5 py-2 bg-brand-500 text-black rounded-lg font-semibold text-sm hover:bg-brand-400 transition-colors">
            Sign In
          </Link>
        </div>
      )}
      {user && !canVote && !isClosed && (
        <div className="bg-surface-800 border border-surface-700 rounded-xl p-6 text-center mb-6">
          <p className="text-white font-medium mb-1">Paid membership required to vote</p>
          <p className="text-gray-400 text-sm mb-4">Upgrade to PRO or PREMIUM to cast your vote.</p>
          <Link href="/subscribe" className="inline-block px-5 py-2 bg-brand-500 text-black rounded-lg font-semibold text-sm hover:bg-brand-400 transition-colors">
            Upgrade Now
          </Link>
        </div>
      )}
      {myVotes.length > 0 && !isClosed && !notStarted && (
        <p className="text-xs text-gray-500 mb-4">
          {poll.allowMultiple
            ? `${myVotes.length} option${myVotes.length !== 1 ? 's' : ''} selected · tap to toggle`
            : 'You voted · tap another option to change your vote'}
        </p>
      )}

      {/* Options */}
      <div className="space-y-4">
        {poll.options.map((opt) => {
          const isMyPick = myVotes.includes(opt.id);

          return (
            <div key={opt.id}
              className={`rounded-xl border transition-colors overflow-hidden ${
                isMyPick ? 'border-brand-500 bg-brand-500/10' : 'border-surface-700 bg-surface-800'
              }`}>
              <div className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-white font-semibold">{opt.label}</p>
                  {canVote && !isClosed && !notStarted && (
                    <button onClick={() => handleVote(opt.id)} disabled={voting === opt.id}
                      className={`flex-shrink-0 text-xs px-4 py-1.5 rounded-full font-semibold transition-colors disabled:opacity-50 ${
                        isMyPick
                          ? 'bg-brand-500 text-black'
                          : 'bg-surface-600 text-gray-300 hover:bg-brand-500/20 hover:text-brand-400'
                      }`}>
                      {voting === opt.id ? '…' : isMyPick ? (poll.allowMultiple ? '✓ Selected' : 'Your Vote ✓') : (poll.allowMultiple ? 'Select' : 'Vote')}
                    </button>
                  )}
                </div>

                {/* Type-specific body */}
                {poll.pollType === 'CONTENT_VOTE' && (
                  <ContentOptionBody opt={opt} canVote={canVote} creator={poll.creator.displayName || poll.creator.username} onExpand={setLightbox} />
                )}
                {poll.pollType === 'ARTIST_VOTE' && (
                  <ArtistOptionBody opt={opt} />
                )}
                {poll.pollType === 'CUSTOM' && (
                  <CustomOptionBody opt={opt} onExpand={setLightbox} />
                )}

                {/* Results bar — only when closed */}
                {isClosed && opt._count !== undefined && (
                  <ResultBar votes={opt._count.votes} total={totalVotes} isMyPick={isMyPick} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error && <p className="mt-4 text-red-400 text-sm text-center">{error}</p>}

      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}
