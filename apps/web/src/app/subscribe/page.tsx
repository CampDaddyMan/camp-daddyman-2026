'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import Button from '@/components/ui/Button';

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
    disabled: true,
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
    disabled: false,
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
      'Priority support',
      '4K streaming',
      '500GB storage',
    ],
    excluded: [],
    cta: 'Join Pro Annual →',
    disabled: false,
    highlight: false,
  },
  {
    key: 'CREATOR',
    name: 'Creator',
    price: '$29.99',
    period: '/mo',
    description: 'Built for those ready to share their voice with the world.',
    included: [
      'Everything in Premium',
      'Upload & publish content',
      'Creator analytics dashboard',
      'Subscriber-only content gating',
      'Custom creator profile page',
      'Revenue from paid content',
    ],
    excluded: [],
    cta: 'Become a Creator →',
    disabled: false,
    highlight: false,
  },
];

export default function SubscribePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  async function handleUpgrade(planKey: string) {
    if (!user) return router.push('/login');
    setLoading(planKey);
    try {
      const { data } = await api.post('/subscriptions/checkout', { plan: planKey });
      window.location.href = data.url;
    } catch {
      setLoading(null);
    }
  }

  async function handleManage() {
    setPortalLoading(true);
    try {
      const { data } = await api.post('/subscriptions/portal');
      window.location.href = data.url;
    } catch {
      setPortalLoading(false);
    }
  }

  const currentPlan = user?.subscription?.plan || 'FREE';
  const isActivePaid = currentPlan !== 'FREE' && user?.subscription?.status === 'ACTIVE';

  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      {/* Header */}
      <div className="text-center mb-12">
        <p className="text-brand-400 text-xs font-semibold uppercase tracking-widest mb-3">Membership</p>
        <h1 className="text-4xl font-bold text-white mb-3">Simple, transparent pricing</h1>
        <p className="text-gray-400 text-lg">Start free. Upgrade when you're ready.</p>

        {isActivePaid && (
          <div className="mt-6 inline-flex flex-col items-center gap-2">
            <p className="text-sm text-gray-400">
              You're on the <span className="text-brand-400 font-semibold">{currentPlan}</span> plan.
            </p>
            <button
              onClick={handleManage}
              disabled={portalLoading}
              className="text-sm text-gray-300 hover:text-white border border-surface-600 hover:border-surface-500 px-5 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {portalLoading ? 'Redirecting...' : 'Manage billing & cancel →'}
            </button>
          </div>
        )}
      </div>

      {/* Plans grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {PLANS.map((plan) => {
          const isCurrent = plan.key === currentPlan;
          return (
            <div
              key={plan.key}
              className={`relative rounded-2xl p-6 flex flex-col ${
                plan.highlight
                  ? 'bg-brand-500/10 border border-brand-500/40 ring-1 ring-brand-500/20'
                  : 'bg-surface-800 border border-surface-700'
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold text-black bg-brand-400 px-3 py-1 rounded-full whitespace-nowrap">
                  MOST POPULAR
                </span>
              )}

              {/* Plan name & price */}
              <div className="mb-4">
                <h2 className="text-lg font-bold text-white">{plan.name}</h2>
                <div className="mt-1 flex items-end gap-1">
                  <span className="text-3xl font-bold text-white">{plan.price}</span>
                  <span className="text-gray-400 text-sm pb-1">{plan.period}</span>
                </div>
                <p className="text-gray-500 text-xs mt-2 leading-relaxed">{plan.description}</p>
              </div>

              {/* Features */}
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

              <Button
                onClick={() => !isCurrent && !plan.disabled && handleUpgrade(plan.key)}
                disabled={isCurrent || plan.disabled || loading === plan.key}
                variant={plan.highlight ? 'primary' : 'secondary'}
                size="md"
                className="w-full"
              >
                {isCurrent ? 'Current plan' : loading === plan.key ? 'Redirecting...' : plan.cta}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
