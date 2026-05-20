'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface Track {
  albumId: string;
  contentId: string;
  trackNumber: number;
  discNumber: number;
  content: {
    id: string;
    title: string;
    duration: number | null;
    thumbnailUrl: string | null;
    mediaUrl: string | null;
    hlsUrl: string | null;
    views: number;
    creator: { id: string; username: string; displayName: string | null };
  };
}

interface Album {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  releaseDate: string | null;
  genre: string | null;
  releaseType: string;
  creator: { id: string; username: string; displayName: string | null };
  _count: { tracks: number };
  tracks: Track[];
}

function formatDuration(seconds: number | null) {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function AlbumPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [album, setAlbum] = useState<Album | null>(null);
  const [loading, setLoading] = useState(true);

  // Player state
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTrackIdx, setCurrentTrackIdx] = useState<number | null>(null);
  const [playing, setPlaying]   = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shuffle, setShuffle]   = useState(false);
  const [repeat, setRepeat]     = useState(false);

  useEffect(() => {
    api.get(`/albums/${id}`)
      .then((r) => setAlbum(r.data.album))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const currentTrack = album && currentTrackIdx !== null ? album.tracks[currentTrackIdx] : null;

  const playTrack = useCallback((idx: number) => {
    setCurrentTrackIdx(idx);
    setProgress(0);
  }, []);

  const playAll = () => playTrack(0);

  const playNext = useCallback(() => {
    if (!album) return;
    if (shuffle) {
      const next = Math.floor(Math.random() * album.tracks.length);
      playTrack(next);
    } else if (currentTrackIdx !== null) {
      const next = currentTrackIdx + 1;
      if (next < album.tracks.length) playTrack(next);
      else if (repeat) playTrack(0);
    }
  }, [album, shuffle, repeat, currentTrackIdx, playTrack]);

  const playPrev = useCallback(() => {
    if (!album || currentTrackIdx === null) return;
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    const prev = currentTrackIdx - 1;
    if (prev >= 0) playTrack(prev);
  }, [album, currentTrackIdx, playTrack]);

  // Load and play when currentTrackIdx changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    const src = currentTrack.content.hlsUrl || currentTrack.content.mediaUrl;
    if (!src) return;
    audio.src = src;
    audio.play().then(() => setPlaying(true)).catch(() => {});
  }, [currentTrackIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay     = () => setPlaying(true);
    const onPause    = () => setPlaying(false);
    const onEnded    = () => playNext();
    const onTime     = () => setProgress(audio.currentTime);
    const onDuration = () => setDuration(audio.duration || 0);

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('durationchange', onDuration);
    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('durationchange', onDuration);
    };
  }, [playNext]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    playing ? audio.pause() : audio.play().catch(() => {});
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Number(e.target.value);
  };

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-10 animate-pulse space-y-6">
      <div className="flex gap-6">
        <div className="w-48 h-48 bg-surface-800 rounded-2xl flex-shrink-0" />
        <div className="flex-1 space-y-3 pt-4">
          <div className="h-6 bg-surface-800 rounded w-1/2" />
          <div className="h-4 bg-surface-800 rounded w-1/3" />
        </div>
      </div>
      {[...Array(6)].map((_, i) => <div key={i} className="h-14 bg-surface-800 rounded-xl" />)}
    </div>
  );

  if (!album) return (
    <div className="max-w-4xl mx-auto px-4 py-20 text-center text-gray-500">
      <p className="text-4xl mb-3">🎵</p>
      <p>Album not found.</p>
    </div>
  );

  const year = album.releaseDate ? new Date(album.releaseDate).getFullYear() : null;
  const totalDuration = album.tracks.reduce((acc, t) => acc + (t.content.duration ?? 0), 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Hidden audio element */}
      <audio ref={audioRef} />

      {/* Album header */}
      <div className="flex flex-col sm:flex-row gap-6 mb-10">
        <div className="relative w-48 h-48 flex-shrink-0 rounded-2xl overflow-hidden bg-surface-800 shadow-2xl self-start">
          {album.coverUrl ? (
            <Image src={album.coverUrl} alt={album.title} fill className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl">🎵</div>
          )}
        </div>

        <div className="flex-1 flex flex-col justify-end">
          <p className="text-xs font-bold text-camp-400 uppercase tracking-widest mb-2">
            {album.releaseType === 'SINGLE' ? 'Single' : album.releaseType === 'EP' ? 'EP' : album.releaseType === 'COMPILATION' ? 'Compilation' : 'Album'}
          </p>
          <h1 className="text-3xl font-bold text-white mb-2">{album.title}</h1>
          <p className="text-gray-400 text-sm mb-1">
            {album.creator.displayName || album.creator.username}
            {year && <span className="text-gray-600"> · {year}</span>}
            {album.genre && <span className="text-gray-600"> · {album.genre}</span>}
          </p>
          <p className="text-gray-600 text-xs mb-4">
            {album._count.tracks} track{album._count.tracks !== 1 ? 's' : ''}
            {totalDuration > 0 && <span> · {formatDuration(totalDuration)}</span>}
          </p>
          {album.description && (
            <p className="text-gray-500 text-sm mb-4 max-w-lg">{album.description}</p>
          )}
          <div className="flex items-center gap-3">
            <button onClick={playAll}
              className="flex items-center gap-2 px-6 py-2.5 bg-brand-500 hover:bg-brand-400 text-black font-bold rounded-full transition-colors text-sm">
              ▶ Play All
            </button>
            <button onClick={() => { setShuffle((s) => !s); playAll(); }}
              className={`px-4 py-2.5 rounded-full text-sm font-medium transition-colors border ${shuffle ? 'border-brand-500 text-brand-400 bg-brand-500/10' : 'border-surface-600 text-gray-400 hover:border-surface-400'}`}>
              ⇄ Shuffle
            </button>
            {user?.isAdmin && (
              <Link href={`/admin?tab=albums&edit=${album.id}`}
                className="px-4 py-2.5 rounded-full text-sm font-medium border border-surface-600 text-gray-400 hover:border-surface-400 transition-colors">
                Edit Album
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Tracklist */}
      <div className="space-y-0.5">
        <div className="grid grid-cols-[2rem_1fr_auto] gap-4 px-4 pb-2 text-xs text-gray-600 font-semibold uppercase tracking-wider border-b border-surface-700/50 mb-1">
          <span>#</span>
          <span>Title</span>
          <span>Time</span>
        </div>

        {album.tracks.map((track, idx) => {
          const isActive = currentTrackIdx === idx;
          return (
            <div key={track.contentId}
              onClick={() => playTrack(idx)}
              className={`grid grid-cols-[2rem_1fr_auto] gap-4 px-4 py-3 rounded-xl cursor-pointer transition-colors group
                ${isActive ? 'bg-brand-500/10 border border-brand-500/20' : 'hover:bg-surface-800'}`}>
              <div className="flex items-center justify-center text-sm">
                {isActive && playing ? (
                  <span className="text-brand-400 text-xs">♫</span>
                ) : (
                  <span className={`${isActive ? 'text-brand-400' : 'text-gray-600 group-hover:hidden'}`}>
                    {track.trackNumber}
                  </span>
                )}
                <span className="hidden group-hover:block text-gray-400 text-xs">▶</span>
              </div>

              <div className="flex items-center gap-3 min-w-0">
                {track.content.thumbnailUrl && (
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-surface-700">
                    <Image src={track.content.thumbnailUrl} alt={track.content.title} fill className="object-cover" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className={`text-sm font-medium truncate ${isActive ? 'text-brand-400' : 'text-white'}`}>
                    {track.content.title}
                  </p>
                  <p className="text-xs text-gray-600 truncate">
                    {track.content.creator.displayName || track.content.creator.username}
                  </p>
                </div>
              </div>

              <div className="flex items-center text-xs text-gray-600">
                {formatDuration(track.content.duration)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky player */}
      {currentTrack && (
        <div className="fixed bottom-0 left-0 right-0 bg-surface-900/95 backdrop-blur border-t border-surface-700 px-4 py-3 z-50">
          <div className="max-w-4xl mx-auto">
            {/* Progress bar */}
            <input type="range" min={0} max={duration || 1} step={0.1} value={progress}
              onChange={seek}
              className="w-full h-1 accent-brand-500 mb-3 cursor-pointer" />

            <div className="flex items-center gap-4">
              {/* Track info */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {currentTrack.content.thumbnailUrl && (
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                    <Image src={currentTrack.content.thumbnailUrl} alt={currentTrack.content.title} fill className="object-cover" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{currentTrack.content.title}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {currentTrack.content.creator.displayName || currentTrack.content.creator.username}
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-3">
                <button onClick={playPrev} className="text-gray-400 hover:text-white transition-colors text-lg">⏮</button>
                <button onClick={togglePlay}
                  className="w-10 h-10 bg-brand-500 hover:bg-brand-400 text-black rounded-full flex items-center justify-center transition-colors font-bold">
                  {playing ? '⏸' : '▶'}
                </button>
                <button onClick={playNext} className="text-gray-400 hover:text-white transition-colors text-lg">⏭</button>
              </div>

              {/* Time + options */}
              <div className="flex items-center gap-3 flex-1 justify-end">
                <span className="text-xs text-gray-500 tabular-nums">
                  {formatTime(progress)} / {formatTime(duration)}
                </span>
                <button onClick={() => setShuffle((s) => !s)}
                  className={`text-sm transition-colors ${shuffle ? 'text-brand-400' : 'text-gray-600 hover:text-gray-400'}`}>⇄</button>
                <button onClick={() => setRepeat((r) => !r)}
                  className={`text-sm transition-colors ${repeat ? 'text-brand-400' : 'text-gray-600 hover:text-gray-400'}`}>↺</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom padding so player doesn't cover last track */}
      {currentTrack && <div className="h-24" />}
    </div>
  );
}
