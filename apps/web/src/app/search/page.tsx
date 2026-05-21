'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { Content, ContentType } from '@/types';
import ContentCard from '@/components/content/ContentCard';

const TYPES: { value: ContentType | ''; label: string; emoji: string }[] = [
  { value: '',               label: 'All',           emoji: '✦'  },
  { value: 'MUSIC',         label: 'Music',          emoji: '🎵' },
  { value: 'FILM',          label: 'Film',           emoji: '🎬' },
  { value: 'PODCAST',       label: 'Podcasts',       emoji: '🎙️' },
  { value: 'SPOKEN_WORD',   label: 'Spoken Word',    emoji: '🎤' },
  { value: 'DADDYMAN_ISMS', label: 'DaddyMan-Isms',  emoji: '💡' },
  { value: 'BOOK',          label: 'Books',          emoji: '📖' },
];

const PAGE_SIZE = 12;

function SearchContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();

  const query     = searchParams.get('q') || '';
  const typeParam = (searchParams.get('type') || '') as ContentType | '';

  const [activeType,   setActiveType]   = useState<ContentType | ''>(typeParam);
  const [items,        setItems]        = useState<Content[]>([]);
  const [total,        setTotal]        = useState(0);
  const [page,         setPage]         = useState(1);
  const [loading,      setLoading]      = useState(false);
  const [loadingMore,  setLoadingMore]  = useState(false);
  const [searched,     setSearched]     = useState(false);

  useEffect(() => {
    setActiveType(typeParam);
    setItems([]);
    setPage(1);
    setSearched(false);
  }, [query, typeParam]);

  const fetchPage = useCallback(async (
    q: string,
    type: ContentType | '',
    pageNum: number,
    append: boolean,
  ) => {
    if (!q || q.trim().length < 2) return;
    if (append) setLoadingMore(true);
    else { setLoading(true); setItems([]); }

    const params: Record<string, string | number> = { q, page: pageNum, limit: PAGE_SIZE };
    if (type) params.type = type;

    try {
      const r = await api.get('/content/search', { params });
      setTotal(r.data.total);
      setItems((prev) => append ? [...prev, ...r.data.items] : r.data.items);
    } catch {}
    finally {
      setLoading(false);
      setLoadingMore(false);
      setSearched(true);
    }
  }, []);

  useEffect(() => {
    fetchPage(query, activeType, 1, false);
    setPage(1);
  }, [query, activeType, fetchPage]);

  function handleTypeChange(type: ContentType | '') {
    const p = new URLSearchParams();
    if (query) p.set('q', query);
    if (type) p.set('type', type);
    router.push(`/search?${p.toString()}`);
  }

  function handleLoadMore() {
    const next = page + 1;
    setPage(next);
    fetchPage(query, activeType, next, true);
  }

  const hasMore = items.length < total;

  if (!query) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <p className="text-6xl mb-5">🔍</p>
        <h1 className="text-2xl font-bold text-white mb-2">Search Camp DaddyMan</h1>
        <p className="text-gray-400 mb-8">Find music, films, podcasts, spoken word, books and more.</p>
        <InlineSearchBar />
        <div className="mt-12">
          <p className="text-xs uppercase tracking-widest text-gray-600 mb-4 font-semibold">Browse by type</p>
          <div className="flex flex-wrap justify-center gap-2">
            {TYPES.slice(1).map((t) => (
              <Link
                key={t.value}
                href={`/browse?type=${t.value}`}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm bg-surface-700 text-gray-300 hover:bg-surface-600 hover:text-white transition-colors"
              >
                <span>{t.emoji}</span>{t.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">
          Results for <span className="text-brand-400">&ldquo;{query}&rdquo;</span>
        </h1>
        {searched && !loading && (
          <p className="text-gray-500 text-sm">
            {total.toLocaleString()} {total === 1 ? 'result' : 'results'}
            {activeType ? ` in ${TYPES.find((t) => t.value === activeType)?.label}` : ''}
          </p>
        )}
      </div>

      {/* Type filter pills */}
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

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div key={i} className="aspect-video bg-surface-700 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 && searched ? (
        <div className="text-center py-24">
          <p className="text-5xl mb-4">🔍</p>
          <p className="text-white font-semibold text-lg mb-2">
            No results for &ldquo;{query}&rdquo;
          </p>
          <p className="text-gray-500 text-sm mb-8">
            {activeType
              ? 'Try removing the type filter or broaden your search.'
              : 'Check spelling or try a different term.'}
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            {activeType && (
              <button
                onClick={() => handleTypeChange('')}
                className="px-5 py-2.5 bg-surface-700 hover:bg-surface-600 text-gray-300 hover:text-white rounded-xl text-sm font-medium transition-colors"
              >
                Search all types
              </button>
            )}
            <Link
              href="/browse"
              className="px-5 py-2.5 bg-brand-500 hover:bg-brand-400 text-black rounded-xl text-sm font-semibold transition-colors"
            >
              Browse all content
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((item) => <ContentCard key={item.id} item={item} />)}
          </div>

          {hasMore && (
            <div className="text-center mt-10">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="bg-surface-700 hover:bg-surface-600 text-white px-8 py-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              >
                {loadingMore ? 'Loading...' : `Load more (${total - items.length} remaining)`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function InlineSearchBar() {
  const router = useRouter();
  const [q, setQ] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim().length >= 2) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 max-w-md mx-auto">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search music, film, podcasts..."
        autoFocus
        className="flex-1 bg-surface-700 border border-surface-600 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 transition-colors placeholder:text-gray-500"
      />
      <button
        type="submit"
        disabled={q.trim().length < 2}
        className="bg-brand-500 hover:bg-brand-400 disabled:opacity-40 text-black font-bold px-5 py-3 rounded-xl text-sm transition-colors"
      >
        Search
      </button>
    </form>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchContent />
    </Suspense>
  );
}
