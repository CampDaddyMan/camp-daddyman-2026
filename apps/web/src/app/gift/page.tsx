'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';

const GIFT_PLANS = [
  {
    key: 'PRO',
    label: 'Monthly Membership',
    price: '$19.99',
    duration: '1 month',
    emoji: '🌟',
    features: ['All subscriber-only content', 'HD streaming', 'No ads', 'Full watch history'],
    highlight: false,
  },
  {
    key: 'PREMIUM',
    label: 'Annual Membership',
    price: '$99.99',
    duration: '1 year',
    emoji: '👑',
    features: ['Everything in Monthly', '4K quality', 'Priority support', 'Best value gift'],
    highlight: true,
  },
] as const;

export default function GiftPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [plan, setPlan]               = useState<'PRO' | 'PREMIUM'>('PREMIUM');
  const [email, setEmail]             = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { router.push('/login?next=/gift'); return; }
    if (!email.trim()) return setError('Enter the recipient\'s email address.');
    setError('');
    setSubmitting(true);
    try {
      const { data } = await api.post('/subscriptions/gift', { recipientEmail: email.trim(), plan });
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-14">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="text-5xl mb-4">🎁</div>
        <h1 className="text-3xl font-bold text-white mb-3">Give the Gift of Camp DaddyMan</h1>
        <p className="text-gray-400 text-base leading-relaxed max-w-md mx-auto">
          Give someone you love unlimited access to exclusive music, films, podcasts, and more.
        </p>
      </div>

      {/* Plan picker */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {GIFT_PLANS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPlan(p.key)}
            className={`relative text-left rounded-2xl border-2 p-5 transition-all ${
              plan === p.key
                ? 'border-brand-400 bg-brand-500/10 shadow-[0_0_20px_rgba(248,194,2,0.1)]'
                : 'border-surface-600 bg-surface-800 hover:border-surface-500'
            }`}
          >
            {p.highlight && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-brand-500 text-black text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap">BEST VALUE</span>
              </div>
            )}
            <div className="flex items-start justify-between mb-3">
              <span className="text-3xl">{p.emoji}</span>
              {plan === p.key && (
                <span className="w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center text-black text-xs font-bold flex-shrink-0">✓</span>
              )}
            </div>
            <p className="text-white font-bold text-lg">{p.price}</p>
            <p className="text-gray-400 text-sm">{p.label} · {p.duration}</p>
            <ul className="mt-3 space-y-1">
              {p.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="text-brand-400 text-[10px]">✓</span>{f}
                </li>
              ))}
            </ul>
          </button>
        ))}
      </div>

      {/* Recipient form */}
      <form onSubmit={handleSubmit} className="bg-surface-800 border border-surface-700 rounded-2xl p-6 space-y-5">
        <h2 className="text-white font-semibold">Who's the lucky person?</h2>

        {error && (
          <p className="text-red-400 text-sm bg-red-400/10 px-4 py-3 rounded-lg">{error}</p>
        )}

        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Recipient's email address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="friend@example.com"
            className="w-full bg-surface-700 border border-surface-600 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 transition-colors"
          />
          <p className="text-gray-600 text-xs mt-1.5">They must already have a Camp DaddyMan account.</p>
        </div>

        <div className="bg-surface-700/50 border border-surface-600 rounded-xl p-4 text-sm text-gray-400 space-y-1">
          <p><span className="text-white font-medium">Gifting:</span> {GIFT_PLANS.find((p2) => p2.key === plan)?.label} ({GIFT_PLANS.find((p2) => p2.key === plan)?.duration})</p>
          <p><span className="text-white font-medium">Total:</span> {GIFT_PLANS.find((p2) => p2.key === plan)?.price} — one-time payment</p>
          <p className="text-gray-600 text-xs">Their membership activates immediately after payment.</p>
        </div>

        {user ? (
          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? 'Redirecting to checkout…' : `Gift ${GIFT_PLANS.find((p2) => p2.key === plan)?.price} →`}
          </Button>
        ) : (
          <div className="space-y-3">
            <p className="text-gray-400 text-sm text-center">Sign in to send a gift.</p>
            <Link href="/login?next=/gift">
              <Button size="lg" className="w-full">Sign in to continue</Button>
            </Link>
          </div>
        )}
      </form>

      <p className="text-center text-xs text-gray-600 mt-6">
        Payments are processed securely by Stripe.{' '}
        <Link href="/subscribe" className="text-gray-500 hover:text-gray-300 underline">
          Get your own membership
        </Link>
      </p>
    </div>
  );
}
