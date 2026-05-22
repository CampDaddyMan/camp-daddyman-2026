'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Content } from '@/types';
import ContentCard from '@/components/content/ContentCard';

const PAGE_SIZE = 12;

export default function FeedPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [items, setItems]             = useState<Content[]>([]);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPage = useCallback(async (pageNum: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const r = await api.get('/creators/feed', { params: { page: pageNum, limit: PAGE_SIZE } });
      setTotal(r.data.total);
      setItems((prev) => append ? [...prev, ...r.data.items] : r.data.items);
    } catch {}
    finally { setLoading(false); setLoadingMore(false); }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/login'); return; }
    fetchPage(1, false);
  }, [user, authLoading, fetchPage, router]);

  function handleLoadMore() {
    const next = page + 1;
    setPage(next);
    fetchPage(next, true);
  }

  const hasMore = items.length < total;

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Following</h1>
          {total > 0 && <p className="text-gray-400 text-sm mt-1">{total} piece{total !== 1 ? 's' : ''} from creators you follow</p>}
        </div>
        <Link href="/browse" className="text-sm text-gray-400 hover:text-white transition-colors">Browse all →</Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-video bg-surface-700 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">🎶</p>
          <h2 className="text-lg font-semibold text-white mb-2">Nothing here yet</h2>
          <p className="text-gray-400 text-sm mb-8">Follow some creators and their new content will show up here.</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link href="/search" className="bg-brand-500 hover:bg-brand-400 text-black font-semibold px-6 py-3 rounded-xl text-sm transition-colors">
              Find creators
            </Link>
            <Link href="/browse" className="bg-surface-700 hover:bg-surface-600 text-white px-6 py-3 rounded-xl text-sm font-medium transition-colors">
              Browse content
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
