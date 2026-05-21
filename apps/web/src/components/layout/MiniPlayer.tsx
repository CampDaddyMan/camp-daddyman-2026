'use client';
import { useState } from 'react';
import { usePlayer } from '@/context/PlayerContext';
import QueueDrawer from './QueueDrawer';

const TYPE_EMOJI: Record<string, string> = {
  MUSIC: '🎵', PODCAST: '🎙️', SPOKEN_WORD: '🎤', DADDYMAN_ISMS: '💡',
};

function fmt(s: number) {
  if (!isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function MiniPlayer() {
  const { track, queue, playing, progress, duration, toggle, seek, dismiss, skipNext, skipPrev } = usePlayer();
  const [queueOpen, setQueueOpen] = useState(false);

  if (!track) return null;

  const pct = duration > 0 ? (progress / duration) * 100 : 0;
  const canSkipNext = queue.length > 0;

  return (
    <>
      <QueueDrawer open={queueOpen} onClose={() => setQueueOpen(false)} />

      <div className="fixed bottom-0 left-0 right-0 z-40 bg-surface-900/95 backdrop-blur-md border-t border-surface-700 shadow-[0_-4px_32px_rgba(0,0,0,0.5)]">
        {/* Thin progress stripe */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-surface-700">
          <div className="h-full bg-brand-500 transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>

        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center gap-3">
          {/* Thumbnail */}
          <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-surface-700 overflow-hidden">
            {track.thumbnailUrl
              ? <img src={track.thumbnailUrl} alt={track.title} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-lg">{TYPE_EMOJI[track.type] ?? '🎵'}</div>
            }
          </div>

          {/* Title + creator */}
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate leading-tight">{track.title}</p>
            {track.creator && (
              <p className="text-gray-400 text-xs truncate leading-tight mt-0.5">{track.creator}</p>
            )}
          </div>

          {/* Seek bar + times — hidden on mobile */}
          <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
            <span className="text-gray-500 text-xs font-mono tabular-nums w-10 text-right">{fmt(progress)}</span>
            <input
              type="range" min={0} max={duration || 100} step={1} value={progress}
              onChange={(e) => seek(Number(e.target.value))}
              className="w-32 lg:w-52 accent-brand-500 cursor-pointer h-1"
            />
            <span className="text-gray-500 text-xs font-mono tabular-nums w-10">{fmt(duration)}</span>
          </div>

          {/* Controls */}
          {/* Skip prev */}
          <button
            onClick={skipPrev}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white transition-colors text-sm"
            aria-label="Restart track"
          >
            ⏮
          </button>

          {/* Play / Pause */}
          <button
            onClick={toggle}
            className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-500 hover:bg-brand-400 text-black flex items-center justify-center transition-colors font-bold text-sm"
          >
            {playing ? '❚❚' : '▶'}
          </button>

          {/* Skip next */}
          <button
            onClick={skipNext}
            disabled={!canSkipNext}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center transition-colors text-sm disabled:opacity-30 text-gray-400 hover:text-white disabled:hover:text-gray-400"
            aria-label="Skip to next track"
          >
            ⏭
          </button>

          {/* Queue toggle */}
          <button
            onClick={() => setQueueOpen((o) => !o)}
            className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-colors text-xs relative ${
              queueOpen ? 'bg-surface-700 text-white' : 'text-gray-500 hover:text-white'
            }`}
            aria-label="Toggle queue"
          >
            ☰
            {queue.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-brand-500 text-black text-[9px] font-bold min-w-[14px] h-3.5 px-0.5 rounded-full flex items-center justify-center leading-none">
                {queue.length > 9 ? '9+' : queue.length}
              </span>
            )}
          </button>

          {/* Dismiss */}
          <button
            onClick={dismiss}
            className="flex-shrink-0 text-gray-500 hover:text-white transition-colors text-xl leading-none px-1"
            aria-label="Close player"
          >
            ✕
          </button>
        </div>
      </div>
    </>
  );
}
