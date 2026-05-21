import { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://campdaddyman.com';

export const metadata: Metadata = {
  title: 'The Ark — Official Store',
  description: 'Merch, music, movies, monographs and more from Camp DaddyMan. Official store.',
  openGraph: {
    title: 'The Ark — Camp DaddyMan Official Store',
    description: 'Merch, music, movies, monographs and more from Camp DaddyMan.',
    images: [{ url: `${SITE_URL}/CAMPDADDYMAN_GOLD_MEMBERSHIP_LOGO-V4.png`, width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Ark — Camp DaddyMan Official Store',
    description: 'Merch, music, movies, monographs and more from Camp DaddyMan.',
  },
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
