'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Content } from '@/types';
import ContentCard from '@/components/content/ContentCard';

const PAGE_SIZE = 12;

export default function SavedPage() {
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
      const r = await api.get('/content/saved', { params: { page: pageNum, limit: PAGE_SIZE } });
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">🔖 Watch Later</h1>
        {!loading && (
          <p className="text-gray-500 text-sm mt-1">{total.toLocaleString()} {total === 1 ? 'piece' : 'pieces'} saved</p>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div key={i} className="aspect-video bg-surface-700 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-5xl mb-4">🔖</p>
          <p className="text-white font-semibold text-lg mb-2">Nothing saved yet</p>
          <p className="text-gray-500 text-sm mb-8">Hit the bookmark icon on any content to save it for later.</p>
          <Link
            href="/browse"
            className="px-6 py-3 bg-brand-500 hover:bg-brand-400 text-black font-semibold rounded-xl text-sm transition-colors"
          >
            Browse content
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
