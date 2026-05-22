'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

export interface BannerSlide {
  id: string;
  imageUrl: string;
  linkUrl?: string | null;
  caption?: string | null;
  objectPosition?: string | null; // CSS object-position e.g. "top", "center", "bottom"
  objectFit?: string | null;      // CSS object-fit: "cover" | "contain"
}

interface Props {
  slides: BannerSlide[];
  intervalMs?: number;
  overlay?: number;   // 0–1 black overlay opacity
  gradient?: number;  // px bottom-to-top gradient
  aspectPct?: number; // height as % of width (42.85 = 21:9, 56.25 = 16:9)
}

export default function RotatingBanner({
  slides,
  intervalMs = 15000,
  overlay = 0,
  gradient = 0,
  aspectPct = 42.85,
}: Props) {
  const [idx, setIdx] = useState(0);
  const paused = useRef(false);
  const n = slides.length;

  const advance = useCallback(() => {
    setIdx((i) => (i + 1) % n);
  }, [n]);

  useEffect(() => {
    if (n <= 1) return;
    const t = setInterval(() => {
      if (!paused.current) advance();
    }, intervalMs);
    return () => clearInterval(t);
  }, [advance, n, intervalMs]);

  if (n === 0) return null;

  // aspectPct → CSS aspect-ratio (width/height)
  const cssAspect = `${(100 / aspectPct).toFixed(4)} / 1`;

  return (
    <section
      className="w-full bg-black relative overflow-hidden select-none"
      style={{ aspectRatio: cssAspect }}
      onMouseEnter={() => { paused.current = true; }}
      onMouseLeave={() => { paused.current = false; }}
    >
      {slides.map((slide, i) => {
        const fit      = slide.objectFit      || 'cover';
        const position = slide.objectPosition || 'center';
        const img = (
          <img
            src={slide.imageUrl}
            alt={slide.caption || ''}
            className="absolute inset-0 w-full h-full"
            style={{ objectFit: fit as any, objectPosition: position }}
            draggable={false}
          />
        );
        return (
          <div
            key={slide.id}
            className="absolute inset-0 transition-opacity duration-700 ease-in-out"
            style={{ opacity: i === idx ? 1 : 0, zIndex: i === idx ? 1 : 0 }}
          >
            {slide.linkUrl ? (
              <Link href={slide.linkUrl} className="absolute inset-0 block">
                {img}
              </Link>
            ) : img}
          </div>
        );
      })}

      {overlay > 0 && (
        <div
          className="absolute inset-0 bg-black pointer-events-none"
          style={{ opacity: overlay, zIndex: 2 }}
        />
      )}
      {gradient > 0 && (
        <div
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-surface-900 to-transparent pointer-events-none"
          style={{ height: `${gradient}px`, zIndex: 2 }}
        />
      )}

      {n > 1 && (
        <>
          <button
            onClick={() => setIdx((i) => (i - 1 + n) % n)}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 text-white text-xl leading-none flex items-center justify-center transition-colors"
            aria-label="Previous slide"
          >‹</button>
          <button
            onClick={() => setIdx((i) => (i + 1) % n)}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 text-white text-xl leading-none flex items-center justify-center transition-colors"
            aria-label="Next slide"
          >›</button>

          {slides[idx]?.caption && (
            <div className="absolute bottom-9 left-1/2 -translate-x-1/2 z-10 bg-black/65 text-white text-xs px-4 py-1.5 rounded-full whitespace-nowrap max-w-xs text-center pointer-events-none">
              {slides[idx].caption}
            </div>
          )}

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === idx ? 'w-5 bg-brand-500' : 'w-1.5 bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10 z-10 pointer-events-none">
            <div
              key={idx}
              className="h-full bg-brand-500/70 origin-left"
              style={{ animation: `bannerProgress ${intervalMs}ms linear forwards` }}
            />
          </div>
        </>
      )}

      <style>{`
        @keyframes bannerProgress {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
      `}</style>
    </section>
  );
}
