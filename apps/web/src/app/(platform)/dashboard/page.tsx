'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Content } from '@/types';
import ContentCard from '@/components/content/ContentCard';
import Button from '@/components/ui/Button';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [myContent, setMyContent] = useState<Content[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    api.get('/content', { params: { creator: user.username, limit: 12 } })
      .then((r) => setMyContent(r.data.items))
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [user]);

  if (loading || !user) return null;

  const plan = user.subscription?.plan || 'FREE';

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-10">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {user.displayName || user.username}
          </h1>
          <p className="text-gray-400 text-sm mt-1">@{user.username}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/upload">
            <Button size="md">+ Upload</Button>
          </Link>
          <Link href="/subscribe">
            <Button variant="secondary" size="md">
              {plan === 'FREE' ? 'Upgrade Plan' : `${plan} Member`}
            </Button>
          </Link>
        </div>
      </div>

      {/* Subscription banner for free users */}
      {plan === 'FREE' && (
        <div className="bg-brand-500/10 border border-brand-500/30 rounded-xl px-6 py-4 mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-brand-400 font-semibold">You're on the Free plan</p>
            <p className="text-gray-400 text-sm mt-0.5">Upgrade to access members-only content and more storage.</p>
          </div>
          <Link href="/subscribe">
            <Button size="sm">See plans</Button>
          </Link>
        </div>
      )}

      {/* My content */}
      <h2 className="text-lg font-semibold text-white mb-4">My Content</h2>
      {fetching ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-video bg-surface-700 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : myContent.length === 0 ? (
        <div className="text-center py-16 bg-surface-800 rounded-2xl">
          <p className="text-4xl mb-3">🎬</p>
          <p className="text-gray-400 mb-4">Nothing uploaded yet.</p>
          <Link href="/upload"><Button>Upload your first piece</Button></Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {myContent.map((item) => <ContentCard key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
}
