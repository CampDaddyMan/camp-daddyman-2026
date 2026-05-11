'use client';
import { useState, FormEvent } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import Button from '@/components/ui/Button';

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">Reset your password</h1>
          <p className="text-gray-400 mt-1">Enter your email and we'll send you a reset link</p>
        </div>

        <div className="bg-surface-800 rounded-2xl p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <p className="text-4xl">📬</p>
              <p className="text-white font-semibold">Check your email</p>
              <p className="text-gray-400 text-sm">
                If <strong className="text-white">{email}</strong> has an account, a reset link is on its way. It expires in 1 hour.
              </p>
              <Link href="/login" className="block text-brand-400 hover:underline text-sm mt-4">
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && <p className="text-red-400 text-sm bg-red-400/10 px-4 py-3 rounded-lg">{error}</p>}

              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Email address</label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  required placeholder="you@example.com"
                  className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400 transition-colors"
                />
              </div>

              <Button type="submit" disabled={loading || !email} size="lg" className="w-full">
                {loading ? 'Sending...' : 'Send reset link'}
              </Button>

              <p className="text-center text-sm text-gray-400">
                <Link href="/login" className="text-brand-400 hover:underline">Back to sign in</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
