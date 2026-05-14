'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (searchQuery.trim().length < 2) return;
    router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    setSearchQuery('');
    setOpen(false);
  }

  return (
    <nav className="sticky top-0 z-50 bg-surface-900/90 backdrop-blur border-b border-surface-700">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-full overflow-hidden ring-1 ring-brand-500/40 group-hover:ring-brand-400/60 transition-all shadow-[0_0_12px_rgba(232,184,0,0.15)]">
            <Image
              src="/CAMPDADDYMAN_GOLD_MEMBERSHIP_LOGO-V4.png"
              alt="Camp DaddyMan"
              width={36}
              height={36}
              className="object-cover"
            />
          </div>
          <span className="text-brand-400 font-bold text-lg tracking-tight leading-none">Camp DaddyMan</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6 text-sm">
          <Link href="/" className="text-gray-300 hover:text-white transition-colors">Home</Link>
          <Link href="/browse" className="text-gray-300 hover:text-white transition-colors">Browse</Link>
          <Link href="/browse?type=MUSIC" className="text-gray-300 hover:text-white transition-colors">Music</Link>
          <Link href="/browse?type=FILM" className="text-gray-300 hover:text-white transition-colors">Film</Link>
          <Link href="/browse?type=PODCAST" className="text-gray-300 hover:text-white transition-colors">Podcasts</Link>
          <Link href="/browse?type=SPOKEN_WORD" className="text-gray-300 hover:text-white transition-colors">Spoken Word</Link>
        </div>

        {/* Desktop search */}
        <form onSubmit={handleSearch} className="hidden md:flex items-center gap-2">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-1.5 text-sm w-48 focus:outline-none focus:border-brand-400 focus:w-64 transition-all"
          />
          <button type="submit" className="text-gray-400 hover:text-brand-400 transition-colors text-lg leading-none">
            🔍
          </button>
        </form>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <Link href="/feed" className="text-sm text-gray-300 hover:text-white transition-colors">Following</Link>
              <NotificationBell />
              <Link href="/dashboard" className="text-sm text-gray-300 hover:text-white transition-colors">
                {user.displayName || user.username}
              </Link>
              {user.isAdmin && (
                <Link href="/admin" className="text-xs bg-brand-500 text-black px-3 py-1 rounded-full font-semibold">
                  Admin
                </Link>
              )}
              <Link href="/upload" className="text-sm bg-surface-600 hover:bg-surface-500 px-4 py-2 rounded-lg transition-colors">
                Upload
              </Link>
              <button onClick={logout} className="text-sm text-gray-400 hover:text-white transition-colors">
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-gray-300 hover:text-white transition-colors">Sign in</Link>
              <Link href="/register" className="text-sm bg-brand-500 hover:bg-brand-600 text-black px-4 py-2 rounded-lg font-semibold transition-colors">
                Join
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden text-gray-400 hover:text-white" onClick={() => setOpen(!open)}>
          {open ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-surface-800 border-t border-surface-700 px-4 py-4 flex flex-col gap-4 text-sm">
          <Link href="/" onClick={() => setOpen(false)} className="text-gray-300">Home</Link>
          <Link href="/browse" onClick={() => setOpen(false)} className="text-gray-300">Browse</Link>
          <Link href="/browse?type=MUSIC" onClick={() => setOpen(false)} className="text-gray-300">Music</Link>
          <Link href="/browse?type=FILM" onClick={() => setOpen(false)} className="text-gray-300">Film</Link>
          <Link href="/browse?type=PODCAST" onClick={() => setOpen(false)} className="text-gray-300">Podcasts</Link>
          <Link href="/browse?type=SPOKEN_WORD" onClick={() => setOpen(false)} className="text-gray-300">Spoken Word</Link>
          {/* Mobile search */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="flex-1 bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400 transition-colors"
            />
            <button type="submit" className="bg-brand-500 text-black px-3 py-2 rounded-lg text-sm font-semibold">
              Go
            </button>
          </form>
          {user ? (
            <>
              <Link href="/feed" onClick={() => setOpen(false)} className="text-gray-300">Following</Link>
              <Link href="/notifications" onClick={() => setOpen(false)} className="text-gray-300">Notifications</Link>
              <Link href="/dashboard" onClick={() => setOpen(false)} className="text-gray-300">Dashboard</Link>
              <Link href="/upload" onClick={() => setOpen(false)} className="text-gray-300">Upload</Link>
              {user.isAdmin && <Link href="/admin" onClick={() => setOpen(false)} className="text-brand-400">Admin</Link>}
              <button onClick={() => { logout(); setOpen(false); }} className="text-left text-gray-400">Sign out</button>
            </>
          ) : (
            <>
              <Link href="/login" onClick={() => setOpen(false)} className="text-gray-300">Sign in</Link>
              <Link href="/register" onClick={() => setOpen(false)} className="text-brand-400 font-semibold">Join</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
