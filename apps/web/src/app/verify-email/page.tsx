'use client';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';

function VerifyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) { setStatus('error'); setMessage('No token provided.'); return; }
    api.get(`/auth/verify-email?token=${token}`)
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.error || 'Verification failed.');
      });
  }, [token]);

  return (
    <div className="text-center space-y-4">
      {status === 'loading' && (
        <>
          <div className="w-10 h-10 border-2 border-brand-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400">Verifying your email...</p>
        </>
      )}
      {status === 'success' && (
        <>
          <p className="text-5xl">🎉</p>
          <p className="text-xl font-bold text-white">Email verified!</p>
          <p className="text-gray-400 text-sm">Your account is fully activated. Welcome to Camp DaddyMan.</p>
          <Link href="/dashboard"
            className="inline-block mt-4 bg-brand-500 hover:bg-brand-600 text-black font-semibold px-6 py-3 rounded-xl text-sm transition-colors">
            Go to dashboard
          </Link>
        </>
      )}
      {status === 'error' && (
        <>
          <p className="text-4xl">⚠️</p>
          <p className="text-white font-semibold">Verification failed</p>
          <p className="text-gray-400 text-sm">{message}</p>
          <Link href="/dashboard"
            className="inline-block mt-4 text-brand-400 hover:underline text-sm">
            Resend verification email
          </Link>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#0f0f17]">
      <div className="w-full max-w-md bg-surface-800 rounded-2xl p-10">
        <Suspense>
          <VerifyContent />
        </Suspense>
      </div>
    </div>
  );
}
