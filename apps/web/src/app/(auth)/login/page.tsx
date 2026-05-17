'use client';
import { useState, FormEvent, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import api from '@/lib/api';
import { getDeviceId, getDeviceLabel } from '@/lib/device';

type Step = 'credentials' | 'verify_2fa' | 'conflict';

interface ActiveSession {
  deviceLabel: string;
  ipAddress: string;
  lastActiveAt: string;
}

export default function LoginPage() {
  const { setAuth } = useAuth();
  const router = useRouter();

  const [step, setStep]                 = useState<Step>('credentials');
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [code, setCode]                 = useState('');
  const [challengeId, setChallengeId]   = useState('');
  const [forceId, setForceId]           = useState('');
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);

  const [deviceId, setDeviceId]         = useState('');
  const [deviceLabel, setDeviceLabel]   = useState('');

  useEffect(() => {
    setDeviceId(getDeviceId());
    setDeviceLabel(getDeviceLabel());
  }, []);

  async function handleCredentials(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password, deviceId, deviceLabel });

      if (data.token) {
        setAuth(data.token, data.user);
        router.push('/dashboard');
        return;
      }

      setChallengeId(data.challengeId);
      if (data.activeSession) setActiveSession(data.activeSession);
      setStep('verify_2fa');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Login failed. Check your credentials.');
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

      if (data.token) {
        setAuth(data.token, data.user);
        router.push('/dashboard');
        return;
      }

      if (data.requiresForce) {
        setForceId(data.forceId);
        setActiveSession(data.activeSession);
        setStep('conflict');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Verification failed. Check your code.');
    } finally {
      setLoading(false);
    }
  }

  async function handleForceLogin() {
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/force-login', { forceId });
      setAuth(data.token, data.user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Something went wrong. Please sign in again.');
      setStep('credentials');
    } finally {
      setLoading(false);
    }
  }

  const inputCls = 'w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400 transition-colors';

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* ── Step 1: Credentials ── */}
        {step === 'credentials' && (
          <>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-white">Welcome back</h1>
              <p className="text-gray-400 mt-1">Sign in to your Camp DaddyMan account</p>
            </div>
            <form onSubmit={handleCredentials} className="bg-surface-800 rounded-2xl p-8 space-y-5">
              {error && <p className="text-red-400 text-sm bg-red-400/10 px-4 py-3 rounded-lg">{error}</p>}
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  className={inputCls} placeholder="you@example.com" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm text-gray-300">Password</label>
                  <Link href="/forgot-password" className="text-xs text-brand-400 hover:underline">Forgot password?</Link>
                </div>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                  className={inputCls} placeholder="••••••••" />
              </div>
              <Button type="submit" disabled={loading} size="lg" className="w-full">
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
              <p className="text-center text-sm text-gray-400">
                No account?{' '}
                <Link href="/register" className="text-brand-400 hover:underline">Join Camp DaddyMan</Link>
              </p>
            </form>
          </>
        )}

        {/* ── Step 2: 2FA ── */}
        {step === 'verify_2fa' && (
          <>
            <div className="text-center mb-8">
              <div className="text-4xl mb-3">📧</div>
              <h1 className="text-2xl font-bold text-white">Check your email</h1>
              <p className="text-gray-400 mt-1">
                We sent a 6-digit code to <span className="text-white font-medium">{email}</span>
              </p>
              {activeSession && (
                <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3 text-left">
                  <p className="text-yellow-400 text-xs font-semibold uppercase tracking-wide mb-1">Active session detected</p>
                  <p className="text-gray-300 text-sm">
                    Your account is currently signed in on <strong className="text-white">{activeSession.deviceLabel}</strong>
                    {' '}({activeSession.ipAddress}). Verify your code to manage that session.
                  </p>
                </div>
              )}
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
                {loading ? 'Verifying...' : 'Verify code'}
              </Button>
              <button
                type="button"
                onClick={() => { setStep('credentials'); setCode(''); setError(''); }}
                className="w-full text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                ← Back to sign in
              </button>
            </form>
          </>
        )}

        {/* ── Step 3: Conflict resolution ── */}
        {step === 'conflict' && activeSession && (
          <>
            <div className="text-center mb-8">
              <div className="text-4xl mb-3">⚠️</div>
              <h1 className="text-2xl font-bold text-white">Account already active</h1>
              <p className="text-gray-400 mt-1">Your account is signed in on another device.</p>
            </div>
            <div className="bg-surface-800 rounded-2xl p-8 space-y-6">
              {error && <p className="text-red-400 text-sm bg-red-400/10 px-4 py-3 rounded-lg">{error}</p>}

              <div className="bg-surface-700 rounded-xl p-4 space-y-2">
                <p className="text-xs text-gray-400 uppercase tracking-widest">Currently active on</p>
                <p className="text-white font-semibold">{activeSession.deviceLabel}</p>
                <p className="text-gray-400 text-sm">IP: {activeSession.ipAddress}</p>
                <p className="text-gray-500 text-xs">
                  Last active: {new Date(activeSession.lastActiveAt).toLocaleString()}
                </p>
              </div>

              <p className="text-gray-400 text-sm">
                Only one active session is allowed per account. Signing in here will log out the other device.
              </p>

              <div className="space-y-3">
                <Button
                  onClick={handleForceLogin}
                  disabled={loading}
                  size="lg"
                  className="w-full"
                >
                  {loading ? 'Signing in...' : 'Log out other device & continue'}
                </Button>
                <button
                  type="button"
                  onClick={() => { setStep('credentials'); setCode(''); setError(''); }}
                  className="w-full text-sm text-gray-500 hover:text-gray-300 transition-colors py-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
