'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Content } from '@/types';
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

export default function CreatorPage() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const [creator, setCreator] = useState<Creator | null>(null);
  const [content, setContent] = useState<Content[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    api.get(`/creators/${username}`)
      .then((r) => {
        setCreator(r.data.creator);
        setFollowing(r.data.creator.isFollowing);
        setFollowerCount(r.data.creator._count.followers);
      })
      .catch(() => setNotFound(true));

    api.get(`/creators/${username}/content`)
      .then((r) => setContent(r.data.items))
      .catch(() => {});
  }, [username]);

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

  if (notFound) return <div className="text-center py-20 text-gray-400">Creator not found.</div>;
  if (!creator) return null;

  const isOwnProfile = user?.username === creator.username;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Profile header */}
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
            <span className="mx-2">·</span>
            {creator._count.content} {creator._count.content === 1 ? 'piece' : 'pieces'}
            <span className="mx-2">·</span>
            <span className="text-gray-300">{followerCount.toLocaleString()} {followerCount === 1 ? 'follower' : 'followers'}</span>
          </p>
          {creator.bio && <p className="text-gray-300 text-sm mt-2 max-w-lg">{creator.bio}</p>}
        </div>

        {/* Follow button */}
        {user && !isOwnProfile && (
          <button
            onClick={handleFollow}
            disabled={followLoading}
            className={`flex-shrink-0 px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
              following
                ? 'bg-surface-600 hover:bg-surface-500 text-white border border-surface-500'
                : 'bg-brand-500 hover:bg-brand-600 text-black'
            } disabled:opacity-50`}
          >
            {followLoading ? '...' : following ? 'Following' : 'Follow'}
          </button>
        )}
      </div>

      {/* Content grid */}
      {content.length === 0 ? (
        <div className="text-center py-16 text-gray-500">No public content yet.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {content.map((item) => <ContentCard key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
}
