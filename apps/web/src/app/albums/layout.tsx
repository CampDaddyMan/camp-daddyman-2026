import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Albums & Releases',
  description: 'Albums, EPs, singles, and compilations from Camp DaddyMan creators.',
  openGraph: {
    title: 'Albums & Releases — Camp DaddyMan',
    description: 'Albums, EPs, singles, and compilations from Camp DaddyMan creators.',
    type: 'website',
  },
};

export default function AlbumsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
