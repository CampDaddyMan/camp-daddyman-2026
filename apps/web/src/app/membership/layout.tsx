import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Membership',
  description: 'Join Camp DaddyMan. Free, Pro, and Creator plans — access exclusive content, support independent creators, and become part of the Camp.',
  openGraph: {
    title: 'Membership — Camp DaddyMan',
    description: 'Join Camp DaddyMan. Free, Pro, and Creator plans — access exclusive content and support independent creators.',
    type: 'website',
  },
};

export default function MembershipLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
