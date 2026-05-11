'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Content, ContentType } from '@/types';
import ContentCard from '@/components/content/ContentCard';

interface Creator {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
  bio?: string;
  createdAt: string;
  isFollowing: boolean;
  _count: { content: number; followers: number };
}

const TYPES: { value: ContentType | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'MUSIC', label: 'Music' },
  { value: 'FILM', label: 'Film' },
  { value: 'PODCAST', label: 'Podcasts' },
  { value: 'SPOKEN_WORD', label: 'Spoken Word' },
];

const PAGE_SIZE = 12;

export default function CreatorPage() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();

  const [creator, setCreator]               = useState<Creator | null>(null);
  const [content, setContent]               = useState<Content[]>([]);
  const [total, setTotal]                   = useState(0);
  const [page, setPage]                     = useState(1);
  const [activeType, setActiveType]         = useState<ContentType | ''>('');
  const [notFound, setNotFound]             = useState(false);
  const [creatorLoading, setCreatorLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(true);
  const [loadingMore, setLoadingMore]       = useState(false);
  const [following, setFollowing]           = useState(false);
  const [followerCount, setFollowerCount]   = useState(0);
  const [followLoading, setFollowLoading]   = useState(false);

  useEffect(() => {
    setCreatorLoading(true);
    api.get(`/creators/${username}`)
      .then((r) => {
        setCreator(r.data.creator);
        setFollowing(r.data.creator.isFollowing);
        setFollowerCount(r.data.creator._count.followers);
      })
      .catch(() => setNotFound(true))
      .finally(() => setCreatorLoading(false));
  }, [username]);

  const fetchContent = useCallback(async (
    type: ContentType | '',
    pageNum: number,
    append: boolean,
  ) => {
    if (append) setLoadingMore(true);
    else setContentLoading(true);

    const params: Record<string, string> = { page: String(pageNum), limit: String(PAGE_SIZE) };
    if (type) params.type = type;

    try {
      const r = await api.get(`/creators/${username}/content`, { params });
      setTotal(r.data.total);
      setContent((prev) => append ? [...prev, ...r.data.items] : r.data.items);
    } catch {}
    finally {
      setContentLoading(false);
      setLoadingMore(false);
    }
  }, [username]);

  useEffect(() => {
    setPage(1);
    setContent([]);
    fetchContent(activeType, 1, false);
  }, [activeType, fetchContent]);

  function handleTypeChange(type: ContentType | '') {
    setActiveType(type);
  }

  function handleLoadMore() {
    const next = page + 1;
    setPage(next);
    fetchContent(activeType, next, true);
  }

  async function handleFollow() {
    if (!user || followLoading) return;
    setFollowLoading(true);
    try {
      const { data } = await api.post(`/creators/${username}/follow`);
      setFollowing(data.following);
      setFollowerCount(data.followerCount);
    } finally {
      setFollowLoading(false);
    }
  }

  if (notFound) return (
    <div className="text-center py-20 text-gray-400">
      <p className="text-4xl mb-4">👤</p>
      <p>Creator not found.</p>
      <Link href="/browse" className="text-brand-400 hover:underline text-sm mt-4 inline-block">← Back to browse</Link>
    </div>
  );

  const isOwnProfile = user?.username === creator?.username;
  const hasMore = content.length < total;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">

      {/* ── Profile header ── */}
      {creatorLoading ? (
        <div className="flex items-start gap-5 mb-10 pb-8 border-b border-surface-700 animate-pulse">
          <div className="w-20 h-20 rounded-full bg-surface-700 flex-shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-6 w-48 bg-surface-700 rounded" />
            <div className="h-4 w-64 bg-surface-700 rounded" />
            <div className="h-4 w-80 bg-surface-700 rounded" />
          </div>
        </div>
      ) : creator && (
        <div className="flex items-start gap-5 mb-10 pb-8 border-b border-surface-700">
          <div className="w-20 h-20 rounded-full bg-surface-700 flex items-center justify-center text-3xl overflow-hidden flex-shrink-0">
            {creator.avatar ? (
              <Image src={creator.avatar} alt={creator.username} width={80} height={80} className="object-cover rounded-full" />
            ) : '👤'}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white">{creator.displayName || creator.username}</h1>
            <p className="text-gray-400 text-sm mt-0.5">
              @{creator.username}
              <span className="mx-2 text-surface-500">·</span>
              <span>{creator._count.content} {creator._count.content === 1 ? 'piece' : 'pieces'}</span>
              <span className="mx-2 text-surface-500">·</span>
              <span className="text-gray-300">{followerCount.toLocaleString()} {followerCount === 1 ? 'follower' : 'followers'}</span>
            </p>
            {creator.bio && <p className="text-gray-300 text-sm mt-2 max-w-xl">{creator.bio}</p>}
          </div>

          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {user && !isOwnProfile && (
              <button
                onClick={handleFollow}
                disabled={followLoading}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
                  following
                    ? 'bg-surface-600 hover:bg-surface-500 text-white border border-surface-500'
                    : 'bg-brand-500 hover:bg-brand-600 text-black'
                } disabled:opacity-50`}
              >
                {followLoading ? '...' : following ? 'Following' : 'Follow'}
              </button>
            )}
            {isOwnProfile && (
              <Link
                href="/dashboard"
                className="text-xs text-gray-400 hover:text-white border border-surface-600 px-4 py-1.5 rounded-full transition-colors"
              >
                Edit profile
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ── Type filter tabs ── */}
      <div className="flex gap-2 flex-wrap mb-6">
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

      {/* ── Content grid ── */}
      {contentLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-video bg-surface-700 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : content.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-3">🎵</p>
          <p>No {activeType ? activeType.toLowerCase().replace('_', ' ') : 'public'} content yet.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {content.map((item) => <ContentCard key={item.id} item={item} />)}
          </div>

          {hasMore && (
            <div className="text-center mt-8">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="bg-surface-700 hover:bg-surface-600 text-white px-8 py-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              >
                {loadingMore ? 'Loading...' : `Load more (${total - content.length} remaining)`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
