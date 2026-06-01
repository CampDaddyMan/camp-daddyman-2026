'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

interface EmbedContent {
  id: string;
  title: string;
  type: string;
  thumbnailUrl: string | null;
  duration: number | null;
  creator: { username: string; displayName: string | null };
}

export default function EmbedPage() {
  const { id } = useParams<{ id: string }>();
  const [content, setContent] = useState<EmbedContent | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.get(`/content/${id}/embed-meta`)
      .then((r) => setContent(r.data.content))
      .catch(() => setError(true));
  }, [id]);

  if (error) return (
    <div className="flex h-full min-h-[200px] items-center justify-center bg-black text-gray-400 text-sm">
      Content unavailable
    </div>
  );

  if (!content) return (
    <div className="flex h-full min-h-[200px] items-center justify-center bg-black">
      <div className="w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const creatorName = content.creator.displayName || content.creator.username;

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden" style={{ minHeight: 0 }}>

      {/* Thumbnail area */}
      <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
        {content.thumbnailUrl ? (
          <img
            src={content.thumbnailUrl}
            alt={content.title}
            className="absolute inset-0 w-full h-full object-cover opacity-40"
          />
        ) : (
          <div className="absolute inset-0 bg-surface-900" />
        )}

        {/* Overlay CTA */}
        <div className="relative z-10 flex flex-col items-center gap-4 px-6 text-center">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-surface-800 flex-shrink-0 border-2 border-brand-500/40">
            {content.thumbnailUrl ? (
              <img src={content.thumbnailUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">🎬</div>
            )}
          </div>

          <div>
            <p className="text-white font-bold text-base line-clamp-2 leading-tight">{content.title}</p>
            <p className="text-gray-400 text-xs mt-1">{creatorName} · Camp DaddyMan</p>
          </div>

          <Link
            href={`https://campdaddyman.com/watch/${content.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-black font-bold text-sm px-5 py-2.5 rounded-full transition-colors shadow-lg"
          >
            ▶ Watch on Camp DaddyMan
          </Link>

          <p className="text-gray-600 text-[10px]">Members-only content. Free to join.</p>
        </div>
      </div>

      {/* Footer bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-surface-900 border-t border-surface-700 flex-shrink-0">
        <div className="min-w-0 flex-1">
          <p className="text-white text-xs font-semibold truncate">{content.title}</p>
          <p className="text-gray-500 text-[10px] truncate">{creatorName}</p>
        </div>
        <Link
          href={`https://campdaddyman.com/watch/${content.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 ml-3 flex items-center gap-1 text-[10px] text-brand-400 hover:text-brand-300 font-semibold transition-colors"
        >
          <span className="w-4 h-4 rounded overflow-hidden inline-block">
            <img src="/CAMPDADDYMAN_GOLD_MEMBERSHIP_LOGO-V4.png" alt="" className="w-full h-full object-cover" />
          </span>
          Camp DaddyMan ↗
        </Link>
      </div>
    </div>
  );
}
