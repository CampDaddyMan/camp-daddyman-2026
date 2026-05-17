import Link from 'next/link';
import Image from 'next/image';
import { Content } from '@/types';

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
  const cardWidth = item.cardWidth || 224;

  const aspectClass =
    item.cardAspect === 'square'
      ? 'aspect-square'
      : item.cardAspect === 'portrait'
      ? 'aspect-[4/5]'
      : 'aspect-video';

  return (
    <Link
      href={`/watch/${item.id}`}
      style={{ width: `${cardWidth}px` }}
      className="group block flex-shrink-0 bg-surface-800 rounded-xl overflow-hidden hover:ring-1 hover:ring-brand-400/40 transition-all"
    >

   
        <div className={`relative ${aspectClass} bg-surface-700`}>
        {item.thumbnailUrl ? (
          <Image
            src={item.thumbnailUrl}
            alt={item.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-3xl text-surface-500">
            {TYPE_EMOJI[item.type] ?? '🎬'}
          </div>
        )}

        {item.duration && (
          <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-xs text-white px-1.5 py-0.5 rounded">
            {formatDuration(item.duration)}
          </span>
        )}

        <span className="absolute top-1.5 left-1.5 bg-brand-500/90 text-black text-xs font-semibold px-1.5 py-0.5 rounded-full">
          {TYPE_LABELS[item.type]}
        </span>

        {item.privacy === 'SUBSCRIBERS_ONLY' && (
          <span className="absolute top-1.5 right-1.5 bg-surface-900/90 text-brand-400 text-xs font-semibold px-1.5 py-0.5 rounded-full border border-brand-400/40">
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
        <h2 className="text-lg font-bold text-white">{title}</h2>
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
