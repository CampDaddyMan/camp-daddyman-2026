'use client';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Content } from '@/types';
import ContentRow from '@/components/content/ContentRow';
import { useAuth } from '@/context/AuthContext';

interface Creator {
  username: string;
  displayName?: string;
  avatar?: string;
  bio?: string;
  _count: { followers: number; content: number };
}

interface DiscoveryData {
  trending: Content[];
  newReleases: Content[];
  byType: {
    MUSIC: Content[];
    FILM: Content[];
    PODCAST: Content[];
    SPOKEN_WORD: Content[];
  };
  creators: Creator[];
}

function CreatorCard({ creator }: { creator: Creator }) {
  return (
    <Link
      href={`/creator/${creator.username}`}
      className="group flex-shrink-0 w-44 bg-surface-800 rounded-xl p-4 text-center hover:ring-1 hover:ring-brand-400/40 transition-all"
    >
      <div className="w-14 h-14 rounded-full bg-surface-600 mx-auto mb-3 overflow-hidden">
        {creator.avatar ? (
          <Image src={creator.avatar} alt={creator.displayName || creator.username} width={56} height={56} className="object-cover w-full h-full" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
        )}
      </div>
      <p className="text-white text-sm font-semibold truncate group-hover:text-brand-400 transition-colors">
        {creator.displayName || creator.username}
      </p>
      <p className="text-gray-500 text-xs mt-0.5">@{creator.username}</p>
      <p className="text-gray-400 text-xs mt-1">
        {creator._count.followers.toLocaleString()} followers
      </p>
    </Link>
  );
}

function SearchBar() {
  const router = useRouter();
  const [q, setQ] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim().length < 2) return;
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 max-w-lg mx-auto">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search music, films, podcasts, creators..."
        className="flex-1 bg-white/10 border border-white/20 text-white placeholder-white/50 rounded-xl px-5 py-3 text-sm focus:outline-none focus:border-brand-400 transition-colors"
      />
      <button
        type="submit"
        className="bg-brand-500 hover:bg-brand-600 text-black font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
      >
        Search
      </button>
    </form>
  );
}

interface HistoryItem extends Content {
  watchProgress: number;
  watchedAt: string;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function ContinueWatchingRow({ items }: { items: HistoryItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="mb-10">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-lg font-bold text-white">▶️ Continue Watching</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
        {items.map((item) => {
          const pct = item.duration ? Math.min(100, Math.round((item.watchProgress / item.duration) * 100)) : 0;
          return (
            <Link
              key={item.id}
              href={`/watch/${item.id}`}
              className="snap-start flex-shrink-0 w-56 group"
            >
              <div className="relative aspect-video bg-surface-700 rounded-xl overflow-hidden mb-2">
                {item.thumbnailUrl ? (
                  <Image src={item.thumbnailUrl} alt={item.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-3xl">🎬</div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                {/* Progress bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                  <div className="h-full bg-brand-500" style={{ width: `${pct}%` }} />
                </div>
                {/* Resume position label */}
                <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded">
                  {formatTime(item.watchProgress)}
                </div>
              </div>
              <p className="text-white text-xs font-medium truncate group-hover:text-brand-400 transition-colors">{item.title}</p>
              <p className="text-gray-500 text-[11px] mt-0.5">{item.creator.displayName || item.creator.username}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const [data, setData] = useState<DiscoveryData | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/content/discover')
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    api.get('/content/history')
      .then((r) => setHistory(r.data.items))
      .catch(() => {});
  }, [user]);

  const hasAnyContent = data && (
    data.trending.length > 0 ||
    data.newReleases.length > 0 ||
    Object.values(data.byType).some((arr) => arr.length > 0)
  );

  return (
    <div>
      {/* ── Hero ── */}
      <div className="relative bg-gradient-to-b from-surface-900 via-surface-900 to-transparent pb-12 pt-16 px-4 text-center border-b border-surface-700/50">
        <p className="text-brand-400 text-sm font-semibold uppercase tracking-widest mb-3">Camp DaddyMan</p>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
          Music. Film. Teachings.<br className="hidden md:block" /> All in one place.
        </h1>
        <p className="text-gray-400 text-lg mb-8 max-w-xl mx-auto">
          Independent content rooted in the DaddyMan philosophy. Stream, follow creators, and join the community.
        </p>
        <Suspense>
          <SearchBar />
        </Suspense>
        <div className="flex gap-3 justify-center mt-6 flex-wrap">
          <Link
            href="/browse"
            className="bg-surface-700 hover:bg-surface-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            Browse all
          </Link>
          <Link
            href="/register"
            className="bg-brand-500 hover:bg-brand-600 text-black px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            Join for free
          </Link>
        </div>
      </div>

      {/* ── Content sections ── */}
      <div className="max-w-7xl mx-auto px-4 py-10">

        {loading ? (
          <div className="space-y-10">
            {[0, 1, 2].map((i) => (
              <div key={i}>
                <div className="h-5 w-40 bg-surface-700 rounded animate-pulse mb-4" />
                <div className="flex gap-3">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <div key={j} className="flex-shrink-0 w-56 aspect-video bg-surface-700 rounded-xl animate-pulse" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : !hasAnyContent ? (
          <div className="text-center py-24">
            <p className="text-5xl mb-4">🎬</p>
            <p className="text-gray-400 text-lg">No content yet.</p>
            <Link href="/upload" className="inline-block mt-4 text-brand-400 hover:underline text-sm">
              Be the first to upload →
            </Link>
          </div>
        ) : (
          <>
            <ContinueWatchingRow items={history} />

            {data!.trending.length > 0 && (
              <ContentRow
                title="🔥 Trending"
                items={data!.trending}
                seeAllHref="/browse?sort=trending"
              />
            )}

            {data!.newReleases.length > 0 && (
              <ContentRow
                title="✨ New Releases"
                items={data!.newReleases}
                seeAllHref="/browse"
              />
            )}

            {data!.byType.MUSIC.length > 0 && (
              <ContentRow
                title="🎵 Music"
                items={data!.byType.MUSIC}
                seeAllHref="/browse?type=MUSIC"
              />
            )}

            {data!.byType.FILM.length > 0 && (
              <ContentRow
                title="🎬 Film"
                items={data!.byType.FILM}
                seeAllHref="/browse?type=FILM"
              />
            )}

            {data!.byType.PODCAST.length > 0 && (
              <ContentRow
                title="🎙️ Podcasts"
                items={data!.byType.PODCAST}
                seeAllHref="/browse?type=PODCAST"
              />
            )}

            {data!.byType.SPOKEN_WORD.length > 0 && (
              <ContentRow
                title="🎤 Spoken Word"
                items={data!.byType.SPOKEN_WORD}
                seeAllHref="/browse?type=SPOKEN_WORD"
              />
            )}

            {/* ── Featured Creators ── */}
            {data!.creators.length > 0 && (
              <section className="mb-10">
                <div className="flex items-baseline justify-between mb-4">
                  <h2 className="text-lg font-bold text-white">👥 Featured Creators</h2>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
                  {data!.creators.map((c) => (
                    <div key={c.username} className="snap-start">
                      <CreatorCard creator={c} />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
