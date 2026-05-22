'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface TipSent {
  id: string;
  amountCents: number;
  message: string | null;
  createdAt: string;
  recipient: { username: string; displayName?: string; avatar?: string | null };
}

export default function TipsSentPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [tips, setTips] = useState<TipSent[]>([]);
  const [total, setTotal] = useState(0);
  const [totalCents, setTotalCents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api.get('/dashboard/tips-sent', { params: { page, limit } })
      .then(({ data }) => {
        setTips(data.tips);
        setTotal(data.total);
        setTotalCents(data.totalCents);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, page]);

  if (authLoading || !user) return null;

  const pages = Math.ceil(total / limit);

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <Link href="/dashboard" className="text-gray-500 hover:text-brand-400 text-sm transition-colors">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-white mt-3">Strengths Sent</h1>
        {total > 0 && (
          <p className="text-gray-400 text-sm mt-1">
            {total} strength{total !== 1 ? 's' : ''} sent · <span className="text-brand-400 font-semibold">${(totalCents / 100).toFixed(2)} total</span>
          </p>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-surface-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : tips.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-4">💸</p>
          <p className="text-white font-semibold text-lg mb-2">No strengths sent yet</p>
          <p className="text-gray-500 text-sm">Support a creator by sending them a strength.</p>
          <Link href="/browse" className="inline-block mt-6 bg-brand-500 hover:bg-brand-600 text-black font-bold px-6 py-3 rounded-xl text-sm transition-colors">
            Browse Creators →
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {tips.map((tip) => (
              <div key={tip.id} className="flex items-center gap-4 bg-surface-800 border border-surface-700 rounded-xl px-4 py-3.5">
                <div className="w-10 h-10 rounded-full bg-surface-600 flex-shrink-0 overflow-hidden">
                  {tip.recipient.avatar ? (
                    <Image src={tip.recipient.avatar} alt="" width={40} height={40} className="object-cover w-full h-full" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg">👤</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/creator/${tip.recipient.username}`}
                    className="text-white font-semibold text-sm hover:text-brand-400 transition-colors"
                  >
                    {tip.recipient.displayName || tip.recipient.username}
                  </Link>
                  {tip.message && (
                    <p className="text-gray-400 text-xs mt-0.5 truncate">"{tip.message}"</p>
                  )}
                  <p className="text-gray-600 text-xs mt-0.5">
                    {new Date(tip.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <span className="text-brand-400 font-black text-lg flex-shrink-0">
                  ${(tip.amountCents / 100).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg bg-surface-700 hover:bg-surface-600 text-white text-sm disabled:opacity-40 transition-colors"
              >
                ←
              </button>
              <span className="text-gray-400 text-sm">{page} / {pages}</span>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="px-4 py-2 rounded-lg bg-surface-700 hover:bg-surface-600 text-white text-sm disabled:opacity-40 transition-colors"
              >
                →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
