'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { Content, ContentType } from '@/types';
import ContentCard from '@/components/content/ContentCard';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CreatorResult {
  id: string; username: string; displayName?: string; avatar?: string; bio?: string;
  _count: { followers: number; content: number };
}

interface AlbumResult {
  id: string; title: string; coverUrl?: string; releaseType: string;
  creator: { username: string; displayName?: string };
  _count: { tracks: number };
}

interface SearchResults {
  query: string;
  creators: CreatorResult[];
  albums: AlbumResult[];
  content: { items: Content[]; total: number; page: number; pages: number };
}

// ── Constants ─────────────────────────────────────────────────────────────────

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

const RELEASE_LABEL: Record<string, string> = {
  ALBUM: 'Album', EP: 'EP', SINGLE: 'Single', MIXTAPE: 'Mixtape', COMPILATION: 'Compilation',
};

// ── Sub-components ────────────────────────────────────────────────────────────

function CreatorCard({ c }: { c: CreatorResult }) {
  return (
    <Link href={`/creator/${c.username}`}
      className="flex flex-col items-center gap-2 p-4 bg-surface-800 border border-surface-700 rounded-xl hover:border-brand-500/50 transition-colors text-center group min-w-[140px]">
      <div className="w-16 h-16 rounded-full bg-surface-600 overflow-hidden flex-shrink-0 flex items-center justify-center text-2xl">
        {c.avatar
          ? <img src={c.avatar} alt={c.displayName || c.username} className="w-full h-full object-cover" />
          : <span>{(c.displayName || c.username)[0].toUpperCase()}</span>}
      </div>
      <div className="min-w-0 w-full">
        <p className="text-white text-sm font-semibold truncate group-hover:text-brand-400 transition-colors">
          {c.displayName || c.username}
        </p>
        <p className="text-gray-500 text-xs">@{c.username}</p>
        <p className="text-gray-600 text-xs mt-1">
          {c._count.followers.toLocaleString()} followers · {c._count.content} pieces
        </p>
      </div>
    </Link>
  );
}

function AlbumCard({ a }: { a: AlbumResult }) {
  return (
    <Link href={`/albums/${a.id}`}
      className="flex flex-col gap-2 p-3 bg-surface-800 border border-surface-700 rounded-xl hover:border-brand-500/50 transition-colors group min-w-[160px]">
      <div className="aspect-square bg-surface-700 rounded-lg overflow-hidden flex items-center justify-center text-3xl">
        {a.coverUrl
          ? <img src={a.coverUrl} alt={a.title} className="w-full h-full object-cover" />
          : <span>🎵</span>}
      </div>
      <div className="min-w-0">
        <p className="text-white text-sm font-semibold truncate group-hover:text-brand-400 transition-colors">{a.title}</p>
        <p className="text-gray-500 text-xs truncate">{a.creator.displayName || a.creator.username}</p>
        <p className="text-gray-600 text-xs mt-0.5">
          {RELEASE_LABEL[a.releaseType] || a.releaseType} · {a._count.tracks} tracks
        </p>
      </div>
    </Link>
  );
}

