'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
import { Content } from '@/types';
import { usePlayer } from '@/context/PlayerContext';

const TYPE_LABELS: Record<string, string> = {
  FILM: 'Film', MUSIC: 'Music', PODCAST: 'Podcast',
  SPOKEN_WORD: 'Spoken Word', DADDYMAN_ISMS: 'DaddyMan-Ism', BOOK: 'Book',
};

const TYPE_EMOJI: Record<string, string> = {
  MUSIC: '🎵', FILM: '🎬', PODCAST: '🎙️', SPOKEN_WORD: '🎤', DADDYMAN_ISMS: '💡', BOOK: '📖',
};

const AUDIO_TYPES = ['MUSIC', 'PODCAST', 'SPOKEN_WORD', 'DADDYMAN_ISMS'];

function formatDuration(seconds?: number) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function QueueMenu({ item, onClose }: { item: Content; onClose: () => void }) {
  const { addToQueue, playNext, play } = usePlayer();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const track = {
    id: item.id,
    title: item.title,
    creator: item.creator.displayName || item.creator.username,
    mediaUrl: item.mediaUrl as string,
    thumbnailUrl: item.thumbnailUrl ?? null,
    type: item.type,
  };

  return (
    <div
      ref={ref}
      className="absolute bottom-full right-0 mb-1 w-40 bg-surface-800 border border-surface-600 rounded-xl shadow-2xl overflow-hidden z-50 py-1"
    >
      <button
        onClick={(e) => { e.preventDefault(); play(track); onClose(); }}
        className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-surface-700 transition-colors"
      >
        ▶ Play now
      </button>
      <button
        onClick={(e) => { e.preventDefault(); playNext(track); onClose(); }}
        className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-surface-700 transition-colors"
      >
        ⏭ Play next
      </button>
      <button
        onClick={(e) => { e.preventDefault(); addToQueue(track); onClose(); }}
        className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-surface-700 transition-colors"
      >
        + Add to queue
      </button>
    </div>
  );
}

export default function ContentCard({ item }: { item: Content }) {
  const isAudio = AUDIO_TYPES.includes(item.type);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="group bg-surface-800 rounded-xl overflow-hidden hover:ring-1 hover:ring-brand-400/40 transition-all">
      <Link href={`/watch/${item.id}`} className="block">
        <div className="relative aspect-video bg-surface-700">
          {item.thumbnailUrl ? (
            item.thumbnailUrl.startsWith('http')
              ? <img src={item.thumbnailUrl} alt={item.title} className="absolute inset-0 w-full h-full object-cover" />
              : <Image src={item.thumbnailUrl} alt={item.title} fill className="object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-4xl text-surface-500">
              {TYPE_EMOJI[item.type] ?? '🎬'}
            </div>
          )}
          {item.duration && (
            <span className="absolute bottom-2 right-2 bg-black/80 text-xs text-white px-1.5 py-0.5 rounded">
              {formatDuration(item.duration)}
            </span>
          )}
          <span className="absolute top-2 left-2 bg-brand-500/90 text-black text-xs font-semibold px-2 py-0.5 rounded-full">
            {TYPE_LABELS[item.type]}
          </span>
          {item.privacy === 'SUBSCRIBERS_ONLY' && (
            <span className="absolute top-2 right-2 bg-surface-900/90 text-brand-400 text-xs font-semibold px-2 py-0.5 rounded-full border border-brand-400/40">
              Members
            </span>
          )}

          {/* Queue button — audio types only, appears on hover */}
          {isAudio && item.mediaUrl && (
            <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity relative">
              <button
                onClick={(e) => { e.preventDefault(); setMenuOpen((o) => !o); }}
                className="bg-black/70 hover:bg-black/90 text-white text-xs font-bold px-2 py-1 rounded-lg transition-colors"
                aria-label="Queue options"
              >
                + Queue
              </button>
              {menuOpen && <QueueMenu item={item} onClose={() => setMenuOpen(false)} />}
            </div>
          )}
        </div>
        <div className="p-3 pb-2">
          <h3 className="font-semibold text-white text-sm line-clamp-2 group-hover:text-brand-400 transition-colors">
            {item.title}
          </h3>
          <p className="text-xs text-gray-400 mt-1">{item.creator.displayName || item.creator.username}</p>
          <p className="text-xs text-gray-500 mt-0.5">{item.views.toLocaleString()} views</p>
        </div>
      </Link>

      {item.tags && item.tags.length > 0 && (
        <div className="px-3 pb-3 flex flex-wrap gap-1">
          {item.tags.slice(0, 3).map((tag) => (
            <Link
              key={tag}
              href={`/browse?tag=${encodeURIComponent(tag)}`}
              className="text-xs text-gray-500 hover:text-brand-400 hover:bg-brand-400/10 bg-surface-700 px-2 py-0.5 rounded-full transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              #{tag}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
