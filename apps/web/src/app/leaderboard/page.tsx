'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import Link from 'next/link';
import { getLevel } from '@/lib/xp';

interface LeaderEntry {
  rank: number; username: string; displayName: string | null;
  avatar: string | null; xp: number; currentStreak?: number; badgeCount?: number; xpEarned?: number;
}

const LEVEL_EMOJI = ['🥚', '🐛', '🫘', '🦋'];
const RANK_STYLE = ['text-brand-400', 'text-gray-300', 'text-amber-600'];

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [board, setBoard]   = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/loyalty/leaderboard')
      .then((r) => setBoard(r.data.leaderboard))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-2">🏆 Top Fans</h1>
        <p className="text-gray-400 text-sm">The most active members of Camp DaddyMan. Earn XP by watching, liking, commenting, following and buying.</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-16 bg-surface-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : board.length === 0 ? (
        <div className="text-center py-20 text-gray-500">No activity yet — be the first on the board.</div>
      ) : (
        <div className="space-y-2">
          {board.map((entry) => {
            const { index } = getLevel(entry.xp);
            const isMe = user?.username === entry.username;
            return (
              <Link
                key={entry.username}
                href={`/creator/${entry.username}`}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl border transition-colors hover:bg-surface-700 ${
                  isMe
                    ? 'bg-brand-500/10 border-brand-500/30'
                    : 'bg-surface-800 border-surface-700'
                }`}
              >
                {/* Rank */}
                <span className={`w-8 text-center font-black text-lg flex-shrink-0 ${RANK_STYLE[entry.rank - 1] || 'text-gray-500'}`}>
                  {entry.rank <= 3 ? ['🥇','🥈','🥉'][entry.rank - 1] : `#${entry.rank}`}
                </span>

                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-surface-600 flex-shrink-0 overflow-hidden flex items-center justify-center text-base font-bold text-white">
                  {entry.avatar
                    ? <img src={entry.avatar} alt="" className="w-full h-full object-cover" />
                    : (entry.displayName || entry.username)[0].toUpperCase()
                  }
                </div>

                {/* Name + level */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`font-semibold truncate ${isMe ? 'text-brand-400' : 'text-white'}`}>
                      {entry.displayName || entry.username}
                      {isMe && <span className="text-xs ml-1 text-brand-400/70">(you)</span>}
                    </p>
                    <span className="text-base leading-none">{LEVEL_EMOJI[index - 1]}</span>
                  </div>
                  <p className="text-xs text-gray-500">@{entry.username}</p>
                </div>

                {/* XP + streak */}
                <div className="text-right flex-shrink-0">
                  <p className="text-brand-400 font-black">{entry.xp.toLocaleString()} XP</p>
                  {entry.currentStreak ? (
                    <p className="text-xs text-gray-500">🔥 {entry.currentStreak}d streak</p>
                  ) : entry.badgeCount ? (
                    <p className="text-xs text-gray-500">{entry.badgeCount} badges</p>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="mt-8 text-center">
        <Link href="/loyalty" className="text-sm text-brand-400 hover:text-brand-300 transition-colors font-semibold">
          Spend your XP in the Loyalty Shop →
        </Link>
      </div>
    </div>
  );
}
