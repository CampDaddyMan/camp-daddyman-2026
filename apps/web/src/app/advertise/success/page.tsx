'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

type State = 'loading' | 'confirmed' | 'error';

export default function AdBookingSuccessPage() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<State>('loading');

  useEffect(() => {
    const paymentIntentId = searchParams.get('payment_intent');
    const redirectStatus  = searchParams.get('redirect_status');

    if (!paymentIntentId || redirectStatus !== 'succeeded') {
      setState('error');
      return;
    }

    api.post('/partners/apply/confirm', { paymentIntentId })
      .then(() => setState('confirmed'))
      .catch(() => setState('error'));
  }, [searchParams]);

  if (state === 'loading') {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
        <p className="text-gray-400">Confirming your booking…</p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-6">⚠️</div>
        <h1 className="text-2xl font-black text-white mb-4">Something went wrong</h1>
        <p className="text-gray-400 text-base mb-8">
          Your payment went through but we couldn't confirm the booking automatically.
          Email <a href="mailto:info@campdaddyman.com" className="text-brand-400 underline">info@campdaddyman.com</a> and we'll sort it out.
        </p>
        <Link href="/" className="inline-block bg-surface-2 text-white font-bold px-8 py-4 rounded-xl">
          Go Home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <div className="text-6xl mb-6">🎉</div>
      <h1 className="text-3xl font-black text-white mb-4">You're in the queue!</h1>
      <p className="text-gray-400 text-base leading-relaxed mb-6">
        Your payment was received and your ad is now <strong className="text-brand-400">pending review</strong>.
        We'll typically get back to you within 1 business day.
      </p>
      <p className="text-gray-500 text-sm mb-10">
        Check your email for a booking confirmation. If approved, you'll receive another email when your ad goes live.
        If we can't approve the creative, you'll receive a full automatic refund — no hassle.
      </p>
      <Link
        href="/browse"
        className="inline-block bg-brand-500 hover:bg-brand-400 text-black font-bold px-8 py-4 rounded-xl transition-colors"
      >
        Back to Camp DaddyMan
      </Link>
    </div>
  );
}
