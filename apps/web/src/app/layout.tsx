import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import Navbar from '@/components/layout/Navbar';

export const metadata: Metadata = {
  title: 'Camp DaddyMan',
  description: 'Music, film, teachings, and community content rooted in the DaddyMan philosophy.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Navbar />
          <main className="min-h-screen">{children}</main>
          <footer className="border-t border-surface-700 py-8 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} Camp DaddyMan. All rights reserved.
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
