export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { PlayerProvider } from '@/context/PlayerContext';
import Navbar from '@/components/layout/Navbar';
import MiniPlayer from '@/components/layout/MiniPlayer';
import ConditionalFooter from '@/components/layout/ConditionalFooter';
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://campdaddyman.com';
const DEFAULT_OG_IMAGE = `${SITE_URL}/CAMPDADDYMAN_GOLD_MEMBERSHIP_LOGO-V4.png`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Camp DaddyMan',
    template: '%s — Camp DaddyMan',
  },
  description: 'Music, film, teachings, and community content rooted in the DaddyMan philosophy.',
  icons: {
    icon: '/CAMPDADDYMAN_GOLD_MEMBERSHIP_LOGO-V4.png',
    apple: '/CAMPDADDYMAN_GOLD_MEMBERSHIP_LOGO-V4.png',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Camp DaddyMan',
  },
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

async function getCustomCss(): Promise<string> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
    const res = await fetch(`${apiUrl}/site-settings/css`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return '';
    const data = await res.json();
    return data.css || '';
  } catch {
    return '';
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const customCss = await getCustomCss();

  return (
    <html lang="en">
      <body>
        {customCss && (
          <style dangerouslySetInnerHTML={{ __html: customCss }} />
        )}
        <ServiceWorkerRegistrar />
        <AuthProvider>
          <CartProvider>
            <PlayerProvider>
              <Navbar />
              <main className="min-h-screen pb-24">{children}</main>
              <ConditionalFooter />
              <MiniPlayer />
            </PlayerProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
