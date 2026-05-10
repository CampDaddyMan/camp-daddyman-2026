import Link from 'next/link';
import Image from 'next/image';
import { Content } from '@/types';

const TYPE_LABELS: Record<string, string> = {
  FILM: 'Film',
  MUSIC: 'Music',
  PODCAST: 'Podcast',
  SPOKEN_WORD: 'Spoken Word',
};

function formatDuration(seconds?: number) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function ContentCard({ item }: { item: Content }) {
  return (
    <Link href={`/watch/${item.id}`} className="group block bg-surface-800 rounded-xl overflow-hidden hover:ring-1 hover:ring-brand-400/40 transition-all">
      <div className="relative aspect-video bg-surface-700">
        {item.thumbnailUrl ? (
          <Image src={item.thumbnailUrl} alt={item.title} fill className="object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-4xl text-surface-500">
            {item.type === 'MUSIC' ? '🎵' : item.type === 'FILM' ? '🎬' : item.type === 'PODCAST' ? '🎙️' : '🎤'}
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
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-white text-sm line-clamp-2 group-hover:text-brand-400 transition-colors">
          {item.title}
        </h3>
        <p className="text-xs text-gray-400 mt-1">{item.creator.displayName || item.creator.username}</p>
        <p className="text-xs text-gray-500 mt-0.5">{item.views.toLocaleString()} views</p>
      </div>
    </Link>
  );
}
