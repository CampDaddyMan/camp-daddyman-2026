'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { Content, ContentType } from '@/types';
import ContentCard from '@/components/content/ContentCard';

const TYPES: { value: ContentType | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'MUSIC', label: 'Music' },
  { value: 'FILM', label: 'Film' },
  { value: 'PODCAST', label: 'Podcasts' },
  { value: 'SPOKEN_WORD', label: 'Spoken Word' },
];

export default function BrowsePage() {
  const searchParams = useSearchParams();
  const typeParam = (searchParams.get('type') || '') as ContentType | '';
  const [activeType, setActiveType] = useState<ContentType | ''>(typeParam);
  const [items, setItems] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setActiveType(typeParam);
  }, [typeParam]);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (activeType) params.type = activeType;

    api.get('/content', { params })
      .then((r) => setItems(r.data.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeType]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Hero */}
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Camp DaddyMan</h1>
        <p className="text-gray-400 text-lg">Music, film, teachings, and community content.</p>
      </div>

      {/* Type filter */}
      <div className="flex gap-2 flex-wrap mb-8">
        {TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setActiveType(t.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeType === t.value
                ? 'bg-brand-500 text-black'
                : 'bg-surface-700 text-gray-300 hover:bg-surface-600 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-video bg-surface-700 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-5xl mb-4">🎬</p>
          <p className="text-lg">No content yet. Be the first to upload.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => <ContentCard key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
}
