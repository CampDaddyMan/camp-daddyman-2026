'use client';
import { usePathname } from 'next/navigation';

export default function ConditionalFooter() {
  const pathname = usePathname();
  if (pathname?.startsWith('/embed/')) return null;
  return (
    <footer className="border-t border-surface-700 py-8 text-center text-sm text-gray-500">
      © {new Date().getFullYear()} Camp DaddyMan. All rights reserved.
    </footer>
  );
}
