import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Page Not Found' };

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <p className="text-7xl font-bold text-surface-600 mb-4">404</p>
        <h1 className="text-2xl font-bold text-white mb-3">Page not found</h1>
        <p className="text-gray-400 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/"
            className="bg-brand-500 hover:bg-brand-600 text-black font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
          >
            Go home
          </Link>
          <Link
            href="/browse"
            className="bg-surface-700 hover:bg-surface-600 text-white px-6 py-3 rounded-xl text-sm font-medium transition-colors"
          >
            Browse content
          </Link>
        </div>
      </div>
    </div>
  );
}