// ── Main search logic ─────────────────────────────────────────────────────────

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const query     = searchParams.get('q') || '';
  const typeParam = (searchParams.get('type') || '') as ContentType | '';

  const [activeType,  setActiveType]  = useState<ContentType | ''>(typeParam);
  const [results,     setResults]     = useState<SearchResults | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page,        setPage]        = useState(1);
  const [searched,    setSearched]    = useState(false);

  useEffect(() => {
    setActiveType(typeParam);
    setResults(null);
    setPage(1);
    setSearched(false);
  }, [query, typeParam]);

  const fetchPage = useCallback(async (
    q: string, type: ContentType | '', pageNum: number, append: boolean,
  ) => {
    if (!q || q.trim().length < 2) return;
    if (append) setLoadingMore(true);
    else { setLoading(true); setResults(null); }

    const params: Record<string, string | number> = { q, page: pageNum, limit: PAGE_SIZE };
    if (type) params.type = type;

    try {
      const r = await api.get('/search', { params });
      const data: SearchResults = r.data;
      if (append && results) {
        setResults({
          ...data,
          content: {
            ...data.content,
            items: [...results.content.items, ...data.content.items],
          },
        });
      } else {
        setResults(data);
      }
    } catch {}
    finally { setLoading(false); setLoadingMore(false); setSearched(true); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const hasMore = results ? results.content.items.length < results.content.total : false;
  const hasCreators = (results?.creators.length ?? 0) > 0;
  const hasAlbums   = (results?.albums.length ?? 0) > 0;
  const hasContent  = (results?.content.items.length ?? 0) > 0;
  const totalResults = (results?.content.total ?? 0)
    + (results?.creators.length ?? 0)
    + (results?.albums.length ?? 0);

  if (!query) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <p className="text-6xl mb-5">🔍</p>
        <h1 className="text-2xl font-bold text-white mb-2">Search Camp DaddyMan</h1>
        <p className="text-gray-400 mb-8">Find music, films, podcasts, creators, albums and more.</p>
        <InlineSearchBar />
        <div className="mt-12">
          <p className="text-xs uppercase tracking-widest text-gray-600 mb-4 font-semibold">Browse by type</p>
          <div className="flex flex-wrap justify-center gap-2">
            {TYPES.slice(1).map((t) => (
              <Link key={t.value} href={`/browse?type=${t.value}`}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm bg-surface-700 text-gray-300 hover:bg-surface-600 hover:text-white transition-colors">
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
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">
          Results for <span className="text-brand-400">&ldquo;{query}&rdquo;</span>
        </h1>
        {searched && !loading && (
          <p className="text-gray-500 text-sm">
            {totalResults.toLocaleString()} {totalResults === 1 ? 'result' : 'results'}
            {activeType ? ` in ${TYPES.find((t) => t.value === activeType)?.label}` : ''}
          </p>
        )}
      </div>

      {/* Type filter */}
      <div className="flex gap-2 flex-wrap mb-8">
        {TYPES.map((t) => (
          <button key={t.value} onClick={() => handleTypeChange(t.value)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeType === t.value
                ? 'bg-brand-500 text-black'
                : 'bg-surface-700 text-gray-300 hover:bg-surface-600 hover:text-white'
            }`}>
            <span>{t.emoji}</span>{t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-8">
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-36 h-48 bg-surface-700 rounded-xl animate-pulse flex-shrink-0" />
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-video bg-surface-700 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      ) : !hasCreators && !hasAlbums && !hasContent && searched ? (
        <div className="text-center py-24">
          <p className="text-5xl mb-4">🔍</p>
          <p className="text-white font-semibold text-lg mb-2">No results for &ldquo;{query}&rdquo;</p>
          <p className="text-gray-500 text-sm mb-8">
            {activeType ? 'Try removing the type filter or broaden your search.' : 'Check spelling or try a different term.'}
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            {activeType && (
              <button onClick={() => handleTypeChange('')}
                className="px-5 py-2.5 bg-surface-700 hover:bg-surface-600 text-gray-300 hover:text-white rounded-xl text-sm font-medium transition-colors">
                Search all types
              </button>
            )}
            <Link href="/browse"
              className="px-5 py-2.5 bg-brand-500 hover:bg-brand-400 text-black rounded-xl text-sm font-semibold transition-colors">
              Browse all content
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Creators */}
          {hasCreators && (
            <section>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Creators</h2>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {results!.creators.map((c) => <CreatorCard key={c.id} c={c} />)}
              </div>
            </section>
          )}

          {/* Albums */}
          {hasAlbums && (
            <section>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Albums</h2>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {results!.albums.map((a) => <AlbumCard key={a.id} a={a} />)}
              </div>
            </section>
          )}

          {/* Content */}
          {hasContent && (
            <section>
              {(hasCreators || hasAlbums) && (
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
                  Content
                  <span className="ml-2 text-gray-600 normal-case font-normal">
                    {results!.content.total.toLocaleString()} {results!.content.total === 1 ? 'result' : 'results'}
                  </span>
                </h2>
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {results!.content.items.map((item) => <ContentCard key={item.id} item={item} />)}
              </div>
              {hasMore && (
                <div className="text-center mt-10">
                  <button onClick={handleLoadMore} disabled={loadingMore}
                    className="bg-surface-700 hover:bg-surface-600 text-white px-8 py-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
                    {loadingMore ? 'Loading...' : `Load more (${results!.content.total - results!.content.items.length} remaining)`}
                  </button>
                </div>
              )}
            </section>
          )}
        </div>
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
      <input value={q} onChange={(e) => setQ(e.target.value)}
        placeholder="Search music, film, podcasts, creators..."
        autoFocus
        className="flex-1 bg-surface-700 border border-surface-600 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 transition-colors placeholder:text-gray-500"
      />
      <button type="submit" disabled={q.trim().length < 2}
        className="bg-brand-500 hover:bg-brand-400 disabled:opacity-40 text-black font-bold px-5 py-3 rounded-xl text-sm transition-colors">
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
