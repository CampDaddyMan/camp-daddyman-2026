'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

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
  wrapperClassName?: string;
}

export default function AdSlot({ location, className = '', wrapperClassName }: AdSlotProps) {
  const [ad, setAd] = useState<Ad | null>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    api.get(`/partners/serve/${encodeURIComponent(location)}`)
      .then(({ data }) => setAd(data.ad ?? null))
      .catch(() => {});
  }, [location]);

  if (!ad) return null;

  const showImage = !!ad.imageUrl && !imgError;

  async function handleClick() {
    if (!ad) return;
    try {
      await api.post(`/partners/ads/${ad.id}/click`);
    } catch {}
    window.open(ad.linkUrl, '_blank', 'noopener,noreferrer');
  }

  const inner = (
    <div className={`relative rounded-xl overflow-hidden border border-surface-700 bg-surface-800 ${className}`}>
      <span className="absolute top-1.5 left-1.5 z-10 text-[9px] font-bold uppercase tracking-widest text-gray-500 bg-surface-900/80 px-1.5 py-0.5 rounded">
        Ad
      </span>

      <button
        onClick={handleClick}
        className="w-full text-left focus:outline-none group"
        aria-label={`Advertisement: ${ad.title}`}
      >
        {showImage ? (
          <div className="relative">
            <img
              src={ad.imageUrl!}
              alt={ad.title}
              onError={() => setImgError(true)}
              className="w-full group-hover:opacity-90 transition-opacity"
            />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-3">
              <p className="font-semibold text-white text-xs group-hover:text-brand-400 transition-colors leading-snug">{ad.title}</p>
              <p className="text-[10px] text-gray-300 mt-0.5">Sponsored by {ad.partner.name}</p>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <p className="font-semibold text-white text-sm group-hover:text-brand-400 transition-colors">{ad.title}</p>
            {ad.body && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{ad.body}</p>}
            <p className="text-[10px] text-gray-500 mt-1">Sponsored by {ad.partner.name}</p>
          </div>
        )}
      </button>
    </div>
  );

  return wrapperClassName ? <div className={wrapperClassName}>{inner}</div> : inner;
}
