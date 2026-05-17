'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

const PLANS = [
  {
    key: 'FREE',
    name: 'Free',
    price: '$0',
    period: '/mo',
    description: 'Start exploring Camp DaddyMan at no cost.',
    included: [
      'Browse all public content',
      'Follow creators',
      'Like & comment',
      'Basic watch history',
    ],
    excluded: [
      'Members-only content',
      'HD streaming',
      'Offline access',
    ],
    cta: 'Get started free',
    highlight: false,
  },
  {
    key: 'PRO',
    name: 'Pro Monthly',
    price: '$19.99',
    period: '/mo',
    description: 'For dedicated fans who want the full experience.',
    included: [
      'Everything in Free',
      'Members-only content',
      'HD streaming',
      'Full watch history',
      'Early access to new drops',
    ],
    excluded: [
      'Offline access',
    ],
    cta: 'Join Pro →',
    highlight: true,
  },
  {
    key: 'PREMIUM',
    name: 'Pro Annual',
    price: '$99.99',
    period: '/yr',
    description: 'Everything in Pro — billed once a year. Save vs. monthly.',
    included: [
      'Everything in Pro Monthly',
      'Offline access',
      '4K streaming',
      '500GB storage',
      'Priority support',
    ],
    excluded: [],
    cta: 'Join Pro Annual →',
    highlight: false,
  },
  {
    key: 'CREATOR',
    name: 'Creator',
    price: '$29.99',
    period: '/mo',
    description: 'Built for those ready to share their voice with the world.',
    included: [
      'Everything in Pro Annual',
      'Upload & publish content',
      'Creator analytics dashboard',
      'Subscriber-only content gating',
      'Custom creator profile page',
      'Revenue from paid content',
    ],
    excluded: [],
    cta: 'Become a Creator →',
    highlight: false,
  },
];

