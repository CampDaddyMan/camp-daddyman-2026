'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { Content, ContentType } from '@/types';
import ContentCard from '@/components/content/ContentCard';
import AdSlot from '@/components/ads/AdSlot';

const TYPES: { value: ContentType | ''; label: string; emoji: string }[] = [
  { value: '',             label: 'All',           emoji: '✦'  },
  { value: 'MUSIC',       label: 'Music',          emoji: '🎵' },
  { value: 'FILM',        label: 'Film',           emoji: '🎬' },
  { value: 'PODCAST',     label: 'Podcasts',       emoji: '🎙️' },
  { value: 'SPOKEN_WORD', label: 'Spoken Word',    emoji: '🎤' },
  { value: 'DADDYMAN_ISMS', label: 'DaddyMan-Isms', emoji: '💡' },
  { value: 'BOOK',        label: 'Books',          emoji: '📖' },
];

const PAGE_SIZE = 12;

function BrowseContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const typeParam = (searchParams.get('type') || '') as ContentType | '';
  const sortParam = searchParams.get('sort') || 'latest';
  const tagParam  = searchParams.get('tag') || '';

  const [activeType, setActiveType] = useState<ContentType | ''>(typeParam);
  const [activeSort, setActiveSort] = useState(sortParam);
  const [items, setItems]           = useState<Content[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Sync state when URL params change
  useEffect(() => {
    setActiveType(typeParam);
    setActiveSort(sortParam);
    setPage(1);
    setItems([]);
  }, [typeParam, sortParam, tagParam]);

  const fetchPage = useCallback(async (
    type: ContentType | '',
    sort: string,
    tag: string,
    pageNum: number,
    append: boolean,
  ) => {
    if (append) setLoadingMore(true);
    else setLoading(true);

    const params: Record<string, string> = { page: String(pageNum), limit: String(PAGE_SIZE), sort };
    if (type) params.type = type;
    if (tag) params.tag = tag;

    try {
      const r = await api.get('/content', { params });
      setTotal(r.data.total);
      setItems((prev) => append ? [...prev, ...r.data.items] : r.data.items);
    } catch {}
    finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchPage(activeType, activeSort, tagParam, 1, false);
    setPage(1);
  }, [activeType, activeSort, tagParam, fetchPage]);

  function pushParams(type: ContentType | '', sort: string) {
    const p = new URLSearchParams();
    if (type) p.set('type', type);
    if (sort !== 'latest') p.set('sort', sort);
    if (tagParam) p.set('tag', tagParam);
    router.push(`/browse${p.toString() ? `?${p}` : ''}`);
  }

  function handleTypeChange(type: ContentType | '') {
    pushParams(type, activeSort);
  }

  function handleSortChange(sort: string) {
    pushParams(activeType, sort);
  }

  function handleLoadMore() {
    const next = page + 1;
    setPage(next);
    fetchPage(activeType, activeSort, tagParam, next, true);
  }

  const hasMore = items.length < total;

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Browse</h1>
          {tagParam && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-gray-400">Tag:</span>
              <span className="bg-brand-500/20 text-brand-400 border border-brand-400/30 text-xs font-medium px-3 py-1 rounded-full">
                #{tagParam}
              </span>
              <Link
                href={`/browse${activeType ? `?type=${activeType}` : ''}`}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                ✕ clear
              </Link>
            </div>
          )}
        </div>

        {/* Sort toggle */}
        <div className="flex gap-1 bg-surface-800 border border-surface-700 rounded-lg p-1">
          {[{ value: 'latest', label: 'Latest' }, { value: 'trending', label: 'Trending' }, { value: 'popular', label: 'Most Viewed' }].map((s) => (
            <button
              key={s.value}
              onClick={() => handleSortChange(s.value)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeSort === s.value
                  ? 'bg-brand-500 text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
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

      {/* Results count */}
      {!loading && (
        <p className="text-gray-500 text-sm mb-5">
          {total.toLocaleString()} {total === 1 ? 'result' : 'results'}
          {tagParam ? ` tagged #${tagParam}` : ''}
        </p>
      )}

      <AdSlot location="browse-banner" className="mb-8" />

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div key={i} className="aspect-video bg-surface-700 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-5xl mb-4">{activeType === 'MUSIC' ? '🎵' : activeType === 'FILM' ? '🎬' : activeType === 'PODCAST' ? '🎙️' : activeType === 'BOOK' ? '📖' : activeType === 'SPOKEN_WORD' ? '🎤' : activeType === 'DADDYMAN_ISMS' ? '💡' : '🎬'}</p>
          <p className="text-gray-400 text-lg">Nothing here yet.</p>
          <Link href="/upload" className="inline-block mt-4 text-brand-400 hover:underline text-sm">
            Be the first to upload →
          </Link>
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

export default function BrowsePage() {
  return (
    <Suspense>
      <BrowseContent />
    </Suspense>
  );
}
