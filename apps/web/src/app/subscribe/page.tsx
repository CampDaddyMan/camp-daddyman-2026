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
    period: '',
    features: ['Browse all public content', 'Comment and like', '1GB storage'],
    cta: 'Current plan',
    disabled: true,
  },
  {
    key: 'PRO',
    name: 'Pro',
    price: '$19.99',
    period: '/mo',
    features: ['Everything in Free', 'Members-only content', '100GB storage', 'HD quality', 'No ads'],
    cta: 'Upgrade to Pro',
    disabled: false,
  },
  {
    key: 'PREMIUM',
    name: 'Premium',
    price: '$99.99',
    period: '/yr',
    features: ['Everything in Pro', '500GB storage', '4K quality', 'Download for offline', 'Priority support'],
    cta: 'Upgrade to Premium',
    disabled: false,
    highlight: true,
  },
  {
    key: 'CREATOR',
    name: 'Creator',
    price: '$29.99',
    period: '/mo',
    features: ['Everything in Premium', 'Upload & publish content', 'Creator analytics dashboard', 'Subscriber-only content gating', 'Custom creator profile page', 'Revenue from paid content'],
    cta: 'Become a Creator',
    disabled: false,
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
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-white mb-3">Choose your membership</h1>
        <p className="text-gray-400">Access all of Camp DaddyMan — music, film, teachings, and more.</p>
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

      <div className="grid md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const isCurrent = plan.key === currentPlan;
          return (
            <div key={plan.key} className={`rounded-2xl p-6 flex flex-col ${plan.highlight ? 'bg-brand-500/10 border border-brand-500/40 ring-1 ring-brand-500/20' : 'bg-surface-800 border border-surface-700'}`}>
              <div className="mb-6">
                {plan.highlight && (
                  <span className="text-xs font-bold text-brand-400 bg-brand-400/10 px-2.5 py-1 rounded-full mb-3 inline-block">Most Popular</span>
                )}
                <h2 className="text-xl font-bold text-white">{plan.name}</h2>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-white">{plan.price}</span>
                  <span className="text-gray-400 text-sm">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="text-brand-400 mt-0.5">✓</span>
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
