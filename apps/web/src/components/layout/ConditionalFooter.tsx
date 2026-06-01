'use client';
import { usePathname } from 'next/navigation';
import NewsletterSignup from '@/components/ui/NewsletterSignup';

export default function ConditionalFooter() {
  const pathname = usePathname();
  if (pathname?.startsWith('/embed/')) return null;
  return (
    <footer className="border-t border-surface-700 mt-12">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h3 className="text-white font-bold text-lg mb-1">Stay in the loop</h3>
          <p className="text-gray-500 text-sm mb-5">New drops, exclusives, and camp news — straight to your inbox.</p>
          <div className="max-w-md mx-auto">
            <NewsletterSignup source="footer" />
          </div>
        </div>
        <p className="text-center text-sm text-gray-600">
          © {new Date().getFullYear()} Camp DaddyMan. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
