import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Account Suspended' };

export default function BannedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <p className="text-5xl mb-6">🚫</p>
        <h1 className="text-2xl font-bold text-white mb-3">Account Suspended</h1>
        <p className="text-gray-400 mb-6">
          Your account has been suspended for violating our community guidelines.
          If you believe this is a mistake, please contact us.
        </p>
        <Link
          href="mailto:support@campdaddyman.com"
          className="inline-block bg-brand-500 hover:bg-brand-600 text-black font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
        >
          Contact Support
        </Link>
      </div>
    </div>
  );
}
