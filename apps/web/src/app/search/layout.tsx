import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search for music, films, podcasts, spoken word, books, and creators on Camp DaddyMan.',
  openGraph: {
    title: 'Search — Camp DaddyMan',
    description: 'Search for music, films, podcasts, spoken word, books, and creators.',
    type: 'website',
  },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
