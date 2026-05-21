import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Browse',
  description: 'Stream music, films, podcasts, spoken word, teachings, and books from independent creators on Camp DaddyMan.',
  openGraph: {
    title: 'Browse All Content — Camp DaddyMan',
    description: 'Stream music, films, podcasts, spoken word, teachings, and books from independent creators.',
    type: 'website',
  },
};

export default function BrowseLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
