'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface Album {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  releaseDate: string | null;
  genre: string | null;
  creator: { id: string; username: string; displayName: string | null };
  _count: { tracks: number };
}

function AlbumCard({ album }: { album: Album }) {
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
      </div>
      <div className="p-4">
        <h2 className="text-white font-semibold text-sm truncate group-hover:text-brand-400 transition-colors">
          {album.title}
        </h2>
        <p className="text-gray-500 text-xs mt-0.5 truncate">
          {album.creator.displayName || album.creator.username}
          {year && <span> · {year}</span>}
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
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/albums')
      .then((r) => setAlbums(r.data.albums))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Albums</h1>
          <p className="text-gray-400 text-sm mt-0.5">{albums.length} release{albums.length !== 1 ? 's' : ''}</p>
        </div>
        {user?.isAdmin && (
          <Link href="/admin?tab=albums"
            className="text-xs px-4 py-2 bg-brand-500 text-black rounded-lg font-semibold hover:bg-brand-400 transition-colors">
            + New Album
          </Link>
        )}
      </div>

      {albums.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-5xl mb-4">🎵</p>
          <p className="text-lg">No albums released yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {albums.map((a) => <AlbumCard key={a.id} album={a} />)}
        </div>
      )}
    </div>
  );
}
