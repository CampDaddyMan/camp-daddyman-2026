import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Notifications',
  description: 'Your notifications on Camp DaddyMan.',
};

export default function NotificationsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
