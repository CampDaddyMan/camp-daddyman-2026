'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useRef, useEffect, FormEvent } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useProfile } from '@/context/ProfileContext';
import NotificationBell from './NotificationBell';

function IconCart() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconChevron({ open }: { open: boolean }) {
  return (
    <svg
      width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round"
      className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function MobileSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-4 pt-4 pb-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1 px-3">{label}</p>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

function MobileLink({ href, onClick, accent, children }: { href: string; onClick: () => void; accent?: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`px-3 py-2.5 text-sm rounded-lg transition-colors ${accent ? 'text-brand-400 font-semibold hover:text-brand-300' : 'text-gray-300 hover:text-white hover:bg-surface-800'}`}
    >
      {children}
    </Link>
  );
}

const BROWSE_ITEMS = [
  { label: 'All Content', href: '/browse' },
  { label: 'Music', href: '/browse?type=MUSIC' },
  { label: 'Film', href: '/browse?type=FILM' },
  { label: 'Podcasts', href: '/browse?type=PODCAST' },
  { label: 'Spoken Word', href: '/browse?type=SPOKEN_WORD' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { totalItems } = useCart();
  const { activeProfile } = useProfile();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const browseRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (browseRef.current && !browseRef.current.contains(e.target as Node)) {
        setBrowseOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setBrowseOpen(false);
  }, [pathname]);

  if (pathname?.startsWith('/embed/')) return null;

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (searchQuery.trim().length < 2) return;
    router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    setSearchQuery('');
    setMobileOpen(false);
  }

  const isBrowseActive = pathname?.startsWith('/browse');

  return (
    <nav
      className="sticky top-0 z-50 bg-surface-900/95 backdrop-blur border-b-0"
      style={{ boxShadow: '0 1px 0 0 rgba(0,155,58,0.4), 0 2px 0 0 rgba(232,184,0,0.2)' }}
    >
      <div className="max-w-7xl mx-auto px-4 flex items-center h-16 gap-3">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group shrink-0 mr-1">
          <div className="w-9 h-9 rounded-full overflow-hidden ring-1 ring-brand-500/40 group-hover:ring-brand-400/60 transition-all shadow-[0_0_12px_rgba(232,184,0,0.15)]">
            <Image
              src="/CAMPDADDYMAN_GOLD_MEMBERSHIP_LOGO-V4.png"
              alt="Camp DaddyMan"
              width={36}
              height={36}
              className="object-cover"
            />
          </div>
          <span className="text-brand-400 font-bold text-lg tracking-tight leading-none hidden lg:block">Camp DaddyMan</span>
        </Link>

        {/* Desktop center nav */}
        <div className="hidden md:flex items-center gap-0.5 flex-1">

          <Link
            href="/"
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${pathname === '/' ? 'text-white bg-surface-700' : 'text-gray-300 hover:text-white hover:bg-surface-800'}`}
          >
            Home
          </Link>

          {/* Browse dropdown */}
          <div ref={browseRef} className="relative">
            <button
              onClick={() => setBrowseOpen(!browseOpen)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                browseOpen || isBrowseActive
                  ? 'text-white bg-surface-700'
                  : 'text-gray-300 hover:text-white hover:bg-surface-800'
              }`}
            >
              Browse
              <IconChevron open={browseOpen} />
            </button>
            {browseOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-48 bg-surface-800 border border-surface-600/60 rounded-xl shadow-2xl overflow-hidden z-50 py-1">
                {BROWSE_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setBrowseOpen(false)}
                    className="block px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-surface-700 transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/journey"
            className={`px-3 py-2 rounded-lg text-sm font-bold transition-colors ${pathname?.startsWith('/journey') ? 'text-brand-400 bg-brand-500/10' : 'text-brand-400 hover:bg-brand-500/10'}`}
          >
            Journey
          </Link>
          <Link
            href="/live"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${pathname?.startsWith('/live') ? 'text-white bg-surface-700' : 'text-gray-300 hover:text-white hover:bg-surface-800'}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            Live
          </Link>
          <Link
            href="/series"
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${pathname?.startsWith('/series') ? 'text-white bg-surface-700' : 'text-gray-300 hover:text-white hover:bg-surface-800'}`}
          >
            Series
          </Link>
          <Link
            href="/albums"
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${pathname?.startsWith('/albums') ? 'text-white bg-surface-700' : 'text-gray-300 hover:text-white hover:bg-surface-800'}`}
          >
            Albums
          </Link>
          <Link
            href="/polls"
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${pathname === '/polls' ? 'text-white bg-surface-700' : 'text-gray-300 hover:text-white hover:bg-surface-800'}`}
          >
            Polls
          </Link>
          <Link
            href="/partners"
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${pathname === '/partners' ? 'text-white bg-surface-700' : 'text-gray-300 hover:text-white hover:bg-surface-800'}`}
          >
            Partners
          </Link>
          <Link
            href="/leaderboard"
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${pathname === '/leaderboard' ? 'text-white bg-surface-700' : 'text-gray-300 hover:text-white hover:bg-surface-800'}`}
          >
            🏆 Leaderboard
          </Link>
          <Link
            href="/loyalty"
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${pathname === '/loyalty' ? 'text-white bg-surface-700' : 'text-gray-300 hover:text-white hover:bg-surface-800'}`}
          >
            ⭐ Rewards
          </Link>
          <Link
            href="/advertise"
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${pathname === '/advertise' ? 'text-white bg-surface-700' : 'text-gray-300 hover:text-white hover:bg-surface-800'}`}
          >
            Advertise
          </Link>
        </div>

        {/* Desktop right section */}
        <div className="hidden md:flex items-center gap-2 ml-auto">

          {/* Search */}
          <form onSubmit={handleSearch} className="relative">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="bg-surface-700/70 border border-surface-600 text-white rounded-lg pl-3 pr-8 py-1.5 text-sm w-36 focus:outline-none focus:border-brand-400/60 focus:w-48 focus:bg-surface-700 transition-all"
            />
            <button type="submit" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-brand-400 transition-colors">
              <IconSearch />
            </button>
          </form>

          <div className="w-px h-5 bg-surface-600 mx-0.5" />

          {/* Gift pill */}
          <Link
            href="/gift"
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold bg-surface-700 text-gray-300 border border-surface-600 hover:bg-surface-600 hover:text-white transition-all whitespace-nowrap"
          >
            <span className="text-[12px]">🎁</span>
            Gift
          </Link>

          {/* Membership pill */}
          <Link
            href="/membership"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold bg-brand-500/15 text-brand-400 border border-brand-500/30 hover:bg-brand-500/25 hover:border-brand-400/60 hover:text-brand-300 transition-all whitespace-nowrap"
          >
            <span className="text-[11px]">★</span>
            Membership
          </Link>

          {/* The Ark pill */}
          <Link
            href="/shop"
            className="flex items-center px-3.5 py-1.5 rounded-full text-sm font-semibold bg-surface-700 text-gray-200 border border-surface-600 hover:bg-surface-600 hover:text-white hover:border-surface-500 transition-all whitespace-nowrap"
          >
            The Ark
          </Link>

          <div className="w-px h-5 bg-surface-600 mx-0.5" />

          {/* Cart */}
          <Link href="/shop/cart" className="relative p-2 text-gray-400 hover:text-brand-400 transition-colors rounded-lg hover:bg-surface-800">
            <IconCart />
            {totalItems > 0 && (
              <span className="absolute top-0 right-0 bg-brand-500 text-black text-[9px] font-bold min-w-[16px] h-4 px-0.5 rounded-full flex items-center justify-center leading-none">
                {totalItems > 9 ? '9+' : totalItems}
              </span>
            )}
          </Link>

          {/* User area */}
          {user ? (
            <>
              <NotificationBell />

              {/* User dropdown */}
              <div className="relative" ref={userRef}>
                <button
                  onClick={() => setUserOpen((o) => !o)}
                  className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-surface-800 max-w-[150px]"
                >
                  {activeProfile ? (
                    <>
                      <span
                        className="w-6 h-6 rounded flex items-center justify-center text-[11px] font-bold text-black flex-shrink-0"
                        style={{ backgroundColor: activeProfile.avatar || '#e8b800' }}
                      >
                        {activeProfile.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="truncate">{activeProfile.name}</span>
                    </>
                  ) : (
                    <span className="truncate">{user.displayName || user.username}</span>
                  )}
                  <IconChevron open={userOpen} />
                </button>
                {userOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-48 bg-surface-800 border border-surface-600/60 rounded-xl shadow-2xl overflow-hidden z-50 py-1">
                    <Link href="/profiles" onClick={() => setUserOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-surface-700 transition-colors">
                      {activeProfile ? (
                        <>
                          <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-black flex-shrink-0" style={{ backgroundColor: activeProfile.avatar || '#e8b800' }}>{activeProfile.name.charAt(0).toUpperCase()}</span>
                          <span className="truncate">{activeProfile.name}</span>
                          <span className="ml-auto text-xs text-gray-500">Switch</span>
                        </>
                      ) : (
                        <span>Profiles</span>
                      )}
                    </Link>
                    <div className="border-t border-surface-700 my-1" />
                    <Link href="/dashboard" onClick={() => setUserOpen(false)} className="block px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-surface-700 transition-colors">Dashboard</Link>
                    <Link href="/feed" onClick={() => setUserOpen(false)} className="block px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-surface-700 transition-colors">Following</Link>
                    <Link href="/liked" onClick={() => setUserOpen(false)} className="block px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-surface-700 transition-colors">Liked</Link>
                    <Link href="/saved" onClick={() => setUserOpen(false)} className="block px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-surface-700 transition-colors">Watch Later</Link>
                    <Link href="/history" onClick={() => setUserOpen(false)} className="block px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-surface-700 transition-colors">Watch History</Link>
                    <Link href="/wrapped" onClick={() => setUserOpen(false)} className="block px-4 py-2.5 text-sm text-brand-400 font-semibold hover:text-brand-300 hover:bg-surface-700 transition-colors">🎵 Wrapped</Link>
                    <Link href="/shop/orders" onClick={() => setUserOpen(false)} className="block px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-surface-700 transition-colors">My Orders</Link>
                    <div className="border-t border-surface-700 my-1" />
                    <button onClick={() => { logout(); setUserOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-500 hover:text-white hover:bg-surface-700 transition-colors">
                      Sign out
                    </button>
                  </div>
                )}
              </div>

              {(user.isAdmin || (user as any).isCreator) && (
                <Link href="/upload" className="text-sm bg-surface-700 hover:bg-surface-600 border border-surface-600 hover:border-surface-500 text-gray-200 px-3 py-1.5 rounded-lg font-medium transition-all">
                  Upload
                </Link>
              )}
              {user.isAdmin && (
                <Link href="/admin" className="text-xs bg-brand-500 hover:bg-brand-400 text-black px-3 py-1 rounded-full font-semibold transition-colors">
                  Admin
                </Link>
              )}
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors px-2">Sign in</Link>
              <Link href="/register" className="text-sm bg-brand-500 hover:bg-brand-400 text-black px-4 py-2 rounded-lg font-semibold transition-colors">
                Join
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden ml-auto p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-surface-800"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? <IconClose /> : <IconMenu />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-surface-900 border-t border-surface-700/60 overflow-y-auto max-h-[85vh]">

          {/* Search */}
          <div className="px-4 pt-4 pb-2">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search content..."
                className="flex-1 bg-surface-700 border border-surface-600 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400 transition-colors"
              />
              <button type="submit" className="bg-brand-500 text-black px-4 py-2 rounded-xl text-sm font-bold hover:bg-brand-400 transition-colors">
                Go
              </button>
            </form>
          </div>

          {/* Membership CTA for logged-out */}
          {!user && (
            <div className="mx-4 mt-3 mb-1 p-4 bg-brand-500/10 border border-brand-500/25 rounded-xl">
              <p className="text-sm text-brand-300 font-bold mb-1">Join Camp DaddyMan</p>
              <p className="text-xs text-gray-400 mb-3 leading-relaxed">
                Exclusive music, film, podcasts &amp; merch discounts — all in one place.
              </p>
              <Link
                href="/register"
                onClick={() => setMobileOpen(false)}
                className="block text-center bg-brand-500 text-black text-sm font-bold px-4 py-2.5 rounded-lg hover:bg-brand-400 transition-colors"
              >
                Join Now — It&apos;s Free
              </Link>
            </div>
          )}

          {/* Explore */}
          <MobileSection label="Explore">
            <MobileLink href="/" onClick={() => setMobileOpen(false)}>Home</MobileLink>
            <MobileLink href="/browse" onClick={() => setMobileOpen(false)}>All Content</MobileLink>
            <MobileLink href="/browse?type=MUSIC" onClick={() => setMobileOpen(false)}>Music</MobileLink>
            <MobileLink href="/browse?type=FILM" onClick={() => setMobileOpen(false)}>Film</MobileLink>
            <MobileLink href="/browse?type=PODCAST" onClick={() => setMobileOpen(false)}>Podcasts</MobileLink>
            <MobileLink href="/browse?type=SPOKEN_WORD" onClick={() => setMobileOpen(false)}>Spoken Word</MobileLink>
          </MobileSection>

          {/* Community */}
          <MobileSection label="Community">
            <MobileLink href="/live" onClick={() => setMobileOpen(false)}>📡 Live</MobileLink>
            <MobileLink href="/series" onClick={() => setMobileOpen(false)}>Series</MobileLink>
            <MobileLink href="/albums" onClick={() => setMobileOpen(false)}>Albums</MobileLink>
            <MobileLink href="/polls" onClick={() => setMobileOpen(false)}>Polls</MobileLink>
            <MobileLink href="/partners" onClick={() => setMobileOpen(false)}>Partners</MobileLink>
            <MobileLink href="/leaderboard" onClick={() => setMobileOpen(false)}>🏆 Leaderboard</MobileLink>
            <MobileLink href="/loyalty" onClick={() => setMobileOpen(false)}>⭐ Rewards</MobileLink>
            <MobileLink href="/advertise" onClick={() => setMobileOpen(false)}>Advertise</MobileLink>
          </MobileSection>

          {/* Store */}
          <MobileSection label="Store">
            <MobileLink href="/gift" onClick={() => setMobileOpen(false)}>🎁 Gift a Membership</MobileLink>
            <MobileLink href="/shop" onClick={() => setMobileOpen(false)}>The Ark — Merch</MobileLink>
            <MobileLink href="/shop/cart" onClick={() => setMobileOpen(false)}>
              <span className="flex items-center justify-between">
                Cart
                {totalItems > 0 && (
                  <span className="bg-brand-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">{totalItems}</span>
                )}
              </span>
            </MobileLink>
            <Link
              href="/membership"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 text-sm text-brand-400 font-semibold hover:text-brand-300 transition-colors rounded-lg"
            >
              <span className="text-[12px]">★</span>
              Membership
            </Link>
          </MobileSection>

          {/* Account */}
          {user ? (
            <MobileSection label="Account">
              <MobileLink href="/profiles" onClick={() => setMobileOpen(false)}>
                {activeProfile ? `Profile: ${activeProfile.name}` : 'Profiles'}
              </MobileLink>
              <MobileLink href="/dashboard" onClick={() => setMobileOpen(false)}>{user.displayName || user.username}</MobileLink>
              <MobileLink href="/feed" onClick={() => setMobileOpen(false)}>Following</MobileLink>
              <MobileLink href="/liked" onClick={() => setMobileOpen(false)}>Liked</MobileLink>
              <MobileLink href="/saved" onClick={() => setMobileOpen(false)}>Watch Later</MobileLink>
              <MobileLink href="/history" onClick={() => setMobileOpen(false)}>Watch History</MobileLink>
              <MobileLink href="/wrapped" onClick={() => setMobileOpen(false)} accent>🎵 Wrapped</MobileLink>
              <MobileLink href="/notifications" onClick={() => setMobileOpen(false)}>Notifications</MobileLink>
              <MobileLink href="/shop/orders" onClick={() => setMobileOpen(false)}>My Orders</MobileLink>
              {(user.isAdmin || (user as any).isCreator) && (
                <MobileLink href="/upload" onClick={() => setMobileOpen(false)}>Upload</MobileLink>
              )}
              {user.isAdmin && (
                <MobileLink href="/admin" onClick={() => setMobileOpen(false)} accent>Admin Panel</MobileLink>
              )}
              <button
                onClick={() => { logout(); setMobileOpen(false); }}
                className="w-full text-left px-3 py-2.5 text-sm text-gray-400 hover:text-white transition-colors rounded-lg"
              >
                Sign out
              </button>
            </MobileSection>
          ) : (
            <MobileSection label="Account">
              <MobileLink href="/login" onClick={() => setMobileOpen(false)}>Sign in</MobileLink>
            </MobileSection>
          )}

          <div className="h-6" />
        </div>
      )}
    </nav>
  );
}
