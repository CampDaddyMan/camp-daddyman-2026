'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/api';
import { Content, ContentType } from '@/types';
import ContentCard from '@/components/content/ContentCard';

interface Creator {
  username: string;
  displayName?: string;
  avatar?: string;
  bio?: string;
  _count: { followers: number; content: number };
}

const TYPES: { value: ContentType | ''; label: string; emoji: string }[] = [
  { value: '',             label: 'All',            emoji: '✦'  },
  { value: 'MUSIC',       label: 'Music',           emoji: '🎵' },
  { value: 'FILM',        label: 'Film',            emoji: '🎬' },
  { value: 'PODCAST',     label: 'Podcasts',        emoji: '🎙️' },
  { value: 'SPOKEN_WORD', label: 'Spoken Word',     emoji: '🎤' },
  { value: 'DADDYMAN_ISMS', label: 'DaddyMan-Isms', emoji: '💡' },
  { value: 'BOOK',        label: 'Books',           emoji: '📖' },
];

function CreatorResult({ creator }: { creator: Creator }) {
  return (
    <Link
      href={`/creator/${creator.username}`}
      className="flex items-center gap-4 bg-surface-800 hover:bg-surface-700 border border-surface-700 rounded-xl px-4 py-3 transition-colors"
    >
      <div className="w-12 h-12 rounded-full bg-surface-600 overflow-hidden flex-shrink-0 flex items-center justify-center text-xl">
        {creator.avatar
          ? <Image src={creator.avatar} alt={creator.username} width={48} height={48} className="object-cover w-full h-full" />
          : (creator.displayName || creator.username)[0].toUpperCase()
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm truncate">{creator.displayName || creator.username}</p>
        <p className="text-gray-400 text-xs">@{creator.username} · {creator._count.followers.toLocaleString()} followers · {creator._count.content} pieces</p>
        {creator.bio && <p className="text-gray-500 text-xs mt-0.5 truncate">{creator.bio}</p>}
      </div>
      <span className="text-xs text-brand-400 border border-brand-400/30 px-2 py-0.5 rounded-full flex-shrink-0">Creator</span>
    </Link>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get('q') || '';
  const typeParam = (searchParams.get('type') || '') as ContentType | '';

  const [query, setQuery]           = useState(q);
  const [activeType, setActiveType] = useState<ContentType | ''>(typeParam);
  const [items, setItems]           = useState<Content[]>([]);
  const [creators, setCreators]     = useState<Creator[]>([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(false);
  const [searched, setSearched]     = useState(false);

  const doSearch = useCallback((term: string, type: ContentType | '') => {
    if (term.trim().length < 2) return;
    setLoading(true);
    setSearched(true);

    const contentParams: Record<string, string> = { q: term.trim() };
    if (type) contentParams.type = type;

    // Search content and creators in parallel; only search creators on "All" tab
    const searches: Promise<any>[] = [
      api.get('/content/search', { params: contentParams }),
    ];
    if (!type) {
      searches.push(api.get('/creators/search', { params: { q: term.trim() } }));
    }

    Promise.all(searches)
      .then(([contentRes, creatorRes]) => {
        setItems(contentRes.data.items);
        setTotal(contentRes.data.total);
        setCreators(creatorRes?.data.creators || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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

  const totalResults = total + (activeType ? 0 : creators.length);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-white mb-6">Search</h1>

      <form onSubmit={handleSubmit} className="flex gap-3 mb-8">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search music, film, books, podcasts, spoken word, creators..."
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

      {searched && (
        <div className="flex gap-2 flex-wrap mb-8">
          {TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => handleTypeChange(t.value)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeType === t.value
                  ? 'bg-brand-500 text-black'
                  : 'bg-surface-700 text-gray-300 hover:bg-surface-600 hover:text-white'
              }`}
            >
              <span>{t.emoji}</span>{t.label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[0,1,2].map((i) => <div key={i} className="h-16 bg-surface-700 rounded-xl animate-pulse" />)}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-video bg-surface-700 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      ) : searched && totalResults === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-4">🔍</p>
          <p className="text-gray-400 text-lg">No results for <strong className="text-white">"{q}"</strong></p>
          <p className="text-gray-500 text-sm mt-2">Try different keywords or browse by type above</p>
        </div>
      ) : searched ? (
        <>
          <p className="text-gray-400 text-sm mb-6">
            {totalResults} result{totalResults !== 1 ? 's' : ''} for <strong className="text-white">"{q}"</strong>
          </p>

          {/* Creator results */}
          {creators.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Creators</h2>
              <div className="space-y-2">
                {creators.map((c) => <CreatorResult key={c.username} creator={c} />)}
              </div>
            </div>
          )}

          {/* Content results */}
          {items.length > 0 && (
            <>
              {creators.length > 0 && (
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Content</h2>
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {items.map((item) => <ContentCard key={item.id} item={item} />)}
              </div>
            </>
          )}
        </>
      ) : (
        <div className="text-center py-20 text-gray-500">
          <p className="text-5xl mb-4">🎵</p>
          <p className="text-lg">Search music, film, books, podcasts, spoken word, or creators</p>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchContent />
    </Suspense>
  );
}
