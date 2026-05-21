import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Watch Later — Camp DaddyMan',
  description: 'Your saved content on Camp DaddyMan.',
};

export default function SavedLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
