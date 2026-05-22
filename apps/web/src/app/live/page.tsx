'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

interface LiveStream {
  id: string;
  title: string;
  description: string | null;
  status: string;
  thumbnailUrl: string | null;
  scheduledAt: string | null;
  startedAt: string | null;
  creator: { username: string; displayName: string | null; avatar: string | null };
}

export default function LivePage() {
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/live')
      .then((r) => setStreams(r.data.streams ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const live      = streams.filter((s) => s.status === 'live');
  const scheduled = streams.filter((s) => s.status === 'idle' && s.scheduledAt);
  const ended     = streams.filter((s) => s.status === 'ended');

  function StreamCard({ stream }: { stream: LiveStream }) {
    const isLive = stream.status === 'live';
    const creator = stream.creator.displayName || stream.creator.username;
    return (
      <Link
        href={`/live/${stream.id}`}
        className="group bg-surface-800 border border-surface-700 hover:border-surface-600 rounded-2xl overflow-hidden transition-all"
      >
        <div className="relative aspect-video bg-surface-700">
          {stream.thumbnailUrl
            ? <img src={stream.thumbnailUrl} alt={stream.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            : <div className="absolute inset-0 flex items-center justify-center text-4xl">📺</div>
          }
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          {isLive && (
            <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              LIVE
            </div>
          )}
          {stream.status === 'idle' && stream.scheduledAt && (
            <div className="absolute top-2 left-2 bg-surface-800/90 text-gray-300 text-xs font-semibold px-2 py-0.5 rounded-full border border-surface-600">
              Scheduled
            </div>
          )}
        </div>
        <div className="p-4">
          <p className="text-white font-semibold text-sm line-clamp-1 group-hover:text-brand-400 transition-colors">{stream.title}</p>
          <p className="text-gray-500 text-xs mt-0.5">{creator}</p>
          {stream.scheduledAt && stream.status === 'idle' && (
            <p className="text-gray-600 text-xs mt-1">
              {new Date(stream.scheduledAt).toLocaleString()}
            </p>
          )}
        </div>
      </Link>
    );
  }

  if (loading) return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="h-8 w-32 bg-surface-700 rounded animate-pulse mb-8" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1,2,3].map((i) => <div key={i} className="aspect-video bg-surface-700 rounded-2xl animate-pulse" />)}
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white">📡 Live</h1>
        <p className="text-gray-500 text-sm mt-1">Real-time streams from Camp DaddyMan</p>
      </div>

      {live.length === 0 && scheduled.length === 0 && ended.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          <p className="text-5xl mb-4">📡</p>
          <p className="text-lg font-medium text-gray-400">No live streams right now</p>
          <p className="text-sm mt-2">Check back soon — live drops are announced on the community page.</p>
          <Link href="/browse" className="inline-block mt-6 text-brand-400 hover:underline text-sm">Browse content instead →</Link>
        </div>
      )}

      {live.length > 0 && (
        <section className="mb-10">
          <h2 className="text-red-400 font-bold uppercase text-xs tracking-widest mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Live Now
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {live.map((s) => <StreamCard key={s.id} stream={s} />)}
          </div>
        </section>
      )}

      {scheduled.length > 0 && (
        <section className="mb-10">
          <h2 className="text-gray-400 font-semibold text-sm mb-4">Coming Up</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {scheduled.map((s) => <StreamCard key={s.id} stream={s} />)}
          </div>
        </section>
      )}

      {ended.length > 0 && (
        <section>
          <h2 className="text-gray-600 font-semibold text-sm mb-4">Past Streams</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {ended.map((s) => <StreamCard key={s.id} stream={s} />)}
          </div>
        </section>
      )}
    </div>
  );
}
