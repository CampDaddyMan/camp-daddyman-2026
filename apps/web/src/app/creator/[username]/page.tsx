'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { usePlayer } from '@/context/PlayerContext';
import { Content, ContentType } from '@/types';
import ContentCard from '@/components/content/ContentCard';

const TIP_PRESETS = [5, 10, 25, 50];

function TipModal({ username, creatorName, onClose }: { username: string; creatorName: string; onClose: () => void }) {
  const [amount, setAmount] = useState<number | ''>(10);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || Number(amount) < 1) { setError('Minimum tip is $1'); return; }
    if (Number(amount) > 500) { setError('Maximum tip is $500'); return; }
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post(`/subscriptions/tip/${username}`, { amount: Number(amount), message });
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong');
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div className="bg-surface-800 border border-surface-600 rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-bold text-lg">Send A Strength to {creatorName}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Presets */}
          <div className="grid grid-cols-4 gap-2">
            {TIP_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setAmount(p)}
                className={`py-2 rounded-xl text-sm font-semibold transition-colors ${
                  amount === p ? 'bg-brand-500 text-black' : 'bg-surface-700 text-gray-300 hover:bg-surface-600 hover:text-white'
                }`}
              >
                ${p}
              </button>
            ))}
          </div>

          {/* Custom amount */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            <input
              type="number"
              min={1}
              max={500}
              value={amount}
              onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="Custom amount"
              className="w-full bg-surface-700 border border-surface-600 text-white rounded-xl pl-7 pr-4 py-2.5 text-sm focus:outline-none focus:border-brand-400 transition-colors"
            />
          </div>

          {/* Message */}
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add a message (optional)"
            rows={2}
            maxLength={200}
            className="w-full bg-surface-700 border border-surface-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400 transition-colors resize-none placeholder:text-gray-500"
          />

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={loading || !amount}
            className="w-full bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-black font-bold py-3 rounded-xl text-sm transition-colors"
          >
            {loading ? 'Redirecting...' : `Send $${amount || '—'} Strength`}
          </button>
        </form>
      </div>
    </div>
  );
}

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

interface Album {
  id: string;
  title: string;
  coverUrl: string | null;
  releaseType: 'ALBUM' | 'EP' | 'SINGLE' | 'COMPILATION';
  releaseDate: string | null;
  _count: { tracks: number };
}

const TYPES: { value: ContentType | ''; label: string; emoji: string }[] = [
  { value: '',               label: 'All',          emoji: '✦'  },
  { value: 'MUSIC',         label: 'Music',         emoji: '🎵' },
  { value: 'FILM',          label: 'Film',          emoji: '🎬' },
  { value: 'PODCAST',       label: 'Podcasts',      emoji: '🎙️' },
  { value: 'SPOKEN_WORD',   label: 'Spoken Word',   emoji: '🎤' },
  { value: 'DADDYMAN_ISMS', label: 'DaddyMan-Isms', emoji: '💡' },
  { value: 'BOOK',          label: 'Books',         emoji: '📖' },
];

const AUDIO_TYPES = ['MUSIC', 'PODCAST', 'SPOKEN_WORD', 'DADDYMAN_ISMS'];

const RELEASE_COLORS: Record<string, string> = {
  SINGLE:      'bg-brand-500/20 text-brand-400',
  EP:          'bg-amber-500/20 text-amber-400',
  ALBUM:       'bg-surface-600 text-gray-300',
  COMPILATION: 'bg-purple-500/20 text-purple-400',
};

