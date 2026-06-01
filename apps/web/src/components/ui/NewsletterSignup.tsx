'use client';
import { useState } from 'react';
import api from '@/lib/api';

export default function NewsletterSignup({ source = 'website', compact = false }: { source?: string; compact?: boolean }) {
  const [email, setEmail]       = useState('');
  const [status, setStatus]     = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage]   = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('loading');
    try {
      const { data } = await api.post('/newsletter/subscribe', { email: email.trim(), source });
      if (data.alreadySubscribed) {
        setMessage("You're already on the list!");
      } else if (data.resubscribed) {
        setMessage("Welcome back! You've been re-subscribed.");
      } else {
        setMessage("You're in! Check your inbox for a welcome email.");
      }
      setStatus('success');
      setEmail('');
    } catch (err: any) {
      setMessage(err.response?.data?.error || 'Something went wrong. Try again.');
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <p className={`text-brand-400 font-medium ${compact ? 'text-sm' : 'text-base'}`}>
        ✓ {message}
      </p>
    );
  }

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email"
          required
          className="flex-1 min-w-0 bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400 transition-colors"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="flex-shrink-0 bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-black font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
        >
          {status === 'loading' ? '…' : 'Join'}
        </button>
      </form>
    );
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email address"
          required
          className="flex-1 bg-surface-700 border border-surface-600 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 transition-colors"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="flex-shrink-0 bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-black font-bold px-6 py-3 rounded-xl text-sm transition-colors"
        >
          {status === 'loading' ? 'Joining…' : 'Join the family'}
        </button>
      </form>
      {status === 'error' && (
        <p className="text-red-400 text-sm mt-2">{message}</p>
      )}
    </div>
  );
}
