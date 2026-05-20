'use client';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Content } from '@/types';
import ContentRow from '@/components/content/ContentRow';
import AdSlot from '@/components/ads/AdSlot';
import { useAuth } from '@/context/AuthContext';

// ── Mini poll widget ───────────────────────────────────────────────────────────

interface ActivePoll {
  id: string;
  title: string;
  description: string | null;
  pollType: string;
  status: string;
  endsAt: string | null;
  _count: { votes: number; options: number };
}

function HomePollBanner({ poll }: { poll: ActivePoll }) {
  const isClosed = poll.status === 'CLOSED';
  const endsDate = poll.endsAt ? new Date(poll.endsAt) : null;
  const soon = endsDate && !isClosed && (endsDate.getTime() - Date.now()) < 24 * 3600 * 1000;

  const TYPE_EMOJI: Record<string, string> = {
    CONTENT_VOTE: '🎵', ARTIST_VOTE: '🌟', CUSTOM: '🗳️',
  };

  return (
    <Link
      href={`/polls/${poll.id}`}
      className="group flex items-center gap-4 bg-surface-800 border border-brand-500/30 hover:border-brand-500/60 rounded-2xl px-6 py-5 transition-all hover:shadow-[0_0_24px_rgba(248,194,2,0.1)]"
    >
      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-brand-500/15 flex items-center justify-center text-2xl">
        {TYPE_EMOJI[poll.pollType] ?? '🗳️'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
            isClosed ? 'bg-surface-600 text-gray-400' : 'bg-brand-500/20 text-brand-400'
          }`}>
            {isClosed ? 'Results Live' : 'Vote Now'}
          </span>
          {soon && <span className="text-[11px] text-red-400 font-semibold">Ending soon</span>}
          <span className="text-[11px] text-gray-500">{poll._count.votes} vote{poll._count.votes !== 1 ? 's' : ''}</span>
        </div>
        <p className="text-white font-semibold text-sm leading-snug line-clamp-1">{poll.title}</p>
        {poll.description && (
          <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">{poll.description}</p>
        )}
      </div>
      <span className="text-brand-400 text-lg flex-shrink-0 group-hover:translate-x-1 transition-transform">→</span>
    </Link>
  );
}

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
    DADDYMAN_ISMS: Content[];
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
        className="bg-camp-500 hover:bg-camp-600 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
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
        <h2 className="text-xl font-bold text-white">▶️ Continue Watching</h2>
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
                  item.thumbnailUrl.startsWith('http')
                    ? <img src={item.thumbnailUrl} alt={item.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    : <Image src={item.thumbnailUrl} alt={item.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
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
  const router = useRouter();
  const [data, setData] = useState<DiscoveryData | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [activePoll, setActivePoll] = useState<ActivePoll | null>(null);
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    api.get('/content/discover')
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
    api.get('/polls', { params: { status: 'ACTIVE' } })
      .then(({ data }) => setActivePoll(data.polls?.[0] ?? null))
      .catch(() => {});
    api.get('/site-settings/public')
      .then(({ data }) => setSiteSettings(data.settings ?? {}))
      .catch(() => {});
  }, []);

  function s(key: string, fallback: string) {
    return siteSettings[key] || fallback;
  }

  useEffect(() => {
    if (!user) return;
    api.get('/content/history')
      .then((r) => setHistory(r.data.items))
      .catch(() => {});
  }, [user]);

  async function handleCheckout(plan: string) {
    if (!user) {
      router.push(`/register?next=/subscribe`);
      return;
    }
    setCheckoutLoading(plan);
    try {
      const { data } = await api.post('/subscriptions/checkout', { plan });
      window.location.href = data.url;
    } catch {
      router.push('/subscribe');
    } finally {
      setCheckoutLoading(null);
    }
  }


  return (
    <div>
      {/* ── Hero ── */}
      <div className="relative flex flex-col items-center justify-center min-h-[88vh] overflow-hidden px-4 text-center">
        {/* Atmospheric background */}
        <div className="absolute inset-0 bg-surface-900" />
        {/* Jamaican flag — gold centre glow, green corner glows */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_65%_60%_at_50%_45%,rgba(248,194,2,0.18),transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_65%_55%_at_0%_100%,rgba(2,65,25,0.28),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_65%_55%_at_100%_0%,rgba(2,65,25,0.28),transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(2,65,25,0.09)_0%,transparent_38%,transparent_62%,rgba(2,65,25,0.09)_100%)]" />
        {/* Jamaican flag accent stripe — black / gold / green */}
        <div className="absolute top-0 left-0 right-0 flex h-1">
          <div className="flex-1 bg-black" />
          <div className="flex-1 bg-brand-500" />
          <div className="flex-1 bg-camp-500" />
          <div className="flex-1 bg-brand-500" />
          <div className="flex-1 bg-black" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-surface-900 to-transparent" />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center gap-4 md:gap-7 pt-20 md:pt-0">
          {/* Logo */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full blur-2xl bg-brand-500/20 scale-110" />
            <div className="relative w-52 h-52 md:w-64 md:h-64 rounded-full overflow-hidden ring-1 ring-brand-500/30 shadow-[0_0_100px_rgba(248,194,2,0.18)]">
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
            {s('hero_tagline', 'Discipline · Identity · Legacy')}
          </p>
          <p className="text-gray-500 text-[10px] tracking-[0.3em] uppercase -mt-4">Est. 2023</p>

          {/* Headline */}
          <div>
            <h1 className="text-4xl md:text-6xl font-bold text-camp-400 leading-tight tracking-tight">
              {s('hero_headline', 'Music. Film. Teachings.')}
            </h1>
            <p className="text-gray-400 text-base md:text-lg mt-3 max-w-lg mx-auto leading-relaxed">
              {s('hero_sub', 'Independent content rooted in the DaddyMan philosophy. Stream, follow creators, and join the community.')}
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
              className="bg-camp-500 hover:bg-camp-600 text-white px-7 py-3 rounded-xl text-sm font-semibold transition-colors shadow-[0_0_20px_rgba(2,65,25,0.5)]"
            >
              {s('hero_cta_browse', 'Browse all')}
            </Link>
            <Link
              href="/register"
              className="bg-brand-500 hover:bg-brand-600 text-black px-7 py-3 rounded-xl text-sm font-bold transition-colors shadow-[0_0_24px_rgba(248,194,2,0.3)]"
            >
              {s('hero_cta_join', 'Join for free →')}
            </Link>
          </div>

        </div>

        {/* Scroll cue — gold bouncing arrow */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce"
          style={{ color: '#f8c202', fontSize: '1.75rem', lineHeight: 1, textShadow: '0 0 12px rgba(248,194,2,0.5)' }}
        >
          ↓
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-surface-700/50" />

      {/* ── Browse by Category ── */}
      <section className="max-w-7xl mx-auto px-4 py-10 md:py-16">

        {/* Section header */}
        <div className="mb-8 md:mb-10">
          <p className="text-camp-400 text-base font-bold uppercase tracking-[0.35em] mb-3">{s('browse_eyebrow', 'Explore the Camp')}</p>
          <div className="flex items-end justify-between gap-4 flex-wrap mb-4">
            <h2 className="text-3xl md:text-5xl font-black text-white leading-tight tracking-tight">
              {s('browse_title', 'What are you feeling?')}
            </h2>
            <Link href="/browse" className="text-sm text-brand-400 hover:underline hidden sm:block flex-shrink-0 mb-1">
              Browse all →
            </Link>
          </div>
          {/* Direction banner */}
          <div className="flex items-center gap-3 rounded-xl border border-surface-700 bg-surface-800/60 px-5 py-3.5">
            <span className="text-brand-400 text-xl flex-shrink-0">↓</span>
            <p className="text-gray-300 text-sm leading-relaxed">
              <span className="text-white font-semibold">{s('browse_banner_bold', 'Pick your format')}</span> — {s('browse_banner_body', 'tap any category below to dive straight into the music, film, podcasts, spoken word, or teachings that move you.')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { label: 'Music',         href: '/browse?type=MUSIC',        image: '/images/categories/CampDaddyman_Media_Categories_Music.jpg',       desc: 'Original tracks & albums',      emoji: '🎵' },
            { label: 'Film',          href: '/browse?type=FILM',         image: '/images/categories/CampDaddyman_Media_Categories_Film.jpg',        desc: 'Short films & features',        emoji: '🎬' },
            { label: 'Podcasts',      href: '/browse?type=PODCAST',      image: '/images/categories/CampDaddyman_Media_Categories_Podcasts.jpg',    desc: 'Conversations & interviews',    emoji: '🎙️' },
            { label: 'Spoken Word',   href: '/browse?type=SPOKEN_WORD',  image: '/images/categories/CampDaddyman_Media_Categories_Spoken_Word.jpg', desc: 'Poetry & spoken teachings',     emoji: '🎤' },
            { label: 'DaddyMan-Isms', href: '/browse?type=DADDYMAN_ISMS', image: null,                                                              desc: 'Quotes, parables & teachings', emoji: '💡' },
          ].map((cat) => (
            <Link
              key={cat.label}
              href={cat.href}
              className="group relative overflow-hidden rounded-2xl aspect-video border border-surface-700 hover:border-camp-500 transition-all duration-300 shadow-[0_0_0_0_rgba(2,65,25,0)] hover:shadow-[0_0_16px_rgba(2,65,25,0.4)]"
            >
              {cat.image ? (
                <Image
                  src={cat.image}
                  alt={cat.label}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-camp-500/20 via-surface-800 to-surface-900 group-hover:from-camp-500/30 transition-all duration-700 flex items-center justify-center">
                  <span className="text-5xl opacity-40 group-hover:opacity-70 transition-opacity">{cat.emoji}</span>
                </div>
              )}

              {/* Strong gradient so title is always readable */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

              <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4 z-10">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-base leading-none">{cat.emoji}</span>
                  <h3 className="text-white text-sm font-bold">{cat.label}</h3>
                </div>
                <p className="text-gray-300 text-xs leading-snug">{cat.desc}</p>
              </div>

              {/* Green top accent on hover */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-camp-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
            </Link>
          ))}
        </div>
      </section> 

      {/* ── Active poll banner ── */}
      {activePoll && (
        <div className="max-w-7xl mx-auto px-4 pb-8">
          <p className="text-camp-400 text-xs font-bold uppercase tracking-[0.35em] mb-3">Community Poll</p>
          <HomePollBanner poll={activePoll} />
          <div className="mt-2 text-right">
            <Link href="/polls" className="text-xs text-gray-500 hover:text-brand-400 transition-colors">
              All polls →
            </Link>
          </div>
        </div>
      )}

      {/* ── Dynamic content rows ── */}
      <div className="max-w-7xl mx-auto px-4 pb-10">
        {loading ? (
          <div className="space-y-10">
            {[0, 1, 2, 3].map((i) => (
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

            <ContentRow title="🔥 Trending" items={data?.trending ?? []} seeAllHref="/browse?sort=trending" emptyText="New drops coming soon." />

            <AdSlot location="home-mid-banner" className="mb-8 rounded-2xl" />

            <ContentRow title="✨ New Releases" items={data?.newReleases ?? []} seeAllHref="/browse" emptyText="First releases dropping soon." />
            <ContentRow title="🎵 Music" items={data?.byType.MUSIC ?? []} seeAllHref="/browse?type=MUSIC" emptyText="Original tracks & albums coming soon." />
            <ContentRow title="🎬 Film" items={data?.byType.FILM ?? []} seeAllHref="/browse?type=FILM" emptyText="Short films & features coming soon." />
            <ContentRow title="🎙️ Podcasts" items={data?.byType.PODCAST ?? []} seeAllHref="/browse?type=PODCAST" emptyText="Long-form conversations coming soon." />
            <ContentRow title="🎤 Spoken Word" items={data?.byType.SPOKEN_WORD ?? []} seeAllHref="/browse?type=SPOKEN_WORD" emptyText="Poetry & spoken teachings coming soon." />
            <ContentRow title="💬 DaddyMan-Isms" items={data?.byType.DADDYMAN_ISMS ?? []} seeAllHref="/browse?type=DADDYMAN_ISMS" emptyText="Quotes, parables & teachings — dropping soon." />

            {(data?.creators ?? []).length > 0 && (
              <section className="mb-10">
                <div className="flex items-baseline justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">👥 Featured Creators</h2>
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

      {/* ── Philosophy pillars ── */}
      <section className="border-t border-surface-700/50 bg-surface-800/40">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <p className="text-camp-400 text-sm uppercase tracking-[0.3em] mb-2">{s('pillars_eyebrow', 'The Foundation')}</p>
            <h2 className="text-2xl md:text-3xl font-bold text-white">{s('pillars_title', 'Built on three pillars')}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-8">
            {[
              {
                word: s('pillar1_word', 'Discipline'),
                icon: s('pillar1_icon', '⚔️'),
                body: s('pillar1_body', 'Consistent creative output rooted in craft, not trends. Every piece of content released here is intentional.'),
              },
              {
                word: s('pillar2_word', 'Identity'),
                icon: s('pillar2_icon', '👑'),
                body: s('pillar2_body', 'Know who you are and let it shape your art. The DaddyMan philosophy starts with a clear sense of self.'),
              },
              {
                word: s('pillar3_word', 'Legacy'),
                icon: s('pillar3_icon', '🔥'),
                body: s('pillar3_body', "Create work that lasts. Music, film, and teachings that your children's children will still draw from."),
              },
            ].map((pillar) => (
              <div key={pillar.word} className="relative group p-6 md:p-8 rounded-2xl border border-surface-700 hover:border-camp-500/40 bg-surface-800 hover:bg-surface-700/60 transition-all duration-200">
                <div className="absolute top-0 left-8 right-8 h-0.5 bg-gradient-to-r from-camp-500/60 via-brand-500/60 to-transparent rounded-full" />
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
            <p className="text-brand-400/70 text-sm uppercase tracking-[0.3em] mb-2">{s('features_eyebrow', 'Why Join')}</p>
            <h2 className="text-2xl md:text-3xl font-bold text-white">{s('features_title', 'Everything in one place')}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {[
              { icon: s('feature1_icon', '🎵'), title: s('feature1_title', 'Music & Film'), body: s('feature1_body', 'Stream original tracks, albums, short films, and full-length features from independent creators.') },
              { icon: s('feature2_icon', '🎙️'), title: s('feature2_title', 'Podcasts & Teachings'), body: s('feature2_body', 'Weekly conversations, long-form interviews, and spoken word rooted in the DaddyMan philosophy.') },
              { icon: s('feature3_icon', '🔒'), title: s('feature3_title', 'Members-only content'), body: s('feature3_body', "Subscriber access unlocks exclusive drops, extended cuts, and content you won't find anywhere else.") },
              { icon: s('feature4_icon', '👥'), title: s('feature4_title', 'Follow creators'), body: s('feature4_body', 'Build your feed. When creators you follow drop something new, you hear about it first.') },
              { icon: s('feature5_icon', '📱'), title: s('feature5_title', 'Watch anywhere'), body: s('feature5_body', 'Web and mobile — your watch history and progress sync across devices.') },
              { icon: s('feature6_icon', '🏕️'), title: s('feature6_title', 'Join the Camp'), body: s('feature6_body', "This isn't just content. It's a community built on Discipline, Identity, and Legacy.") },
            ].map((f) => (
              <div key={f.title} className="flex gap-4 p-5 rounded-2xl bg-surface-800 border border-surface-700">
                <span className="text-2xl mt-0.5 shrink-0">{f.icon}</span>
                <div>
                  <p className="text-white font-semibold text-sm mb-1">{f.title}</p>
                  <p className="text-gray-500 text-sm leading-relaxed">{f.body}</p>
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
            <p className="text-brand-400/70 text-sm uppercase tracking-[0.3em] mb-2">{s('pricing_eyebrow', 'Membership')}</p>
            <h2 className="text-2xl md:text-3xl font-bold text-white">{s('pricing_title', 'Simple, transparent pricing')}</h2>
            <p className="text-gray-400 text-sm mt-2">{s('pricing_sub', "Start free. Upgrade when you're ready.")}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* FREE */}
            <div className="rounded-2xl border border-surface-600 bg-surface-800 p-7 flex flex-col">
              <p className="text-gray-400 text-sm uppercase tracking-widest mb-2">Free</p>
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

            {/* PRO MONTHLY — highlighted */}
            <div className="rounded-2xl border border-brand-500/60 bg-surface-800 p-7 flex flex-col relative shadow-[0_0_40px_rgba(248,194,2,0.12)]">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-500 text-black text-xs font-bold px-4 py-1 rounded-full tracking-wide">
                MOST POPULAR
              </div>
              <p className="text-brand-400 text-sm uppercase tracking-widest mb-2">Pro Monthly</p>
              <div className="flex items-end gap-1 mb-6">
                <span className="text-4xl font-bold text-white">$19.99</span>
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
              <button
                onClick={() => handleCheckout('PRO')}
                disabled={checkoutLoading === 'PRO'}
                className="block w-full text-center bg-brand-500 hover:bg-brand-600 text-black font-bold py-3 rounded-xl text-sm transition-colors shadow-[0_0_20px_rgba(248,194,2,0.2)] disabled:opacity-60"
              >
                {checkoutLoading === 'PRO' ? 'Redirecting…' : 'Join Pro →'}
              </button>
            </div>

            {/* PRO ANNUAL */}
            <div className="rounded-2xl border border-surface-600 bg-surface-800 p-7 flex flex-col">
              <p className="text-gray-400 text-sm uppercase tracking-widest mb-2">Pro Annual</p>
              <div className="flex items-end gap-1 mb-6">
                <span className="text-4xl font-bold text-white">$99.99</span>
                <span className="text-gray-500 text-sm mb-1">/yr</span>
              </div>
              <ul className="space-y-3 text-sm text-gray-400 flex-1 mb-8">
                {['Everything in Pro Monthly','Offline access','4K streaming','500GB storage','Priority support'].map((f) => (
                  <li key={f} className="flex items-center gap-2"><span className="text-brand-400">✓</span>{f}</li>
                ))}
              </ul>
              <button
                onClick={() => handleCheckout('PREMIUM')}
                disabled={checkoutLoading === 'PREMIUM'}
                className="block w-full text-center border border-surface-500 hover:border-brand-400/50 text-gray-300 hover:text-white py-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
              >
                {checkoutLoading === 'PREMIUM' ? 'Redirecting…' : 'Join Pro Annual →'}
              </button>
            </div>

            {/* CREATOR */}
            <div className="rounded-2xl border border-surface-600 bg-surface-800 p-7 flex flex-col">
              <p className="text-gray-400 text-sm uppercase tracking-widest mb-2">Creator</p>
              <div className="flex items-end gap-1 mb-6">
                <span className="text-4xl font-bold text-white">$29.99</span>
                <span className="text-gray-500 text-sm mb-1">/mo</span>
              </div>
              <ul className="space-y-3 text-sm text-gray-400 flex-1 mb-8">
                {['Everything in Pro Annual','Upload & publish content','Creator analytics','Subscriber-only gating','Custom creator profile','Revenue from paid content'].map((f) => (
                  <li key={f} className="flex items-center gap-2"><span className="text-brand-400">✓</span>{f}</li>
                ))}
              </ul>
              <button
                onClick={() => handleCheckout('CREATOR')}
                disabled={checkoutLoading === 'CREATOR'}
                className="block w-full text-center border border-surface-500 hover:border-brand-400/50 text-gray-300 hover:text-white py-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
              >
                {checkoutLoading === 'CREATOR' ? 'Redirecting…' : 'Become a Creator →'}
              </button>
            </div>
          </div>

          {/* Uncs & Aunties teaser */}
          <div className="mt-8 rounded-2xl border border-brand-500/30 bg-surface-800/60 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-brand-400 text-sm font-semibold uppercase tracking-widest mb-1">Special Support</p>
              <h3 className="text-white font-bold text-lg">Uncs & Aunties</h3>
              <p className="text-gray-400 text-sm mt-1">Got love for the Camp? Give what you feel — min $99.99, one-time or monthly.</p>
            </div>
            <Link
              href="/membership#supporter"
              className="flex-shrink-0 bg-brand-500 hover:bg-brand-600 text-black font-bold px-6 py-3 rounded-xl text-sm transition-colors shadow-[0_0_20px_rgba(248,194,2,0.2)] whitespace-nowrap"
            >
              Support the Camp →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Become a creator CTA ── */}
      <section className="border-t border-surface-700/50">
        <div className="max-w-4xl mx-auto px-4 py-12 md:py-20 text-center">
          <p className="text-brand-400/70 text-sm uppercase tracking-[0.3em] mb-4">{s('creator_eyebrow', 'For Creators')}</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
            {s('creator_headline', 'Your voice deserves its own platform.')}
          </h2>
          <p className="text-gray-400 text-base md:text-lg mb-8 max-w-xl mx-auto">
            {s('creator_sub', 'Upload your music, films, podcasts, and teachings. Grow a following, gate premium content, and get paid — on your terms.')}
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/register" className="bg-brand-500 hover:bg-brand-600 text-black font-bold px-8 py-3.5 rounded-xl text-sm transition-colors shadow-[0_0_30px_rgba(248,194,2,0.25)]">
              {s('creator_cta_start', 'Start creating →')}
            </Link>
            <Link href="/browse" className="border border-surface-600 hover:border-surface-500 text-gray-300 hover:text-white px-8 py-3.5 rounded-xl text-sm font-medium transition-colors">
              {s('creator_cta_explore', 'Explore first')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
