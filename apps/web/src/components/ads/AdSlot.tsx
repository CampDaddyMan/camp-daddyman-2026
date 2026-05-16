'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

const API = process.env.NEXT_PUBLIC_API_URL ?? '';

interface Ad {
  id: string;
  title: string;
  body: string | null;
  imageUrl: string | null;
  linkUrl: string;
  partner: { name: string; website: string | null };
}

interface AdSlotProps {
  location: string;
  className?: string;
}

export default function AdSlot({ location, className = '' }: AdSlotProps) {
  const [ad, setAd] = useState<Ad | null>(null);

  useEffect(() => {
    fetch(`${API}/api/partners/serve/${encodeURIComponent(location)}`)
      .then((r) => r.json())
      .then((d) => setAd(d.ad ?? null))
      .catch(() => {});
  }, [location]);

  if (!ad) return null;

  async function handleClick() {
    if (!ad) return;
    try {
      await fetch(`${API}/api/partners/ads/${ad.id}/click`, { method: 'POST' });
    } catch {}
    window.open(ad.linkUrl, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className={`relative rounded-xl overflow-hidden border border-surface-700 bg-surface-800 ${className}`}>
      <span className="absolute top-1.5 left-1.5 z-10 text-[9px] font-bold uppercase tracking-widest text-gray-500 bg-surface-900/80 px-1.5 py-0.5 rounded">
        Ad
      </span>

      <button
        onClick={handleClick}
        className="w-full text-left focus:outline-none group"
        aria-label={`Advertisement: ${ad.title}`}
      >
        {ad.imageUrl && (
          <div className="relative w-full aspect-[16/5] bg-surface-700">
            <Image src={ad.imageUrl} alt={ad.title} fill className="object-cover group-hover:opacity-90 transition-opacity" />
          </div>
        )}

        {!ad.imageUrl && (
          <div className="p-4">
            <p className="font-semibold text-white text-sm group-hover:text-brand-400 transition-colors">{ad.title}</p>
            {ad.body && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{ad.body}</p>}
            <p className="text-xs text-gray-600 mt-2">Sponsored by {ad.partner.name}</p>
          </div>
        )}

        {ad.imageUrl && (
          <div className="p-3">
            <p className="font-semibold text-white text-xs group-hover:text-brand-400 transition-colors">{ad.title}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Sponsored by {ad.partner.name}</p>
          </div>
        )}
      </button>
    </div>
  );
}
