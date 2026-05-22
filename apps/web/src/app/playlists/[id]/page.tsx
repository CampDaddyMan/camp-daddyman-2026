'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { usePlayer } from '@/context/PlayerContext';
import api from '@/lib/api';

interface TrackContent {
  id: string;
  title: string;
  type: string;
  duration: number | null;
  thumbnailUrl: string | null;
  mediaUrl: string | null;
  hlsUrl: string | null;
  views: number;
  creator: { username: string; displayName: string | null };
}

interface PlaylistItem {
  id: string;
  contentId: string;
  position: number;
  addedAt: string;
  content: TrackContent;
}

interface Playlist {
  id: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
  isPublic: boolean;
  userId: string;
  createdAt: string;
  _count: { items: number };
  items: PlaylistItem[];
}

function fmt(s: number | null) {
  if (!s) return '—';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

const TYPE_EMOJI: Record<string, string> = {
  MUSIC: '🎵', PODCAST: '🎙️', SPOKEN_WORD: '🎤', DADDYMAN_ISMS: '💡', FILM: '🎬', BOOK: '📖',
};

const AUDIO_TYPES = ['MUSIC', 'PODCAST', 'SPOKEN_WORD', 'DADDYMAN_ISMS'];

export default function PlaylistPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const player = usePlayer();

  const [playlist, setPlaylist]   = useState<Playlist | null>(null);
  const [loading, setLoading]     = useState(true);
  const [editing, setEditing]     = useState(false);
  const [editName, setEditName]   = useState('');
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    api.get(`/playlists/${id}`)
      .then((r) => setPlaylist(r.data.playlist))
      .catch(() => router.replace('/playlists'))
      .finally(() => setLoading(false));
  }, [id, router]);

  const isOwner = user && playlist && user.id === playlist.userId;

  function buildPlayerTrack(item: PlaylistItem) {
    return {
      id: item.content.id,
      title: item.content.title,
      creator: item.content.creator.displayName || item.content.creator.username,
      mediaUrl: item.content.hlsUrl || item.content.mediaUrl || '',
      thumbnailUrl: item.content.thumbnailUrl,
      type: item.content.type,
    };
  }

  function playAll() {
    if (!playlist || playlist.items.length === 0) return;
    const audioItems = playlist.items.filter((i) => AUDIO_TYPES.includes(i.content.type));
    const targets = audioItems.length > 0 ? audioItems : playlist.items;
    const [first, ...rest] = targets;
    player.play(buildPlayerTrack(first));
    rest.forEach((item) => player.addToQueue(buildPlayerTrack(item)));
  }

  function playTrack(item: PlaylistItem) {
    if (!AUDIO_TYPES.includes(item.content.type)) {
      router.push(`/watch/${item.content.id}`);
      return;
    }
    player.play(buildPlayerTrack(item));
  }

  async function handleRemove(contentId: string) {
    await api.delete(`/playlists/${id}/items/${contentId}`);
    setPlaylist((prev) => prev ? {
      ...prev,
      items: prev.items.filter((i) => i.contentId !== contentId),
      _count: { items: prev._count.items - 1 },
    } : prev);
  }

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const { data } = await api.patch(`/playlists/${id}`, { name: editName.trim() });
      setPlaylist((prev) => prev ? { ...prev, name: data.playlist.name } : prev);
      setEditing(false);
    } catch {}
    finally { setSaving(false); }
  }

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-10 animate-pulse space-y-4">
      <div className="flex gap-6">
        <div className="w-48 h-48 bg-surface-800 rounded-2xl flex-shrink-0" />
        <div className="flex-1 space-y-3 pt-6">
          <div className="h-6 bg-surface-800 rounded w-1/2" />
          <div className="h-4 bg-surface-800 rounded w-1/3" />
        </div>
      </div>
      {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-surface-800 rounded-xl" />)}
    </div>
  );

  if (!playlist) return null;

  const totalDuration = playlist.items.reduce((acc, i) => acc + (i.content.duration ?? 0), 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-6 mb-10">
        <div className="relative w-48 h-48 flex-shrink-0 rounded-2xl overflow-hidden bg-surface-800 shadow-2xl self-start">
          {playlist.coverUrl
            ? <Image src={playlist.coverUrl} alt={playlist.name} fill className="object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-6xl">🎵</div>}
        </div>

        <div className="flex-1 flex flex-col justify-end">
          <p className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-2">Playlist</p>

          {editing ? (
            <form onSubmit={handleSaveName} className="flex gap-2 mb-3">
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1 bg-surface-700 border border-surface-600 rounded-xl px-3 py-2 text-white text-lg font-bold focus:outline-none focus:border-brand-500"
              />
              <button type="submit" disabled={saving} className="px-4 py-2 bg-brand-500 text-black font-bold rounded-xl text-sm disabled:opacity-50">Save</button>
              <button type="button" onClick={() => setEditing(false)} className="px-3 py-2 text-gray-400 hover:text-white text-sm">Cancel</button>
            </form>
          ) : (
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
              {playlist.name}
              {isOwner && (
                <button onClick={() => { setEditName(playlist.name); setEditing(true); }}
                  className="text-gray-600 hover:text-gray-300 text-base transition-colors" aria-label="Rename">✎</button>
              )}
            </h1>
          )}

          <p className="text-gray-400 text-sm mb-1">
            {playlist._count.items} track{playlist._count.items !== 1 ? 's' : ''}
            {totalDuration > 0 && <span className="text-gray-600"> · {fmt(totalDuration)}</span>}
          </p>
          {playlist.description && <p className="text-gray-500 text-sm mb-4 max-w-lg">{playlist.description}</p>}

          <div className="flex items-center gap-3 mt-3">
            <button onClick={playAll} disabled={playlist.items.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-black font-bold rounded-full transition-colors text-sm">
              ▶ Play All
            </button>
            <Link href="/playlists" className="px-4 py-2.5 rounded-full text-sm font-medium border border-surface-600 text-gray-400 hover:border-surface-400 transition-colors">
              ← My Playlists
            </Link>
          </div>
        </div>
      </div>

      {/* Track list */}
      {playlist.items.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-3">🎵</p>
          <p className="text-sm">No tracks yet. Go watch content and add it to this playlist.</p>
        </div>
      ) : (
        <div className="space-y-0.5">
          <div className="grid grid-cols-[2rem_1fr_auto] gap-4 px-4 pb-2 text-xs text-gray-600 font-semibold uppercase tracking-wider border-b border-surface-700/50 mb-1">
            <span>#</span><span>Title</span><span>Time</span>
          </div>

          {playlist.items.map((item, idx) => {
            const isAudio = AUDIO_TYPES.includes(item.content.type);
            const isPlaying = player.track?.id === item.content.id && player.playing;

            return (
              <div
                key={item.id}
                className={`grid grid-cols-[2rem_1fr_auto] gap-4 px-4 py-3 rounded-xl transition-colors group cursor-pointer
                  ${isPlaying ? 'bg-brand-500/10 border border-brand-500/20' : 'hover:bg-surface-800'}`}
              >
                <div className="flex items-center justify-center text-sm" onClick={() => playTrack(item)}>
                  {isPlaying
                    ? <span className="text-brand-400 text-xs">♫</span>
                    : <span className={`${isPlaying ? 'text-brand-400' : 'text-gray-600'} group-hover:hidden`}>{idx + 1}</span>}
                  <span className="hidden group-hover:block text-gray-400 text-xs">
                    {isAudio ? '▶' : '🎬'}
                  </span>
                </div>

                <div className="flex items-center gap-3 min-w-0" onClick={() => playTrack(item)}>
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-surface-700">
                    {item.content.thumbnailUrl
                      ? <Image src={item.content.thumbnailUrl} alt={item.content.title} fill className="object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-base">{TYPE_EMOJI[item.content.type] ?? '🎵'}</div>}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${isPlaying ? 'text-brand-400' : 'text-white'}`}>
                      {item.content.title}
                    </p>
                    <p className="text-xs text-gray-600 truncate">
                      {item.content.creator.displayName || item.content.creator.username}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 tabular-nums">{fmt(item.content.duration)}</span>
                  {isOwner && (
                    <button
                      onClick={() => handleRemove(item.contentId)}
                      className="text-gray-600 hover:text-red-400 transition-colors text-sm opacity-0 group-hover:opacity-100"
                      aria-label="Remove from playlist"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
