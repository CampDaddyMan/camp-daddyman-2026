'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Content } from '@/types';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const TYPE_LABELS: Record<string, string> = {
  FILM: 'Film', MUSIC: 'Music', PODCAST: 'Podcast', SPOKEN_WORD: 'Spoken Word', DADDYMAN_ISMS: 'DaddyMan-Ism', BOOK: 'Book',
};

const TYPE_EMOJI: Record<string, string> = {
  MUSIC: '🎵', FILM: '🎬', PODCAST: '🎙️', SPOKEN_WORD: '🎤', DADDYMAN_ISMS: '💡', BOOK: '📖',
};


function formatDuration(seconds?: number) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function RowCard({ item }: { item: Content }) {
  const { user } = useAuth();
  const cardWidth = item.cardWidth || 224;
  const [hovered, setHovered] = useState(false);
  const [actionsVisible, setActionsVisible] = useState(false);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const aspectClass =
    item.cardAspect === 'square'
      ? 'aspect-square'
      : item.cardAspect === 'portrait'
      ? 'aspect-[4/5]'
      : 'aspect-video';

  function handleMouseEnter() {
    setActionsVisible(true);
    if (!item.previewUrl) return;
    timerRef.current = setTimeout(() => setHovered(true), 1500);
  }

  function handleMouseLeave() {
    setActionsVisible(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    setHovered(false);
  }

  async function handleLike(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    try {
      const { data } = await api.post(`/content/${item.id}/like`);
      setLiked(data.isLiked);
    } catch {}
  }

  async function handleSave(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    try {
      const { data } = await api.post(`/content/${item.id}/save`);
      setSaved(data.isSaved);
    } catch {}
  }

  return (
    <div
      style={{ width: `${cardWidth}px` }}
      className="group relative flex-shrink-0 rounded-xl bg-surface-800 hover:ring-1 hover:ring-brand-400/40 transition-all"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link href={`/watch/${item.id}`} className="block rounded-xl overflow-hidden">
        <div className={`relative ${aspectClass} bg-surface-700`}>
          {item.thumbnailUrl ? (
            <Image src={item.thumbnailUrl} alt={item.title} fill sizes="224px" className="object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-3xl text-surface-500">
              {TYPE_EMOJI[item.type] ?? '🎬'}
            </div>
          )}

          {hovered && item.previewUrl && (
            <video src={item.previewUrl} autoPlay muted playsInline loop className="absolute inset-0 w-full h-full object-cover z-10" />
          )}

          {item.duration && (
            <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-xs text-white px-1.5 py-0.5 rounded z-20">
              {formatDuration(item.duration)}
            </span>
          )}

          <span className="absolute top-1.5 left-1.5 bg-brand-500/90 text-black text-xs font-semibold px-1.5 py-0.5 rounded-full z-20">
            {TYPE_LABELS[item.type]}
          </span>

          {item.privacy === 'SUBSCRIBERS_ONLY' && (
            <span className="absolute top-1.5 right-1.5 bg-surface-900/90 text-brand-400 text-xs font-semibold px-1.5 py-0.5 rounded-full border border-brand-400/40 z-20">
              Members
            </span>
          )}
        </div>

        <div className="p-3">
          <h3 className="font-semibold text-white text-sm line-clamp-2 group-hover:text-brand-400 transition-colors leading-snug">
            {item.title}
          </h3>
          <p className="text-xs text-gray-400 mt-1 truncate">
            {item.creator.displayName || item.creator.username}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {item.views.toLocaleString()} views
          </p>
        </div>
      </Link>

      {/* Quick-action buttons — save & like on hover */}
      {user && (
        <div
          className={`absolute top-2 right-2 flex gap-1 z-30 transition-opacity duration-150 ${
            actionsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <button
            onClick={handleSave}
            title={saved ? 'Saved' : 'Save to watchlist'}
            className={`w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-sm shadow transition-colors ${
              saved ? 'bg-brand-500 text-black' : 'bg-black/75 text-white hover:bg-black'
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </button>
          <button
            onClick={handleLike}
            title={liked ? 'Liked' : 'Like'}
            className={`w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-sm shadow transition-colors ${
              liked ? 'bg-red-500 text-white' : 'bg-black/75 text-white hover:bg-black'
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

// ── Top 10 row ─────────────────────────────────────────────────────────────────

function Top10Card({ item, rank }: { item: Content; rank: number }) {
  return (
    <Link href={`/watch/${item.id}`} className="group flex items-end flex-shrink-0" style={{ width: '180px' }}>
      {/* Rank number — huge outlined text, overlaps left edge of thumbnail */}
      <span
        className="flex-shrink-0 text-[6.5rem] font-black leading-none select-none z-10 translate-x-3"
        style={{
          WebkitTextStroke: '2px rgba(255,255,255,0.65)',
          color: 'transparent',
          textShadow: '0 2px 8px rgba(0,0,0,0.8)',
          fontFamily: 'sans-serif',
        }}
      >
        {rank}
      </span>
      {/* Thumbnail */}
      <div className="flex-1 relative aspect-[2/3] bg-surface-700 rounded-lg overflow-hidden -translate-x-1 shadow-xl group-hover:ring-2 group-hover:ring-brand-400/60 transition-all">
        {item.thumbnailUrl ? (
          <Image src={item.thumbnailUrl} alt={item.title} fill sizes="120px" className="object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-2xl">{TYPE_EMOJI[item.type] ?? '🎬'}</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute bottom-2 left-2 right-2 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all">
          <p className="text-white text-xs font-semibold line-clamp-2 leading-snug">{item.title}</p>
        </div>
      </div>
    </Link>
  );
}

export function Top10Row({ title, items, seeAllHref }: { title: string; items: Content[]; seeAllHref?: string }) {
  if (items.length === 0) return null;
  return (
    <section className="mb-10">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-xl font-bold text-white">{title}</h2>
        {seeAllHref && (
          <Link href={seeAllHref} className="text-sm text-brand-400 hover:underline">See all →</Link>
        )}
      </div>
      <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
        {items.slice(0, 10).map((item, i) => (
          <div key={item.id} className="snap-start">
            <Top10Card item={item} rank={i + 1} />
          </div>
        ))}
      </div>
    </section>
  );
}

interface ContentRowProps {
  title: string;
  items: Content[];
  seeAllHref?: string;
  emptyText?: string;
}

export default function ContentRow({ title, items, seeAllHref, emptyText }: ContentRowProps) {
  return (
    <section className="mb-10">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-xl font-bold text-white">{title}</h2>
        {seeAllHref && items.length > 0 && (
          <Link href={seeAllHref} className="text-sm text-brand-400 hover:underline">
            See all →
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-gray-500 text-sm py-4">
          {emptyText || 'Nothing here yet.'}
        </p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
          {items.map((item) => (
            <div key={item.id} className="snap-start">
              <RowCard item={item} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
