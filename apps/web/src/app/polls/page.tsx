'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

type PollType = 'CONTENT_VOTE' | 'ARTIST_VOTE' | 'CUSTOM';

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
  _count: { votes: number; options: number };
}

const TYPE_META: Record<PollType, { emoji: string; label: string; color: string }> = {
  CONTENT_VOTE: { emoji: '🎵', label: 'Content Vote',   color: 'bg-camp-500/20 text-camp-400' },
  ARTIST_VOTE:  { emoji: '🌟', label: 'Artist Poll',    color: 'bg-brand-500/20 text-brand-400' },
  CUSTOM:       { emoji: '🗳️', label: 'Custom Poll',    color: 'bg-surface-600 text-gray-400' },
};

function PollCard({ poll }: { poll: Poll }) {
  const meta    = TYPE_META[poll.pollType];
  const closed  = poll.status === 'CLOSED';
  const expires = poll.endsAt ? new Date(poll.endsAt) : null;
  const soon    = expires && !closed && (expires.getTime() - Date.now()) < 24 * 3600 * 1000;

  return (
    <Link href={`/polls/${poll.id}`}
      className="flex items-stretch bg-surface-800 border border-surface-700 hover:border-surface-500 rounded-2xl overflow-hidden transition-colors group">
      {poll.imageUrl && (
        <div className="flex-shrink-0 w-24 bg-surface-700 overflow-hidden">
          <img src={poll.imageUrl} alt={poll.title} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="flex-1 min-w-0 p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${meta.color}`}>
              {meta.emoji} {meta.label}
            </span>
            {closed ? (
              <span className="text-xs px-2.5 py-1 rounded-full bg-surface-700 text-gray-500">Closed · Results live</span>
            ) : soon ? (
              <span className="text-xs px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 font-medium">Ending soon</span>
            ) : (
              <span className="text-xs px-2.5 py-1 rounded-full bg-green-500/20 text-green-400">Voting open</span>
            )}
          </div>
          <span className="text-brand-400 text-sm group-hover:translate-x-0.5 transition-transform flex-shrink-0">→</span>
        </div>

        <h2 className="text-white font-semibold text-base mb-1 group-hover:text-brand-400 transition-colors line-clamp-2">
          {poll.title}
        </h2>
        {poll.description && (
          <p className="text-gray-500 text-sm line-clamp-2 mb-3">{poll.description}</p>
        )}

        <div className="flex items-center gap-3 text-xs text-gray-500 mt-3 pt-3 border-t border-surface-700">
          <span>{poll._count.options} options</span>
          <span>·</span>
          <span>{poll._count.votes} vote{poll._count.votes !== 1 ? 's' : ''}</span>
          {expires && !closed && (
            <>
              <span>·</span>
              <span>Ends {expires.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            </>
          )}
          {closed && poll.endsAt && (
            <>
              <span>·</span>
              <span>Closed {new Date(poll.endsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function PollsPage() {
  const { user } = useAuth();
  const [active, setActive]   = useState<Poll[]>([]);
  const [closed, setClosed]   = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/polls', { params: { status: 'ACTIVE' } }),
      api.get('/polls', { params: { status: 'CLOSED' } }),
    ]).then(([a, c]) => {
      setActive(a.data.polls);
      setClosed(c.data.polls);
    }).catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="max-w-3xl mx-auto px-4 py-16 space-y-4">
      {[1,2,3].map((i) => <div key={i} className="h-36 bg-surface-800 rounded-2xl animate-pulse" />)}
    </div>
  );

  const total = active.length + closed.length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Community Polls</h1>
          <p className="text-gray-400 text-sm mt-0.5">{total} poll{total !== 1 ? 's' : ''} total</p>
        </div>
        {user?.isAdmin && (
          <Link href="/admin?tab=polls"
            className="text-xs px-4 py-2 bg-brand-500 text-black rounded-lg font-semibold hover:bg-brand-400 transition-colors">
            + Create Poll
          </Link>
        )}
      </div>

      {active.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Open — Vote Now</h2>
          <div className="space-y-3">
            {active.map((p) => <PollCard key={p.id} poll={p} />)}
          </div>
        </section>
      )}

      {active.length === 0 && (
        <div className="text-center py-12 text-gray-500 mb-10">
          <p className="text-4xl mb-3">🗳️</p>
          <p>No active polls right now.</p>
        </div>
      )}

      {closed.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Closed — See Results</h2>
          <div className="space-y-3">
            {closed.map((p) => <PollCard key={p.id} poll={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
