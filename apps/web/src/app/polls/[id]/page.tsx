'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface PollOption {
  id: string;
  label: string;
  order: number;
  content: {
    id: string;
    title: string;
    type: string;
    mediaUrl: string | null;
    thumbnailUrl: string | null;
  };
  _count?: { votes: number };
}

interface Poll {
  id: string;
  title: string;
  description: string | null;
  status: 'ACTIVE' | 'CLOSED';
  endsAt: string | null;
  createdAt: string;
  creator: { username: string; displayName: string | null };
  options: PollOption[];
  _count: { votes: number };
}

function AudioPlayer({ src, label }: { src: string; label: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  function toggle() {
    const el = ref.current;
    if (!el) return;
    if (playing) { el.pause(); } else { el.play(); }
    setPlaying(!playing);
  }

  return (
    <div className="flex items-center gap-3 bg-surface-900 rounded-lg px-3 py-2">
      <button
        onClick={toggle}
        className="w-9 h-9 rounded-full bg-brand-500 hover:bg-brand-400 text-black flex items-center justify-center flex-shrink-0 transition-colors text-sm"
      >
        {playing ? '❚❚' : '▶'}
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 truncate">{label}</p>
        <div className="h-1 bg-surface-600 rounded-full mt-1 overflow-hidden">
          <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <audio
        ref={ref}
        src={src}
        onTimeUpdate={() => {
          const el = ref.current;
          if (el && el.duration) setProgress((el.currentTime / el.duration) * 100);
        }}
        onEnded={() => { setPlaying(false); setProgress(0); }}
      />
    </div>
  );
}

export default function PollPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [poll, setPoll]         = useState<Poll | null>(null);
  const [myVote, setMyVote]     = useState<string | null>(null);
  const [voting, setVoting]     = useState<string | null>(null);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(true);

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

  const isPaid   = user?.subscription?.plan && user.subscription.plan !== 'FREE';
  const isClosed = poll?.status === 'CLOSED';
  const totalVotes = poll?._count.votes ?? 0;

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-16 space-y-4">
      {[1,2,3].map((i) => <div key={i} className="h-28 bg-surface-800 rounded-xl animate-pulse" />)}
    </div>
  );

  if (error || !poll) return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center text-gray-400">
      <p className="text-4xl mb-3">🎵</p>
      <p>{error || 'Poll not found'}</p>
      <Link href="/" className="mt-4 inline-block text-brand-400 hover:underline text-sm">Back to home</Link>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
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

      {/* Subscriber gate */}
      {!user && (
        <div className="bg-surface-800 border border-surface-700 rounded-xl p-6 text-center mb-6">
          <p className="text-white font-medium mb-1">Members only</p>
          <p className="text-gray-400 text-sm mb-4">Sign in with a paid membership to listen and vote.</p>
          <Link href="/login" className="inline-block px-5 py-2 bg-brand-500 text-black rounded-lg font-semibold text-sm hover:bg-brand-400 transition-colors">
            Sign In
          </Link>
        </div>
      )}
      {user && !isPaid && !isClosed && (
        <div className="bg-surface-800 border border-surface-700 rounded-xl p-6 text-center mb-6">
          <p className="text-white font-medium mb-1">Paid membership required</p>
          <p className="text-gray-400 text-sm mb-4">Upgrade to PRO or PREMIUM to listen and vote.</p>
          <Link href="/subscribe" className="inline-block px-5 py-2 bg-brand-500 text-black rounded-lg font-semibold text-sm hover:bg-brand-400 transition-colors">
            Upgrade Now
          </Link>
        </div>
      )}

      {/* Vote changed notice */}
      {myVote && !isClosed && (
        <p className="text-xs text-gray-500 mb-4">You voted · tap another option to change your vote</p>
      )}

      {/* Options */}
      <div className="space-y-4">
        {poll.options.map((opt) => {
          const isMyPick  = myVote === opt.id;
          const votePct   = isClosed && totalVotes > 0 && opt._count
            ? Math.round((opt._count.votes / totalVotes) * 100)
            : null;
          const canVote   = !isClosed && (isPaid || user?.isAdmin);

          return (
            <div
              key={opt.id}
              className={`rounded-xl border transition-colors overflow-hidden ${
                isMyPick
                  ? 'border-brand-500 bg-brand-500/10'
                  : 'border-surface-700 bg-surface-800'
              }`}
            >
              <div className="px-5 py-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-white font-medium">{opt.label}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{opt.content.title}</p>
                  </div>
                  {canVote && (
                    <button
                      onClick={() => handleVote(opt.id)}
                      disabled={voting === opt.id}
                      className={`flex-shrink-0 text-xs px-4 py-1.5 rounded-full font-semibold transition-colors disabled:opacity-50 ${
                        isMyPick
                          ? 'bg-brand-500 text-black'
                          : 'bg-surface-600 text-gray-300 hover:bg-brand-500/20 hover:text-brand-400'
                      }`}
                    >
                      {voting === opt.id ? '…' : isMyPick ? 'Your Vote ✓' : 'Vote'}
                    </button>
                  )}
                </div>

                {/* Audio player — only shown to authenticated paid users */}
                {(isPaid || user?.isAdmin) && opt.content.mediaUrl && (
                  <AudioPlayer src={opt.content.mediaUrl} label={opt.content.title} />
                )}

                {/* Results bar — only when closed */}
                {isClosed && votePct !== null && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>{opt._count?.votes ?? 0} vote{opt._count?.votes !== 1 ? 's' : ''}</span>
                      <span className="font-semibold text-white">{votePct}%</span>
                    </div>
                    <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isMyPick ? 'bg-brand-500' : 'bg-camp-500'}`}
                        style={{ width: `${votePct}%` }}
                      />
                    </div>
                  </div>
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
