'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

function UnsubscribeContent() {
  const params = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (!token) { setStatus('error'); return; }
    api.get(`/newsletter/unsubscribe?token=${encodeURIComponent(token)}`)
      .then((r) => { setEmail(r.data.email); setStatus('success'); })
      .catch(() => setStatus('error'));
  }, [token]);

  if (status === 'loading') return <p className="text-gray-400">Unsubscribing…</p>;

  if (status === 'success') return (
    <>
      <p className="text-4xl mb-4">👋</p>
      <h1 className="text-2xl font-bold text-white mb-2">You've been unsubscribed</h1>
      <p className="text-gray-400 text-sm mb-6">{email} will no longer receive newsletter emails from Camp DaddyMan.</p>
      <Link href="/" className="text-brand-400 hover:text-brand-300 text-sm underline">Go back to Camp DaddyMan</Link>
    </>
  );

  return (
    <>
      <p className="text-4xl mb-4">❌</p>
      <h1 className="text-2xl font-bold text-white mb-2">Invalid link</h1>
      <p className="text-gray-400 text-sm mb-6">This unsubscribe link is invalid or has already been used.</p>
      <Link href="/" className="text-brand-400 hover:text-brand-300 text-sm underline">Go back to Camp DaddyMan</Link>
    </>
  );
}

export default function UnsubscribePage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <Suspense fallback={<p className="text-gray-400">Loading…</p>}>
          <UnsubscribeContent />
        </Suspense>
      </div>
    </div>
  );
}
