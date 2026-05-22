'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface EpisodeContent {
  id: string;
  title: string;
  description: string | null;
  type: string;
  thumbnailUrl: string | null;
  duration: number | null;
  views: number;
  privacy: string;
  rating: string | null;
  createdAt: string;
}

interface Episode {
  episodeNumber: number;
  content: EpisodeContent;
}

interface Season {
  id: string;
  number: number;
  title: string | null;
  description: string | null;
  episodes: Episode[];
}

interface SeriesDetail {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  bannerUrl: string | null;
  genre: string | null;
  tags: string[];
  status: string;
  privacy: string;
  createdAt: string;
  creator: { username: string; displayName: string | null; avatar: string | null };
  seasons: Season[];
}

function formatDuration(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function typeEmoji(type: string) {
  const map: Record<string, string> = {
    FILM: '🎬', MUSIC: '🎵', PODCAST: '🎙️', SPOKEN_WORD: '🎤', DADDYMAN_ISMS: '💡', BOOK: '📖',
  };
  return map[type] ?? '🎬';
}

export default function SeriesDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [series, setSeries]         = useState<SeriesDetail | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [activeSeason, setActiveSeason] = useState(0);

  useEffect(() => {
    api.get(`/series/${id}`)
      .then((r) => {
        setSeries(r.data.series);
        setActiveSeason(0);
      })
      .catch((err) => {
        if (err.response?.status === 403) setError('This series is private.');
        else setError('Series not found.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="max-w-5xl mx-auto px-4 py-10 animate-pulse">
      <div className="h-48 bg-surface-700 rounded-2xl mb-8" />
      <div className="h-6 bg-surface-700 rounded w-1/3 mb-3" />
      <div className="h-4 bg-surface-700 rounded w-1/2" />
    </div>
  );

  if (error || !series) return (
    <div className="text-center py-20 text-gray-400">
      <p className="text-5xl mb-4">📺</p>
      <p>{error || 'Series not found.'}</p>
      <Link href="/series" className="text-brand-400 hover:underline text-sm mt-4 inline-block">← Back to Series</Link>
    </div>
  );

  const season = series.seasons[activeSeason] ?? null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">

      {/* Banner / Header */}
      <div className="relative rounded-2xl overflow-hidden mb-8 bg-surface-800 border border-surface-700">
        {series.bannerUrl ? (
          <div className="relative h-52 sm:h-72">
            <Image src={series.bannerUrl} alt={series.title} fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          </div>
        ) : (
          <div className="h-32 bg-gradient-to-br from-surface-700 to-surface-800" />
        )}
        <div className="p-6 flex gap-5 items-end -mt-8 relative z-10">
          {series.coverUrl ? (
            <div className="relative w-28 h-40 flex-shrink-0 rounded-xl overflow-hidden shadow-2xl border border-surface-600">
              <Image src={series.coverUrl} alt={series.title} fill className="object-cover" />
            </div>
          ) : (
            <div className="w-28 h-40 flex-shrink-0 rounded-xl bg-surface-700 flex items-center justify-center text-4xl border border-surface-600 shadow-2xl">
              📺
            </div>
          )}
          <div className="flex-1 min-w-0 pb-1">
            <div className="flex flex-wrap gap-2 mb-2">
              {series.genre && (
                <span className="text-xs px-2 py-0.5 bg-surface-700/80 text-gray-300 rounded-full border border-surface-600">{series.genre}</span>
              )}
              <span className="text-xs px-2 py-0.5 bg-surface-700/80 text-gray-400 rounded-full border border-surface-600 capitalize">{series.status.toLowerCase()}</span>
              {series.privacy === 'SUBSCRIBERS_ONLY' && (
                <span className="text-xs px-2 py-0.5 bg-brand-500/20 text-brand-300 rounded-full border border-brand-500/40">Members Only</span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg">{series.title}</h1>
            <p className="text-gray-400 text-sm mt-1">
              By{' '}
              <Link href={`/creator/${series.creator.username}`} className="text-brand-400 hover:underline">
                {series.creator.displayName || series.creator.username}
              </Link>
              {' '}· {series.seasons.length} season{series.seasons.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Description */}
      {series.description && (
        <p className="text-gray-400 text-sm leading-relaxed mb-8">{series.description}</p>
      )}

      {series.seasons.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-3">🎬</p>
          <p>No episodes yet. Check back soon.</p>
        </div>
      ) : (
        <>
          {/* Season tabs */}
          {series.seasons.length > 1 && (
            <div className="flex gap-1 mb-6 border-b border-surface-700 pb-0 overflow-x-auto">
              {series.seasons.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setActiveSeason(i)}
                  className={`px-4 py-2 text-sm font-medium transition-colors rounded-t-lg whitespace-nowrap ${
                    activeSeason === i
                      ? 'text-white bg-surface-800 border border-surface-700 border-b-surface-800 -mb-px'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {s.title || `Season ${s.number}`}
                </button>
              ))}
            </div>
          )}

          {/* Season header */}
          {season && (
            <div className="mb-5">
              <h2 className="text-white font-semibold">
                {season.title || `Season ${season.number}`}
              </h2>
              {season.description && (
                <p className="text-gray-500 text-sm mt-0.5">{season.description}</p>
              )}
              <p className="text-gray-600 text-xs mt-1">{season.episodes.length} episode{season.episodes.length !== 1 ? 's' : ''}</p>
            </div>
          )}

          {/* Episode list */}
          {season && season.episodes.length === 0 ? (
            <p className="text-gray-600 text-sm py-8 text-center">No episodes in this season yet.</p>
          ) : (
            <div className="space-y-2">
              {(season?.episodes ?? []).map((ep) => {
                const c = ep.content;
                const href = `/watch/${c.id}`;

                return (
                  <Link
                    key={c.id}
                    href={href}
                    className="group flex gap-4 items-center bg-surface-800 hover:bg-surface-700 border border-surface-700 hover:border-surface-600 rounded-xl p-4 transition-colors"
                  >
                    {/* Episode number */}
                    <div className="flex-shrink-0 w-8 text-center">
                      <span className="text-gray-500 text-sm font-mono">{ep.episodeNumber}</span>
                    </div>

                    {/* Thumbnail */}
                    <div className="relative w-24 flex-shrink-0 aspect-video bg-surface-700 rounded-lg overflow-hidden">
                      {c.thumbnailUrl ? (
                        <Image src={c.thumbnailUrl} alt={c.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-xl">{typeEmoji(c.type)}</div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 bg-brand-500 rounded-full flex items-center justify-center shadow-lg">
                          <span className="text-black text-xs ml-0.5">▶</span>
                        </div>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm group-hover:text-brand-400 transition-colors truncate">{c.title}</p>
                      {c.description && (
                        <p className="text-gray-500 text-xs mt-0.5 line-clamp-2 leading-relaxed">{c.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-600">
                        {c.duration && <span>{formatDuration(c.duration)}</span>}
                        <span>{c.views.toLocaleString()} views</span>
                        {c.rating && (
                          <span className="border border-gray-700 text-gray-500 px-1.5 py-0 rounded font-bold text-[10px]">{c.rating}</span>
                        )}
                        {c.privacy === 'SUBSCRIBERS_ONLY' && (
                          <span className="text-brand-400 font-semibold">Members</span>
                        )}
                      </div>
                    </div>

                    <div className="flex-shrink-0 text-gray-600 group-hover:text-gray-400 transition-colors ml-2">›</div>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}

      <div className="mt-10 pt-6 border-t border-surface-700">
        <Link href="/series" className="text-sm text-gray-500 hover:text-brand-400 transition-colors">← All Series</Link>
      </div>
    </div>
  );
}
