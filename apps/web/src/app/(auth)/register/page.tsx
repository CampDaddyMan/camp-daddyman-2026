'use client';
import { useState, FormEvent, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import api from '@/lib/api';
import { getDeviceId, getDeviceLabel } from '@/lib/device';

type Step = 'form' | 'verify_2fa';

export default function RegisterPage() {
  const { setAuth } = useAuth();
  const router = useRouter();

  const [step, setStep]               = useState<Step>('form');
  const [form, setForm]               = useState({ email: '', username: '', password: '', displayName: '' });
  const [code, setCode]               = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);

  const [deviceId, setDeviceId]       = useState('');
  const [deviceLabel, setDeviceLabel] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [referredBy, setReferredBy]     = useState('');

  useEffect(() => {
    setDeviceId(getDeviceId());
    setDeviceLabel(getDeviceLabel());
    try {
      const stored = localStorage.getItem('referralCode');
      if (stored) { setReferralCode(stored); setReferredBy(stored); }
    } catch {}
  }, []);

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', { ...form, deviceId, deviceLabel, referralCode: referralCode || undefined });
      setChallengeId(data.challengeId);
      setStep('verify_2fa');
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.response?.data?.errors?.[0]?.msg || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify2FA(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-2fa', { challengeId, code });
      setAuth(data.token, data.user);
      try { localStorage.removeItem('referralCode'); } catch {}
      const next = new URLSearchParams(window.location.search).get('next');
      router.push(next || '/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Verification failed. Check your code.');
    } finally {
      setLoading(false);
    }
  }

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value }),
  });

  const inputCls = 'w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400 transition-colors';

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* ── Step 1: Registration form ── */}
        {step === 'form' && (
          <>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-white">Join Camp DaddyMan</h1>
              <p className="text-gray-400 mt-1">Create your account and be part of the movement</p>
            </div>
            <form onSubmit={handleRegister} className="bg-surface-800 rounded-2xl p-8 space-y-5">
              {referredBy && (
                <p className="text-brand-400 text-sm bg-brand-500/10 border border-brand-500/20 px-4 py-3 rounded-lg text-center">
                  🎉 Invited by <strong>@{referredBy}</strong>
                </p>
              )}
              {error && <p className="text-red-400 text-sm bg-red-400/10 px-4 py-3 rounded-lg">{error}</p>}
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Display Name</label>
                <input {...field('displayName')} type="text" placeholder="Your name" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Username</label>
                <input {...field('username')} type="text" required placeholder="yourusername" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Email</label>
                <input {...field('email')} type="email" required placeholder="you@example.com" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Password</label>
                <input {...field('password')} type="password" required placeholder="••••••••" minLength={6} className={inputCls} />
              </div>
              <Button type="submit" disabled={loading} size="lg" className="w-full">
                {loading ? 'Creating account...' : 'Create account'}
              </Button>
              <p className="text-center text-sm text-gray-400">
                Already have an account?{' '}
                <Link href="/login" className="text-brand-400 hover:underline">Sign in</Link>
              </p>
            </form>
          </>
        )}

        {/* ── Step 2: 2FA verification ── */}
        {step === 'verify_2fa' && (
          <>
            <div className="text-center mb-8">
              <div className="text-4xl mb-3">📧</div>
              <h1 className="text-2xl font-bold text-white">Verify your email</h1>
              <p className="text-gray-400 mt-1">
                We sent a 6-digit code to <span className="text-white font-medium">{form.email}</span>
              </p>
              <p className="text-gray-500 text-sm mt-2">Enter the code to activate your account.</p>
            </div>
            <form onSubmit={handleVerify2FA} className="bg-surface-800 rounded-2xl p-8 space-y-5">
              {error && <p className="text-red-400 text-sm bg-red-400/10 px-4 py-3 rounded-lg">{error}</p>}
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Verification code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  required
                  autoFocus
                  className={`${inputCls} text-center text-2xl font-mono tracking-widest`}
                  placeholder="000000"
                />
                <p className="text-gray-500 text-xs mt-2">Code expires in 10 minutes.</p>
              </div>
              <Button type="submit" disabled={loading || code.length !== 6} size="lg" className="w-full">
                {loading ? 'Verifying...' : 'Verify & activate account'}
              </Button>
              <button
                type="button"
                onClick={() => { setStep('form'); setCode(''); setError(''); }}
                className="w-full text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                ← Back
              </button>
            </form>
          </>
        )}

      </div>
    </div>
  );
}
