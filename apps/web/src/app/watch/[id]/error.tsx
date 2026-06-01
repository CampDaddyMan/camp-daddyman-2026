'use client';
import Link from 'next/link';

export default function WatchError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-20 text-center text-gray-400">
      <p className="text-5xl mb-4">🎬</p>
      <p className="text-lg font-medium text-white mb-2">Unable to load this video</p>
      <p className="text-sm mb-8">The video may have moved or there was a connection issue.</p>
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={reset}
          className="px-5 py-2 bg-brand-500 hover:bg-brand-400 text-black font-semibold rounded-lg transition-colors text-sm"
        >
          Try again
        </button>
        <Link href="/browse" className="text-sm text-gray-500 hover:text-brand-400 transition-colors">
          ← Browse content
        </Link>
      </div>
    </div>
  );
}