function fmt(s?: number | null) {
  if (!s) return null;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function joinYear(dateStr: string) {
  return new Date(dateStr).getFullYear();
}

const PAGE_SIZE = 12;

export default function CreatorPage() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const player = usePlayer();

  const [creator, setCreator]               = useState<Creator | null>(null);
  const [content, setContent]               = useState<Content[]>([]);
  const [topTracks, setTopTracks]           = useState<Content[]>([]);
  const [albums, setAlbums]                 = useState<Album[]>([]);
  const [total, setTotal]                   = useState(0);
  const [page, setPage]                     = useState(1);
  const [activeType, setActiveType]         = useState<ContentType | ''>('');
  const [sort, setSort]                     = useState<'latest' | 'popular'>('latest');
  const [notFound, setNotFound]             = useState(false);
  const [creatorLoading, setCreatorLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(true);
  const [loadingMore, setLoadingMore]       = useState(false);
  const [following, setFollowing]           = useState(false);
  const [followerCount, setFollowerCount]   = useState(0);
  const [followLoading, setFollowLoading]   = useState(false);
  const [tipOpen, setTipOpen]               = useState(false);
  const [tipped, setTipped]                 = useState(false);
  const [showCommunity, setShowCommunity]   = useState(false);
  const [posts, setPosts]                   = useState<{ id: string; text: string; imageUrl: string | null; createdAt: string; creator: { username: string; displayName?: string; avatar?: string } }[]>([]);
  const [postsLoading, setPostsLoading]     = useState(false);
  const [newPostText, setNewPostText]       = useState('');
  const [postSubmitting, setPostSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('tipped=true')) {
      setTipped(true);
    }
  }, []);

  useEffect(() => {
    if (!showCommunity) return;
    setPostsLoading(true);
    api.get(`/creators/${username}/posts`)
      .then((r) => setPosts(r.data.posts))
      .catch(() => {})
      .finally(() => setPostsLoading(false));
  }, [showCommunity, username]);

  async function handlePostSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newPostText.trim() || postSubmitting) return;
    setPostSubmitting(true);
    try {
      const { data } = await api.post(`/creators/${username}/posts`, { text: newPostText.trim() });
      setPosts((prev) => [data.post, ...prev]);
      setNewPostText('');
    } catch {}
    finally { setPostSubmitting(false); }
  }

  async function handleDeletePost(postId: string) {
    await api.delete(`/creators/${username}/posts/${postId}`);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }

  function postTimeAgo(iso: string) {
    const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (secs < 60) return 'just now';
    if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
    if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
    if (secs < 604800) return `${Math.floor(secs / 86400)}d ago`;
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

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

  // Fetch top tracks and albums once we know the creator
  useEffect(() => {
    if (!creator) return;
    api.get(`/creators/${username}/content`, {
      params: { type: AUDIO_TYPES.join(','), sort: 'popular', limit: '5' },
    }).then((r) => setTopTracks(r.data.items)).catch(() => {});

    api.get('/albums', { params: { creatorId: creator.id, limit: '8' } })
      .then((r) => setAlbums(r.data.albums ?? r.data.items ?? []))
      .catch(() => {});
  }, [creator?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchContent = useCallback(async (
    type: ContentType | '',
    sortOrder: 'latest' | 'popular',
    pageNum: number,
    append: boolean,
  ) => {
    if (append) setLoadingMore(true);
    else setContentLoading(true);

    const params: Record<string, string> = {
      page: String(pageNum),
      limit: String(PAGE_SIZE),
      sort: sortOrder,
    };
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
    fetchContent(activeType, sort, 1, false);
  }, [activeType, sort, fetchContent]);

  function handleLoadMore() {
    const next = page + 1;
    setPage(next);
    fetchContent(activeType, sort, next, true);
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
          <div className="w-24 h-24 rounded-full bg-surface-700 flex-shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-7 w-48 bg-surface-700 rounded" />
            <div className="h-4 w-64 bg-surface-700 rounded" />
            <div className="h-4 w-80 bg-surface-700 rounded" />
          </div>
        </div>
      ) : creator && (
        <div className="flex items-start gap-5 mb-10 pb-8 border-b border-surface-700">
          <div className="w-24 h-24 rounded-full bg-surface-700 flex items-center justify-center text-4xl overflow-hidden flex-shrink-0 ring-2 ring-surface-600">
            {creator.avatar ? (
              <img src={creator.avatar} alt={creator.username} className="w-full h-full object-cover" />
            ) : '👤'}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white">{creator.displayName || creator.username}</h1>
            <p className="text-gray-500 text-sm mt-0.5">@{creator.username}</p>
            <div className="flex items-center gap-4 mt-2 text-sm">
              <span className="text-gray-300 font-medium">{followerCount.toLocaleString()} <span className="text-gray-500 font-normal">{followerCount === 1 ? 'follower' : 'followers'}</span></span>
              <span className="text-gray-300 font-medium">{creator._count.content} <span className="text-gray-500 font-normal">{creator._count.content === 1 ? 'piece' : 'pieces'}</span></span>
              <span className="text-gray-600 text-xs">Since {joinYear(creator.createdAt)}</span>
            </div>
            {creator.bio && <p className="text-gray-300 text-sm mt-2.5 max-w-xl leading-relaxed">{creator.bio}</p>}
          </div>

          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {user && !isOwnProfile && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTipOpen(true)}
                  className="px-4 py-2 rounded-full text-sm font-semibold border border-surface-500 text-gray-300 hover:border-brand-400 hover:text-brand-400 transition-colors"
                >
                  💛 Send A Strength
                </button>
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
              </div>
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

      {/* ── Top Tracks ── */}
      {topTracks.length > 0 && (
        <div className="mb-10">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-4">Top Tracks</h2>
          <div className="space-y-1">
            {topTracks.map((track, i) => (
              <div
                key={track.id}
                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-surface-800 transition-colors group"
              >
                <span className="text-gray-600 text-xs w-4 text-right flex-shrink-0 group-hover:hidden">{i + 1}</span>
                <button
                  onClick={() => player.play({
                    id: track.id,
                    title: track.title,
                    creator: track.creator.displayName || track.creator.username,
                    mediaUrl: track.mediaUrl as string,
                    thumbnailUrl: track.thumbnailUrl ?? null,
                    type: track.type,
                  })}
                  className="hidden group-hover:flex w-4 h-4 items-center justify-center text-brand-400 flex-shrink-0 text-xs"
                  aria-label="Play"
                >
                  ▶
                </button>
                <div className="w-9 h-9 rounded-lg bg-surface-700 overflow-hidden flex-shrink-0">
                  {track.thumbnailUrl
                    ? <img src={track.thumbnailUrl} alt={track.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-sm">🎵</div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/watch/${track.id}`} className="text-white text-sm font-medium truncate block hover:text-brand-400 transition-colors">
                    {track.title}
                  </Link>
                </div>
                <span className="text-gray-600 text-xs flex-shrink-0">{track.views.toLocaleString()} plays</span>
                {track.duration && <span className="text-gray-600 text-xs flex-shrink-0 font-mono tabular-nums">{fmt(track.duration)}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Albums ── */}
      {albums.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500">Releases</h2>
            <Link href={`/albums?creator=${username}`} className="text-xs text-gray-500 hover:text-brand-400 transition-colors">
              View all →
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
            {albums.map((album) => (
              <Link
                key={album.id}
                href={`/albums/${album.id}`}
                className="flex-shrink-0 w-36 group"
              >
                <div className="w-36 h-36 rounded-xl bg-surface-700 overflow-hidden mb-2 group-hover:ring-1 group-hover:ring-brand-400/40 transition-all">
                  {album.coverUrl
                    ? <img src={album.coverUrl} alt={album.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-3xl">🎵</div>
                  }
                </div>
                <p className="text-white text-xs font-medium truncate group-hover:text-brand-400 transition-colors">{album.title}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${RELEASE_COLORS[album.releaseType] ?? RELEASE_COLORS.ALBUM}`}>
                    {album.releaseType === 'COMPILATION' ? 'Comp.' : album.releaseType.charAt(0) + album.releaseType.slice(1).toLowerCase()}
                  </span>
                  {album.releaseDate && (
                    <span className="text-gray-600 text-[10px]">{new Date(album.releaseDate).getFullYear()}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Tip success toast ── */}
      {tipped && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-surface-800 border border-brand-500/40 text-white px-6 py-3 rounded-2xl shadow-2xl z-50 flex items-center gap-3 text-sm">
          <span className="text-xl">💛</span>
          <span>Strength sent! Thank you for supporting {creator?.displayName || creator?.username}.</span>
          <button onClick={() => setTipped(false)} className="text-gray-400 hover:text-white ml-2">×</button>
        </div>
      )}

      {/* ── Tip modal ── */}
      {tipOpen && creator && (
        <TipModal
          username={creator.username}
          creatorName={creator.displayName || creator.username}
          onClose={() => setTipOpen(false)}
        />
      )}

      {/* ── Top-level tabs: Content / Community ── */}
      <div className="flex gap-1 mb-5 border-b border-surface-700">
        <button
          onClick={() => setShowCommunity(false)}
          className={`px-4 py-2 text-sm font-medium transition-colors rounded-t-lg ${!showCommunity ? 'text-white bg-surface-800 border border-surface-700 border-b-surface-800 -mb-px' : 'text-gray-500 hover:text-gray-300'}`}
        >
          Content
        </button>
        <button
          onClick={() => setShowCommunity(true)}
          className={`px-4 py-2 text-sm font-medium transition-colors rounded-t-lg ${showCommunity ? 'text-white bg-surface-800 border border-surface-700 border-b-surface-800 -mb-px' : 'text-gray-500 hover:text-gray-300'}`}
        >
          Community
        </button>
      </div>

      {/* ── Community tab ── */}
      {showCommunity && (
        <div className="space-y-4">
          {user?.username === username && (
            <form onSubmit={handlePostSubmit} className="bg-surface-800 border border-surface-700 rounded-xl p-4">
              <textarea
                value={newPostText}
                onChange={(e) => setNewPostText(e.target.value)}
                placeholder="Share an update with your followers…"
                rows={3}
                maxLength={2000}
                className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm placeholder-gray-600 focus:outline-none focus:border-brand-500 resize-none"
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-gray-600 text-xs">{newPostText.length}/2000</span>
                <button
                  type="submit"
                  disabled={!newPostText.trim() || postSubmitting}
                  className="px-4 py-1.5 bg-brand-500 hover:bg-brand-400 disabled:opacity-40 text-black text-sm font-semibold rounded-lg transition-colors"
                >
                  {postSubmitting ? 'Posting…' : 'Post'}
                </button>
              </div>
            </form>
          )}

          {postsLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => <div key={i} className="h-24 bg-surface-700 rounded-xl animate-pulse" />)}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16 text-gray-600">
              <p className="text-3xl mb-3">📝</p>
              <p className="text-sm">No community posts yet.</p>
            </div>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="bg-surface-800 border border-surface-700 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-surface-600 overflow-hidden flex-shrink-0">
                      {post.creator.avatar
                        ? <img src={post.creator.avatar} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">{(post.creator.displayName || post.creator.username)[0].toUpperCase()}</div>
                      }
                    </div>
                    <div>
                      <p className="text-white text-sm font-semibold">{post.creator.displayName || post.creator.username}</p>
                      <p className="text-gray-500 text-xs">{postTimeAgo(post.createdAt)}</p>
                    </div>
                  </div>
                  {(user?.username === username || (user as any)?.isAdmin) && (
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="text-gray-600 hover:text-red-400 transition-colors text-sm flex-shrink-0"
                      title="Delete post"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{post.text}</p>
                {post.imageUrl && (
                  <img src={post.imageUrl} alt="" className="mt-3 w-full rounded-lg object-cover max-h-80" />
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Type filter + sort + content grid (content tab only) ── */}
      {!showCommunity && (
        <>
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <div className="flex gap-2 flex-wrap">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setActiveType(t.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    activeType === t.value
                      ? 'bg-brand-500 text-black'
                      : 'bg-surface-700 text-gray-300 hover:bg-surface-600 hover:text-white'
                  }`}
                >
                  <span>{t.emoji}</span>{t.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 bg-surface-800 rounded-lg p-1 flex-shrink-0">
              <button
                onClick={() => setSort('latest')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${sort === 'latest' ? 'bg-surface-600 text-white' : 'text-gray-500 hover:text-white'}`}
              >
                Latest
              </button>
              <button
                onClick={() => setSort('popular')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${sort === 'popular' ? 'bg-surface-600 text-white' : 'text-gray-500 hover:text-white'}`}
              >
                Popular
              </button>
            </div>
          </div>

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
        </>
      )}
    </div>
  );
}
