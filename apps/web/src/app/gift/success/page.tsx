'use client';
import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Button from '@/components/ui/Button';

function GiftSuccessContent() {
  const params = useSearchParams();
  const plan = params.get('plan') ?? 'PRO';
  const forEmail = params.get('for') ?? '';
  const label = plan === 'PREMIUM' ? 'Annual Membership (1 year)' : 'Monthly Membership (1 month)';

  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <div className="text-6xl mb-6">🎁✨</div>
      <h1 className="text-3xl font-bold text-white mb-3">Gift Sent!</h1>
      <p className="text-gray-400 text-base leading-relaxed mb-6">
        Your gift of a <span className="text-brand-400 font-semibold">{label}</span> has been activated
        {forEmail && (
          <> for <span className="text-white font-semibold">{forEmail}</span></>
        )}.
        They now have full access to Camp DaddyMan.
      </p>

      <div className="bg-surface-800 border border-surface-700 rounded-2xl p-6 mb-8 text-left space-y-3">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 bg-brand-500/20 rounded-full flex items-center justify-center text-brand-400 text-sm flex-shrink-0">✓</span>
          <p className="text-gray-300 text-sm">Membership activated immediately</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 bg-brand-500/20 rounded-full flex items-center justify-center text-brand-400 text-sm flex-shrink-0">✓</span>
          <p className="text-gray-300 text-sm">They can log in now and access all members-only content</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 bg-brand-500/20 rounded-full flex items-center justify-center text-brand-400 text-sm flex-shrink-0">✓</span>
          <p className="text-gray-300 text-sm">No recurring charge — this was a one-time gift payment</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/gift">
          <Button variant="secondary" size="lg">Give another gift</Button>
        </Link>
        <Link href="/">
          <Button size="lg">Back to Camp DaddyMan</Button>
        </Link>
      </div>
    </div>
  );
}

export default function GiftSuccessPage() {
  return (
    <Suspense>
      <GiftSuccessContent />
    </Suspense>
  );
}
