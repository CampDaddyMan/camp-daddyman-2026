'use client';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Content } from '@/types';
import ContentRow from '@/components/content/ContentRow';
import { useAuth } from '@/context/AuthContext';

interface Creator {
  username: string;
  displayName?: string;
  avatar?: string;
  bio?: string;
  _count: { followers: number; content: number };
}

interface DiscoveryData {
  trending: Content[];
  newReleases: Content[];
  byType: {
    MUSIC: Content[];
    FILM: Content[];
    PODCAST: Content[];
    SPOKEN_WORD: Content[];
  };
  creators: Creator[];
}

function CreatorCard({ creator }: { creator: Creator }) {
  return (
    <Link
      href={`/creator/${creator.username}`}
      className="group flex-shrink-0 w-44 bg-surface-800 rounded-xl p-4 text-center hover:ring-1 hover:ring-brand-400/40 transition-all"
    >
      <div className="w-14 h-14 rounded-full bg-surface-600 mx-auto mb-3 overflow-hidden">
        {creator.avatar ? (
          <Image src={creator.avatar} alt={creator.displayName || creator.username} width={56} height={56} className="object-cover w-full h-full" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
        )}
      </div>
      <p className="text-white text-sm font-semibold truncate group-hover:text-brand-400 transition-colors">
        {creator.displayName || creator.username}
      </p>
      <p className="text-gray-500 text-xs mt-0.5">@{creator.username}</p>
      <p className="text-gray-400 text-xs mt-1">
        {creator._count.followers.toLocaleString()} followers
      </p>
    </Link>
  );
}

function SearchBar() {
  const router = useRouter();
  const [q, setQ] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim().length < 2) return;
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 max-w-lg mx-auto">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search music, films, podcasts, creators..."
        className="flex-1 bg-white/10 border border-white/20 text-white placeholder-white/50 rounded-xl px-5 py-3 text-sm focus:outline-none focus:border-brand-400 transition-colors"
      />
      <button
        type="submit"
        className="bg-brand-500 hover:bg-brand-600 text-black font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
      >
        Search
      </button>
    </form>
  );
}

