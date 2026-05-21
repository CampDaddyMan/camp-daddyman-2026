import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Watch History',
  description: 'Your recently watched content on Camp DaddyMan.',
};

export default function HistoryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
