'use client';
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get('q') || '';
  const typeParam = (searchParams.get('type') || '') as ContentType | '';

  const [query, setQuery]       = useState(q);
  const [activeType, setActiveType] = useState<ContentType | ''>(typeParam);
  const [items, setItems]       = useState<Content[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback((term: string, type: ContentType | '') => {
    if (term.trim().length < 2) return;
    setLoading(true);
    setSearched(true);
    const params: Record<string, string> = { q: term.trim() };
    if (type) params.type = type;
    api.get('/content/search', { params })
      .then((r) => { setItems(r.data.items); setTotal(r.data.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Run search when URL params change
  useEffect(() => {
    setQuery(q);
    setActiveType(typeParam);
    if (q) doSearch(q, typeParam);
  }, [q, typeParam, doSearch]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length < 2) return;
    const params = new URLSearchParams({ q: query.trim() });
    if (activeType) params.set('type', activeType);
    router.push(`/search?${params.toString()}`);
  }

  function handleTypeChange(type: ContentType | '') {
    setActiveType(type);
    if (q) {
      const params = new URLSearchParams({ q });
      if (type) params.set('type', type);
      router.push(`/search?${params.toString()}`);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-white mb-6">Search</h1>

      {/* Search bar */}
      <form onSubmit={handleSubmit} className="flex gap-3 mb-8">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search music, films, podcasts, creators..."
          className="flex-1 bg-surface-700 border border-surface-600 text-white rounded-xl px-5 py-3 text-sm focus:outline-none focus:border-brand-400 transition-colors"
          autoFocus
        />
        <button
          type="submit"
          className="bg-brand-500 hover:bg-brand-600 text-black font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
        >
          Search
        </button>
      </form>

      {/* Type filters */}
      {searched && (
        <div className="flex gap-2 flex-wrap mb-8">
          {TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => handleTypeChange(t.value)}
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
      )}

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-video bg-surface-700 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : searched && items.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-4">🔍</p>
          <p className="text-gray-400 text-lg">No results for <strong className="text-white">"{q}"</strong></p>
          <p className="text-gray-500 text-sm mt-2">Try different keywords or browse by type above</p>
        </div>
      ) : searched ? (
        <>
          <p className="text-gray-400 text-sm mb-5">
            {total} result{total !== 1 ? 's' : ''} for <strong className="text-white">"{q}"</strong>
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((item) => <ContentCard key={item.id} item={item} />)}
          </div>
        </>
      ) : (
        <div className="text-center py-20 text-gray-500">
          <p className="text-5xl mb-4">🎵</p>
          <p className="text-lg">Search for music, films, podcasts, or creators</p>
        </div>
      )}
    </div>
  );
}
