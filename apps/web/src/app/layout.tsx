import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import Navbar from '@/components/layout/Navbar';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://campdaddyman.com';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Camp DaddyMan',
    template: '%s — Camp DaddyMan',
  },
  description: 'Music, film, teachings, and community content rooted in the DaddyMan philosophy.',
  openGraph: {
    siteName: 'Camp DaddyMan',
    title: 'Camp DaddyMan',
    description: 'Music, film, teachings, and community content rooted in the DaddyMan philosophy.',
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Camp DaddyMan',
    description: 'Music, film, teachings, and community content rooted in the DaddyMan philosophy.',
    images: [DEFAULT_OG_IMAGE],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <CartProvider>
          <Navbar />
          <main className="min-h-screen">{children}</main>
          <footer className="border-t border-surface-700 py-8 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} Camp DaddyMan. All rights reserved.
          </footer>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
