'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import api from '@/lib/api';
import { Content } from '@/types';
import ContentCard from '@/components/content/ContentCard';

interface Creator {
  username: string;
  displayName?: string;
  avatar?: string;
  bio?: string;
  createdAt: string;
  _count: { content: number };
}

export default function CreatorPage() {
  const { username } = useParams<{ username: string }>();
  const [creator, setCreator] = useState<Creator | null>(null);
  const [content, setContent] = useState<Content[]>([]);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.get(`/creators/${username}`)
      .then((r) => setCreator(r.data.creator))
      .catch(() => setNotFound(true));

    api.get(`/creators/${username}/content`)
      .then((r) => setContent(r.data.items))
      .catch(() => {});
  }, [username]);

  if (notFound) return <div className="text-center py-20 text-gray-400">Creator not found.</div>;
  if (!creator) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Profile header */}
      <div className="flex items-center gap-5 mb-10 pb-8 border-b border-surface-700">
        <div className="w-20 h-20 rounded-full bg-surface-700 flex items-center justify-center text-3xl overflow-hidden flex-shrink-0">
          {creator.avatar ? (
            <Image src={creator.avatar} alt={creator.username} width={80} height={80} className="object-cover rounded-full" />
          ) : '👤'}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{creator.displayName || creator.username}</h1>
          <p className="text-gray-400 text-sm mt-0.5">@{creator.username} · {creator._count.content} pieces</p>
          {creator.bio && <p className="text-gray-300 text-sm mt-2 max-w-lg">{creator.bio}</p>}
        </div>
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
