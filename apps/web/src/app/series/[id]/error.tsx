'use client';
import Link from 'next/link';

export default function SeriesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-20 text-center text-gray-400">
      <p className="text-5xl mb-4">📺</p>
      <p className="text-lg font-medium text-white mb-2">Something went wrong loading this series</p>
      <p className="text-sm mb-8">
        {error.message || 'An unexpected error occurred. Please try again.'}
      </p>
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={reset}
          className="px-5 py-2 bg-brand-500 hover:bg-brand-400 text-black font-semibold rounded-lg transition-colors text-sm"
        >
          Try again
        </button>
        <Link href="/series" className="text-sm text-gray-500 hover:text-brand-400 transition-colors">
          ← All Series
        </Link>
      </div>
    </div>
  );
}