interface HistoryItem extends Content {
  watchProgress: number;
  watchedAt: string;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function ContinueWatchingRow({ items }: { items: HistoryItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="mb-10">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-lg font-bold text-white">▶️ Continue Watching</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
        {items.map((item) => {
          const pct = item.duration ? Math.min(100, Math.round((item.watchProgress / item.duration) * 100)) : 0;
          return (
            <Link
              key={item.id}
              href={`/watch/${item.id}`}
              className="snap-start flex-shrink-0 w-56 group"
            >
              <div className="relative aspect-video bg-surface-700 rounded-xl overflow-hidden mb-2">
                {item.thumbnailUrl ? (
                  <Image src={item.thumbnailUrl} alt={item.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-3xl">🎬</div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                {/* Progress bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                  <div className="h-full bg-brand-500" style={{ width: `${pct}%` }} />
                </div>
                {/* Resume position label */}
                <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded">
                  {formatTime(item.watchProgress)}
                </div>
              </div>
              <p className="text-white text-xs font-medium truncate group-hover:text-brand-400 transition-colors">{item.title}</p>
              <p className="text-gray-500 text-[11px] mt-0.5">{item.creator.displayName || item.creator.username}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const [data, setData] = useState<DiscoveryData | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/content/discover')
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    api.get('/content/history')
      .then((r) => setHistory(r.data.items))
      .catch(() => {});
  }, [user]);

  const hasAnyContent = data && (
    data.trending.length > 0 ||
    data.newReleases.length > 0 ||
    Object.values(data.byType).some((arr) => arr.length > 0)
  );

  return (
    <div>
      {/* ── Hero ── */}
      <div className="relative flex flex-col items-center justify-center min-h-[88vh] overflow-hidden px-4 text-center">
        {/* Atmospheric background */}
        <div className="absolute inset-0 bg-surface-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_45%,rgba(232,184,0,0.07),transparent_70%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-surface-900 to-transparent" />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center gap-7">
          {/* Logo */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full blur-2xl bg-brand-500/20 scale-110" />
            <div className="relative w-52 h-52 md:w-64 md:h-64 rounded-full overflow-hidden ring-1 ring-brand-500/30 shadow-[0_0_100px_rgba(232,184,0,0.18)]">
              <Image
                src="/CAMPDADDYMAN_GOLD_MEMBERSHIP_LOGO-V4.png"
                alt="Camp DaddyMan"
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>

          {/* Tagline from the badge */}
          <p className="text-brand-400/80 text-[11px] md:text-xs font-semibold uppercase tracking-[0.35em]">
            Discipline &nbsp;·&nbsp; Identity &nbsp;·&nbsp; Legacy
          </p>

          {/* Headline */}
          <div>
            <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight tracking-tight">
              Music. Film. Teachings.
            </h1>
            <p className="text-gray-400 text-base md:text-lg mt-3 max-w-lg mx-auto leading-relaxed">
              Independent content rooted in the DaddyMan philosophy.<br className="hidden md:block" />
              Stream, follow creators, and join the community.
            </p>
          </div>

          {/* Search */}
          <div className="w-full max-w-md">
            <Suspense>
              <SearchBar />
            </Suspense>
          </div>

          {/* CTAs */}
          <div className="flex gap-3 flex-wrap justify-center">
            <Link
              href="/browse"
              className="bg-surface-700 hover:bg-surface-600 text-white px-7 py-3 rounded-xl text-sm font-medium transition-colors border border-surface-600"
            >
              Browse all
            </Link>
            <Link
              href="/register"
              className="bg-brand-500 hover:bg-brand-600 text-black px-7 py-3 rounded-xl text-sm font-bold transition-colors shadow-[0_0_24px_rgba(232,184,0,0.3)]"
            >
              Join for free →
            </Link>
          </div>

          {/* Est. badge */}
          <p className="text-gray-600 text-xs tracking-widest uppercase">Est. 2023</p>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-gray-600 animate-bounce text-lg">↓</div>
      </div>

      {/* Divider */}
      <div className="border-t border-surface-700/50" />

      {/* ── Browse by Category ── */ }
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <p className="text-brand-400/70 text-xs uppercase tracking-[0.3em] mb-2">Explore the Camp</p>
          <h2 className="text-2xl md:text-3xl font-bold text-white">1 What are you feeling?</h2>
        </div>
        
   
        

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
  {[
    {
      label: 'Music',
      href: '/browse?type=MUSIC',
      image: '/images/categories/CampDaddyman_Media_Categories_Music.jpg',
      desc: 'Original tracks & albums'
    },
    {
      label: 'Film',
      href: '/browse?type=FILM',
      image: '/images/categories/CampDaddyman_Media_Categories_Film.jpg',
      desc: 'Short films & features'
    },
    {
      label: 'Podcasts',
      href: '/browse?type=PODCAST',
      image: '/images/categories/CampDaddyman_Media_Categories_Podcasts.jpg',
      desc: 'Conversations & interviews'
    },
    {
      label: 'Spoken Word',
      href: '/browse?type=SPOKEN_WORD',
      image: '/images/categories/CampDaddyman_Media_Categories_Spoken_Word.jpg',
      desc: 'Poetry & spoken teachings'
    },
  ].map((cat) => (
    <Link
      key={cat.label}
      href={cat.href}
      className="group relative overflow-hidden rounded-2xl aspect-video border border-surface-700 hover:border-brand-500/40 transition-all duration-300"
    >
      {/* Background Image */}
      <Image
        src={cat.image}
        alt={cat.label}
        fill
        className="object-cover group-hover:scale-105 transition-transform duration-700"
      />

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
        <h3 className="text-white text-xl font-bold mb-1">
          {cat.label}
        </h3>

        <p className="text-gray-300 text-sm">
          {cat.desc}
        </p>
      </div>
    </Link>
  ))}
</div>
      </section> 

      {/* ── Dynamic content rows ── */}
      {(loading || hasAnyContent) && (
        <div className="max-w-7xl mx-auto px-4 pb-10">
          {loading ? (
            <div className="space-y-10">
              {[0, 1, 2].map((i) => (
                <div key={i}>
                  <div className="h-5 w-40 bg-surface-700 rounded animate-pulse mb-4" />
                  <div className="flex gap-3">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <div key={j} className="flex-shrink-0 w-56 aspect-video bg-surface-700 rounded-xl animate-pulse" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <ContinueWatchingRow items={history} />

              {data!.trending.length > 0 && (
                <ContentRow title="🔥 Trending" items={data!.trending} seeAllHref="/browse?sort=trending" />
              )}
              {data!.newReleases.length > 0 && (
                <ContentRow title="✨ New Releases" items={data!.newReleases} seeAllHref="/browse" />
              )}
              {data!.byType.MUSIC.length > 0 && (
                <ContentRow title="🎵 Music" items={data!.byType.MUSIC} seeAllHref="/browse?type=MUSIC" />
              )}
              {data!.byType.FILM.length > 0 && (
                <ContentRow title="🎬 Film" items={data!.byType.FILM} seeAllHref="/browse?type=FILM" />
              )}
              {data!.byType.PODCAST.length > 0 && (
                <ContentRow title="🎙️ Podcasts" items={data!.byType.PODCAST} seeAllHref="/browse?type=PODCAST" />
              )}
              {data!.byType.SPOKEN_WORD.length > 0 && (
                <ContentRow title="🎤 Spoken Word" items={data!.byType.SPOKEN_WORD} seeAllHref="/browse?type=SPOKEN_WORD" />
              )}

              {data!.creators.length > 0 && (
                <section className="mb-10">
                  <div className="flex items-baseline justify-between mb-4">
                    <h2 className="text-lg font-bold text-white">👥 Featured Creators</h2>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
                    {data!.creators.map((c) => (
                      <div key={c.username} className="snap-start">
                        <CreatorCard creator={c} />
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Philosophy pillars ── */}
      <section className="border-t border-surface-700/50 bg-surface-800/40">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <p className="text-brand-400/70 text-xs uppercase tracking-[0.3em] mb-2">The Foundation</p>
            <h2 className="text-2xl md:text-3xl font-bold text-white">Built on three pillars</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                word: 'Discipline',
                icon: '⚔️',
                body: 'Consistent creative output rooted in craft, not trends. Every piece of content released here is intentional.',
              },
              {
                word: 'Identity',
                icon: '👑',
                body: 'Know who you are and let it shape your art. The DaddyMan philosophy starts with a clear sense of self.',
              },
              {
                word: 'Legacy',
                icon: '🔥',
                body: 'Create work that lasts. Music, film, and teachings that your children\'s children will still draw from.',
              },
            ].map((pillar) => (
              <div key={pillar.word} className="relative group p-8 rounded-2xl border border-surface-700 hover:border-brand-500/30 bg-surface-800 hover:bg-surface-700/60 transition-all duration-200">
                <div className="text-4xl mb-4">{pillar.icon}</div>
                <h3 className="text-brand-400 font-bold text-xl mb-3 tracking-wide">{pillar.word}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{pillar.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What you get (value prop) ── */}
      <section className="border-t border-surface-700/50">
        <div className="max-w-5xl mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <p className="text-brand-400/70 text-xs uppercase tracking-[0.3em] mb-2">Why Join</p>
            <h2 className="text-2xl md:text-3xl font-bold text-white">Everything in one place</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {[
              { icon: '🎵', title: 'Music & Film', body: 'Stream original tracks, albums, short films, and full-length features from independent creators.' },
              { icon: '🎙️', title: 'Podcasts & Teachings', body: 'Weekly conversations, long-form interviews, and spoken word rooted in the DaddyMan philosophy.' },
              { icon: '🔒', title: 'Members-only content', body: 'Subscriber access unlocks exclusive drops, extended cuts, and content you won\'t find anywhere else.' },
              { icon: '👥', title: 'Follow creators', body: 'Build your feed. When creators you follow drop something new, you hear about it first.' },
              { icon: '📱', title: 'Watch anywhere', body: 'Web and mobile — your watch history and progress sync across devices.' },
              { icon: '🏕️', title: 'Join the Camp', body: 'This isn\'t just content. It\'s a community built on Discipline, Identity, and Legacy.' },
            ].map((f) => (
              <div key={f.title} className="flex gap-4 p-5 rounded-2xl bg-surface-800 border border-surface-700">
                <span className="text-2xl mt-0.5 shrink-0">{f.icon}</span>
                <div>
                  <p className="text-white font-semibold text-sm mb-1">{f.title}</p>
                  <p className="text-gray-500 text-xs leading-relaxed">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="border-t border-surface-700/50 bg-surface-800/30">
        <div className="max-w-5xl mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <p className="text-brand-400/70 text-xs uppercase tracking-[0.3em] mb-2">Membership</p>
            <h2 className="text-2xl md:text-3xl font-bold text-white">Simple, transparent pricing</h2>
            <p className="text-gray-400 text-sm mt-2">Start free. Upgrade when you're ready.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* FREE */}
            <div className="rounded-2xl border border-surface-600 bg-surface-800 p-8 flex flex-col">
              <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">Free</p>
              <div className="flex items-end gap-1 mb-6">
                <span className="text-4xl font-bold text-white">$0</span>
                <span className="text-gray-500 text-sm mb-1">/mo</span>
              </div>
              <ul className="space-y-3 text-sm text-gray-400 flex-1 mb-8">
                {['Browse all public content','Follow creators','Like & comment','Basic watch history'].map((f) => (
                  <li key={f} className="flex items-center gap-2"><span className="text-brand-400">✓</span>{f}</li>
                ))}
                {['Members-only content','HD streaming','Offline access'].map((f) => (
                  <li key={f} className="flex items-center gap-2 opacity-40"><span>✕</span>{f}</li>
                ))}
              </ul>
              <Link href="/register" className="block text-center border border-surface-500 hover:border-brand-400/50 text-gray-300 hover:text-white py-3 rounded-xl text-sm font-medium transition-colors">
                Get started free
              </Link>
            </div>

            {/* PRO — highlighted */}
            <div className="rounded-2xl border border-brand-500/60 bg-surface-800 p-8 flex flex-col relative shadow-[0_0_40px_rgba(232,184,0,0.12)]">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-500 text-black text-xs font-bold px-4 py-1 rounded-full tracking-wide">
                MOST POPULAR
              </div>
              <p className="text-brand-400 text-xs uppercase tracking-widest mb-2">Pro</p>
              <div className="flex items-end gap-1 mb-6">
                <span className="text-4xl font-bold text-white">$9</span>
                <span className="text-gray-500 text-sm mb-1">/mo</span>
              </div>
              <ul className="space-y-3 text-sm text-gray-300 flex-1 mb-8">
                {['Everything in Free','Members-only content','HD streaming','Full watch history','Early access to new drops'].map((f) => (
                  <li key={f} className="flex items-center gap-2"><span className="text-brand-400">✓</span>{f}</li>
                ))}
                {['Offline access'].map((f) => (
                  <li key={f} className="flex items-center gap-2 opacity-40"><span>✕</span>{f}</li>
                ))}
              </ul>
              <Link href="/subscribe" className="block text-center bg-brand-500 hover:bg-brand-600 text-black font-bold py-3 rounded-xl text-sm transition-colors shadow-[0_0_20px_rgba(232,184,0,0.2)]">
                Join Pro →
              </Link>
            </div>

            {/* PREMIUM */}
            <div className="rounded-2xl border border-surface-600 bg-surface-800 p-8 flex flex-col">
              <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">Premium</p>
              <div className="flex items-end gap-1 mb-6">
                <span className="text-4xl font-bold text-white">$19</span>
                <span className="text-gray-500 text-sm mb-1">/mo</span>
              </div>
              <ul className="space-y-3 text-sm text-gray-400 flex-1 mb-8">
                {['Everything in Pro','Offline access','Creator tools & dashboard','Upload your own content','Priority support'].map((f) => (
                  <li key={f} className="flex items-center gap-2"><span className="text-brand-400">✓</span>{f}</li>
                ))}
              </ul>
              <Link href="/subscribe" className="block text-center border border-surface-500 hover:border-brand-400/50 text-gray-300 hover:text-white py-3 rounded-xl text-sm font-medium transition-colors">
                Join Premium
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Become a creator CTA ── */}
      <section className="border-t border-surface-700/50">
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <p className="text-brand-400/70 text-xs uppercase tracking-[0.3em] mb-4">For Creators</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
            Your voice deserves<br className="hidden md:block" /> its own platform.
          </h2>
          <p className="text-gray-400 text-base md:text-lg mb-8 max-w-xl mx-auto">
            Upload your music, films, podcasts, and teachings. Grow a following, gate premium content, and get paid — on your terms.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/register" className="bg-brand-500 hover:bg-brand-600 text-black font-bold px-8 py-3.5 rounded-xl text-sm transition-colors shadow-[0_0_30px_rgba(232,184,0,0.25)]">
              Start creating →
            </Link>
            <Link href="/browse" className="border border-surface-600 hover:border-surface-500 text-gray-300 hover:text-white px-8 py-3.5 rounded-xl text-sm font-medium transition-colors">
              Explore first
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
