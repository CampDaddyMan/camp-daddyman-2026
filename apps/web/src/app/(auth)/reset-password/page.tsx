'use client';
import { useState, FormEvent, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import Button from '@/components/ui/Button';

function ResetForm() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const token        = searchParams.get('token') || '';

  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/reset-password', { token, password });
      setSuccess(true);
      setTimeout(() => router.push('/login'), 2500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  }

  if (!token) return (
    <div className="text-center space-y-4">
      <p className="text-4xl">⚠️</p>
      <p className="text-white font-semibold">Invalid link</p>
      <p className="text-gray-400 text-sm">This reset link is missing or malformed.</p>
      <Link href="/forgot-password" className="text-brand-400 hover:underline text-sm">Request a new link</Link>
    </div>
  );

  if (success) return (
    <div className="text-center space-y-4">
      <p className="text-4xl">✅</p>
      <p className="text-white font-semibold">Password updated!</p>
      <p className="text-gray-400 text-sm">Redirecting you to sign in...</p>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <p className="text-red-400 text-sm bg-red-400/10 px-4 py-3 rounded-lg">{error}</p>}

      <div>
        <label className="block text-sm text-gray-300 mb-1.5">New password</label>
        <input
          type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          required minLength={6} placeholder="At least 6 characters"
          className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400 transition-colors"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-300 mb-1.5">Confirm password</label>
        <input
          type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
          required placeholder="Repeat your new password"
          className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400 transition-colors"
        />
      </div>

      <Button type="submit" disabled={loading || !password || !confirm} size="lg" className="w-full">
        {loading ? 'Updating...' : 'Set new password'}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">Set a new password</h1>
          <p className="text-gray-400 mt-1">Choose something strong that you'll remember</p>
        </div>
        <div className="bg-surface-800 rounded-2xl p-8">
          <Suspense>
            <ResetForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
