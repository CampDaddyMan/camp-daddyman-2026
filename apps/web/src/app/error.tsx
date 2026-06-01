'use client';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 text-center text-gray-400">
      <div>
        <p className="text-5xl mb-4">⚠️</p>
        <p className="text-xl font-bold text-white mb-2">Something went wrong</p>
        <p className="text-sm mb-8 max-w-sm mx-auto leading-relaxed">
          We hit an unexpected error. Your account and content are safe — this is just a hiccup.
        </p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={reset}
            className="px-5 py-2 bg-brand-500 hover:bg-brand-400 text-black font-semibold rounded-lg transition-colors text-sm"
          >
            Try again
          </button>
          <Link href="/" className="text-sm text-gray-500 hover:text-brand-400 transition-colors">
            ← Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
