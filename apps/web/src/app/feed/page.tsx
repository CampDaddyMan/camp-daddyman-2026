'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Content } from '@/types';
import ContentCard from '@/components/content/ContentCard';

export default function FeedPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Content[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    api.get('/creators/feed')
      .then((r) => { setItems(r.data.items); setTotal(r.data.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <p className="text-5xl mb-4">🎵</p>
      <h2 className="text-xl font-bold text-white mb-2">Your Following Feed</h2>
      <p className="text-gray-400 mb-6">Sign in to see new content from the creators you follow.</p>
      <Link href="/login" className="bg-brand-500 hover:bg-brand-600 text-black font-semibold px-6 py-3 rounded-xl text-sm transition-colors">
        Sign in
      </Link>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Following</h1>
          {total > 0 && <p className="text-gray-400 text-sm mt-1">{total} piece{total !== 1 ? 's' : ''} from creators you follow</p>}
        </div>
        <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">Browse all →</Link>
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
          <p className="text-gray-400 text-sm mb-6">Follow some creators and their new content will show up here.</p>
          <Link href="/" className="bg-brand-500 hover:bg-brand-600 text-black font-semibold px-6 py-3 rounded-xl text-sm transition-colors">
            Discover creators
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => <ContentCard key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
}
