'use client';
import { usePlayer } from '@/context/PlayerContext';

const TYPE_EMOJI: Record<string, string> = {
  MUSIC: '🎵', PODCAST: '🎙️', SPOKEN_WORD: '🎤', DADDYMAN_ISMS: '💡',
};

export default function QueueDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { track, queue, skipNext, removeFromQueue, clearQueue } = usePlayer();

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30 bg-black/40"
        onClick={onClose}
      />

      {/* Drawer — sits just above the mini-player (bottom-20 = 80px = player height) */}
      <div className="fixed bottom-20 left-0 right-0 z-40 max-h-[60vh] flex flex-col bg-surface-900 border-t border-surface-700 shadow-[0_-8px_32px_rgba(0,0,0,0.6)]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-surface-700 flex-shrink-0">
          <h2 className="text-white font-semibold text-sm">Up Next</h2>
          <div className="flex items-center gap-3">
            {queue.length > 0 && (
              <button
                onClick={clearQueue}
                className="text-xs text-gray-500 hover:text-red-400 transition-colors"
              >
                Clear all
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-lg leading-none">✕</button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Now Playing */}
          {track && (
            <div className="px-5 py-3 border-b border-surface-800">
              <p className="text-[10px] uppercase tracking-widest text-gray-600 font-semibold mb-2">Now Playing</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-surface-700 overflow-hidden flex-shrink-0">
                  {track.thumbnailUrl
                    ? <img src={track.thumbnailUrl} alt={track.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-sm">{TYPE_EMOJI[track.type] ?? '🎵'}</div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{track.title}</p>
                  <p className="text-gray-500 text-xs truncate">{track.creator}</p>
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse flex-shrink-0" />
              </div>
            </div>
          )}

          {/* Queue */}
          {queue.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-gray-500 text-sm">Queue is empty</p>
              <p className="text-gray-600 text-xs mt-1">Add songs with the + button on any track</p>
            </div>
          ) : (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-600 font-semibold px-5 pt-3 pb-1">Up Next — {queue.length} track{queue.length !== 1 ? 's' : ''}</p>
              {queue.map((t, i) => (
                <div
                  key={`${t.id}-${i}`}
                  className="flex items-center gap-3 px-5 py-2.5 hover:bg-surface-800 transition-colors group"
                >
                  <span className="text-gray-700 text-xs w-4 text-right flex-shrink-0">{i + 1}</span>
                  <div className="w-9 h-9 rounded-lg bg-surface-700 overflow-hidden flex-shrink-0">
                    {t.thumbnailUrl
                      ? <img src={t.thumbnailUrl} alt={t.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-xs">{TYPE_EMOJI[t.type] ?? '🎵'}</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium truncate">{t.title}</p>
                    <p className="text-gray-500 text-xs truncate">{t.creator}</p>
                  </div>
                  {i === 0 && (
                    <button
                      onClick={skipNext}
                      className="opacity-0 group-hover:opacity-100 text-xs text-brand-400 hover:text-brand-300 transition-all px-2 py-1 rounded-lg hover:bg-brand-400/10 whitespace-nowrap flex-shrink-0"
                    >
                      Play now
                    </button>
                  )}
                  <button
                    onClick={() => removeFromQueue(i)}
                    className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all text-base leading-none px-1 flex-shrink-0"
                    aria-label="Remove from queue"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <div className="h-3" />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
