import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Following',
  description: 'Latest content from the creators you follow on Camp DaddyMan.',
};

export default function FeedLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
