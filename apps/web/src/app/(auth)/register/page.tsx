'use client';
import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: '', username: '', password: '', displayName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value }),
  });

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">Join Camp DaddyMan</h1>
          <p className="text-gray-400 mt-1">Create your account and be part of the movement</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface-800 rounded-2xl p-8 space-y-5">
          {error && <p className="text-red-400 text-sm bg-red-400/10 px-4 py-3 rounded-lg">{error}</p>}

          <div>
            <label className="block text-sm text-gray-300 mb-1.5">Display Name</label>
            <input {...field('displayName')} type="text" placeholder="Your name"
              className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400 transition-colors" />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1.5">Username</label>
            <input {...field('username')} type="text" required placeholder="yourusername"
              className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400 transition-colors" />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1.5">Email</label>
            <input {...field('email')} type="email" required placeholder="you@example.com"
              className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400 transition-colors" />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1.5">Password</label>
            <input {...field('password')} type="password" required placeholder="••••••••" minLength={6}
              className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400 transition-colors" />
          </div>

          <Button type="submit" disabled={loading} size="lg" className="w-full">
            {loading ? 'Creating account...' : 'Create account'}
          </Button>

          <p className="text-center text-sm text-gray-400">
            Already have an account?{' '}
            <Link href="/login" className="text-brand-400 hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
