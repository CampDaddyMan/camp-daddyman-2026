import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Liked',
  description: 'All the content you\'ve liked on Camp DaddyMan.',
};

export default function LikedLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
