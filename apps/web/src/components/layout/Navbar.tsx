'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-surface-900/90 backdrop-blur border-b border-surface-700">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        <Link href="/" className="text-brand-400 font-bold text-xl tracking-tight">
          Camp DaddyMan
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6 text-sm">
          <Link href="/" className="text-gray-300 hover:text-white transition-colors">Browse</Link>
          <Link href="/?type=MUSIC" className="text-gray-300 hover:text-white transition-colors">Music</Link>
          <Link href="/?type=FILM" className="text-gray-300 hover:text-white transition-colors">Film</Link>
          <Link href="/?type=PODCAST" className="text-gray-300 hover:text-white transition-colors">Podcasts</Link>
          <Link href="/?type=SPOKEN_WORD" className="text-gray-300 hover:text-white transition-colors">Spoken Word</Link>
        </div>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
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
          <Link href="/" onClick={() => setOpen(false)} className="text-gray-300">Browse</Link>
          <Link href="/?type=MUSIC" onClick={() => setOpen(false)} className="text-gray-300">Music</Link>
          <Link href="/?type=FILM" onClick={() => setOpen(false)} className="text-gray-300">Film</Link>
          <Link href="/?type=PODCAST" onClick={() => setOpen(false)} className="text-gray-300">Podcasts</Link>
          <Link href="/?type=SPOKEN_WORD" onClick={() => setOpen(false)} className="text-gray-300">Spoken Word</Link>
          {user ? (
            <>
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
