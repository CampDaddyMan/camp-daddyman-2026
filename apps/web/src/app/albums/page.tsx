'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

type ReleaseType = 'ALBUM' | 'EP' | 'SINGLE' | 'COMPILATION';

interface Album {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  releaseDate: string | null;
  genre: string | null;
  releaseType: ReleaseType;
  creator: { id: string; username: string; displayName: string | null };
  _count: { tracks: number };
}

const TYPE_META: Record<ReleaseType, { label: string; color: string }> = {
  SINGLE:      { label: 'Single',      color: 'bg-brand-500/20 text-brand-400' },
  EP:          { label: 'EP',          color: 'bg-camp-500/20 text-camp-400' },
  ALBUM:       { label: 'Album',       color: 'bg-surface-600 text-gray-300' },
  COMPILATION: { label: 'Compilation', color: 'bg-purple-500/20 text-purple-400' },
};

const TABS: { key: 'ALL' | ReleaseType; label: string }[] = [
  { key: 'ALL',         label: 'All' },
  { key: 'SINGLE',      label: 'Singles' },
  { key: 'EP',          label: 'EPs' },
  { key: 'ALBUM',       label: 'Albums' },
  { key: 'COMPILATION', label: 'Compilations' },
];

function AlbumCard({ album }: { album: Album }) {
  const meta = TYPE_META[album.releaseType] ?? TYPE_META.ALBUM;
  const year = album.releaseDate ? new Date(album.releaseDate).getFullYear() : null;

  return (
    <Link href={`/albums/${album.id}`}
      className="group block bg-surface-800 rounded-2xl overflow-hidden border border-surface-700 hover:border-surface-500 transition-colors">
      <div className="relative aspect-square bg-surface-900">
        {album.coverUrl ? (
          <Image src={album.coverUrl} alt={album.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">🎵</div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity w-12 h-12 bg-brand-500 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-black text-xl ml-0.5">▶</span>
          </div>
        </div>
        <div className="absolute top-2 left-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${meta.color}`}>{meta.label}</span>
        </div>
      </div>
      <div className="p-4">
        <h2 className="text-white font-semibold text-sm truncate group-hover:text-brand-400 transition-colors">
          {album.title}
        </h2>
        <p className="text-gray-500 text-xs mt-0.5 truncate">
          {album.creator.displayName || album.creator.username}
          {year && <span className="text-gray-600"> · {year}</span>}
        </p>
        <div className="flex items-center gap-2 mt-2 text-xs text-gray-600">
          {album.genre && <span className="px-2 py-0.5 bg-surface-700 rounded-full">{album.genre}</span>}
          <span>{album._count.tracks} track{album._count.tracks !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </Link>
  );
}

export default function AlbumsPage() {
  const { user } = useAuth();
  const [albums, setAlbums]   = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<'ALL' | ReleaseType>('ALL');

  useEffect(() => {
    api.get('/albums')
      .then((r) => setAlbums(r.data.albums))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = tab === 'ALL' ? albums : albums.filter((a) => a.releaseType === tab);

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="bg-surface-800 rounded-2xl overflow-hidden animate-pulse">
            <div className="aspect-square bg-surface-700" />
            <div className="p-4 space-y-2">
              <div className="h-3 bg-surface-700 rounded w-3/4" />
              <div className="h-3 bg-surface-700 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const counts = {
    ALL:         albums.length,
    SINGLE:      albums.filter((a) => a.releaseType === 'SINGLE').length,
    EP:          albums.filter((a) => a.releaseType === 'EP').length,
    ALBUM:       albums.filter((a) => a.releaseType === 'ALBUM').length,
    COMPILATION: albums.filter((a) => a.releaseType === 'COMPILATION').length,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Music</h1>
          <p className="text-gray-400 text-sm mt-0.5">{albums.length} release{albums.length !== 1 ? 's' : ''}</p>
        </div>
        {user?.isAdmin && (
          <Link href="/admin?tab=albums"
            className="text-xs px-4 py-2 bg-brand-500 text-black rounded-lg font-semibold hover:bg-brand-400 transition-colors">
            + New Release
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 border-b border-surface-700 pb-0">
        {TABS.filter((t) => counts[t.key] > 0 || t.key === 'ALL').map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors rounded-t-lg flex items-center gap-1.5 ${
              tab === t.key
                ? 'text-white bg-surface-800 border border-surface-700 border-b-surface-800 -mb-px'
                : 'text-gray-500 hover:text-gray-300'
            }`}>
            {t.label}
            {counts[t.key] > 0 && (
              <span className="text-xs text-gray-600">{counts[t.key]}</span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-5xl mb-4">🎵</p>
          <p className="text-lg">No {tab === 'ALL' ? 'releases' : TABS.find((t) => t.key === tab)?.label.toLowerCase()} yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {filtered.map((a) => <AlbumCard key={a.id} album={a} />)}
        </div>
      )}
    </div>
  );
}
