'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────────

interface TopItem {
  id: string; title: string; type: string;
  thumbnailUrl?: string; progress: number;
  creator: { username: string; displayName: string };
}

interface WrappedData {
  year: number;
  empty: boolean;
  totalItems: number;
  totalSeconds: number;
  topContent: TopItem[];
  topCreator: { username: string; displayName: string; seconds: number; count: number } | null;
  topType: string | null;
  typeStats: Record<string, { count: number; seconds: number }>;
  firstContent: TopItem & { watchedAt: string } | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const TYPE_EMOJI: Record<string, string> = {
  MUSIC: '🎵', FILM: '🎬', PODCAST: '🎙️', SPOKEN_WORD: '📖',
  DADDYMAN_ISMS: '✊', BOOK: '📚',
};

const TYPE_LABEL: Record<string, string> = {
  MUSIC: 'Music', FILM: 'Film', PODCAST: 'Podcast',
  SPOKEN_WORD: 'Spoken Word', DADDYMAN_ISMS: 'DaddyMan-Isms', BOOK: 'Books',
};

// ── Stat card ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className={`rounded-2xl p-6 flex flex-col gap-1 ${accent || 'bg-white/5 border border-white/10'}`}>
      <p className="text-xs uppercase tracking-widest text-white/50">{label}</p>
      <p className="text-4xl font-black text-white leading-tight">{value}</p>
      {sub && <p className="text-sm text-white/60">{sub}</p>}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function WrappedPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<WrappedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api.get(`/content/wrapped?year=${year}`)
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [user, year]);

  function handleShare() {
    if (!data || data.empty) return;
    const h = Math.floor(data.totalSeconds / 3600);
    const m = Math.floor((data.totalSeconds % 3600) / 60);
    const timeStr = h > 0 ? `${h} hours and ${m} minutes` : `${m} minutes`;
    const text =
      `My ${data.year} Camp DaddyMan Wrapped:\n` +
      `🎧 ${data.totalItems} titles across ${timeStr}\n` +
      (data.topType ? `${TYPE_EMOJI[data.topType] || '🎵'} Mostly ${TYPE_LABEL[data.topType] || data.topType}\n` : '') +
      (data.topContent[0] ? `🏆 Top pick: "${data.topContent[0].title}"\n` : '') +
      `\ncampdaddyman.com`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  const availableYears = Array.from({ length: new Date().getFullYear() - 2024 + 1 }, (_, i) => 2025 + i);

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#0a0a0a]/90 backdrop-blur border-b border-white/5 flex items-center gap-4 px-4 h-14">
        <Link href="/" className="text-white/50 hover:text-white text-sm">← Back</Link>
        <h1 className="text-sm font-bold tracking-widest uppercase text-white/80 flex-1 text-center">
          Wrapped
        </h1>
        <div className="flex items-center gap-2">
          {availableYears.map((y) => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${
                year === y ? 'bg-[#f8c202] text-black font-bold' : 'text-white/50 hover:text-white'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-20 pt-8">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-8 h-8 border-2 border-[#f8c202] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !data || data.empty ? (
          <div className="text-center py-32">
            <p className="text-5xl mb-4">🎵</p>
            <p className="text-xl font-bold mb-2">Nothing to show yet</p>
            <p className="text-white/50 text-sm mb-6">Start watching & listening to build your {year} Wrapped.</p>
            <Link href="/" className="inline-block bg-[#f8c202] text-black font-bold px-6 py-3 rounded-full hover:bg-yellow-300 transition-colors">
              Explore content
            </Link>
          </div>
        ) : (
          <>
            {/* Hero */}
            <div ref={cardRef} className="rounded-3xl overflow-hidden mb-8 bg-gradient-to-br from-[#f8c202] via-[#c0392b] to-[#1a1a2e] p-8">
              <p className="text-xs uppercase tracking-widest text-white/70 mb-1">Your {data.year}</p>
              <h2 className="text-4xl font-black mb-6">Wrapped.</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-5xl font-black leading-none">{fmtTime(data.totalSeconds)}</p>
                  <p className="text-sm text-white/70 mt-1">of Camp DaddyMan</p>
                </div>
                <div>
                  <p className="text-5xl font-black leading-none">{data.totalItems}</p>
                  <p className="text-sm text-white/70 mt-1">{data.totalItems === 1 ? 'title' : 'titles'} explored</p>
                </div>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              {data.topType && (
                <StatCard
                  label="Top format"
                  value={`${TYPE_EMOJI[data.topType] || '🎵'} ${TYPE_LABEL[data.topType] || data.topType}`}
                  sub={`${data.typeStats[data.topType]?.count} titles · ${fmtTime(data.typeStats[data.topType]?.seconds)}`}
                  accent="bg-white/5 border border-white/10"
                />
              )}
              {data.topCreator && (
                <StatCard
                  label="Top creator"
                  value={data.topCreator.displayName}
                  sub={`${data.topCreator.count} titles · ${fmtTime(data.topCreator.seconds)}`}
                />
              )}
              {data.firstContent && (
                <div className="col-span-2 rounded-2xl p-4 bg-white/5 border border-white/10 flex items-center gap-4">
                  {data.firstContent.thumbnailUrl ? (
                    <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 relative">
                      <Image src={data.firstContent.thumbnailUrl} alt={data.firstContent.title} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center text-2xl flex-shrink-0">
                      {TYPE_EMOJI[data.firstContent.type] || '🎵'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-widest text-white/40 mb-0.5">First played in {data.year}</p>
                    <p className="font-bold truncate">{data.firstContent.title}</p>
                    <p className="text-sm text-white/50">{data.firstContent.creator.displayName}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Type breakdown */}
            {Object.keys(data.typeStats).length > 1 && (
              <div className="mb-8">
                <p className="text-xs uppercase tracking-widest text-white/40 mb-3">Your mix</p>
                <div className="space-y-2">
                  {Object.entries(data.typeStats)
                    .sort((a, b) => b[1].seconds - a[1].seconds)
                    .map(([type, stats]) => {
                      const pct = Math.round((stats.seconds / data.totalSeconds) * 100);
                      return (
                        <div key={type} className="flex items-center gap-3">
                          <span className="text-lg w-7">{TYPE_EMOJI[type] || '🎵'}</span>
                          <div className="flex-1">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-white/70">{TYPE_LABEL[type] || type}</span>
                              <span className="text-white/40">{fmtTime(stats.seconds)}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-[#f8c202]"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Top 5 */}
            {data.topContent.length > 0 && (
              <div className="mb-8">
                <p className="text-xs uppercase tracking-widest text-white/40 mb-3">Your top {data.topContent.length}</p>
                <div className="space-y-2">
                  {data.topContent.map((item, i) => (
                    <Link
                      key={item.id}
                      href={`/watch/${item.id}`}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/8 hover:bg-white/10 transition-colors"
                    >
                      <span className="text-2xl font-black text-[#f8c202] w-8 text-center">{i + 1}</span>
                      {item.thumbnailUrl ? (
                        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 relative">
                          <Image src={item.thumbnailUrl} alt={item.title} fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center text-xl flex-shrink-0">
                          {TYPE_EMOJI[item.type] || '🎵'}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate text-sm">{item.title}</p>
                        <p className="text-xs text-white/50">{item.creator.displayName}</p>
                      </div>
                      <span className="text-xs text-white/40 flex-shrink-0">{fmtTime(item.progress)}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Share */}
            <button
              onClick={handleShare}
              className="w-full py-4 rounded-2xl bg-[#f8c202] text-black font-bold text-base hover:bg-yellow-300 transition-colors"
            >
              {copied ? '✓ Copied to clipboard' : `Share your ${data.year} Wrapped`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