export default function MembershipPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [supporterLoading, setSupporterLoading] = useState(false);
  const [amountError, setAmountError] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState('');

  async function handleCheckout(planKey: string) {
    if (!user) { router.push('/register'); return; }
    setCheckoutError('');
    setCheckoutLoading(planKey);
    try {
      const { data } = await api.post('/subscriptions/checkout', { plan: planKey });
      window.location.href = data.url;
    } catch {
      setCheckoutLoading(null);
      setCheckoutError('Unable to reach checkout — please try again in a moment.');
    }
  }

  async function handleSupporter() {
    if (!user) return router.push('/login');
    const val = parseFloat(amount);
    if (!val || val < 99.99) {
      setAmountError('Minimum amount is $99.99');
      return;
    }
    setAmountError('');
    setSupporterLoading(true);
    try {
      const { data } = await api.post('/subscriptions/checkout/supporter', { amount: val, recurring });
      window.location.href = data.url;
    } catch {
      setSupporterLoading(false);
      setAmountError('Unable to reach checkout — please try again in a moment.');
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      {/* Header */}
      <div className="text-center mb-14">
        <p className="text-brand-400 text-xs font-semibold uppercase tracking-widest mb-3">Membership</p>
        <h1 className="text-4xl font-bold text-white mb-3">Simple, transparent pricing</h1>
        <p className="text-gray-400 text-lg">Start free. Upgrade when you're ready.</p>
      </div>

      {checkoutError && (
        <div className="mb-8 bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center px-4 py-3 rounded-xl">
          {checkoutError}
        </div>
      )}

      {/* Plans grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {PLANS.map((plan) => (
          <div
            key={plan.key}
            className={`relative rounded-2xl p-6 flex flex-col ${
              plan.highlight
                ? 'bg-brand-500/10 border border-brand-500/40 ring-1 ring-brand-500/20 shadow-[0_0_40px_rgba(232,184,0,0.10)]'
                : 'bg-surface-800 border border-surface-700'
            }`}
          >
            {plan.highlight && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold text-black bg-brand-400 px-3 py-1 rounded-full whitespace-nowrap">
                MOST POPULAR
              </span>
            )}

            <div className="mb-4">
              <h2 className="text-lg font-bold text-white">{plan.name}</h2>
              <div className="mt-1 flex items-end gap-1">
                <span className="text-3xl font-bold text-white">{plan.price}</span>
                <span className="text-gray-400 text-sm pb-1">{plan.period}</span>
              </div>
              <p className="text-gray-500 text-xs mt-2 leading-relaxed">{plan.description}</p>
            </div>

            <ul className="space-y-2.5 mb-8 flex-1">
              {plan.included.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="text-brand-400 mt-0.5 flex-shrink-0">✓</span>
                  {f}
                </li>
              ))}
              {plan.excluded.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="mt-0.5 flex-shrink-0">✕</span>
                  {f}
                </li>
              ))}
            </ul>

            {plan.key === 'FREE' ? (
              <Link
                href="/register"
                className="block text-center py-3 rounded-xl text-sm font-semibold transition-colors border border-surface-500 hover:border-brand-400/50 text-gray-300 hover:text-white"
              >
                {plan.cta}
              </Link>
            ) : (
              <button
                onClick={() => handleCheckout(plan.key)}
                disabled={checkoutLoading === plan.key}
                className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 ${
                  plan.highlight
                    ? 'bg-brand-500 hover:bg-brand-600 text-black shadow-[0_0_20px_rgba(232,184,0,0.2)]'
                    : 'border border-surface-500 hover:border-brand-400/50 text-gray-300 hover:text-white'
                }`}
              >
                {checkoutLoading === plan.key ? 'Redirecting…' : plan.cta}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Uncs & Aunties */}
      <div id="supporter" className="mt-10 rounded-2xl border border-brand-500/30 bg-gradient-to-br from-surface-800 to-surface-900 p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_80%_50%,rgba(232,184,0,0.05),transparent_70%)]" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-8">
          {/* Info */}
          <div className="flex-1">
            <p className="text-brand-400 text-xs font-semibold uppercase tracking-widest mb-2">Special Support</p>
            <h2 className="text-2xl font-bold text-white mb-2">Uncs & Aunties</h2>
            <p className="text-gray-400 text-sm leading-relaxed max-w-lg">
              Got love for the Camp? Go beyond a standard membership. Set your own amount — minimum $99.99 — and choose to give once or show up every month. Every dollar goes directly to supporting independent creators on this platform.
            </p>
            <ul className="mt-4 space-y-1.5">
              {['Full Premium + Creator access', 'Your name honored in the Camp', 'One-time gift or monthly recurring', 'No maximum — give what you feel'].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                  <span className="text-brand-400">✓</span>{f}
                </li>
              ))}
            </ul>
          </div>

          {/* Input */}
          <div className="w-full md:w-72 flex flex-col gap-4">
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-widest mb-1.5 block">Your amount (min $99.99)</label>
              <div className="flex items-center bg-surface-700 border border-surface-600 rounded-xl overflow-hidden focus-within:border-brand-400 transition-colors">
                <span className="text-gray-400 pl-4 text-lg font-bold">$</span>
                <input
                  type="number"
                  min="99.99"
                  step="0.01"
                  placeholder="99.99"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setAmountError(''); }}
                  className="flex-1 bg-transparent text-white px-2 py-3 text-lg font-bold focus:outline-none"
                />
              </div>
              {amountError && <p className="text-red-400 text-xs mt-1">{amountError}</p>}
            </div>

            <div className="flex rounded-xl overflow-hidden border border-surface-600">
              <button
                onClick={() => setRecurring(false)}
                className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${!recurring ? 'bg-brand-500 text-black' : 'bg-surface-700 text-gray-400 hover:text-white'}`}
              >
                One-time
              </button>
              <button
                onClick={() => setRecurring(true)}
                className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${recurring ? 'bg-brand-500 text-black' : 'bg-surface-700 text-gray-400 hover:text-white'}`}
              >
                Monthly
              </button>
            </div>

            <button
              onClick={handleSupporter}
              disabled={supporterLoading}
              className="w-full bg-brand-500 hover:bg-brand-600 text-black font-bold py-3 rounded-xl text-sm transition-colors shadow-[0_0_24px_rgba(232,184,0,0.25)] disabled:opacity-50"
            >
              {supporterLoading ? 'Redirecting...' : 'Support the Camp →'}
            </button>
          </div>
        </div>
      </div>

      {/* Reassurance */}
      <div className="mt-10 text-center">
        <p className="text-gray-500 text-sm">
          All paid plans include a 7-day free trial. Cancel anytime.{' '}
          <Link href="/subscribe" className="text-brand-400 hover:underline">
            Already a member? Manage your plan →
          </Link>
        </p>
      </div>
    </div>
  );
}
