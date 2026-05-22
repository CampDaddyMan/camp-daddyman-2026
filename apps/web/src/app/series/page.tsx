'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

type SeriesStatus = 'ACTIVE' | 'ENDED' | 'HIATUS' | 'UPCOMING';
type SeriesPrivacy = 'PUBLIC' | 'SUBSCRIBERS_ONLY' | 'PRIVATE';

interface Series {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  genre: string | null;
  tags: string[];
  status: SeriesStatus;
  privacy: SeriesPrivacy;
  createdAt: string;
  creator: { username: string; displayName: string | null };
  _count: { seasons: number };
}

const STATUS_META: Record<SeriesStatus, { label: string; color: string }> = {
  ACTIVE:   { label: 'Ongoing',  color: 'bg-brand-500/20 text-brand-400' },
  ENDED:    { label: 'Complete', color: 'bg-surface-600 text-gray-400' },
  HIATUS:   { label: 'On Hiatus', color: 'bg-yellow-500/20 text-yellow-400' },
  UPCOMING: { label: 'Upcoming', color: 'bg-camp-500/20 text-camp-400' },
};

function SeriesCard({ s }: { s: Series }) {
  const meta = STATUS_META[s.status] ?? STATUS_META.ACTIVE;
  return (
    <Link href={`/series/${s.id}`}
      className="group block bg-surface-800 rounded-2xl overflow-hidden border border-surface-700 hover:border-surface-500 transition-colors">
      <div className="relative aspect-[2/3] bg-surface-900">
        {s.coverUrl ? (
          <Image src={s.coverUrl} alt={s.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">📺</div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
        <div className="absolute top-2 left-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${meta.color}`}>{meta.label}</span>
        </div>
        {s.privacy === 'SUBSCRIBERS_ONLY' && (
          <div className="absolute top-2 right-2">
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-brand-500/30 text-brand-300 border border-brand-500/40">Members</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h2 className="text-white font-semibold text-sm truncate group-hover:text-brand-400 transition-colors">
          {s.title}
        </h2>
        <p className="text-gray-500 text-xs mt-0.5 truncate">
          {s.creator.displayName || s.creator.username}
          {s._count.seasons > 0 && <span className="text-gray-600"> · {s._count.seasons} season{s._count.seasons !== 1 ? 's' : ''}</span>}
        </p>
        {s.genre && (
          <span className="inline-block mt-2 text-xs px-2 py-0.5 bg-surface-700 text-gray-400 rounded-full">{s.genre}</span>
        )}
      </div>
    </Link>
  );
}

export default function SeriesPage() {
  const { user } = useAuth();
  const [series, setSeries]   = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/series')
      .then((r) => setSeries(r.data.series))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="bg-surface-800 rounded-2xl overflow-hidden animate-pulse">
            <div className="aspect-[2/3] bg-surface-700" />
            <div className="p-4 space-y-2">
              <div className="h-3 bg-surface-700 rounded w-3/4" />
              <div className="h-3 bg-surface-700 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Series</h1>
          <p className="text-gray-400 text-sm mt-0.5">{series.length} series</p>
        </div>
        {user?.isAdmin && (
          <Link href="/admin?tab=series"
            className="text-xs px-4 py-2 bg-brand-500 text-black rounded-lg font-semibold hover:bg-brand-400 transition-colors">
            + New Series
          </Link>
        )}
      </div>

      {series.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-5xl mb-4">📺</p>
          <p className="text-lg">No series yet.</p>
          <p className="text-sm mt-2">Check back soon — original content is coming.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {series.map((s) => <SeriesCard key={s.id} s={s} />)}
        </div>
      )}
    </div>
  );
}
