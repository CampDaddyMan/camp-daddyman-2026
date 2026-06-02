'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import Button from '@/components/ui/Button';

const CREATOR_PRICE = '$29.99';

const PERKS = [
  { icon: '🎬', title: 'Upload & publish', body: 'Music, film, podcasts, spoken word, books — bring your work to the platform and reach the whole camp.' },
  { icon: '💰', title: 'Revenue share', body: "Earn from your paid content. You're a producer here, not a free rider — you put in, and you get paid." },
  { icon: '📊', title: 'Creator analytics', body: 'See what lands. Track plays, views, followers and earnings from one dashboard.' },
  { icon: '🔒', title: 'Gate your best work', body: 'Offer subscriber-only content and decide what is free and what is for your true supporters.' },
  { icon: '🎨', title: 'Your own profile', body: 'A custom creator page that is unmistakably yours — your home inside Camp DaddyMan.' },
  { icon: '🚀', title: 'Everything in Pro Annual', body: 'Full member access included — 4K streaming, offline, priority support, the works.' },
];

export default function CreatePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isCreator = !!(user as any)?.isCreator;

  async function startCheckout() {
    if (!user) {
      // send them to register, then back here to finish becoming a creator
      router.push('/register?next=/create');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/subscriptions/checkout', { plan: 'CREATOR' });
      window.location.href = data.url;
    } catch {
      setLoading(false);
      setError('Unable to reach checkout — please try again in a moment.');
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-16">

      {/* Hero */}
      <div className="text-center mb-14">
        <p className="text-brand-400 text-xs font-semibold uppercase tracking-widest mb-3">
          Become a Creator
        </p>
        <h1 className="text-4xl md:text-5xl font-black text-white mb-5 leading-tight">
          Bring your voice to<br className="hidden sm:block" /> Camp DaddyMan
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
          Upload your music, film, podcasts and writing — build your audience, gate your
          best work, and earn a real share of the revenue you create.
        </p>

        {error && (
          <div className="mt-6 max-w-md mx-auto bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <div className="mt-8 flex flex-col items-center gap-3">
          {isCreator ? (
            <>
              <span className="inline-flex items-center gap-2 text-brand-400 font-semibold">
                ★ You're already a Creator
              </span>
              <Link href="/upload">
                <Button size="lg">Go to Upload →</Button>
              </Link>
            </>
          ) : (
            <>
              <Button size="lg" onClick={startCheckout} disabled={loading} className="px-10">
                {loading ? 'Redirecting…' : user ? `Become a Creator — ${CREATOR_PRICE}/mo →` : 'Get started →'}
              </Button>
              <p className="text-gray-600 text-xs">
                {CREATOR_PRICE}/month · cancel anytime
                {!user && <> · <Link href="/login?next=/create" className="text-gray-400 hover:text-brand-400 underline">already have an account?</Link></>}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Why it costs — the philosophy, stated plainly */}
      <div className="mb-14 bg-surface-800 border border-surface-700 rounded-2xl p-7 md:p-9">
        <h2 className="text-white font-bold text-lg mb-3">Why creating isn't free</h2>
        <p className="text-gray-400 leading-relaxed">
          Camp DaddyMan does revenue share with its creators. If you're going to earn
          from your work here, you put in too — that's the deal. Creators are producers,
          not the biggest consumers eating for free while getting paid. Skin in the game
          keeps the field honest, and it keeps what you earn real.
        </p>
      </div>

      {/* Perks grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-14">
        {PERKS.map((p) => (
          <div key={p.title} className="bg-surface-800 border border-surface-700 rounded-2xl p-6">
            <div className="text-3xl mb-3">{p.icon}</div>
            <h3 className="text-white font-semibold mb-1.5">{p.title}</h3>
            <p className="text-gray-500 text-sm leading-relaxed">{p.body}</p>
          </div>
        ))}
      </div>

      {/* Final CTA */}
      {!isCreator && (
        <div className="text-center bg-brand-500/10 border border-brand-500/30 rounded-2xl p-10">
          <h2 className="text-2xl font-bold text-white mb-2">Ready to share your work?</h2>
          <p className="text-gray-400 mb-6">{CREATOR_PRICE}/month. Cancel anytime. Your audience is waiting.</p>
          <Button size="lg" onClick={startCheckout} disabled={loading} className="px-10">
            {loading ? 'Redirecting…' : user ? 'Become a Creator →' : 'Get started →'}
          </Button>
        </div>
      )}
    </div>
  );
}
