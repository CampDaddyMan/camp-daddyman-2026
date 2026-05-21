import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Polls',
  description: 'Vote on content, artists, and community decisions at Camp DaddyMan.',
  openGraph: {
    title: 'Polls — Camp DaddyMan',
    description: 'Vote on content, artists, and community decisions.',
    type: 'website',
  },
};

export default function PollsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
