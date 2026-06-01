'use client';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function JoinPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();

  useEffect(() => {
    if (code) {
      try { localStorage.setItem('referralCode', code.toLowerCase()); } catch {}
    }
    router.replace('/register');
  }, [code, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400 text-sm">Taking you to sign up…</p>
    </div>
  );
}
