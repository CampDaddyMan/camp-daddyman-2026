'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Content } from '@/types';

interface HistoryItem extends Content {
  watchProgress: number;
  watchedAt: string;
}

const TYPE_EMOJI: Record<string, string> = {
  MUSIC: '🎵', FILM: '🎬', PODCAST: '🎙️', SPOKEN_WORD: '🎤', DADDYMAN_ISMS: '💡', BOOK: '📖',
};

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function timeAgo(iso: string) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  if (secs < 7 * 86400) return `${Math.floor(secs / 86400)}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [items, setItems]   = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/login'); return; }
    api.get('/content/history')
      .then((r) => setItems(r.data.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, authLoading, router]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">▶ Watch History</h1>
        {!loading && (
          <p className="text-gray-500 text-sm mt-1">{items.length} {items.length === 1 ? 'item' : 'items'} — last 20 watched</p>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex gap-4 animate-pulse">
              <div className="w-40 aspect-video bg-surface-700 rounded-xl flex-shrink-0" />
              <div className="flex-1 py-1 space-y-2">
                <div className="h-4 w-3/4 bg-surface-700 rounded" />
                <div className="h-3 w-1/3 bg-surface-700 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-5xl mb-4">📺</p>
          <p className="text-white font-semibold text-lg mb-2">Nothing watched yet</p>
          <p className="text-gray-500 text-sm mb-8">Start watching content and it'll appear here.</p>
          <Link
            href="/browse"
            className="px-6 py-3 bg-brand-500 hover:bg-brand-400 text-black font-semibold rounded-xl text-sm transition-colors"
          >
            Browse content
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const pct = item.duration ? Math.min(100, Math.round((item.watchProgress / item.duration) * 100)) : 0;
            return (
              <Link
                key={item.id}
                href={`/watch/${item.id}`}
                className="flex gap-4 group hover:bg-surface-800 rounded-xl p-2 -mx-2 transition-colors"
              >
                {/* Thumbnail */}
                <div className="relative w-40 flex-shrink-0 aspect-video rounded-xl overflow-hidden bg-surface-700">
                  {item.thumbnailUrl ? (
                    <img src={item.thumbnailUrl} alt={item.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-2xl">
                      {TYPE_EMOJI[item.type] ?? '🎬'}
                    </div>
                  )}
                  {/* Progress bar */}
                  {item.duration && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                      <div className="h-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                  {/* Resume time */}
                  <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                    {fmt(item.watchProgress)}
                    {item.duration ? ` / ${fmt(item.duration)}` : ''}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 py-1">
                  <p className="text-white font-semibold text-sm line-clamp-2 group-hover:text-brand-400 transition-colors leading-snug">
                    {item.title}
                  </p>
                  <p className="text-gray-400 text-xs mt-1">{item.creator.displayName || item.creator.username}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-gray-600 text-xs">{item.type.replace('_', ' ').toLowerCase()}</span>
                    <span className="text-gray-700 text-xs">·</span>
                    <span className="text-gray-600 text-xs">{timeAgo(item.watchedAt)}</span>
                    {pct >= 90 && <span className="text-green-500 text-xs">✓ Watched</span>}
                    {pct > 0 && pct < 90 && <span className="text-brand-400 text-xs">{pct}% watched</span>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
