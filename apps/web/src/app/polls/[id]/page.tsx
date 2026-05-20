'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

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
  endsAt: string | null;
  createdAt: string;
  creator: { username: string; displayName: string | null };
  options: PollOption[];
  _count: { votes: number };
}

// ── Mini audio player ─────────────────────────────────────────────────────────

function AudioPlayer({ src, label }: { src: string; label: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  function toggle() {
    const el = ref.current;
    if (!el) return;
    playing ? el.pause() : el.play();
    setPlaying(!playing);
  }

  return (
    <div className="flex items-center gap-3 bg-surface-900 rounded-lg px-3 py-2">
      <button onClick={toggle}
        className="w-9 h-9 rounded-full bg-brand-500 hover:bg-brand-400 text-black flex items-center justify-center flex-shrink-0 transition-colors text-sm">
        {playing ? '❚❚' : '▶'}
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 truncate">{label}</p>
        <div className="h-1 bg-surface-600 rounded-full mt-1 overflow-hidden">
          <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <audio ref={ref} src={src}
        controlsList="nodownload"
        onContextMenu={(e) => e.preventDefault()}
        onTimeUpdate={() => {
          const el = ref.current;
          if (el?.duration) setProgress((el.currentTime / el.duration) * 100);
        }}
        onEnded={() => { setPlaying(false); setProgress(0); }}
      />
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

function ContentOptionBody({ opt, canVote }: { opt: PollOption; canVote: boolean }) {
  return (
    <>
      <p className="text-gray-500 text-xs mt-0.5">{opt.content?.title}</p>
      {canVote && opt.content?.mediaUrl && (
        <div className="mt-3">
          <AudioPlayer src={opt.content.mediaUrl} label={opt.content.title} />
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

function CustomOptionBody({ opt }: { opt: PollOption }) {
  return (
    <>
      {opt.imageUrl && (
        <div className="mt-3 rounded-lg overflow-hidden aspect-video bg-surface-700">
          <img src={opt.imageUrl} alt={opt.label} className="w-full h-full object-cover" />
        </div>
      )}
      {opt.body && <p className="text-gray-400 text-sm mt-2 leading-relaxed">{opt.body}</p>}
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PollPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [poll, setPoll]       = useState<Poll | null>(null);
  const [myVote, setMyVote]   = useState<string | null>(null);
  const [voting, setVoting]   = useState<string | null>(null);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/polls/${id}`)
      .then(({ data }) => { setPoll(data.poll); setMyVote(data.myVoteOptionId); })
      .catch(() => setError('Poll not found'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleVote(optionId: string) {
    if (!poll || poll.status === 'CLOSED') return;
    setVoting(optionId);
    setError('');
    try {
      await api.post(`/polls/${id}/vote`, { optionId });
      setMyVote(optionId);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Vote failed');
    } finally {
      setVoting(null);
    }
  }

  const isPaid   = !!(user?.subscription?.plan && user.subscription.plan !== 'FREE');
  const canVote  = isPaid || !!user?.isAdmin;
  const isClosed = poll?.status === 'CLOSED';
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
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${isClosed ? 'bg-surface-600 text-gray-400' : 'bg-brand-500/20 text-brand-400'}`}>
            {isClosed ? 'Closed' : 'Voting Open'}
          </span>
          {poll.endsAt && !isClosed && (
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
      {myVote && !isClosed && (
        <p className="text-xs text-gray-500 mb-4">You voted · tap another option to change your vote</p>
      )}

      {/* Options */}
      <div className="space-y-4">
        {poll.options.map((opt) => {
          const isMyPick = myVote === opt.id;

          return (
            <div key={opt.id}
              className={`rounded-xl border transition-colors overflow-hidden ${
                isMyPick ? 'border-brand-500 bg-brand-500/10' : 'border-surface-700 bg-surface-800'
              }`}>
              <div className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-white font-semibold">{opt.label}</p>
                  {canVote && !isClosed && (
                    <button onClick={() => handleVote(opt.id)} disabled={voting === opt.id}
                      className={`flex-shrink-0 text-xs px-4 py-1.5 rounded-full font-semibold transition-colors disabled:opacity-50 ${
                        isMyPick
                          ? 'bg-brand-500 text-black'
                          : 'bg-surface-600 text-gray-300 hover:bg-brand-500/20 hover:text-brand-400'
                      }`}>
                      {voting === opt.id ? '…' : isMyPick ? 'Your Vote ✓' : 'Vote'}
                    </button>
                  )}
                </div>

                {/* Type-specific body */}
                {poll.pollType === 'CONTENT_VOTE' && (
                  <ContentOptionBody opt={opt} canVote={canVote} />
                )}
                {poll.pollType === 'ARTIST_VOTE' && (
                  <ArtistOptionBody opt={opt} />
                )}
                {poll.pollType === 'CUSTOM' && (
                  <CustomOptionBody opt={opt} />
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
    </div>
  );
}
