'use client';
import { createContext, useContext, useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { getLevel } from '@/lib/xp';

// ── Types ─────────────────────────────────────────────────────────────────────

interface GrowthDay { date: string; users: number; content: number }

interface OverviewData {
  stats: { totalUsers: number; totalContent: number; activeSubscriptions: number; totalViews: number };
  planCounts: Record<string, number>;
  growth: GrowthDay[];
  recentUsers: { id: string; username: string; displayName?: string; email: string; createdAt: string; subscription?: { plan: string } | null }[];
}

interface AdminUser {
  id: string; username: string; email: string; displayName?: string;
  isAdmin: boolean; isCreator: boolean; isBanned: boolean; createdAt: string;
  xp: number; currentStreak: number; longestStreak: number;
  station?: string | null;
  subscription?: { plan: string; status: string } | null;
  _count: { content: number; followers: number; badges: number };
}

interface AdminContent {
  id: string; title: string; description?: string; lyrics?: string; canvasUrl?: string | null; previewUrl?: string | null; type: string; status: string; privacy: string;
  views: number; createdAt: string; mediaUrl?: string | null; thumbnailUrl?: string | null; tags?: string[];
  featured?: boolean;
  creator: { username: string; email: string };
  _count: { likes: number; comments: number };
  credits?: { id: string; role: string; user: { username: string; displayName?: string | null } }[];
}

interface AdminReport {
  id: string;
  reason: string;
  detail?: string | null;
  status: string;
  createdAt: string;
  content: { id: string; title: string; type: string; status: string; creator: { username: string } };
  reporter: { username: string; email: string };
}

type Tab = 'overview' | 'users' | 'content' | 'reports' | 'polls' | 'partners' | 'shop' | 'albums' | 'series' | 'live' | 'push' | 'newsletter' | 'loyalty' | 'livity' | 'settings';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function useDebounce(value: string, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── Growth chart ──────────────────────────────────────────────────────────────

function GrowthChart({ data }: { data: GrowthDay[] }) {
  const W = 700, H = 80, PAD = 2;
  const barW = Math.floor((W - PAD * (data.length - 1)) / data.length);
  const maxVal = Math.max(...data.map((d) => d.users + d.content), 1);

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full" preserveAspectRatio="none" style={{ minWidth: 320 }}>
        {data.map((d, i) => {
          const total  = d.users + d.content;
          const barH   = Math.round((total  / maxVal) * H);
          const uH     = Math.round((d.users / maxVal) * H);
          const x      = i * (barW + PAD);
          const isFirst = i === 0, isLast = i === data.length - 1;
          const showLabel = isFirst || isLast || i === Math.floor(data.length / 2);
          return (
            <g key={d.date}>
              <rect x={x} y={H - barH} width={barW} height={barH - uH} fill="#004d1d" opacity={0.8} rx={2} />
              <rect x={x} y={H - uH}   width={barW} height={uH}        fill="#009B3A" rx={2} />
              {showLabel && (
                <text x={x + barW / 2} y={H + 15} textAnchor="middle" fill="#6b7280" fontSize={9}>
                  {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="flex gap-4 mt-2 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-brand-400" />New Users</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-camp-600 opacity-80" />New Content</span>
      </div>
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────

function Pager({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center gap-2 mt-4 justify-end text-sm">
      <button onClick={() => onChange(page - 1)} disabled={page === 1}
        className="px-3 py-1.5 bg-surface-700 rounded-lg text-gray-300 disabled:opacity-40 hover:bg-surface-600 transition-colors">
        ‹ Prev
      </button>
      <span className="text-gray-400">Page {page} of {pages}</span>
      <button onClick={() => onChange(page + 1)} disabled={page === pages}
        className="px-3 py-1.5 bg-surface-700 rounded-lg text-gray-300 disabled:opacity-40 hover:bg-surface-600 transition-colors">
        Next ›
      </button>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, emoji, sub, onClick }: { label: string; value: string | number; emoji: string; sub?: string; onClick?: () => void }) {
  const base = "bg-surface-800 border border-surface-700 rounded-xl px-5 py-4 text-left w-full";
  const interactive = onClick ? " cursor-pointer hover:border-surface-500 hover:bg-surface-750 transition-all group" : "";
  const inner = (
    <>
      <div className="text-xl mb-2">{emoji}</div>
      <div className="text-2xl font-bold text-white">{typeof value === 'number' ? fmt(value) : value}</div>
      <div className="text-xs text-gray-400 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-600 mt-1">{sub}</div>}
      {onClick && <div className="text-xs text-brand-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">View →</div>}
    </>
  );
  if (onClick) return <button className={base + interactive} onClick={onClick}>{inner}</button>;
  return <div className={base}>{inner}</div>;
}

// ── Plan badge ────────────────────────────────────────────────────────────────

const PLAN_LABELS: Record<string, string> = {
  FREE: 'Free', PRO: 'Pro Monthly', PREMIUM: 'Pro Annual', CREATOR: 'Creator',
};

function PlanBadge({ plan }: { plan?: string }) {
  const p = plan || 'FREE';
  const cls = p === 'PREMIUM' ? 'bg-brand-500/20 text-brand-400'
            : p === 'PRO'     ? 'bg-camp-500/20 text-camp-400'
            : p === 'CREATOR' ? 'bg-purple-500/20 text-purple-400'
            :                   'bg-surface-600 text-gray-400';
  return <span className={`text-xs px-2 py-0.5 rounded-full ${cls}`}>{PLAN_LABELS[p] ?? p}</span>;
}

// ── User action drawer ────────────────────────────────────────────────────────

type RecentUser = OverviewData['recentUsers'][number];

function UserActionDrawer({ user, onClose }: { user: RecentUser; onClose: () => void }) {
  const [sending, setSending]       = useState<string | null>(null);
  const [followupMsg, setFollowup]  = useState('');
  const [couponCode, setCoupon]     = useState('');
  const [couponMsg, setCouponMsg]   = useState('');
  const [toast, setToast]           = useState('');
  const [banned, setBanned]         = useState(false);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  }

  async function sendNotify(type: string, extra?: object) {
    setSending(type);
    try {
      await api.post(`/admin/users/${user.id}/notify`, { type, ...extra });
      showToast(type === 'welcome' ? '👋 Welcome email sent!' : type === 'followup' ? '✉️ Follow-up sent!' : '🎁 Coupon sent!');
      if (type === 'followup') setFollowup('');
      if (type === 'coupon')   { setCoupon(''); setCouponMsg(''); }
    } catch {
      showToast('Send failed — check email config');
    } finally {
      setSending(null);
    }
  }

  async function handleBan() {
    setSending('ban');
    try {
      const { data } = await api.post(`/admin/users/${user.id}/toggle-ban`);
      setBanned(data.user.isBanned);
      showToast(data.user.isBanned ? '🚫 Member banned' : '✓ Member unbanned');
    } catch {
      showToast('Action failed');
    } finally {
      setSending(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-sm bg-surface-800 border-l border-surface-700 h-full overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-700">
          <h2 className="text-white font-semibold">Member Actions</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
        </div>

        {/* User info */}
        <div className="px-6 py-5 border-b border-surface-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold text-base flex-shrink-0">
              {(user.displayName || user.username)[0].toUpperCase()}
            </div>
            <div>
              <p className="text-white font-semibold">{user.displayName || user.username}</p>
              <p className="text-gray-400 text-xs">@{user.username}</p>
            </div>
          </div>
          <p className="text-gray-400 text-xs mb-2">✉️ {user.email}</p>
          <div className="flex items-center gap-2">
            <PlanBadge plan={user.subscription?.plan} />
            <span className="text-gray-500 text-xs">Joined {fmtDate(user.createdAt)}</span>
          </div>
        </div>

        {toast && (
          <div className="mx-6 mt-4 px-4 py-2 bg-brand-500/20 border border-brand-500/40 rounded-lg text-brand-400 text-sm text-center">
            {toast}
          </div>
        )}

        <div className="flex-1 px-6 py-5 space-y-6">
          {/* View profile */}
          <a href={`/creator/${user.username}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-between w-full px-4 py-2.5 rounded-lg bg-surface-700 hover:bg-surface-600 text-white text-sm font-medium transition-colors">
            <span>👤 View Public Profile</span>
            <span className="text-brand-400 text-xs">→</span>
          </a>

          {/* Welcome email */}
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Quick Actions</p>
            <button
              onClick={() => sendNotify('welcome')}
              disabled={sending === 'welcome'}
              className="w-full px-4 py-2.5 rounded-lg bg-brand-500/10 border border-brand-500/30 text-brand-400 hover:bg-brand-500/20 text-sm font-medium transition-colors text-left disabled:opacity-50">
              {sending === 'welcome' ? 'Sending…' : '👋 Send Welcome Email'}
            </button>
          </div>

          {/* Custom follow-up */}
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Personal Follow-up</p>
            <textarea
              value={followupMsg}
              onChange={(e) => setFollowup(e.target.value)}
              rows={3}
              placeholder="Write a personal message to this member..."
              className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400 resize-none mb-2"
            />
            <button
              onClick={() => sendNotify('followup', { message: followupMsg })}
              disabled={sending === 'followup' || !followupMsg.trim()}
              className="w-full px-4 py-2 rounded-lg bg-camp-500/10 border border-camp-500/30 text-camp-400 hover:bg-camp-500/20 text-sm font-medium transition-colors disabled:opacity-50">
              {sending === 'followup' ? 'Sending…' : '✉️ Send Follow-up'}
            </button>
          </div>

          {/* Coupon / gift */}
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Gift / Coupon Code</p>
            <input
              value={couponCode}
              onChange={(e) => setCoupon(e.target.value)}
              placeholder="Coupon code (e.g. CAMP25FREE)"
              className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400 mb-2"
            />
            <textarea
              value={couponMsg}
              onChange={(e) => setCouponMsg(e.target.value)}
              rows={2}
              placeholder="Message to send with the coupon (optional)"
              className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400 resize-none mb-2"
            />
            <button
              onClick={() => sendNotify('coupon', { code: couponCode, message: couponMsg })}
              disabled={sending === 'coupon' || !couponCode.trim()}
              className="w-full px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20 text-sm font-medium transition-colors disabled:opacity-50">
              {sending === 'coupon' ? 'Sending…' : '🎁 Send Coupon Email'}
            </button>
          </div>

          {/* Danger zone */}
          <div className="pt-2 border-t border-surface-700">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Account Actions</p>
            <button
              onClick={handleBan}
              disabled={sending === 'ban'}
              className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                banned
                  ? 'bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20'
                  : 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20'
              }`}>
              {sending === 'ban' ? '…' : banned ? '✓ Unban Member' : '🚫 Ban Member'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Overview tab ──────────────────────────────────────────────────────────────

function OverviewTab({ onNav }: { onNav: (tab: Tab, plan?: string) => void }) {
  const [data, setData]               = useState<OverviewData | null>(null);
  const [selectedUser, setSelectedUser] = useState<RecentUser | null>(null);

  useEffect(() => {
    api.get('/admin/stats').then((r) => setData(r.data)).catch(() => {});
  }, []);

  if (!data) return <div className="animate-pulse space-y-4">{Array.from({length:3}).map((_,i)=><div key={i} className="h-24 bg-surface-700 rounded-xl"/>)}</div>;

  const { stats, planCounts, growth, recentUsers } = data;
  const paidRevenue = (planCounts.PRO || 0) * 19.99 + (planCounts.PREMIUM || 0) * (99.99 / 12);

  return (
    <div className="space-y-8">
      {/* Stats row — clickable */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Users"    value={stats.totalUsers}          emoji="👥" onClick={() => onNav('users')} />
        <StatCard label="Active Content" value={stats.totalContent}        emoji="🎵" onClick={() => onNav('content')} />
        <StatCard label="Paid Members"   value={stats.activeSubscriptions} emoji="💳" onClick={() => onNav('users', 'PRO')} />
        <StatCard label="Total Views"    value={stats.totalViews}          emoji="👁️" onClick={() => onNav('content')} />
      </div>

      {/* Growth chart */}
      <div className="bg-surface-800 border border-surface-700 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Platform Growth — last 30 days</h3>
        {growth.every((d) => d.users + d.content === 0)
          ? <p className="text-gray-500 text-sm py-6 text-center">No activity yet.</p>
          : <GrowthChart data={growth} />
        }
      </div>

      {/* Subscription breakdown + recent signups */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Plan breakdown — rows clickable */}
        <div className="bg-surface-800 border border-surface-700 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Subscription Breakdown</h3>
          <div className="space-y-3">
            {(['PREMIUM', 'PRO', 'FREE'] as const).map((plan) => {
              const count = planCounts[plan] || 0;
              const pct   = stats.totalUsers > 0 ? Math.round((count / stats.totalUsers) * 100) : 0;
              return (
                <button key={plan} onClick={() => onNav('users', plan)}
                  className="w-full text-left group cursor-pointer">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-300 group-hover:text-white transition-colors font-medium">{PLAN_LABELS[plan] ?? plan}</span>
                    <span className="text-gray-400">
                      {count.toLocaleString()} ({pct}%)
                      <span className="text-brand-400 ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    </span>
                  </div>
                  <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${plan === 'PREMIUM' ? 'bg-brand-400' : plan === 'PRO' ? 'bg-camp-500' : 'bg-surface-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 mt-4 pt-4 border-t border-surface-700">
            Est. MRR: <span className="text-white font-semibold">${paidRevenue.toLocaleString()}</span>
            <span className="text-gray-600 ml-1">(Monthly×$19.99 + Annual×$8.33/mo)</span>
          </p>
        </div>

        {/* Recent signups — clickable rows */}
        <div className="bg-surface-800 border border-surface-700 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Recent Signups</h3>
          <div className="space-y-1">
            {recentUsers.map((u) => (
              <button key={u.id} onClick={() => setSelectedUser(u)}
                className="flex items-center justify-between text-sm w-full hover:bg-surface-700 rounded-lg px-2 py-2 -mx-2 transition-colors group">
                <span className="text-white group-hover:text-brand-400 transition-colors text-left">{u.displayName || u.username}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <PlanBadge plan={u.subscription?.plan} />
                  <span className="text-gray-500 text-xs hidden sm:inline">{fmtDate(u.createdAt)}</span>
                  <span className="text-brand-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </div>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-surface-700">Click a member to send messages, coupons, or take action.</p>
        </div>
      </div>

      {selectedUser && (
        <UserActionDrawer user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}
    </div>
  );
}

// ── Users tab ─────────────────────────────────────────────────────────────────

function UsersTab({ initialPlan = 'ALL' }: { initialPlan?: string }) {
  const [users, setUsers]   = useState<AdminUser[]>([]);
  const [total, setTotal]   = useState(0);
  const [pages, setPages]   = useState(1);
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState('');
  const [plan, setPlan]     = useState(initialPlan);
  const [acting, setActing] = useState<string | null>(null);
  const dSearch = useDebounce(search);

  function load(p: number) {
    const params: Record<string, string> = { page: String(p), limit: '20' };
    if (dSearch) params.search = dSearch;
    if (plan !== 'ALL') params.plan = plan;
    api.get('/admin/users', { params })
      .then((r) => { setUsers(r.data.users); setTotal(r.data.total); setPages(r.data.pages); setPage(p); })
      .catch(() => {});
  }

  useEffect(() => { load(1); }, [dSearch, plan]); // eslint-disable-line

  async function handleToggleAdmin(id: string) {
    setActing(id);
    const { data } = await api.post(`/admin/users/${id}/toggle-admin`).finally(() => setActing(null));
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, isAdmin: data.user.isAdmin } : u));
  }

  async function handleToggleBan(id: string) {
    setActing(id);
    const { data } = await api.post(`/admin/users/${id}/toggle-ban`).finally(() => setActing(null));
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, isBanned: data.user.isBanned } : u));
  }

  async function handleDelete(id: string, username: string) {
    if (!confirm(`Permanently delete @${username}? This cannot be undone.`)) return;
    setActing(id);
    await api.delete(`/admin/users/${id}`).finally(() => setActing(null));
    setUsers((prev) => prev.filter((u) => u.id !== id));
    setTotal((n) => n - 1);
  }

  async function handleConferStation(id: string, station: string | null) {
    const { data } = await api.post(`/admin/users/${id}/station`, { station });
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, station: data.user.station } : u));
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search username, email..."
          className="bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:border-brand-400"
        />
        <select value={plan} onChange={(e) => setPlan(e.target.value)}
          className="bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none">
          <option value="ALL">All plans</option>
          <option value="FREE">Free</option>
          <option value="PRO">Pro</option>
          <option value="PREMIUM">Premium</option>
        </select>
        <span className="ml-auto text-sm text-gray-400 self-center">{total.toLocaleString()} users</span>
      </div>

      <div className="overflow-x-auto bg-surface-800 border border-surface-700 rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-700 text-left text-xs text-gray-400 uppercase tracking-wide">
              <th className="px-5 py-3">User</th>
              <th className="px-4 py-3 hidden md:table-cell">Email</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3 hidden md:table-cell">Level</th>
              <th className="px-4 py-3 hidden sm:table-cell text-right">Content</th>
              <th className="px-4 py-3 hidden lg:table-cell text-right">Followers</th>
              <th className="px-4 py-3 hidden lg:table-cell">Joined</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-700">
            {users.map((u) => (
              <tr key={u.id} className={`hover:bg-surface-750 transition-colors ${u.isBanned ? 'opacity-50' : ''}`}>
                <td className="px-5 py-3">
                  <Link href={`/creator/${u.username}`} className="text-white hover:text-brand-400 font-medium transition-colors">
                    {u.displayName || u.username}
                  </Link>
                  <div className="flex gap-1 mt-0.5">
                    {u.isAdmin   && <span className="text-[10px] bg-brand-500/20 text-brand-400 px-1.5 rounded">Admin</span>}
                    {u.isCreator && <span className="text-[10px] bg-camp-500/20 text-camp-400 px-1.5 rounded">Creator</span>}
                    {u.isBanned  && <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 rounded">Banned</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-400 hidden md:table-cell text-xs">{u.email}</td>
                <td className="px-4 py-3"><PlanBadge plan={u.subscription?.plan} /></td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <div className="text-xs text-white font-medium">{getLevel(u.xp ?? 0).name}</div>
                  <div className="text-[10px] text-gray-500 font-mono">
                    {(u.xp ?? 0).toLocaleString()} XP
                    {u.currentStreak > 0 && ` · 🔥${u.currentStreak}`}
                    {u._count.badges > 0 && ` · ${u._count.badges}🏅`}
                  </div>
                  {u.station && (
                    <div className="text-[10px] text-amber-400 mt-0.5">
                      {{ ARK_BUILDER: '🌱 Ark Builder', GARDENER: '🌿 Gardener', FAADA: '🌍 Faada' }[u.station] ?? u.station}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-400 text-right hidden sm:table-cell">{u._count.content}</td>
                <td className="px-4 py-3 text-gray-400 text-right hidden lg:table-cell">{u._count.followers}</td>
                <td className="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell">{fmtDate(u.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex gap-2 justify-end flex-wrap">
                    <select
                      value={u.station ?? ''}
                      onChange={(e) => handleConferStation(u.id, e.target.value || null)}
                      title="Confer station (Elder action)"
                      className="text-xs px-2 py-1 rounded-lg bg-surface-700 border border-surface-600 text-amber-400 focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value="">— Station —</option>
                      <option value="ARK_BUILDER">🌱 Ark Builder</option>
                      <option value="GARDENER">🌿 Gardener</option>
                      <option value="FAADA">🌍 Faada</option>
                    </select>
                    <button
                      onClick={() => handleToggleBan(u.id)}
                      disabled={acting === u.id || u.isAdmin}
                      className={`text-xs px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40 ${u.isBanned ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'}`}
                    >
                      {acting === u.id ? '...' : u.isBanned ? 'Unban' : 'Ban'}
                    </button>
                    <button
                      onClick={() => handleToggleAdmin(u.id)}
                      disabled={acting === u.id}
                      className="text-xs px-2.5 py-1 rounded-lg bg-surface-600 text-gray-300 hover:bg-surface-500 transition-colors disabled:opacity-40"
                    >
                      {u.isAdmin ? 'Rm Admin' : 'Admin'}
                    </button>
                    <button
                      onClick={() => handleDelete(u.id, u.username)}
                      disabled={acting === u.id || u.isAdmin}
                      className="text-xs px-2.5 py-1 rounded-lg bg-surface-600 text-gray-500 hover:text-red-400 hover:bg-surface-500 transition-colors disabled:opacity-40"
                    >
                      Del
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={page} pages={pages} onChange={load} />
    </div>
  );
}

// ── Edit content modal ────────────────────────────────────────────────────────

function EditContentModal({ item, onClose, onSaved }: {
  item: AdminContent;
  onClose: () => void;
  onSaved: (updated: AdminContent) => void;
}) {
  const [title, setTitle]               = useState(item.title);
  const [description, setDesc]          = useState(item.description || '');
  const [lyrics, setLyrics]             = useState(item.lyrics || '');
  const [introStart, setIntroStart]     = useState<string>(String((item as any).introStart ?? ''));
  const [introEnd, setIntroEnd]         = useState<string>(String((item as any).introEnd   ?? ''));
  const [xpWatchSeconds, setXpWatch]   = useState<string>(String((item as any).xpWatchSeconds ?? 30));
  const [canvasUrl, setCanvasUrl]       = useState(item.canvasUrl || '');
  const [canvasUploading, setCanvasUp]  = useState(false);
  const canvasInputRef                  = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl]     = useState(item.previewUrl || '');
  const [previewUploading, setPreviewUp] = useState(false);
  const previewInputRef                 = useRef<HTMLInputElement>(null);
  const [type, setType]                 = useState(item.type);
  const [thumbnailUrl, setThumb]        = useState(item.thumbnailUrl || '');
  const [mediaUrl, setMediaUrl]         = useState(item.mediaUrl || '');
  const [privacy, setPrivacy]           = useState(item.privacy);
  const [tags, setTags]                 = useState((item.tags || []).join(', '));
  const [featured, setFeatured]         = useState(item.featured ?? false);
  const [chapters, setChapters]         = useState<{ time: string; label: string }[]>(
    ((item as any).chapters || []).map((c: { time: number; label: string }) => ({ time: String(c.time), label: c.label }))
  );
  const [saving, setSaving]             = useState(false);
  const [uploading, setUploading]       = useState(false);
  const [mediaUploading, setMediaUp]    = useState(false);
  const [mediaProgress, setMediaProg]   = useState(0);
  const [mediaUploadDone, setMediaDone] = useState(false);
  const [error, setError]               = useState('');
  const fileInputRef                    = useRef<HTMLInputElement>(null);
  const mediaInputRef                   = useRef<HTMLInputElement>(null);
  // Credits
  const [credits, setCredits]           = useState<{ username: string; role: string }[]>(
    (item.credits || []).map((c) => ({ username: c.user.username, role: c.role }))
  );
  const [creditUsername, setCreditUser] = useState('');
  const [creditRole, setCreditRole]     = useState('');
  const [creditSaving, setCreditSaving] = useState(false);
  const [userSuggestions, setUserSugg]  = useState<{ username: string; displayName?: string | null }[]>([]);
  const [suggOpen, setSuggOpen]         = useState(false);
  // Track whether thumbnail was updated via upload (already saved to DB by uploadThumbnail endpoint)
  const thumbUploadedRef                = useRef(false);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('thumbnail', file);
      const { data } = await api.post(`/content/${item.id}/thumbnail`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setThumb(data.thumbnailUrl);
      thumbUploadedRef.current = true; // already persisted — skip re-saving in handleSave
    } catch {
      setError('Image upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleMediaUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaUp(true);
    setMediaProg(0);
    setError('');
    try {
      const fd = new FormData();
      fd.append('media', file);
      const { data } = await api.post(`/content/${item.id}/media`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (ev) => {
          if (ev.total) setMediaProg(Math.round((ev.loaded / ev.total) * 100));
        },
      });
      setMediaUrl(data.mediaUrl);
      setMediaDone(true);
      setTimeout(() => setMediaDone(false), 4000);
    } catch {
      setError('Media upload failed');
    } finally {
      setMediaUp(false);
      setMediaProg(0);
      if (mediaInputRef.current) mediaInputRef.current.value = '';
    }
  }

  async function handleCanvasUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCanvasUp(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('canvas', file);
      const { data } = await api.post(`/content/${item.id}/canvas`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setCanvasUrl(data.canvasUrl);
    } catch {
      setError('Canvas upload failed');
    } finally {
      setCanvasUp(false);
      if (canvasInputRef.current) canvasInputRef.current.value = '';
    }
  }

  async function handlePreviewUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewUp(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('preview', file);
      const { data } = await api.post(`/content/${item.id}/preview`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreviewUrl(data.previewUrl);
    } catch {
      setError('Preview upload failed');
    } finally {
      setPreviewUp(false);
      if (previewInputRef.current) previewInputRef.current.value = '';
    }
  }

  async function handleSave() {
    if (!title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    setError('');
    try {
      const payload: Record<string, any> = { title, privacy, type, featured };
      if (description !== (item.description || ''))   payload.description  = description;
      if (lyrics !== (item.lyrics || ''))             payload.lyrics       = lyrics;
      const parsedIntroStart = introStart !== '' ? Number(introStart) : null;
      const parsedIntroEnd   = introEnd   !== '' ? Number(introEnd)   : null;
      if (parsedIntroStart !== ((item as any).introStart ?? null)) payload.introStart = parsedIntroStart;
      if (parsedIntroEnd   !== ((item as any).introEnd   ?? null)) payload.introEnd   = parsedIntroEnd;
      const parsedXpWatch = xpWatchSeconds !== '' ? Number(xpWatchSeconds) : 30;
      if (parsedXpWatch !== ((item as any).xpWatchSeconds ?? 30)) payload.xpWatchSeconds = parsedXpWatch;
      // Only include thumbnailUrl if manually pasted (upload already saved it to DB)
      if (!thumbUploadedRef.current && thumbnailUrl !== (item.thumbnailUrl || '')) {
        payload.thumbnailUrl = thumbnailUrl;
      }
      if (tags !== (item.tags || []).join(', ')) payload.tags = tags;
      payload.chapters = chapters.filter(c => c.label.trim()).map(c => ({ time: Number(c.time) || 0, label: c.label.trim() })).sort((a, b) => a.time - b.time);
      const { data } = await api.patch(`/admin/content/${item.id}`, payload);
      // Use locally tracked signed URLs — the PATCH response returns raw storage paths, not signed
      onSaved({ ...item, ...data.content, mediaUrl: mediaUrl || item.mediaUrl, thumbnailUrl: thumbnailUrl || item.thumbnailUrl });
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function searchUsers(q: string) {
    if (!q.trim()) { setUserSugg([]); setSuggOpen(false); return; }
    const r = await api.get('/admin/users', { params: { search: q, limit: 5 } }).catch(() => null);
    if (r) {
      setUserSugg(r.data.users || []);
      setSuggOpen(true);
    }
  }

  function addCredit() {
    if (!creditUsername.trim() || !creditRole.trim()) return;
    if (credits.some((c) => c.username === creditUsername.trim())) return;
    setCredits((prev) => [...prev, { username: creditUsername.trim(), role: creditRole.trim() }]);
    setCreditUser('');
    setCreditRole('');
    setUserSugg([]);
    setSuggOpen(false);
  }

  async function saveCredits() {
    setCreditSaving(true);
    await api.put(`/admin/content/${item.id}/credits`, { credits }).catch(() => {});
    setCreditSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-md bg-surface-800 border-l border-surface-700 h-full overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-700">
          <h2 className="text-white font-semibold">Edit Content</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="flex-1 px-6 py-6 space-y-5">
          {/* Thumbnail preview */}
          <div>
            <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wide">Thumbnail</label>
            <div className="relative aspect-video bg-surface-700 rounded-xl overflow-hidden mb-2">
              {thumbnailUrl
                ? <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
                : <div className="absolute inset-0 flex items-center justify-center text-4xl">🖼️</div>
              }
            </div>
            <div className="flex gap-2 mb-2">
              <input
                value={thumbnailUrl}
                onChange={(e) => setThumb(e.target.value)}
                placeholder="/images/thumbnails/your-image.jpg or URL"
                className="flex-1 bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-3 py-2 rounded-lg bg-camp-500 hover:bg-camp-600 text-white text-sm font-medium transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {uploading ? '...' : 'Upload'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>
            <p className="text-xs text-gray-500">Upload a file or paste a URL</p>
          </div>

          {/* Media file */}
          <div>
            <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wide">
              {item.type === 'FILM' ? 'Video File' : item.type === 'BOOK' ? 'Book File (PDF / EPUB)' : 'Audio File'}
            </label>
            <div className="bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-sm text-gray-300 mb-2 truncate">
              {mediaUrl ? (mediaUrl.split('/').pop()?.split('?')[0] ?? 'file') : 'No file uploaded'}
            </div>
            {mediaUploading && (
              <div className="mb-2">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  {mediaProgress < 100
                    ? <><span>Uploading…</span><span>{mediaProgress}%</span></>
                    : <span className="text-yellow-400 animate-pulse">Processing — please wait…</span>}
                </div>
                <div className="h-1.5 bg-surface-600 rounded-full overflow-hidden">
                  {mediaProgress < 100
                    ? <div className="h-full bg-brand-500 rounded-full transition-all duration-200" style={{ width: `${mediaProgress}%` }} />
                    : <div className="h-full bg-yellow-500 rounded-full animate-pulse w-full" />}
                </div>
              </div>
            )}
            {mediaUploadDone && !mediaUploading && (
              <div className="mb-2 flex items-center gap-2 text-xs text-green-400 font-semibold">
                <span>✓</span><span>Audio uploaded successfully</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => mediaInputRef.current?.click()}
              disabled={mediaUploading}
              className="px-3 py-2 rounded-lg bg-surface-600 hover:bg-surface-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {mediaUploading
                ? mediaProgress < 100 ? `Uploading ${mediaProgress}%…` : 'Processing…'
                : mediaUrl ? 'Replace File' : 'Upload File'}
            </button>
            <input
              ref={mediaInputRef}
              type="file"
              accept="video/*,audio/*"
              className="hidden"
              onChange={handleMediaUpload}
            />
            <p className="text-xs text-gray-500 mt-2">
              <span className="text-gray-400">Video:</span> MP4, WebM, MOV &nbsp;·&nbsp;
              <span className="text-gray-400">Audio:</span> MP3, WAV, AAC, FLAC, OGG &nbsp;·&nbsp;Max 2GB
            </p>
          </div>

          {/* Content Type */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Content Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none"
            >
              <option value="FILM">Film</option>
              <option value="MUSIC">Music</option>
              <option value="PODCAST">Podcast</option>
              <option value="SPOKEN_WORD">Spoken Word</option>
              <option value="DADDYMAN_ISMS">DaddyMan-Isms</option>
              <option value="BOOK">Book</option>
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDesc(e.target.value)}
              rows={4}
              className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400 resize-none"
            />
          </div>

          {/* Lyrics — audio types only */}
          {['MUSIC', 'PODCAST', 'SPOKEN_WORD', 'DADDYMAN_ISMS'].includes(type) && (
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Lyrics / Transcript</label>
              <textarea
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                rows={10}
                placeholder={"[Verse 1]\nLine one...\n\n[Chorus]\nLine two..."}
                className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400 resize-y font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">Use plain text. Optional section labels like [Verse 1] are supported.</p>
            </div>
          )}

          {/* XP Watch Threshold */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">XP Watch Threshold</label>
            <p className="text-xs text-gray-500 mb-2">Viewers earn +10 XP after watching this many seconds. Default is 30. Set lower for short clips (DaddyMan-Isms, trailers), higher for long films.</p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                max={3600}
                value={xpWatchSeconds}
                onChange={(e) => setXpWatch(e.target.value)}
                placeholder="30"
                className="w-32 bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
              />
              <span className="text-xs text-gray-500">seconds</span>
            </div>
          </div>

          {/* Skip Intro timestamps — video types only */}
          {['FILM'].includes(type) && (
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Skip Intro</label>
              <p className="text-xs text-gray-500 mb-3">Set the intro window in seconds. A "Skip Intro" button appears when playback is inside this range.</p>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 block mb-1">Intro starts (sec)</label>
                  <input
                    type="number"
                    min={0}
                    value={introStart}
                    onChange={(e) => setIntroStart(e.target.value)}
                    placeholder="e.g. 2"
                    className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 block mb-1">Skip to (sec)</label>
                  <input
                    type="number"
                    min={0}
                    value={introEnd}
                    onChange={(e) => setIntroEnd(e.target.value)}
                    placeholder="e.g. 90"
                    className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Chapters — all video/audio types */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs text-gray-400 uppercase tracking-wide">Chapters</label>
              <button
                type="button"
                onClick={() => setChapters(prev => [...prev, { time: '', label: '' }])}
                className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
              >
                + Add chapter
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-3">Clickable timestamp markers. Viewers jump to any chapter from the watch page.</p>
            {chapters.length === 0 ? (
              <p className="text-xs text-gray-600 italic">No chapters yet.</p>
            ) : (
              <div className="space-y-2">
                {chapters.map((ch, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      type="number" min={0}
                      value={ch.time}
                      onChange={(e) => setChapters(prev => prev.map((c, j) => j === i ? { ...c, time: e.target.value } : c))}
                      placeholder="0"
                      className="w-20 bg-surface-700 border border-surface-600 text-white rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-brand-400"
                    />
                    <span className="text-gray-500 text-xs flex-shrink-0">sec</span>
                    <input
                      type="text"
                      value={ch.label}
                      onChange={(e) => setChapters(prev => prev.map((c, j) => j === i ? { ...c, label: e.target.value } : c))}
                      placeholder="Chapter title"
                      maxLength={80}
                      className="flex-1 bg-surface-700 border border-surface-600 text-white rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-brand-400"
                    />
                    <button
                      type="button"
                      onClick={() => setChapters(prev => prev.filter((_, j) => j !== i))}
                      className="text-gray-600 hover:text-red-400 transition-colors px-1 flex-shrink-0"
                    >✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Canvas video — audio types only */}
          {['MUSIC', 'PODCAST', 'SPOKEN_WORD', 'DADDYMAN_ISMS'].includes(type) && (
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Canvas Video</label>
              <p className="text-xs text-gray-500 mb-3">Short looping video (3–8s) shown as background on the audio player. MP4 or WebM, max 50MB.</p>
              <div className="flex items-start gap-4">
                {canvasUrl ? (
                  <div className="relative w-24 flex-shrink-0 rounded-xl overflow-hidden bg-surface-900 border border-surface-600" style={{ aspectRatio: '9/16' }}>
                    <video
                      src={canvasUrl}
                      autoPlay loop muted playsInline
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setCanvasUrl('')}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white text-xs flex items-center justify-center hover:bg-red-500 transition-colors"
                    >✕</button>
                  </div>
                ) : (
                  <div className="w-24 flex-shrink-0 rounded-xl bg-surface-700 border border-surface-600 border-dashed flex items-center justify-center text-gray-600 text-2xl" style={{ aspectRatio: '9/16' }}>
                    ▶
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => canvasInputRef.current?.click()}
                    disabled={canvasUploading}
                    className="px-4 py-2 bg-surface-700 hover:bg-surface-600 border border-surface-600 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {canvasUploading ? 'Uploading...' : canvasUrl ? 'Replace Canvas' : 'Upload Canvas'}
                  </button>
                  <input ref={canvasInputRef} type="file" accept="video/mp4,video/webm" className="hidden" onChange={handleCanvasUpload} />
                </div>
              </div>
            </div>
          )}

          {/* Hover Preview Clip */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Hover Preview Clip</label>
            <p className="text-xs text-gray-500 mb-3">Short muted clip (5–30s) that auto-plays when users hover a card. MP4 or WebM, max 100MB.</p>
            <div className="flex items-start gap-4">
              {previewUrl ? (
                <div className="relative w-32 flex-shrink-0 rounded-xl overflow-hidden bg-surface-900 border border-surface-600" style={{ aspectRatio: '16/9' }}>
                  <video
                    src={previewUrl}
                    autoPlay loop muted playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setPreviewUrl('')}
                    className="absolute top-1 right-1 bg-black/70 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center hover:bg-red-600"
                  >×</button>
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => previewInputRef.current?.click()}
                disabled={previewUploading}
                className="px-4 py-2 bg-surface-700 hover:bg-surface-600 border border-surface-600 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {previewUploading ? 'Uploading...' : previewUrl ? 'Replace Preview' : 'Upload Preview'}
              </button>
              <input ref={previewInputRef} type="file" accept="video/mp4,video/webm" className="hidden" onChange={handlePreviewUpload} />
            </div>
          </div>

          {/* Privacy */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Privacy</label>
            <select
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value)}
              className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none"
            >
              <option value="PUBLIC">Public</option>
              <option value="SUBSCRIBERS_ONLY">Subscribers Only</option>
              <option value="PRIVATE">Private</option>
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Tags</label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="hip-hop, discipline, original"
              className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
            />
            <p className="text-xs text-gray-500 mt-1">Comma separated</p>
          </div>

          {/* Featured */}
          <div className="flex items-center justify-between bg-surface-700 border border-surface-600 rounded-lg px-4 py-3">
            <div>
              <p className="text-white text-sm font-medium">Featured on Homepage</p>
              <p className="text-gray-500 text-xs mt-0.5">Shows in the ⭐ Featured row on the homepage</p>
            </div>
            <button
              type="button"
              onClick={() => setFeatured((v) => !v)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                featured ? 'bg-brand-500' : 'bg-surface-500'
              }`}
            >
              <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 ${featured ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Credits */}
          <div>
            <p className="text-sm font-medium text-gray-300 mb-3">Collab Credits</p>
            {credits.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {credits.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 bg-surface-700 rounded-lg px-3 py-2">
                    <span className="text-xs text-gray-400 w-28 flex-shrink-0">{c.role}</span>
                    <span className="text-sm text-white flex-1">@{c.username}</span>
                    <button type="button" onClick={() => setCredits((prev) => prev.filter((_, j) => j !== i))} className="text-gray-600 hover:text-red-400 text-xs">✕</button>
                  </div>
                ))}
              </div>
            )}
            <div className="relative mb-2">
              <input
                value={creditUsername}
                onChange={(e) => { setCreditUser(e.target.value); searchUsers(e.target.value); }}
                onBlur={() => setTimeout(() => setSuggOpen(false), 150)}
                placeholder="Username"
                className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
              />
              {suggOpen && userSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-surface-700 border border-surface-600 rounded-lg z-10 overflow-hidden">
                  {userSuggestions.map((u) => (
                    <button
                      key={u.username}
                      type="button"
                      onMouseDown={() => { setCreditUser(u.username); setSuggOpen(false); }}
                      className="w-full text-left px-3 py-2 text-sm text-white hover:bg-surface-600"
                    >
                      @{u.username}{u.displayName ? ` — ${u.displayName}` : ''}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <input
                value={creditRole}
                onChange={(e) => setCreditRole(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCredit())}
                placeholder="Role (e.g. Featured Artist)"
                className="flex-1 bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
              />
              <button type="button" onClick={addCredit} className="px-3 py-2 bg-surface-600 hover:bg-surface-500 text-white text-sm rounded-lg transition-colors">Add</button>
            </div>
            <button
              type="button"
              onClick={saveCredits}
              disabled={creditSaving}
              className="mt-3 w-full py-2 text-sm border border-surface-600 text-gray-400 hover:text-white hover:border-surface-500 rounded-lg transition-colors disabled:opacity-50"
            >
              {creditSaving ? 'Saving credits…' : 'Save credits'}
            </button>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>

        <div className="px-6 py-5 border-t border-surface-700 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg bg-surface-700 text-gray-300 hover:bg-surface-600 transition-colors text-sm">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 px-4 py-2 rounded-lg bg-brand-500 text-black font-semibold hover:bg-brand-400 transition-colors text-sm disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Content tab ───────────────────────────────────────────────────────────────

function ContentTab() {
  const [content, setContent] = useState<AdminContent[]>([]);
  const [total, setTotal]     = useState(0);
  const [pages, setPages]     = useState(1);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState('ALL');
  const [type, setType]       = useState('ALL');
  const [acting, setActing]   = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminContent | null>(null);
  const dSearch = useDebounce(search);

  function load(p: number) {
    const params: Record<string, string> = { page: String(p), limit: '20' };
    if (dSearch)          params.search = dSearch;
    if (status !== 'ALL') params.status = status;
    if (type   !== 'ALL') params.type   = type;
    api.get('/admin/content', { params })
      .then((r) => { setContent(r.data.content); setTotal(r.data.total); setPages(r.data.pages); setPage(p); })
      .catch(() => {});
  }

  useEffect(() => { load(1); }, [dSearch, status, type]); // eslint-disable-line

  async function handleStatus(id: string, newStatus: string) {
    setActing(id);
    await api.post(`/admin/content/${id}/status`, { status: newStatus }).finally(() => setActing(null));
    setContent((prev) => prev.map((c) => c.id === id ? { ...c, status: newStatus } : c));
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title, creator..."
          className="bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:border-brand-400"
        />
        <select value={type} onChange={(e) => setType(e.target.value)}
          className="bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none">
          <option value="ALL">All types</option>
          <option value="FILM">Film</option>
          <option value="MUSIC">Music</option>
          <option value="PODCAST">Podcast</option>
          <option value="SPOKEN_WORD">Spoken Word</option>
          <option value="DADDYMAN_ISMS">DaddyMan-Isms</option>
          <option value="BOOK">Book</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none">
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="ARCHIVED">Archived</option>
          <option value="DELETED">Deleted</option>
          <option value="PROCESSING">Processing</option>
        </select>
        <span className="ml-auto text-sm text-gray-400 self-center">{total.toLocaleString()} pieces</span>
      </div>

      <div className="overflow-x-auto bg-surface-800 border border-surface-700 rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-700 text-left text-xs text-gray-400 uppercase tracking-wide">
              <th className="px-5 py-3">Title</th>
              <th className="px-4 py-3 hidden md:table-cell">Creator</th>
              <th className="px-4 py-3 hidden sm:table-cell">Type</th>
              <th className="px-4 py-3 text-right">Views</th>
              <th className="px-4 py-3 hidden sm:table-cell text-right">Likes</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 hidden lg:table-cell">Published</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-700">
            {content.map((c) => (
              <tr key={c.id} className="hover:bg-surface-750 transition-colors group">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1.5">
                    {c.featured && <span className="text-brand-400 text-xs flex-shrink-0" title="Featured">⭐</span>}
                    <Link href={`/watch/${c.id}`} className="text-white hover:text-brand-400 font-medium transition-colors line-clamp-1">
                      {c.title}
                    </Link>
                  </div>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <Link href={`/creator/${c.creator.username}`} className="text-gray-400 hover:text-white transition-colors text-xs">
                    @{c.creator.username}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-400 hidden sm:table-cell text-xs">{c.type.replace('_', ' ')}</td>
                <td className="px-4 py-3 text-right text-white font-medium">{fmt(c.views)}</td>
                <td className="px-4 py-3 text-right text-gray-400 hidden sm:table-cell">{c._count.likes}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    c.status === 'ACTIVE'     ? 'bg-green-500/20 text-green-400' :
                    c.status === 'DELETED'    ? 'bg-red-500/20 text-red-400' :
                    c.status === 'ARCHIVED'   ? 'bg-yellow-500/20 text-yellow-400' :
                                               'bg-surface-600 text-gray-400'
                  }`}>{c.status}</span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell">{fmtDate(c.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex gap-1.5 justify-end">
                    <button onClick={() => setEditing(c)}
                      className="text-xs px-2 py-1 rounded bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 transition-colors">
                      Edit
                    </button>
                    {c.status !== 'ACTIVE' && (
                      <button onClick={() => handleStatus(c.id, 'ACTIVE')} disabled={acting === c.id}
                        className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors disabled:opacity-40">
                        Restore
                      </button>
                    )}
                    {c.status === 'ACTIVE' && (
                      <button onClick={() => handleStatus(c.id, 'ARCHIVED')} disabled={acting === c.id}
                        className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-colors disabled:opacity-40">
                        Archive
                      </button>
                    )}
                    {c.status !== 'DELETED' && (
                      <button onClick={() => handleStatus(c.id, 'DELETED')} disabled={acting === c.id}
                        className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-40">
                        {acting === c.id ? '...' : 'Remove'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={page} pages={pages} onChange={load} />

      {editing && (
        <EditContentModal
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setContent((prev) => prev.map((c) => c.id === updated.id ? updated : c));
            load(page); // re-fetch with freshly signed URLs from server
          }}
        />
      )}
    </div>
  );
}

// ── Reports tab ───────────────────────────────────────────────────────────────

function ReportsTab() {
  const [reports, setReports]   = useState<AdminReport[]>([]);
  const [total, setTotal]       = useState(0);
  const [pages, setPages]       = useState(1);
  const [page, setPage]         = useState(1);
  const [status, setStatus]     = useState('PENDING');
  const [acting, setActing]     = useState<string | null>(null);

  function load(p: number) {
    const params: Record<string, string> = { page: String(p), limit: '20', status };
    api.get('/admin/reports', { params })
      .then((r) => { setReports(r.data.reports); setTotal(r.data.total); setPages(r.data.pages); setPage(p); })
      .catch(() => {});
  }

  useEffect(() => { load(1); }, [status]); // eslint-disable-line

  async function handleResolve(id: string, action: 'REVIEWED' | 'DISMISSED') {
    setActing(id);
    await api.post(`/admin/reports/${id}/resolve`, { action }).finally(() => setActing(null));
    setReports((prev) => prev.map((r) => r.id === id ? { ...r, status: action } : r));
  }

  const REASON_LABEL: Record<string, string> = {
    SPAM: 'Spam',
    INAPPROPRIATE: 'Inappropriate',
    COPYRIGHT: 'Copyright',
    HATE_SPEECH: 'Hate speech',
    MISINFORMATION: 'Misinformation',
    OTHER: 'Other',
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-5">
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none">
          <option value="PENDING">Pending</option>
          <option value="REVIEWED">Reviewed</option>
          <option value="DISMISSED">Dismissed</option>
          <option value="ALL">All reports</option>
        </select>
        <span className="ml-auto text-sm text-gray-400 self-center">{total.toLocaleString()} reports</span>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-3">✅</p>
          <p>No {status.toLowerCase()} reports</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {reports.map((r) => (
              <div key={r.id} className="bg-surface-800 border border-surface-700 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        r.status === 'PENDING'   ? 'bg-yellow-500/20 text-yellow-400' :
                        r.status === 'REVIEWED'  ? 'bg-green-500/20 text-green-400' :
                                                   'bg-surface-600 text-gray-400'
                      }`}>{r.status}</span>
                      <span className="text-xs text-gray-400 bg-surface-700 px-2 py-0.5 rounded-full">
                        {REASON_LABEL[r.reason] || r.reason}
                      </span>
                      <span className="text-xs text-gray-500">{fmtDate(r.createdAt)}</span>
                    </div>
                    <p className="text-white text-sm font-medium">
                      <Link href={`/watch/${r.content.id}`} className="hover:text-brand-400 transition-colors">
                        {r.content.title}
                      </Link>
                      <span className="text-gray-500 font-normal ml-2">by @{r.content.creator.username}</span>
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">Reported by @{r.reporter.username} ({r.reporter.email})</p>
                    {r.detail && (
                      <p className="text-gray-400 text-xs mt-2 bg-surface-700 rounded-lg px-3 py-2 italic">"{r.detail}"</p>
                    )}
                  </div>
                  {r.status === 'PENDING' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleResolve(r.id, 'REVIEWED')}
                        disabled={acting === r.id}
                        className="text-xs px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-40"
                      >
                        {acting === r.id ? '...' : 'Take action'}
                      </button>
                      <button
                        onClick={() => handleResolve(r.id, 'DISMISSED')}
                        disabled={acting === r.id}
                        className="text-xs px-3 py-1.5 rounded-lg bg-surface-600 text-gray-300 hover:bg-surface-500 transition-colors disabled:opacity-40"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Pager page={page} pages={pages} onChange={load} />
        </>
      )}
    </div>
  );
}

// ── Polls tab ─────────────────────────────────────────────────────────────────

type PollType = 'CONTENT_VOTE' | 'ARTIST_VOTE' | 'CUSTOM';
interface FlexOption { label: string; contentId: string; artistId: string; imageUrl: string; body: string }
interface AdminPoll {
  id: string; title: string; description?: string | null; imageUrl?: string | null;
  pollType: PollType;
  status: 'ACTIVE' | 'CLOSED'; endsAt?: string | null; createdAt: string;
  _count: { votes: number; options: number };
}
interface ContentPick { id: string; title: string; type: string }
interface ArtistPick  { id: string; username: string; displayName?: string | null }

const POLL_TYPE_LABELS: Record<PollType, { label: string; emoji: string; hint: string }> = {
  CONTENT_VOTE: { label: 'Content Vote', emoji: '🎵', hint: 'Members vote on music, film, books, podcasts — any content type' },
  ARTIST_VOTE:  { label: 'Artist of the Week',  emoji: '🌟', hint: 'Showcase artists — bio, top tracks, stats' },
  CUSTOM:       { label: 'Custom Poll',          emoji: '🗳️', hint: 'Free-form options with image and description' },
};

function blankOption(): FlexOption {
  return { label: '', contentId: '', artistId: '', imageUrl: '', body: '' };
}

function CreatePollModal({ onClose, onCreated }: { onClose: () => void; onCreated: (p: AdminPoll) => void }) {
  const [title, setTitle]             = useState('');
  const [description, setDesc]        = useState('');
  const [startsAt, setStartsAt]       = useState('');
  const [endsAt, setEndsAt]           = useState('');
  const [allowMultiple, setAllowMulti] = useState(false);
  const [pollType, setPollType]       = useState<PollType>('CONTENT_VOTE');
  const [options, setOptions]         = useState<FlexOption[]>([blankOption(), blankOption()]);
  const [content, setContent]         = useState<ContentPick[]>([]);
  const [artists, setArtists]         = useState<ArtistPick[]>([]);
  const [imageFile, setImageFile]     = useState<File | null>(null);
  const [imagePreview, setPreview]    = useState('');
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');
  const imgRef                        = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get('/admin/content', { params: { limit: '100', status: 'ACTIVE' } })
      .then(({ data }) => setContent(data.content)).catch(() => {});
    api.get('/admin/users', { params: { limit: '100' } })
      .then(({ data }) => setArtists(data.users)).catch(() => {});
  }, []);

  // Reset options when type changes
  useEffect(() => {
    setOptions([blankOption(), blankOption()]);
  }, [pollType]);

  function setField(idx: number, field: keyof FlexOption, val: string) {
    setOptions((prev) => prev.map((o, i) => i === idx ? { ...o, [field]: val } : o));
  }

  function addOption() { if (options.length < 7) setOptions((prev) => [...prev, blankOption()]); }
  function removeOption(idx: number) {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleCreate() {
    if (!title.trim()) { setError('Title required'); return; }

    let mappedOptions: any[];
    if (pollType === 'CONTENT_VOTE') {
      const filled = options.filter((o) => o.contentId);
      if (filled.length < 2) { setError('Select at least 2 songs'); return; }
      mappedOptions = filled.map((o, i) => ({ contentId: o.contentId, label: o.label || `Version ${i + 1}` }));
    } else if (pollType === 'ARTIST_VOTE') {
      const filled = options.filter((o) => o.artistId);
      if (filled.length < 2) { setError('Select at least 2 artists'); return; }
      mappedOptions = filled.map((o, i) => ({ artistId: o.artistId, label: o.label || `Artist ${i + 1}` }));
    } else {
      const filled = options.filter((o) => o.label.trim());
      if (filled.length < 2) { setError('Add at least 2 options'); return; }
      mappedOptions = filled.map((o) => ({ label: o.label, imageUrl: o.imageUrl || undefined, body: o.body || undefined }));
    }

    setSaving(true);
    setError('');
    try {
      const { data } = await api.post('/polls', {
        title: title.trim(),
        description: description.trim() || undefined,
        startsAt: startsAt || undefined,
        endsAt: endsAt || undefined,
        allowMultiple,
        pollType,
        options: mappedOptions,
      });
      // Upload cover image if one was selected
      if (imageFile) {
        const fd = new FormData();
        fd.append('image', imageFile);
        await api.post(`/polls/${data.poll.id}/image`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }).catch(() => {});
      }
      onCreated(data.poll);
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Create failed');
    } finally {
      setSaving(false);
    }
  }

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  }

  const info = POLL_TYPE_LABELS[pollType];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-surface-800 border border-surface-700 rounded-2xl overflow-y-auto max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-700">
          <h2 className="text-white font-semibold">Create Poll</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="flex-1 px-6 py-6 space-y-5">

          {/* Poll type selector */}
          <div>
            <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wide">Poll Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(POLL_TYPE_LABELS) as PollType[]).map((t) => {
                const { label, emoji } = POLL_TYPE_LABELS[t];
                return (
                  <button key={t} type="button" onClick={() => setPollType(t)}
                    className={`rounded-lg border px-3 py-3 text-center text-xs transition-colors ${
                      pollType === t
                        ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                        : 'border-surface-600 bg-surface-700 text-gray-400 hover:border-surface-500'
                    }`}>
                    <div className="text-xl mb-1">{emoji}</div>
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-2">{info.hint}</p>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Poll Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder={pollType === 'CONTENT_VOTE' ? 'Which version hits different?' : pollType === 'ARTIST_VOTE' ? 'Artist of the Week' : 'What should we do next?'}
              className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400" />
          </div>

          {/* Cover image — optional */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Cover Image (optional)</label>
            <div
              onClick={() => imgRef.current?.click()}
              className="relative w-full aspect-video bg-surface-700 rounded-xl overflow-hidden cursor-pointer border border-dashed border-surface-500 hover:border-brand-400 transition-colors flex items-center justify-center mb-2"
            >
              {imagePreview
                ? <img src={imagePreview} alt="" className="absolute inset-0 w-full h-full object-cover" />
                : <div className="text-center text-gray-500 text-sm"><div className="text-3xl mb-1">🖼️</div>Click to upload</div>
              }
            </div>
            <input ref={imgRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImagePick} />
            {imagePreview && (
              <button type="button" onClick={() => { setImageFile(null); setPreview(''); }} className="text-xs text-red-400 hover:text-red-300 transition-colors">
                ✕ Remove image
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Description (optional)</label>
            <textarea value={description} onChange={(e) => setDesc(e.target.value)} rows={2}
              className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400 resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Start Date / Time (optional)</label>
              <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)}
                className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400" />
              <p className="text-[10px] text-gray-600 mt-1">When poll becomes visible</p>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">End Date / Time (optional)</label>
              <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)}
                className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400" />
              <p className="text-[10px] text-gray-600 mt-1">When voting closes</p>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wide">Multi-select</label>
            <button type="button" onClick={() => setAllowMulti((v) => !v)}
              className={`w-full rounded-lg border px-4 py-2.5 text-sm font-medium text-left transition-colors ${
                allowMultiple ? 'border-brand-500 bg-brand-500/10 text-brand-400' : 'border-surface-600 bg-surface-700 text-gray-400'
              }`}>
              {allowMultiple ? '✓ Voters can select multiple options' : 'Single choice only (tap to enable multi-select)'}
            </button>
          </div>

          {/* Options — different UI per type */}
          <div>
            <label className="block text-xs text-gray-400 mb-3 uppercase tracking-wide">
              {pollType === 'CONTENT_VOTE' ? 'Song Versions' : pollType === 'ARTIST_VOTE' ? 'Artists' : 'Options'}
              <span className="text-gray-600 font-normal normal-case ml-2">({options.length}/7)</span>
            </label>
            <div className="space-y-3">
              {options.map((opt, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <div className="flex-1 space-y-1.5">
                    {pollType === 'CONTENT_VOTE' && (
                      <select value={opt.contentId} onChange={(e) => setField(idx, 'contentId', e.target.value)}
                        className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none">
                        <option value="">— pick a song / content —</option>
                        {content.map((c) => (
                          <option key={c.id} value={c.id}>{c.title} ({c.type.toLowerCase().replace('_', ' ')})</option>
                        ))}
                      </select>
                    )}
                    {pollType === 'ARTIST_VOTE' && (
                      <select value={opt.artistId} onChange={(e) => setField(idx, 'artistId', e.target.value)}
                        className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none">
                        <option value="">— pick an artist —</option>
                        {artists.map((a) => (
                          <option key={a.id} value={a.id}>{a.displayName || a.username} (@{a.username})</option>
                        ))}
                      </select>
                    )}
                    {pollType === 'CUSTOM' && (
                      <>
                        <input value={opt.imageUrl} onChange={(e) => setField(idx, 'imageUrl', e.target.value)}
                          placeholder="Image URL (optional)"
                          className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400" />
                        <textarea value={opt.body} onChange={(e) => setField(idx, 'body', e.target.value)}
                          placeholder="Description (optional)" rows={2}
                          className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400 resize-none" />
                      </>
                    )}
                    <input value={opt.label} onChange={(e) => setField(idx, 'label', e.target.value)}
                      placeholder={pollType === 'CONTENT_VOTE' ? 'Label (e.g. "Studio Take")' : pollType === 'ARTIST_VOTE' ? 'Label (optional)' : 'Option label *'}
                      className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400" />
                  </div>
                  <button onClick={() => removeOption(idx)} disabled={options.length <= 2}
                    className="mt-1 text-gray-500 hover:text-red-400 disabled:opacity-30 text-lg leading-none px-1">×</button>
                </div>
              ))}
            </div>
            {options.length < 7 ? (
              <button onClick={addOption}
                className="mt-3 text-sm text-brand-400 hover:text-brand-300 transition-colors">
                + Add another option
              </button>
            ) : (
              <p className="mt-3 text-xs text-gray-600">Maximum 7 options reached</p>
            )}
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>

        <div className="px-6 py-5 border-t border-surface-700 flex gap-3">
          <button onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg bg-surface-700 text-gray-300 hover:bg-surface-600 transition-colors text-sm">
            Cancel
          </button>
          <button onClick={handleCreate} disabled={saving}
            className="flex-1 px-4 py-2 rounded-lg bg-brand-500 text-black font-semibold hover:bg-brand-400 transition-colors text-sm disabled:opacity-50">
            {saving ? 'Creating…' : 'Create Poll'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditPollModal({ poll, onClose, onSaved }: { poll: AdminPoll; onClose: () => void; onSaved: (p: AdminPoll) => void }) {
  const [title, setTitle]               = useState(poll.title);
  const [description, setDesc]          = useState(poll.description || '');
  const [startsAt, setStartsAt]         = useState((poll as any).startsAt ? new Date((poll as any).startsAt).toISOString().slice(0, 16) : '');
  const [endsAt, setEndsAt]             = useState(poll.endsAt ? new Date(poll.endsAt).toISOString().slice(0, 16) : '');
  const [allowMultiple, setAllowMulti]  = useState((poll as any).allowMultiple ?? false);
  const [pollType, setPollType]         = useState<PollType>(poll.pollType);
  const [options, setOptions]           = useState<FlexOption[]>([blankOption(), blankOption()]);
  const [content, setContent]           = useState<ContentPick[]>([]);
  const [artists, setArtists]           = useState<ArtistPick[]>([]);
  const [imagePreview, setPreview]      = useState(poll.imageUrl || '');
  const [imageFile, setImageFile]       = useState<File | null>(null);
  const [optionsLoaded, setOptLoaded]   = useState(false);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState('');
  const imgRef                          = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get('/admin/content', { params: { limit: '100', status: 'ACTIVE' } })
      .then(({ data }) => setContent(data.content)).catch(() => {});
    api.get('/admin/users', { params: { limit: '100' } })
      .then(({ data }) => setArtists(data.users)).catch(() => {});
    api.get(`/polls/${poll.id}`).then(({ data: d }) => {
      const mapped: FlexOption[] = (d.poll.options ?? []).map((opt: any) => ({
        label:     opt.label || '',
        contentId: opt.content?.id || '',
        artistId:  opt.artist?.id  || '',
        imageUrl:  opt.imageUrl    || '',
        body:      opt.body        || '',
      }));
      if (mapped.length >= 2) setOptions(mapped);
      setOptLoaded(true);
    }).catch(() => setOptLoaded(true));
  }, [poll.id]);

  function setField(idx: number, field: keyof FlexOption, val: string) {
    setOptions((prev) => prev.map((o, i) => i === idx ? { ...o, [field]: val } : o));
  }
  function addOption() { if (options.length < 7) setOptions((prev) => [...prev, blankOption()]); }
  function removeOption(idx: number) { if (options.length > 2) setOptions((prev) => prev.filter((_, i) => i !== idx)); }

  function handleTypeChange(newType: PollType) {
    setPollType(newType);
    setOptions([blankOption(), blankOption()]);
  }

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    if (!title.trim()) { setError('Title is required'); return; }

    let mappedOptions: any[];
    if (pollType === 'CONTENT_VOTE') {
      const filled = options.filter((o) => o.contentId);
      if (filled.length < 2) { setError('Select at least 2 songs'); return; }
      mappedOptions = filled.map((o, i) => ({ contentId: o.contentId, label: o.label || `Version ${i + 1}` }));
    } else if (pollType === 'ARTIST_VOTE') {
      const filled = options.filter((o) => o.artistId);
      if (filled.length < 2) { setError('Select at least 2 artists'); return; }
      mappedOptions = filled.map((o, i) => ({ artistId: o.artistId, label: o.label || `Artist ${i + 1}` }));
    } else {
      const filled = options.filter((o) => o.label.trim());
      if (filled.length < 2) { setError('Add at least 2 options'); return; }
      mappedOptions = filled.map((o) => ({ label: o.label, imageUrl: o.imageUrl || undefined, body: o.body || undefined }));
    }

    setSaving(true);
    setError('');
    try {
      const { data } = await api.patch(`/polls/${poll.id}`, {
        title: title.trim(),
        description: description.trim() || null,
        startsAt: startsAt || null,
        endsAt: endsAt || null,
        allowMultiple,
        pollType,
        options: mappedOptions,
      });
      let uploadedImageUrl: string | undefined;
      if (imageFile) {
        const fd = new FormData();
        fd.append('image', imageFile);
        const { data: imgData } = await api.post(`/polls/${poll.id}/image`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        uploadedImageUrl = imgData.imageUrl;
      }
      onSaved({ ...data.poll, imageUrl: uploadedImageUrl ?? poll.imageUrl });
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const info = POLL_TYPE_LABELS[pollType];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-md bg-surface-800 border-l border-surface-700 h-full overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-700">
          <div>
            <h2 className="text-white font-semibold">Edit Poll</h2>
            <p className="text-gray-500 text-xs mt-0.5">{poll._count.votes} vote{poll._count.votes !== 1 ? 's' : ''} · changing options resets votes</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="flex-1 px-6 py-6 space-y-5">
          {/* Cover image */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Cover Image</label>
            <div onClick={() => imgRef.current?.click()}
              className="relative w-full aspect-video bg-surface-700 rounded-xl overflow-hidden cursor-pointer border border-dashed border-surface-500 hover:border-brand-400 transition-colors flex items-center justify-center mb-2">
              {imagePreview
                ? <img src={imagePreview} alt="" className="absolute inset-0 w-full h-full object-cover" />
                : <div className="text-center text-gray-500 text-sm"><div className="text-3xl mb-1">🖼️</div>Click to upload</div>
              }
            </div>
            <input ref={imgRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImagePick} />
            {imagePreview && (
              <button type="button" onClick={() => { setImageFile(null); setPreview(''); }} className="text-xs text-red-400 hover:text-red-300 transition-colors">
                ✕ Remove image
              </button>
            )}
          </div>

          {/* Poll type */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Poll Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(POLL_TYPE_LABELS) as PollType[]).map((t) => {
                const tInfo = POLL_TYPE_LABELS[t];
                return (
                  <button key={t} type="button" onClick={() => handleTypeChange(t)}
                    className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border text-xs font-medium transition-colors ${pollType === t ? 'border-brand-500 bg-brand-500/10 text-brand-400' : 'border-surface-600 text-gray-400 hover:border-surface-400'}`}>
                    <span className="text-xl">{tInfo.emoji}</span>
                    <span className="text-center leading-tight">{tInfo.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-2">{info.hint}</p>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400" />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Description</label>
            <textarea value={description} onChange={(e) => setDesc(e.target.value)} rows={3}
              className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400 resize-none" />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Start Date / Time</label>
              <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)}
                className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400" />
              {startsAt && <button type="button" onClick={() => setStartsAt('')} className="text-xs text-gray-500 hover:text-gray-300 mt-1 transition-colors">✕ Clear</button>}
              <p className="text-[10px] text-gray-600 mt-0.5">When poll goes live</p>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">End Date / Time</label>
              <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)}
                className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400" />
              {endsAt && <button type="button" onClick={() => setEndsAt('')} className="text-xs text-gray-500 hover:text-gray-300 mt-1 transition-colors">✕ Clear</button>}
              <p className="text-[10px] text-gray-600 mt-0.5">When voting closes</p>
            </div>
          </div>

          {/* Multi-select toggle */}
          <div>
            <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wide">Multi-select</label>
            <button type="button" onClick={() => setAllowMulti((v: boolean) => !v)}
              className={`w-full rounded-lg border px-4 py-2.5 text-sm font-medium text-left transition-colors ${
                allowMultiple ? 'border-brand-500 bg-brand-500/10 text-brand-400' : 'border-surface-600 bg-surface-700 text-gray-400'
              }`}>
              {allowMultiple ? '✓ Voters can select multiple options' : 'Single choice only (tap to enable multi-select)'}
            </button>
          </div>

          {/* Options */}
          <div>
            <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wide">
              Options <span className="text-gray-600 font-normal normal-case">({options.length}/7)</span>
            </label>
            {!optionsLoaded ? (
              <div className="text-xs text-gray-500 py-4 text-center">Loading options…</div>
            ) : (
              <div className="space-y-3">
                {options.map((opt, idx) => (
                  <div key={idx} className="bg-surface-700 rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-5 text-center">{idx + 1}</span>
                      <input value={opt.label} onChange={(e) => setField(idx, 'label', e.target.value)}
                        placeholder={pollType === 'CONTENT_VOTE' ? 'Label (optional)' : pollType === 'ARTIST_VOTE' ? 'Label (optional)' : 'Option label'}
                        className="flex-1 bg-surface-600 border border-surface-500 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400" />
                      <button type="button" onClick={() => removeOption(idx)}
                        disabled={options.length <= 2}
                        className="text-gray-500 hover:text-red-400 disabled:opacity-30 transition-colors text-lg leading-none">×</button>
                    </div>
                    {pollType === 'CONTENT_VOTE' && (
                      <select value={opt.contentId} onChange={(e) => setField(idx, 'contentId', e.target.value)}
                        className="w-full bg-surface-600 border border-surface-500 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400">
                        <option value="">— Select content —</option>
                        {content.map((c) => <option key={c.id} value={c.id}>{c.title} ({c.type})</option>)}
                      </select>
                    )}
                    {pollType === 'ARTIST_VOTE' && (
                      <select value={opt.artistId} onChange={(e) => setField(idx, 'artistId', e.target.value)}
                        className="w-full bg-surface-600 border border-surface-500 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400">
                        <option value="">— Select artist —</option>
                        {artists.map((a) => <option key={a.id} value={a.id}>{a.displayName || a.username} (@{a.username})</option>)}
                      </select>
                    )}
                    {pollType === 'CUSTOM' && (
                      <>
                        <input value={opt.imageUrl} onChange={(e) => setField(idx, 'imageUrl', e.target.value)}
                          placeholder="Image URL (optional)"
                          className="w-full bg-surface-600 border border-surface-500 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400" />
                        <textarea value={opt.body} onChange={(e) => setField(idx, 'body', e.target.value)}
                          placeholder="Description (optional)" rows={2}
                          className="w-full bg-surface-600 border border-surface-500 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400 resize-none" />
                      </>
                    )}
                  </div>
                ))}
                {options.length < 7 ? (
                  <button type="button" onClick={addOption}
                    className="w-full py-2 rounded-xl border border-dashed border-surface-600 text-gray-500 hover:border-brand-400 hover:text-brand-400 text-sm transition-colors">
                    + Add option
                  </button>
                ) : (
                  <p className="text-xs text-gray-600 text-center py-2">Maximum 7 options reached</p>
                )}
              </div>
            )}
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>

        <div className="px-6 py-5 border-t border-surface-700 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg bg-surface-700 text-gray-300 hover:bg-surface-600 transition-colors text-sm">Cancel</button>
          <button onClick={handleSave} disabled={saving || !optionsLoaded}
            className="flex-1 px-4 py-2 rounded-lg bg-brand-500 text-black font-semibold hover:bg-brand-400 transition-colors text-sm disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PollsTab({ autoCreate = false }: { autoCreate?: boolean }) {
  const [polls, setPolls]       = useState<AdminPoll[]>([]);
  const [loading, setLoading]   = useState(true);
  const [creating, setCreating] = useState(autoCreate);
  const [editing, setEditing]   = useState<AdminPoll | null>(null);
  const [acting, setActing]     = useState<string | null>(null);
  const [filter, setFilter]     = useState('ALL');

  function load() {
    const params: Record<string, string> = {};
    if (filter !== 'ALL') params.status = filter;
    api.get('/polls', { params })
      .then(({ data }) => setPolls(data.polls))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [filter]); // eslint-disable-line

  async function handleClose(id: string) {
    if (!confirm('Close this poll? Voters will see the results.')) return;
    setActing(id);
    await api.post(`/polls/${id}/close`).finally(() => setActing(null));
    setPolls((prev) => prev.map((p) => p.id === id ? { ...p, status: 'CLOSED' } : p));
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this poll and all votes? Cannot be undone.')) return;
    setActing(id);
    await api.delete(`/polls/${id}`).finally(() => setActing(null));
    setPolls((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-5 items-center">
        <select value={filter} onChange={(e) => setFilter(e.target.value)}
          className="bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none">
          <option value="ALL">All polls</option>
          <option value="ACTIVE">Active</option>
          <option value="CLOSED">Closed</option>
        </select>
        <span className="text-sm text-gray-400">{polls.length} poll{polls.length !== 1 ? 's' : ''}</span>
        <button onClick={() => setCreating(true)}
          className="ml-auto px-4 py-2 bg-brand-500 text-black rounded-lg text-sm font-semibold hover:bg-brand-400 transition-colors">
          + Create Poll
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-20 bg-surface-700 rounded-xl animate-pulse" />)}</div>
      ) : polls.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-3">🗳️</p>
          <p>No polls yet. Create one to let your members vote on a song.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {polls.map((p) => (
            <div key={p.id} className="bg-surface-800 border border-surface-700 rounded-xl overflow-hidden">
              <div className="flex items-stretch">
                {p.imageUrl && (
                  <div className="flex-shrink-0 w-20 bg-surface-700 overflow-hidden">
                    <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover" />
                  </div>
                )}
              <div className="flex-1 px-5 py-4 flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.status === 'ACTIVE' ? 'bg-brand-500/20 text-brand-400' : 'bg-surface-600 text-gray-400'}`}>
                      {p.status}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-surface-700 text-gray-400">
                      {POLL_TYPE_LABELS[p.pollType]?.emoji} {POLL_TYPE_LABELS[p.pollType]?.label}
                    </span>
                    <span className="text-xs text-gray-500">{fmtDate(p.createdAt)}</span>
                    {p.endsAt && p.status === 'ACTIVE' && (
                      <span className="text-xs text-gray-500">· ends {fmtDate(p.endsAt)}</span>
                    )}
                  </div>
                  <p className="text-white font-medium">{p.title}</p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {p._count.options} options · {p._count.votes} vote{p._count.votes !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0 flex-wrap">
                  <Link href={`/polls/${p.id}`} target="_blank"
                    className="text-xs px-3 py-1.5 rounded-lg bg-surface-600 text-gray-300 hover:bg-surface-500 transition-colors">
                    View
                  </Link>
                  <button onClick={() => setEditing(p)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 transition-colors">
                    Edit
                  </button>
                  {p.status === 'ACTIVE' && (
                    <button onClick={() => handleClose(p.id)} disabled={acting === p.id}
                      className="text-xs px-3 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-colors disabled:opacity-40">
                      {acting === p.id ? '…' : 'Close'}
                    </button>
                  )}
                  <button onClick={() => handleDelete(p.id)} disabled={acting === p.id}
                    className="text-xs px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-40">
                    {acting === p.id ? '…' : 'Delete'}
                  </button>
                </div>
              </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <CreatePollModal
          onClose={() => setCreating(false)}
          onCreated={(p) => { setPolls((prev) => [p as any, ...prev]); setCreating(false); }}
        />
      )}

      {editing && (
        <EditPollModal
          poll={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => { setPolls((prev) => prev.map((p) => p.id === updated.id ? updated : p)); setEditing(null); }}
        />
      )}
    </div>
  );
}

// ── Partners tab ──────────────────────────────────────────────────────────────

interface AdminPartner {
  id: string; name: string; email: string; website?: string | null;
  logo?: string | null; description?: string | null; type: string; status: string;
  contactName?: string | null; phone?: string | null; featured: boolean; createdAt: string;
  _count?: { ads: number };
}
interface AdminPlacement {
  id: string; name: string; location: string; description?: string | null;
  pricePerDay: number; width?: number | null; height?: number | null; active: boolean;
  _count?: { ads: number };
}
interface AdminAd {
  id: string; title: string; body?: string | null; imageUrl?: string | null;
  linkUrl: string; startsAt: string; endsAt: string; status: string;
  impressions: number; clicks: number; paidAmount: number; notes?: string | null;
  partner: { id: string; name: string }; placement: { id: string; name: string; location: string };
}

const PARTNER_TYPE_LABELS: Record<string, string> = {
  ADVERTISER: 'Advertiser', SPONSOR: 'Sponsor', DONOR: 'Donor', COLLABORATOR: 'Collaborator',
};
const PARTNER_STATUS_COLORS: Record<string, string> = {
  PENDING:   'bg-yellow-500/20 text-yellow-400',
  APPROVED:  'bg-green-500/20 text-green-400',
  SUSPENDED: 'bg-red-500/20 text-red-400',
};
const AD_STATUS_COLORS: Record<string, string> = {
  PENDING:        'bg-yellow-500/20 text-yellow-400',
  PENDING_REVIEW: 'bg-orange-500/20 text-orange-400',
  ACTIVE:         'bg-green-500/20 text-green-400',
  PAUSED:         'bg-surface-600 text-gray-400',
  COMPLETED:      'bg-blue-500/20 text-blue-400',
  CANCELLED:      'bg-red-500/20 text-red-400',
};

function PartnersTab() {
  const [view, setView]           = useState<'partners' | 'placements' | 'ads'>('partners');
  const [partners, setPartners]   = useState<AdminPartner[]>([]);
  const [placements, setPlacements] = useState<AdminPlacement[]>([]);
  const [ads, setAds]             = useState<AdminAd[]>([]);
  const [loading, setLoading]     = useState(true);
  const [acting, setActing]       = useState<string | null>(null);
  const [showAddPartner, setAddPartner] = useState(false);
  const [showAddPlacement, setAddPlacement] = useState(false);
  const [editPlacement, setEditPlacement] = useState<AdminPlacement | null>(null);
  const [showAddAd, setAddAd]       = useState(false);
  const [editAd, setEditAd]         = useState<AdminAd | null>(null);
  const [duplicateAd, setDuplicateAd] = useState<AdminAd | null>(null);
  const [editPartner, setEditPartner] = useState<AdminPartner | null>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');

  function loadPartners() {
    const params: Record<string, string> = {};
    if (statusFilter !== 'ALL') params.status = statusFilter;
    api.get('/partners', { params })
      .then(({ data }) => setPartners(data.partners))
      .catch(() => {})
      .finally(() => setLoading(false));
  }
  function loadPlacements() {
    api.get('/partners/placements/list')
      .then(({ data }) => setPlacements(data.placements))
      .catch(() => {})
      .finally(() => setLoading(false));
  }
  function loadAds() {
    api.get('/partners/ads/list')
      .then(({ data }) => setAds(data.ads))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    setLoading(true);
    if (view === 'partners')   loadPartners();
    if (view === 'placements') loadPlacements();
    if (view === 'ads') {
      loadAds();
      // also populate dropdowns used in the Add Ad modal
      loadPartners();
      loadPlacements();
    }
  }, [view, statusFilter]); // eslint-disable-line

  async function handleApprove(id: string, status: string) {
    setActing(id);
    await api.patch(`/partners/${id}`, { status }).finally(() => setActing(null));
    setPartners((prev) => prev.map((p) => p.id === id ? { ...p, status } : p));
  }

  async function handleToggleFeatured(id: string, featured: boolean) {
    setActing(id);
    await api.patch(`/partners/${id}`, { featured: !featured }).finally(() => setActing(null));
    setPartners((prev) => prev.map((p) => p.id === id ? { ...p, featured: !featured } : p));
  }

  async function handleDeletePartner(id: string, name: string) {
    if (!confirm(`Delete partner "${name}"? All their ads will also be deleted.`)) return;
    setActing(id);
    await api.delete(`/partners/${id}`).finally(() => setActing(null));
    setPartners((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleAdStatus(id: string, status: string) {
    setActing(id);
    await api.patch(`/partners/ads/${id}`, { status }).finally(() => setActing(null));
    setAds((prev) => prev.map((a) => a.id === id ? { ...a, status } : a));
  }

  async function handleApproveAd(id: string) {
    setActing(id);
    try {
      await api.post(`/partners/ads/${id}/approve`);
      setAds((prev) => prev.map((a) => a.id === id ? { ...a, status: 'ACTIVE' } : a));
    } catch { alert('Failed to approve ad'); }
    finally { setActing(null); }
  }

  async function handleRejectAd(id: string, title: string) {
    const reason = prompt(`Rejection reason for "${title}" (optional, sent to advertiser):`);
    if (reason === null) return; // user cancelled prompt
    setActing(id);
    try {
      await api.post(`/partners/ads/${id}/reject`, { reason: reason || undefined });
      setAds((prev) => prev.map((a) => a.id === id ? { ...a, status: 'CANCELLED' } : a));
    } catch { alert('Failed to reject ad'); }
    finally { setActing(null); }
  }

  async function handleDeleteAd(id: string) {
    if (!confirm('Delete this ad campaign?')) return;
    setActing(id);
    await api.delete(`/partners/ads/${id}`).finally(() => setActing(null));
    setAds((prev) => prev.filter((a) => a.id !== id));
  }

  async function handleDeletePlacement(id: string, name: string) {
    if (!confirm(`Delete placement "${name}"?`)) return;
    setActing(id);
    await api.delete(`/partners/placements/${id}`).finally(() => setActing(null));
    setPlacements((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div>
      {/* Sub-nav */}
      <div className="flex gap-2 mb-6 border-b border-surface-700 pb-1">
        {(['partners', 'placements', 'ads'] as const).map((v) => (
          <button key={v} onClick={() => setView(v)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors capitalize ${
              view === v ? 'bg-surface-800 text-white border border-surface-700 border-b-surface-800 -mb-px' : 'text-gray-400 hover:text-white'
            }`}>{v}</button>
        ))}
        <div className="ml-auto flex gap-2">
          {view === 'partners'   && (
            <>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-1.5 text-xs focus:outline-none">
                <option value="ALL">All</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
              <button onClick={() => setAddPartner(true)}
                className="px-4 py-1.5 bg-brand-500 text-black rounded-lg text-xs font-semibold hover:bg-brand-400 transition-colors">
                + Add Partner
              </button>
            </>
          )}
          {view === 'placements' && (
            <button onClick={() => setAddPlacement(true)}
              className="px-4 py-1.5 bg-brand-500 text-black rounded-lg text-xs font-semibold hover:bg-brand-400 transition-colors">
              + Add Placement
            </button>
          )}
          {view === 'ads' && (
            <button onClick={() => setAddAd(true)}
              className="px-4 py-1.5 bg-brand-500 text-black rounded-lg text-xs font-semibold hover:bg-brand-400 transition-colors">
              + New Ad Campaign
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-20 bg-surface-700 rounded-xl animate-pulse" />)}</div>
      )}

      {/* Partners list */}
      {!loading && view === 'partners' && (
        <div className="space-y-3">
          {partners.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              <p className="text-4xl mb-3">🤝</p>
              <p>No partners yet. Add your first partner to get started.</p>
            </div>
          )}
          {partners.map((p) => (
            <div key={p.id} className="bg-surface-800 border border-surface-700 rounded-xl px-5 py-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PARTNER_STATUS_COLORS[p.status] ?? 'bg-surface-600 text-gray-400'}`}>
                      {p.status}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-surface-700 text-gray-400">
                      {PARTNER_TYPE_LABELS[p.type] ?? p.type}
                    </span>
                    {p.featured && <span className="text-xs text-brand-400 font-semibold">★ Featured</span>}
                    <span className="text-xs text-gray-500">{fmtDate(p.createdAt)}</span>
                  </div>
                  <p className="text-white font-medium">{p.name}</p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {p.email}
                    {p.contactName && ` · ${p.contactName}`}
                    {p.phone && ` · ${p.phone}`}
                    {p._count !== undefined && ` · ${p._count.ads} ad${p._count.ads !== 1 ? 's' : ''}`}
                  </p>
                  {p.website && (
                    <a href={p.website} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-400 hover:underline mt-0.5 block">
                      {p.website}
                    </a>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0 flex-wrap">
                  {p.status === 'PENDING' && (
                    <button onClick={() => handleApprove(p.id, 'APPROVED')} disabled={acting === p.id}
                      className="text-xs px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors disabled:opacity-40">
                      Approve
                    </button>
                  )}
                  {p.status === 'APPROVED' && (
                    <button onClick={() => handleApprove(p.id, 'SUSPENDED')} disabled={acting === p.id}
                      className="text-xs px-3 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-colors disabled:opacity-40">
                      Suspend
                    </button>
                  )}
                  {p.status === 'SUSPENDED' && (
                    <button onClick={() => handleApprove(p.id, 'APPROVED')} disabled={acting === p.id}
                      className="text-xs px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors disabled:opacity-40">
                      Reinstate
                    </button>
                  )}
                  <button onClick={() => handleToggleFeatured(p.id, p.featured)} disabled={acting === p.id}
                    className={`text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 ${p.featured ? 'bg-brand-500/20 text-brand-400 hover:bg-brand-500/30' : 'bg-surface-600 text-gray-400 hover:bg-surface-500'}`}>
                    {p.featured ? '★ Unfeature' : '☆ Feature'}
                  </button>
                  <button onClick={() => setEditPartner(p)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-surface-600 text-gray-300 hover:bg-surface-500 transition-colors">
                    Edit
                  </button>
                  <button onClick={() => handleDeletePartner(p.id, p.name)} disabled={acting === p.id}
                    className="text-xs px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-40">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Placements list */}
      {!loading && view === 'placements' && (
        <div className="space-y-3">
          {placements.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              <p className="text-4xl mb-3">📍</p>
              <p>No ad placements defined yet. Add placement slots to start selling ads.</p>
            </div>
          )}
          {placements.map((pl) => (
            <div key={pl.id} className="bg-surface-800 border border-surface-700 rounded-xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pl.active ? 'bg-green-500/20 text-green-400' : 'bg-surface-600 text-gray-400'}`}>
                    {pl.active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-xs text-gray-500 font-mono">{pl.location}</span>
                </div>
                <p className="text-white font-medium">{pl.name}</p>
                <p className="text-gray-500 text-xs mt-0.5">
                  ${pl.pricePerDay}/day
                  {pl.width && pl.height && ` · ${pl.width}×${pl.height}px`}
                  {pl._count !== undefined && ` · ${pl._count.ads} ad${pl._count.ads !== 1 ? 's' : ''}`}
                </p>
                {pl.description && <p className="text-gray-600 text-xs mt-1">{pl.description}</p>}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => setEditPlacement(pl)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-surface-700 text-gray-300 hover:bg-surface-600 transition-colors">
                  Edit
                </button>
                <button onClick={() => handleDeletePlacement(pl.id, pl.name)} disabled={acting === pl.id}
                  className="text-xs px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-40">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ads list */}
      {!loading && view === 'ads' && (
        <div className="space-y-3">
          {ads.filter((a) => a.status === 'PENDING_REVIEW').length > 0 && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl px-5 py-3 flex items-center gap-3">
              <span className="text-orange-400 text-lg">🔔</span>
              <p className="text-orange-300 text-sm font-medium">
                {ads.filter((a) => a.status === 'PENDING_REVIEW').length} ad{ads.filter((a) => a.status === 'PENDING_REVIEW').length !== 1 ? 's' : ''} pending your review
              </p>
            </div>
          )}
          {ads.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              <p className="text-4xl mb-3">📢</p>
              <p>No ad campaigns yet. Create one to start monetizing placements.</p>
            </div>
          )}
          {ads.map((a) => {
            const ctr = a.impressions > 0 ? ((a.clicks / a.impressions) * 100).toFixed(1) : '0.0';
            return (
              <div key={a.id} className="bg-surface-800 border border-surface-700 rounded-xl px-5 py-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${AD_STATUS_COLORS[a.status] ?? 'bg-surface-600 text-gray-400'}`}>
                        {a.status === 'PENDING_REVIEW' ? 'Pending Review' : a.status}
                      </span>
                      <span className="text-xs text-gray-500">{fmtDate(a.startsAt)} – {fmtDate(a.endsAt)}</span>
                    </div>
                    <p className="text-white font-medium">{a.title}</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {a.partner.name} · {a.placement.name} <span className="font-mono text-gray-600">({a.placement.location})</span>
                    </p>
                    <div className="flex gap-4 mt-1.5 text-xs text-gray-400">
                      <span>{a.impressions.toLocaleString()} impressions</span>
                      <span>{a.clicks.toLocaleString()} clicks</span>
                      <span className="text-brand-400">{ctr}% CTR</span>
                      <span className="text-camp-400">${a.paidAmount.toFixed(2)} paid</span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0 flex-wrap">
                    <button onClick={() => setEditAd(a)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-surface-700 text-gray-300 hover:bg-surface-600 transition-colors">
                      Edit
                    </button>
                    <button onClick={() => setDuplicateAd(a)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-surface-700 text-gray-300 hover:bg-surface-600 transition-colors">
                      Duplicate
                    </button>
                    {a.status === 'PENDING_REVIEW' && (
                      <>
                        <button onClick={() => handleApproveAd(a.id)} disabled={acting === a.id}
                          className="text-xs px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors disabled:opacity-40 font-semibold">
                          ✓ Approve
                        </button>
                        <button onClick={() => handleRejectAd(a.id, a.title)} disabled={acting === a.id}
                          className="text-xs px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-40 font-semibold">
                          ✕ Reject
                        </button>
                      </>
                    )}
                    {a.status === 'PENDING' && (
                      <button onClick={() => handleAdStatus(a.id, 'ACTIVE')} disabled={acting === a.id}
                        className="text-xs px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors disabled:opacity-40">
                        Activate
                      </button>
                    )}
                    {a.status === 'ACTIVE' && (
                      <button onClick={() => handleAdStatus(a.id, 'PAUSED')} disabled={acting === a.id}
                        className="text-xs px-3 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-colors disabled:opacity-40">
                        Pause
                      </button>
                    )}
                    {a.status === 'PAUSED' && (
                      <button onClick={() => handleAdStatus(a.id, 'ACTIVE')} disabled={acting === a.id}
                        className="text-xs px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors disabled:opacity-40">
                        Resume
                      </button>
                    )}
                    <button onClick={() => handleDeleteAd(a.id)} disabled={acting === a.id}
                      className="text-xs px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-40">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add partner modal */}
      {showAddPartner && (
        <AddPartnerModal
          onClose={() => setAddPartner(false)}
          onCreated={(p) => { setPartners((prev) => [p, ...prev]); setAddPartner(false); }}
        />
      )}

      {/* Edit partner modal */}
      {editPartner && (
        <EditPartnerModal
          partner={editPartner}
          onClose={() => setEditPartner(null)}
          onSaved={(p) => { setPartners((prev) => prev.map((x) => x.id === p.id ? p : x)); setEditPartner(null); }}
        />
      )}

      {/* Add placement modal */}
      {showAddPlacement && (
        <AddPlacementModal
          onClose={() => setAddPlacement(false)}
          onCreated={(pl) => { setPlacements((prev) => [...prev, pl]); setAddPlacement(false); }}
        />
      )}

      {/* Edit placement modal */}
      {editPlacement && (
        <AddPlacementModal
          placement={editPlacement}
          onClose={() => setEditPlacement(null)}
          onCreated={(pl) => { setPlacements((prev) => prev.map((x) => x.id === pl.id ? pl : x)); setEditPlacement(null); }}
        />
      )}

      {/* Add ad modal */}
      {showAddAd && (
        <AddAdModal
          onClose={() => setAddAd(false)}
          onCreated={(a) => { setAds((prev) => [a, ...prev]); setAddAd(false); }}
        />
      )}

      {/* Edit ad modal */}
      {editAd && (
        <AddAdModal
          ad={editAd}
          onClose={() => setEditAd(null)}
          onCreated={(a) => { setAds((prev) => prev.map((x) => x.id === a.id ? a : x)); setEditAd(null); }}
        />
      )}

      {/* Duplicate ad modal — pre-filled but creates a new record */}
      {duplicateAd && (
        <AddAdModal
          ad={duplicateAd}
          isDuplicate
          onClose={() => setDuplicateAd(null)}
          onCreated={(a) => { setAds((prev) => [a, ...prev]); setDuplicateAd(null); }}
        />
      )}
    </div>
  );
}

function AddPartnerModal({ onClose, onCreated }: { onClose: () => void; onCreated: (p: AdminPartner) => void }) {
  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [website, setWebsite]     = useState('');
  const [description, setDesc]    = useState('');
  const [type, setType]           = useState('ADVERTISER');
  const [contactName, setContact] = useState('');
  const [phone, setPhone]         = useState('');
  const [logoFile, setLogoFile]   = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  async function handleCreate() {
    if (!name.trim() || !email.trim()) { setError('Name and email are required'); return; }
    setSaving(true); setError('');
    try {
      const { data } = await api.post('/partners', { name, email, website, description, type, contactName, phone });
      let partner: AdminPartner = data.partner;
      if (logoFile) {
        const fd = new FormData();
        fd.append('logo', logoFile);
        const { data: logoData } = await api.post(`/partners/${partner.id}/logo`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        partner = { ...partner, logo: logoData.logo };
      }
      onCreated(partner);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Create failed');
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-md bg-surface-800 border-l border-surface-700 h-full overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-700">
          <h2 className="text-white font-semibold">Add Partner</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
        </div>
        <div className="flex-1 px-6 py-6 space-y-4">
          {/* Logo upload */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Logo / Brand Image</label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg bg-surface-700 border border-surface-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                {logoPreview
                  ? <img src={logoPreview} alt="preview" className="w-full h-full object-contain" />
                  : <span className="text-2xl">🤝</span>}
              </div>
              <label className="cursor-pointer px-3 py-2 rounded-lg bg-surface-600 hover:bg-surface-500 text-gray-300 text-xs font-medium transition-colors">
                {logoFile ? 'Change image' : 'Upload image'}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoChange} />
              </label>
              {logoFile && (
                <button onClick={() => { setLogoFile(null); setLogoPreview(null); }}
                  className="text-xs text-red-400 hover:text-red-300">Remove</button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Partner Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)}
              className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="ADVERTISER">Advertiser</option>
              <option value="SPONSOR">Sponsor</option>
              <option value="DONOR">Donor</option>
              <option value="COLLABORATOR">Collaborator</option>
            </select>
          </div>
          {[
            { label: 'Business Name *', val: name, set: setName, ph: 'DaddyMan Gear Co.' },
            { label: 'Email *', val: email, set: setEmail, ph: 'contact@partner.com' },
            { label: 'Website', val: website, set: setWebsite, ph: 'https://partner.com' },
            { label: 'Contact Name', val: contactName, set: setContact, ph: 'John Smith' },
            { label: 'Phone', val: phone, set: setPhone, ph: '+1 (555) 000-0000' },
          ].map(({ label, val, set, ph }) => (
            <div key={label}>
              <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">{label}</label>
              <input value={val} onChange={(e) => set(e.target.value)} placeholder={ph}
                className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400" />
            </div>
          ))}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Description</label>
            <textarea value={description} onChange={(e) => setDesc(e.target.value)} rows={3}
              className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400 resize-none" />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
        <div className="px-6 py-5 border-t border-surface-700 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg bg-surface-700 text-gray-300 hover:bg-surface-600 transition-colors text-sm">Cancel</button>
          <button onClick={handleCreate} disabled={saving}
            className="flex-1 px-4 py-2 rounded-lg bg-brand-500 text-black font-semibold hover:bg-brand-400 transition-colors text-sm disabled:opacity-50">
            {saving ? 'Adding…' : 'Add Partner'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditPartnerModal({ partner, onClose, onSaved }: { partner: AdminPartner; onClose: () => void; onSaved: (p: AdminPartner) => void }) {
  const [name, setName]           = useState(partner.name);
  const [email, setEmail]         = useState(partner.email);
  const [website, setWebsite]     = useState(partner.website || '');
  const [description, setDesc]    = useState(partner.description || '');
  const [contactName, setContact] = useState(partner.contactName || '');
  const [phone, setPhone]         = useState(partner.phone || '');
  const [logoFile, setLogoFile]   = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true); setError('');
    try {
      const { data } = await api.patch(`/partners/${partner.id}`, { name, email, website, description, contactName, phone });
      let updated: AdminPartner = { ...partner, ...data.partner };
      if (logoFile) {
        const fd = new FormData();
        fd.append('logo', logoFile);
        const { data: logoData } = await api.post(`/partners/${partner.id}/logo`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        updated = { ...updated, logo: logoData.logo };
      }
      onSaved(updated);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Save failed');
    } finally { setSaving(false); }
  }

  const currentLogo = logoPreview || partner.logo;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-md bg-surface-800 border-l border-surface-700 h-full overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-700">
          <h2 className="text-white font-semibold">Edit Partner</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
        </div>
        <div className="flex-1 px-6 py-6 space-y-4">
          {/* Logo upload */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Logo / Brand Image</label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg bg-surface-700 border border-surface-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                {currentLogo
                  ? <img src={currentLogo} alt="logo" className="w-full h-full object-contain" />
                  : <span className="text-2xl">🤝</span>}
              </div>
              <label className="cursor-pointer px-3 py-2 rounded-lg bg-surface-600 hover:bg-surface-500 text-gray-300 text-xs font-medium transition-colors">
                {currentLogo ? 'Replace image' : 'Upload image'}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoChange} />
              </label>
              {logoFile && (
                <button onClick={() => { setLogoFile(null); setLogoPreview(null); }}
                  className="text-xs text-red-400 hover:text-red-300">Revert</button>
              )}
            </div>
          </div>

          {[
            { label: 'Business Name *', val: name, set: setName },
            { label: 'Email *', val: email, set: setEmail },
            { label: 'Website', val: website, set: setWebsite },
            { label: 'Contact Name', val: contactName, set: setContact },
            { label: 'Phone', val: phone, set: setPhone },
          ].map(({ label, val, set }) => (
            <div key={label}>
              <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">{label}</label>
              <input value={val} onChange={(e) => set(e.target.value)}
                className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400" />
            </div>
          ))}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Description</label>
            <textarea value={description} onChange={(e) => setDesc(e.target.value)} rows={3}
              className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400 resize-none" />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
        <div className="px-6 py-5 border-t border-surface-700 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg bg-surface-700 text-gray-300 hover:bg-surface-600 transition-colors text-sm">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 px-4 py-2 rounded-lg bg-brand-500 text-black font-semibold hover:bg-brand-400 transition-colors text-sm disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddPlacementModal({ placement, onClose, onCreated }: {
  placement?: AdminPlacement;
  onClose: () => void;
  onCreated: (pl: AdminPlacement) => void;
}) {
  const isEdit = !!placement;
  const [name, setName]         = useState(placement?.name ?? '');
  const [location, setLoc]      = useState(placement?.location ?? '');
  const [description, setDesc]  = useState(placement?.description ?? '');
  const [pricePerDay, setPrice] = useState(placement?.pricePerDay != null ? String(placement.pricePerDay) : '');
  const [width, setWidth]       = useState(placement?.width != null ? String(placement.width) : '');
  const [height, setHeight]     = useState(placement?.height != null ? String(placement.height) : '');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  async function handleSave() {
    if (!name.trim() || !location.trim()) { setError('Name and location key are required'); return; }
    setSaving(true); setError('');
    try {
      if (isEdit) {
        const { data } = await api.patch(`/partners/placements/${placement!.id}`, { name, location, description, pricePerDay, width, height });
        onCreated(data.placement);
      } else {
        const { data } = await api.post('/partners/placements', { name, location, description, pricePerDay, width, height });
        onCreated(data.placement);
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Save failed');
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-md bg-surface-800 border-l border-surface-700 h-full overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-700">
          <h2 className="text-white font-semibold">{isEdit ? 'Edit Placement' : 'Add Ad Placement'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
        </div>
        <div className="flex-1 px-6 py-6 space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Display Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Homepage Banner"
              className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Location Key *</label>
            <input value={location} onChange={(e) => setLoc(e.target.value)} placeholder="homepage-banner"
              className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-brand-400" />
            <p className="text-xs text-gray-500 mt-1">Used in {'<AdSlot location="homepage-banner" />'}</p>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Price Per Day ($)</label>
            <input type="number" value={pricePerDay} onChange={(e) => setPrice(e.target.value)} placeholder="25"
              className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Dimensions (px)</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {[
                { label: 'Leaderboard', w: 728, h: 90 },
                { label: 'Billboard', w: 970, h: 250 },
                { label: 'Med. Rectangle', w: 300, h: 250 },
                { label: 'Large Rectangle', w: 336, h: 280 },
                { label: 'Half Page', w: 300, h: 600 },
                { label: 'Wide Skyscraper', w: 160, h: 600 },
              ].map(({ label, w, h }) => (
                <button key={label} type="button"
                  onClick={() => { setWidth(String(w)); setHeight(String(h)); }}
                  className={`text-xs px-2 py-1 rounded border transition-colors ${
                    width === String(w) && height === String(h)
                      ? 'border-brand-400 bg-brand-500/20 text-brand-400'
                      : 'border-surface-600 bg-surface-700 text-gray-400 hover:text-white hover:border-surface-500'
                  }`}>
                  {label} <span className="opacity-60">{w}×{h}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <input type="number" value={width} onChange={(e) => setWidth(e.target.value)} placeholder="Width"
                  className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400" />
              </div>
              <div className="flex items-center text-gray-500 text-sm">×</div>
              <div className="flex-1">
                <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="Height"
                  className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">Standard IAB sizes. Pick a preset or enter custom values.</p>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Description</label>
            <textarea value={description} onChange={(e) => setDesc(e.target.value)} rows={2}
              className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400 resize-none" />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
        <div className="px-6 py-5 border-t border-surface-700 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg bg-surface-700 text-gray-300 hover:bg-surface-600 transition-colors text-sm">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 px-4 py-2 rounded-lg bg-brand-500 text-black font-semibold hover:bg-brand-400 transition-colors text-sm disabled:opacity-50">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Placement'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdField({ label, error, touched, children }: {
  label: string; error: string; touched: boolean; children: React.ReactNode;
}) {
  const icon  = !touched ? '*' : error ? '✗' : '✓';
  const color = !touched ? 'text-gray-400' : error ? 'text-red-400' : 'text-green-400';
  return (
    <div>
      <label className={`block text-xs mb-1.5 uppercase tracking-wide ${color}`}>
        {label} <span className="ml-0.5">{icon}</span>
      </label>
      {children}
      {touched && error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}

function AddAdModal({ ad, isDuplicate, onClose, onCreated }: {
  ad?: AdminAd;
  isDuplicate?: boolean;
  onClose: () => void; onCreated: (a: AdminAd) => void;
}) {
  const isEdit = !!ad && !isDuplicate;
  // datetime-local needs "YYYY-MM-DDTHH:mm" — strip seconds/timezone from ISO string
  function toLocal(iso: string) { return iso ? iso.slice(0, 16) : ''; }

  const [partners, setPartners]         = useState<AdminPartner[]>([]);
  const [placements, setPlacements]     = useState<AdminPlacement[]>([]);
  const [loadingData, setLoadingData]   = useState(true);
  const [partnerId, setPartnerId]       = useState(ad?.partner?.id ?? '');
  const [placementId, setPlacement]     = useState(ad?.placement?.id ?? '');
  const [title, setTitle]               = useState(ad?.title ?? '');
  const [body, setBody]                 = useState(ad?.body ?? '');
  const [linkUrl, setLinkUrl]           = useState(ad?.linkUrl ?? '');
  const [startsAt, setStart]            = useState(toLocal(ad?.startsAt ?? ''));
  const [endsAt, setEnd]                = useState(toLocal(ad?.endsAt ?? ''));
  const [paidAmount, setPaid]           = useState(ad?.paidAmount != null ? String(ad.paidAmount) : '');
  const [notes, setNotes]               = useState(ad?.notes ?? '');
  const [imageFile, setImageFile]       = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState(ad?.imageUrl ?? '');
  const [saving, setSaving]             = useState(false);
  const [submitError, setSubmitError]   = useState('');
  const [touched, setTouched]           = useState<Record<string, boolean>>(
    isEdit ? { partnerId: true, placementId: true, title: true, linkUrl: true, startsAt: true, endsAt: true, paidAmount: true } : {}
  );

  useEffect(() => {
    Promise.all([
      api.get('/partners').then(({ data }) => setPartners(data.partners)),
      api.get('/partners/placements/list').then(({ data }) => setPlacements(data.placements)),
    ]).finally(() => setLoadingData(false));
  }, []);

  // per-field validators — return error string or ''
  function validatePartnerId(v: string)   { return v ? '' : 'Select a partner'; }
  function validatePlacementId(v: string) { return v ? '' : 'Select a placement'; }
  function validateTitle(v: string) {
    if (!v.trim()) return 'Ad title is required';
    if (v.trim().length < 3) return 'Title must be at least 3 characters';
    return '';
  }
  function validateLinkUrl(v: string) {
    if (!v.trim()) return 'Click URL is required';
    try { const u = new URL(v.trim()); if (!['http:', 'https:'].includes(u.protocol)) throw new Error(); return ''; }
    catch { return 'Must be a valid URL starting with https://'; }
  }
  function validateStartsAt(v: string) {
    if (!v) return 'Start date is required';
    if (isNaN(new Date(v).getTime())) return 'Invalid date';
    return '';
  }
  function validateEndsAt(v: string, start: string) {
    if (!v) return 'End date is required';
    if (isNaN(new Date(v).getTime())) return 'Invalid date';
    if (start && new Date(v) <= new Date(start)) return 'End date must be after start date';
    return '';
  }
  function validatePaidAmount(v: string) {
    if (!v) return '';
    const n = parseFloat(v);
    if (isNaN(n) || n < 0) return 'Amount must be a positive number';
    return '';
  }

  const errors = {
    partnerId:   validatePartnerId(partnerId),
    placementId: validatePlacementId(placementId),
    title:       validateTitle(title),
    linkUrl:     validateLinkUrl(linkUrl),
    startsAt:    validateStartsAt(startsAt),
    endsAt:      validateEndsAt(endsAt, startsAt),
    paidAmount:  validatePaidAmount(paidAmount),
  };
  const allValid = !errors.partnerId && !errors.placementId && !errors.title &&
                   !errors.linkUrl && !errors.startsAt && !errors.endsAt && !errors.paidAmount;

  function touch(key: string) { setTouched((p) => ({ ...p, [key]: true })); }
  function touchAll() {
    setTouched({ partnerId: true, placementId: true, title: true, linkUrl: true, startsAt: true, endsAt: true, paidAmount: true });
  }

  // returns Tailwind border + label color classes based on field state
  function fieldState(key: keyof typeof errors) {
    const err = errors[key];
    const t   = touched[key];
    return {
      border: !t ? 'border-surface-600' : err ? 'border-red-500' : 'border-green-500',
      label:  !t ? 'text-gray-400'      : err ? 'text-red-400'   : 'text-green-400',
      icon:   !t ? '*' : err ? '✗' : '✓',
    };
  }

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleCreate() {
    touchAll();
    if (!allValid) return;
    setSaving(true); setSubmitError('');
    try {
      let adData: AdminAd;
      if (isEdit) {
        const { data } = await api.patch(`/partners/ads/${ad!.id}`, {
          partnerId, placementId, title, body, linkUrl, startsAt, endsAt, paidAmount, notes,
        });
        adData = data.ad;
      } else {
        const { data } = await api.post('/partners/ads', {
          partnerId, placementId, title, body, linkUrl, startsAt, endsAt, paidAmount, notes,
        });
        adData = data.ad;
      }
      if (imageFile) {
        const fd = new FormData();
        fd.append('image', imageFile);
        const { data: imgData } = await api.post(`/partners/ads/${adData.id}/image`, fd);
        adData = { ...adData, imageUrl: imgData.imageUrl };
      }
      onCreated(adData);
    } catch (e: any) {
      setSubmitError(e?.response?.data?.error || 'Save failed');
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-md bg-surface-800 border-l border-surface-700 h-full overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-700">
          <h2 className="text-white font-semibold">{isEdit ? 'Edit Ad Campaign' : isDuplicate ? 'Duplicate Ad Campaign' : 'New Ad Campaign'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
        </div>
        <div className="flex-1 px-6 py-6 space-y-4">
          <AdField label="Partner" error={errors.partnerId} touched={!!touched.partnerId}>
            <select value={partnerId}
              onChange={(e) => { setPartnerId(e.target.value); touch('partnerId'); }}
              onBlur={() => touch('partnerId')}
              disabled={loadingData}
              className={`w-full bg-surface-700 border text-white rounded-lg px-3 py-2 text-sm focus:outline-none disabled:opacity-50 ${fieldState('partnerId').border}`}>
              <option value="">{loadingData ? 'Loading…' : partners.length === 0 ? 'No partners found' : '— select partner —'}</option>
              {partners.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.status})</option>)}
            </select>
          </AdField>
          <AdField label="Placement" error={errors.placementId} touched={!!touched.placementId}>
            <select value={placementId}
              onChange={(e) => { setPlacement(e.target.value); touch('placementId'); }}
              onBlur={() => touch('placementId')}
              disabled={loadingData}
              className={`w-full bg-surface-700 border text-white rounded-lg px-3 py-2 text-sm focus:outline-none disabled:opacity-50 ${fieldState('placementId').border}`}>
              <option value="">{loadingData ? 'Loading…' : placements.length === 0 ? 'No placements found — create one first' : '— select placement —'}</option>
              {placements.map((pl) => <option key={pl.id} value={pl.id}>{pl.name} (${pl.pricePerDay}/day)</option>)}
            </select>
          </AdField>
          <AdField label="Ad Title" error={errors.title} touched={!!touched.title}>
            <input value={title}
              onChange={(e) => { setTitle(e.target.value); touch('title'); }}
              onBlur={() => touch('title')}
              placeholder="Summer Drop — Camp DaddyMan Gear"
              className={`w-full bg-surface-700 border text-white rounded-lg px-3 py-2 text-sm focus:outline-none ${fieldState('title').border}`} />
          </AdField>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Body / Tagline</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2}
              className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400 resize-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Ad Image</label>

            {/* Saved image row — always show when there's a stored URL */}
            {ad?.imageUrl && !imageFile && (
              <div className="mb-2 rounded-lg overflow-hidden border border-surface-600 bg-surface-700">
                <img
                  src={ad.imageUrl}
                  alt="current ad image"
                  className="w-full h-32 object-cover"
                  onError={(e) => {
                    const el = e.target as HTMLImageElement;
                    el.style.display = 'none';
                    el.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <div className="hidden px-3 py-2 text-xs text-gray-400">
                  Image saved but can&apos;t render inline —{' '}
                  <a href={ad.imageUrl} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">open in new tab</a>
                </div>
                <p className="px-3 py-1.5 text-[10px] text-gray-500 border-t border-surface-600 truncate">
                  Saved: <a href={ad.imageUrl} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">view</a>
                  {' '}<span className="text-gray-600">{ad.imageUrl.split('/').pop()}</span>
                </p>
              </div>
            )}

            {/* New file preview */}
            {imageFile && imagePreview && (
              <div className="mb-2 rounded-lg overflow-hidden border border-brand-500/40">
                <img src={imagePreview} alt="new image preview" className="w-full h-32 object-cover" />
                <p className="px-3 py-1.5 text-[10px] text-brand-400 border-t border-brand-500/30 truncate">
                  New: {imageFile.name}
                </p>
              </div>
            )}

            <label className="flex items-center justify-center gap-2 w-full border border-dashed border-surface-500 rounded-lg py-3 cursor-pointer hover:border-brand-400 transition-colors text-sm text-gray-400 hover:text-white">
              <span>{imageFile ? 'Change selection…' : ad?.imageUrl ? 'Replace image…' : 'Choose image…'}</span>
              <input type="file" accept="image/*" onChange={handleImagePick} className="hidden" />
            </label>
          </div>
          <AdField label="Click URL" error={errors.linkUrl} touched={!!touched.linkUrl}>
            <input value={linkUrl}
              onChange={(e) => { setLinkUrl(e.target.value); touch('linkUrl'); }}
              onBlur={() => touch('linkUrl')}
              placeholder="https://partner.com/offer"
              className={`w-full bg-surface-700 border text-white rounded-lg px-3 py-2 text-sm focus:outline-none ${fieldState('linkUrl').border}`} />
          </AdField>
          <div className="flex gap-3">
            <div className="flex-1">
              <AdField label="Starts" error={errors.startsAt} touched={!!touched.startsAt}>
                <div className="flex gap-1">
                  <input type="datetime-local" value={startsAt}
                    onChange={(e) => { setStart(e.target.value); touch('startsAt'); touch('endsAt'); }}
                    onBlur={() => touch('startsAt')}
                    className={`flex-1 min-w-0 bg-surface-700 border text-white rounded-lg px-3 py-2 text-sm focus:outline-none ${fieldState('startsAt').border}`} />
                  {startsAt && (
                    <button type="button" onClick={() => { setStart(''); touch('startsAt'); }}
                      className="text-gray-500 hover:text-white px-2 text-sm" title="Clear date">×</button>
                  )}
                </div>
              </AdField>
            </div>
            <div className="flex-1">
              <AdField label="Ends" error={errors.endsAt} touched={!!touched.endsAt}>
                <div className="flex gap-1">
                  <input type="datetime-local" value={endsAt}
                    onChange={(e) => { setEnd(e.target.value); touch('endsAt'); }}
                    onBlur={() => touch('endsAt')}
                    className={`flex-1 min-w-0 bg-surface-700 border text-white rounded-lg px-3 py-2 text-sm focus:outline-none ${fieldState('endsAt').border}`} />
                  {endsAt && (
                    <button type="button" onClick={() => { setEnd(''); touch('endsAt'); }}
                      className="text-gray-500 hover:text-white px-2 text-sm" title="Clear date">×</button>
                  )}
                </div>
              </AdField>
            </div>
          </div>
          <AdField label="Amount Paid ($)" error={errors.paidAmount} touched={!!touched.paidAmount}>
            <input type="number" min="0" step="0.01" value={paidAmount}
              onChange={(e) => { setPaid(e.target.value); touch('paidAmount'); }}
              onBlur={() => touch('paidAmount')}
              placeholder="0.00"
              className={`w-full bg-surface-700 border text-white rounded-lg px-3 py-2 text-sm focus:outline-none ${fieldState('paidAmount').border}`} />
          </AdField>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Internal Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400 resize-none" />
          </div>
          {submitError && <p className="text-red-400 text-sm">{submitError}</p>}
        </div>
        <div className="px-6 py-5 border-t border-surface-700 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg bg-surface-700 text-gray-300 hover:bg-surface-600 transition-colors text-sm">Cancel</button>
          <button onClick={handleCreate} disabled={saving || loadingData}
            className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors text-sm disabled:opacity-50 ${allValid ? 'bg-brand-500 text-black hover:bg-brand-400' : 'bg-surface-600 text-gray-400 cursor-not-allowed'}`}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : isDuplicate ? 'Create Copy' : 'Create Campaign'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Shop Tab ──────────────────────────────────────────────────────────────────

interface OptionGroup { name: string; values: string[]; priceModifiers?: Record<string, number>; images?: Record<string, string> }

interface AdminProduct {
  id: string; name: string; slug: string; type: string; price: number;
  comparePrice?: number; status: string; featured: boolean; tags: string[];
  releaseDate?: string | null;
  imageUrl?: string; imagePreviewUrl?: string; description?: string;
  optionGroups?: OptionGroup[];
  optionGroupsPreview?: OptionGroup[];
  memberDiscountEnabled?: boolean;
  variants: { id: string; name: string; inventory: number; price?: number; options?: Record<string,string> }[];
}

interface AdminOrder {
  id: string; email: string; status: string; total: number; discount: number;
  couponCode?: string | null; couponDiscount?: number;
  trackingNumber?: string; createdAt: string;
  user?: { username: string; email: string } | null;
  items: { name: string; variantName?: string; quantity: number; price: number }[];
}

interface OrderDetail {
  id: string; email: string; status: string;
  subtotal: number; discount: number; couponDiscount: number; couponCode?: string | null; total: number;
  trackingNumber?: string | null; notes?: string | null; createdAt: string; shippedAt?: string | null;
  shippingName?: string | null; shippingLine1?: string | null; shippingLine2?: string | null;
  shippingCity?: string | null; shippingState?: string | null; shippingZip?: string | null; shippingCountry?: string | null;
  user?: { id: string; username: string; email: string; displayName?: string | null } | null;
  items: {
    id: string; name: string; variantName?: string | null; quantity: number; price: number;
    product?: { id: string; name: string; imageUrl?: string | null; type: string } | null;
  }[];
}

interface AdminCoupon {
  id: string; code: string; type: 'PERCENTAGE' | 'FIXED'; value: number;
  minOrderAmount?: number | null; maxUses?: number | null; usedCount: number;
  active: boolean; expiresAt?: string | null; createdAt: string;
  _count: { orders: number };
}

const ORDER_STATUSES = ['ALL','PENDING','PAID','PROCESSING','SHIPPED','DELIVERED','CANCELLED','REFUNDED'];
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'text-camp-400', DRAFT: 'text-yellow-400', ARCHIVED: 'text-gray-500',
  PAID: 'text-camp-400', PROCESSING: 'text-yellow-400', SHIPPED: 'text-blue-400',
  DELIVERED: 'text-brand-400', CANCELLED: 'text-red-400', REFUNDED: 'text-gray-400', PENDING: 'text-gray-400',
};

const EMPTY_PRODUCT = {
  name: '', type: 'PHYSICAL', price: '', comparePrice: '', description: '',
  imageUrl: '', status: 'DRAFT', featured: false, releaseDate: '', memberDiscountEnabled: false, tags: '',
  optionGroups: [] as OptionGroup[],
  variants: [] as { name: string; inventory: string; price: string; options?: Record<string,string> }[],
};

const VARIANT_PRESETS: Record<string, { group: string; values: string[]; priceModifiers?: Record<string, number> }> = {
  'sizes-standard': { group: 'Size', values: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'], priceModifiers: { '2XL': 10, '3XL': 20, '4XL': 30, '5XL': 40 } },
  'colors-basic':   { group: 'Color',    values: ['Black', 'White', 'Gray', 'Navy', 'Red'] },
  'colors-extended':{ group: 'Color',    values: ['Black', 'White', 'Gray', 'Navy', 'Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Pink'] },
  'editions':       { group: 'Edition',  values: ['Standard', 'Deluxe', 'Premium'], priceModifiers: { 'Deluxe': 10, 'Premium': 20 } },
  'format':         { group: 'Format',   values: ['Digital', 'Physical'] },
};

function ProductFormModal({
  initial, onSave, onClose, presetMemberDiscount,
}: {
  initial?: AdminProduct | null;
  onSave: (p: AdminProduct) => void;
  onClose: () => void;
  presetMemberDiscount?: boolean;
}) {
  const editing = !!initial;
  const [form, setForm] = useState<any>(() => {
    if (!initial) return { ...EMPTY_PRODUCT, memberDiscountEnabled: presetMemberDiscount ?? false, status: presetMemberDiscount ? 'ACTIVE' : 'DRAFT' };
    return {
      name: initial.name, type: initial.type, price: String(initial.price),
      comparePrice: initial.comparePrice ? String(initial.comparePrice) : '',
      description: initial.description || '', imageUrl: initial.imageUrl || '',
      status: initial.status, featured: initial.featured,
      releaseDate: initial.releaseDate ? initial.releaseDate.slice(0, 16) : '',
      memberDiscountEnabled: initial.memberDiscountEnabled ?? false,
      tags: initial.tags.join(', '),
      optionGroups: initial.optionGroups || [],
      variants: initial.variants.map((v) => ({
        name: v.name, inventory: String(v.inventory),
        price: v.price != null ? String(v.price) : '',
        options: v.options || {},
      })),
    };
  });

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string>(initial?.imagePreviewUrl || '');
  const imgInputRef = useRef<HTMLInputElement>(null);

  // Keyed by "${groupName}:${value}" — blob or signed URLs for display only
  const [groupImagePreviews, setGroupImagePreviews] = useState<Record<string, string>>(() => {
    const previews: Record<string, string> = {};
    for (const g of (initial?.optionGroupsPreview || [])) {
      for (const [val, url] of Object.entries(g.images || {})) {
        if (url) previews[`${g.name}:${val}`] = url as string;
      }
    }
    return previews;
  });

  async function handleImageUpload(file: File) {
    setPreviewUrl(URL.createObjectURL(file));
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const { data } = await api.post('/admin/products/upload-image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setField('imageUrl', data.url);
    } catch {
      setPreviewUrl(initial?.imagePreviewUrl || '');
      setErr('Image upload failed. Try again.');
    } finally {
      setUploading(false);
    }
  }

  function setField(k: string, v: any) { setForm((f: any) => ({ ...f, [k]: v })); }
  function setVariant(i: number, k: string, v: string) {
    setForm((f: any) => {
      const vars = [...f.variants];
      vars[i] = { ...vars[i], [k]: v };
      return { ...f, variants: vars };
    });
  }
  function addVariant() { setForm((f: any) => ({ ...f, variants: [...f.variants, { name: '', inventory: '0', price: '', options: {} }] })); }
  function removeVariant(i: number) { setForm((f: any) => ({ ...f, variants: f.variants.filter((_: any, j: number) => j !== i) })); }
  function quickAdd(presetKey: string) {
    const preset = VARIANT_PRESETS[presetKey];
    if (!preset) return;
    setForm((f: any) => {
      const group: OptionGroup = { name: preset.group, values: preset.values };
      if (preset.priceModifiers) group.priceModifiers = preset.priceModifiers;
      const filtered = f.optionGroups.filter((g: OptionGroup) => g.name !== preset.group);
      return { ...f, optionGroups: [...filtered, group] };
    });
  }
  function removeOptionGroup(name: string) {
    setForm((f: any) => ({ ...f, optionGroups: f.optionGroups.filter((g: OptionGroup) => g.name !== name) }));
  }

  function setGroupModifier(groupName: string, val: string, price: string) {
    setForm((f: any) => ({
      ...f,
      optionGroups: f.optionGroups.map((g: OptionGroup) => {
        if (g.name !== groupName) return g;
        const mods = { ...(g.priceModifiers || {}) };
        if (price === '') { delete mods[val]; } else { mods[val] = Number(price); }
        return { ...g, priceModifiers: Object.keys(mods).length ? mods : undefined };
      }),
    }));
  }

  async function handleGroupImageUpload(groupName: string, val: string, file: File) {
    const key = `${groupName}:${val}`;
    // Show blob URL immediately for instant feedback
    setGroupImagePreviews((p) => ({ ...p, [key]: URL.createObjectURL(file) }));
    try {
      const fd = new FormData();
      fd.append('image', file);
      const { data } = await api.post('/admin/products/upload-image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      // Store raw R2 URL in form data (for saving to DB)
      setForm((f: any) => ({
        ...f,
        optionGroups: f.optionGroups.map((g: OptionGroup) => {
          if (g.name !== groupName) return g;
          return { ...g, images: { ...(g.images || {}), [val]: data.url } };
        }),
      }));
    } catch {
      // Remove preview on failure
      setGroupImagePreviews((p) => { const n = { ...p }; delete n[key]; return n; });
      setErr('Image upload failed.');
    }
  }

  function removeGroupImage(groupName: string, val: string) {
    const key = `${groupName}:${val}`;
    setGroupImagePreviews((p) => { const n = { ...p }; delete n[key]; return n; });
    setForm((f: any) => ({
      ...f,
      optionGroups: f.optionGroups.map((g: OptionGroup) => {
        if (g.name !== groupName) return g;
        const images = { ...(g.images || {}) };
        delete images[val];
        return { ...g, images: Object.keys(images).length ? images : undefined };
      }),
    }));
  }

  async function handleSave() {
    if (!form.name.trim() || !form.price) { setErr('Name and price are required.'); return; }
    setSaving(true); setErr('');
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        price: Number(form.price),
        comparePrice: form.comparePrice ? Number(form.comparePrice) : null,
        description: form.description || null,
        imageUrl: form.imageUrl || null,
        status: form.status,
        featured: form.featured,
        releaseDate: form.releaseDate || null,
        memberDiscountEnabled: form.memberDiscountEnabled,
        tags: form.tags.split(',').map((t: string) => t.trim()).filter(Boolean),
        optionGroups: form.optionGroups.length ? form.optionGroups : null,
        variants: form.variants.filter((v: any) => v.name.trim()).map((v: any) => ({
          name: v.name.trim(),
          inventory: Number(v.inventory || 0),
          price: v.price ? Number(v.price) : null,
          options: v.options && Object.keys(v.options).length ? v.options : undefined,
        })),
      };
      const { data } = editing
        ? await api.patch(`/admin/products/${initial!.id}`, payload)
        : await api.post('/admin/products', payload);
      onSave(data.product);
    } catch (e: any) {
      setErr(e.response?.data?.error || 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-surface-800 border border-surface-600 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-5 border-b border-surface-700 flex items-center justify-between">
          <h3 className="text-white font-bold text-lg">{editing ? 'Edit Product' : 'New Product'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Product Name *</label>
            <input value={form.name} onChange={(e) => setField('name', e.target.value)}
              className="w-full bg-surface-700 border border-surface-600 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400" />
          </div>

          {/* Type + Status row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Type</label>
              <select value={form.type} onChange={(e) => setField('type', e.target.value)}
                className="w-full bg-surface-700 border border-surface-600 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400">
                <option value="PHYSICAL">Physical</option>
                <option value="DIGITAL">Digital</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Status</label>
              <select value={form.status} onChange={(e) => setField('status', e.target.value)}
                className="w-full bg-surface-700 border border-surface-600 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400">
                <option value="DRAFT">Draft — shows as "Coming Soon" in perk carousel</option>
                <option value="ACTIVE">Active — live & for sale</option>
                <option value="ARCHIVED">Archived — hidden everywhere</option>
              </select>
            </div>
          </div>

          {/* Price + Compare price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Price (USD) *</label>
              <input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setField('price', e.target.value)}
                className="w-full bg-surface-700 border border-surface-600 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Compare Price (strike-through)</label>
              <input type="number" step="0.01" min="0" value={form.comparePrice} onChange={(e) => setField('comparePrice', e.target.value)}
                placeholder="Optional"
                className="w-full bg-surface-700 border border-surface-600 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400" />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setField('description', e.target.value)} rows={3}
              className="w-full bg-surface-700 border border-surface-600 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400 resize-none" />
          </div>

          {/* Image upload */}
          <div>
            <label className="block text-xs text-gray-400 mb-2">Product Image</label>
            <div className="flex gap-3 items-start">
              {/* Preview */}
              <div className="w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-surface-700 border border-surface-600 flex items-center justify-center">
                {previewUrl ? (
                  <img src={previewUrl} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl opacity-30">{form.type === 'DIGITAL' ? '📦' : '👕'}</span>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  ref={imgInputRef}
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }}
                />
                <button
                  type="button"
                  onClick={() => imgInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full px-4 py-2.5 rounded-xl border border-dashed border-surface-500 hover:border-brand-400 text-gray-400 hover:text-brand-400 text-sm transition-colors disabled:opacity-50"
                >
                  {uploading ? 'Uploading…' : '↑ Upload image'}
                </button>
                <input
                  value={form.imageUrl}
                  onChange={(e) => { setField('imageUrl', e.target.value); setPreviewUrl(e.target.value); }}
                  placeholder="Or paste a URL"
                  className="w-full bg-surface-700 border border-surface-600 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-400"
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Tags (comma-separated)</label>
            <input value={form.tags} onChange={(e) => setField('tags', e.target.value)}
              placeholder="merch, music, limited"
              className="w-full bg-surface-700 border border-surface-600 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400" />
          </div>

          {/* Featured */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.featured} onChange={(e) => setField('featured', e.target.checked)}
              className="w-4 h-4 accent-brand-500 rounded" />
            <span className="text-sm text-gray-300">Featured product (shown with badge, sorted first)</span>
          </label>

          {/* Release Date */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Drop / Release Date <span className="text-gray-600 font-normal normal-case">(optional — shows live countdown)</span></label>
            <input
              type="datetime-local"
              value={form.releaseDate}
              onChange={(e) => setField('releaseDate', e.target.value)}
              className="w-full bg-surface-700 border border-surface-600 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400"
            />
          </div>

          {/* Member discount */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.memberDiscountEnabled} onChange={(e) => setField('memberDiscountEnabled', e.target.checked)}
              className="w-4 h-4 accent-brand-500 rounded" />
            <span className="text-sm text-gray-300">Enable member discount <span className="text-gray-500">(PRO 10% / PREMIUM &amp; CREATOR 15%)</span></span>
          </label>

          {/* Option Groups */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-400 font-medium">Option Groups <span className="text-gray-600 font-normal">(Size, Color, Edition…)</span></label>
              <select
                defaultValue=""
                onChange={(e) => { if (e.target.value) { quickAdd(e.target.value); e.target.value = ''; } }}
                className="text-xs bg-surface-700 border border-surface-600 text-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-400"
              >
                <option value="" disabled>+ Add group…</option>
                <optgroup label="Sizes">
                  <option value="sizes-standard">Sizes — XS to 5XL</option>
                </optgroup>
                <optgroup label="Colors">
                  <option value="colors-basic">Colors — Black, White, Gray, Navy, Red</option>
                  <option value="colors-extended">Colors — 10 colors</option>
                </optgroup>
                <optgroup label="Other">
                  <option value="editions">Editions — Standard, Deluxe, Limited</option>
                  <option value="format">Format — Digital, Physical</option>
                </optgroup>
              </select>
            </div>
            {form.optionGroups.length === 0 && (
              <p className="text-xs text-gray-600">No option groups. Add Size, Color, Edition etc. above — customers pick one from each on the product page.</p>
            )}
            <div className="space-y-3 mt-2">
              {form.optionGroups.map((g: OptionGroup) => (
                <div key={g.name} className="border border-surface-600 rounded-xl overflow-hidden">
                  {/* Group header */}
                  <div className="flex items-center justify-between px-3 py-2 bg-surface-700 border-b border-surface-600">
                    <span className="text-brand-400 font-semibold text-sm">{g.name}</span>
                    <button onClick={() => removeOptionGroup(g.name)} className="text-xs text-gray-500 hover:text-red-400 transition-colors">Remove</button>
                  </div>
                  {/* Per-value rows */}
                  <div className="divide-y divide-surface-700">
                    {g.values.map((val) => (
                      <div key={val} className="flex items-center gap-3 px-3 py-2.5 bg-surface-800/40">
                        <span className="text-sm text-white font-medium w-20 flex-shrink-0 truncate">{val}</span>
                        {/* Price modifier dropdown */}
                        <select
                          value={g.priceModifiers?.[val] != null ? String(g.priceModifiers[val]) : ''}
                          onChange={(e) => setGroupModifier(g.name, val, e.target.value)}
                          className="bg-surface-700 border border-surface-600 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-brand-400"
                        >
                          <option value="">No add-on</option>
                          {Array.from({ length: 51 }, (_, i) => i).map((n) => (
                            <option key={n} value={String(n)}>+${n}</option>
                          ))}
                        </select>
                        {/* Edition image */}
                        <div className="flex items-center gap-2 flex-1 justify-end">
                          {groupImagePreviews[`${g.name}:${val}`] ? (
                            <>
                              <img src={groupImagePreviews[`${g.name}:${val}`]} alt={val} className="w-10 h-10 rounded-lg object-cover border border-surface-600 flex-shrink-0" />
                              <button onClick={() => removeGroupImage(g.name, val)} className="text-gray-500 hover:text-red-400 text-xs transition-colors">✕</button>
                            </>
                          ) : (
                            <label className="cursor-pointer text-xs text-gray-500 hover:text-brand-400 border border-dashed border-surface-600 hover:border-brand-400 px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                              + Image
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleGroupImageUpload(g.name, val, file);
                                e.target.value = '';
                              }} />
                            </label>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Inventory variants (optional, for per-SKU stock tracking) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-400 font-medium">Inventory Variants <span className="text-gray-600 font-normal">(optional — leave empty if using option groups above)</span></label>
              <button onClick={addVariant} className="text-xs text-brand-400 hover:text-brand-300">+ Add</button>
            </div>
            {form.variants.length > 0 && (
              <div className="space-y-1.5">
                {form.variants.map((v: any, i: number) => (
                  <div key={i} className="grid grid-cols-7 gap-2 items-center">
                    <input value={v.name} onChange={(e) => setVariant(i, 'name', e.target.value)}
                      placeholder="Name"
                      className="col-span-3 bg-surface-700 border border-surface-600 text-white rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-brand-400" />
                    <input type="number" value={v.inventory} onChange={(e) => setVariant(i, 'inventory', e.target.value)}
                      placeholder="Qty"
                      className="col-span-2 bg-surface-700 border border-surface-600 text-white rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-brand-400" />
                    <input type="number" step="0.01" value={v.price} onChange={(e) => setVariant(i, 'price', e.target.value)}
                      placeholder="$"
                      className="col-span-1 bg-surface-700 border border-surface-600 text-white rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-brand-400" />
                    <button onClick={() => removeVariant(i)} className="text-gray-600 hover:text-red-400 text-sm leading-none col-span-1 text-center">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {err && <p className="text-red-400 text-sm">{err}</p>}
        </div>

        <div className="px-6 py-4 border-t border-surface-700 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl bg-surface-700 text-gray-300 hover:bg-surface-600 transition-colors text-sm">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-xl bg-brand-500 text-black font-bold hover:bg-brand-400 transition-colors text-sm disabled:opacity-50">
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Product'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CouponFormModal({
  initial, onSave, onClose,
}: {
  initial?: AdminCoupon | null;
  onSave: (c: AdminCoupon) => void;
  onClose: () => void;
}) {
  const editing = !!initial;
  const [form, setForm] = useState({
    code: initial?.code ?? '',
    type: initial?.type ?? 'PERCENTAGE',
    value: initial ? String(initial.value) : '',
    minOrderAmount: initial?.minOrderAmount ? String(initial.minOrderAmount) : '',
    maxUses: initial?.maxUses ? String(initial.maxUses) : '',
    maxUsesPerUser: initial ? String((initial as any).maxUsesPerUser ?? 1) : '1',
    active: initial?.active ?? true,
    expiresAt: initial?.expiresAt ? initial.expiresAt.slice(0, 10) : '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  function setF(k: string, v: any) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSave() {
    if (!form.code.trim() || !form.value) { setErr('Code and value are required.'); return; }
    setSaving(true); setErr('');
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value: Number(form.value),
        minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : null,
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        maxUsesPerUser: Number(form.maxUsesPerUser) || 1,
        active: form.active,
        expiresAt: form.expiresAt || null,
      };
      const { data } = editing
        ? await api.patch(`/admin/coupons/${initial!.id}`, payload)
        : await api.post('/admin/coupons', payload);
      onSave(data.coupon);
    } catch (e: any) {
      setErr(e.response?.data?.error || 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-surface-800 border border-surface-600 rounded-2xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-surface-700 flex items-center justify-between">
          <h3 className="text-white font-bold text-lg">{editing ? 'Edit Coupon' : 'New Coupon'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Code */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Code *</label>
            <input
              value={form.code}
              onChange={(e) => setF('code', e.target.value.toUpperCase().replace(/\s/g, ''))}
              placeholder="SUMMER20"
              maxLength={32}
              className="w-full bg-surface-700 border border-surface-600 text-white font-mono rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400 uppercase tracking-wider"
            />
          </div>

          {/* Type + Value */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Type *</label>
              <select value={form.type} onChange={(e) => setF('type', e.target.value)}
                className="w-full bg-surface-700 border border-surface-600 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400">
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED">Fixed ($)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                {form.type === 'PERCENTAGE' ? 'Percent off (1–100) *' : 'Amount off ($) *'}
              </label>
              <input type="number" step={form.type === 'FIXED' ? '0.01' : '1'} min="0"
                value={form.value} onChange={(e) => setF('value', e.target.value)}
                placeholder={form.type === 'PERCENTAGE' ? '20' : '10.00'}
                className="w-full bg-surface-700 border border-surface-600 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400" />
            </div>
          </div>

          {/* Min order + Max uses */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Min order ($)</label>
              <input type="number" step="0.01" min="0" value={form.minOrderAmount}
                onChange={(e) => setF('minOrderAmount', e.target.value)}
                placeholder="Optional"
                className="w-full bg-surface-700 border border-surface-600 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Max uses total</label>
              <input type="number" step="1" min="1" value={form.maxUses}
                onChange={(e) => setF('maxUses', e.target.value)}
                placeholder="Unlimited"
                className="w-full bg-surface-700 border border-surface-600 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Max uses per customer</label>
              <input type="number" step="1" min="1" value={form.maxUsesPerUser}
                onChange={(e) => setF('maxUsesPerUser', e.target.value)}
                placeholder="1"
                className="w-full bg-surface-700 border border-surface-600 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400" />
              <p className="text-xs text-gray-600 mt-1">Default 1 — each customer can use this code once</p>
            </div>
          </div>

          {/* Expiry */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Expires on (optional)</label>
            <input type="date" value={form.expiresAt} onChange={(e) => setF('expiresAt', e.target.value)}
              className="w-full bg-surface-700 border border-surface-600 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400" />
          </div>

          {/* Active */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={(e) => setF('active', e.target.checked)}
              className="w-4 h-4 accent-brand-500 rounded" />
            <span className="text-sm text-gray-300">Active (can be applied at checkout)</span>
          </label>

          {err && <p className="text-red-400 text-sm">{err}</p>}
        </div>

        <div className="px-6 py-4 border-t border-surface-700 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl bg-surface-700 text-gray-300 hover:bg-surface-600 transition-colors text-sm">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-xl bg-brand-500 text-black font-bold hover:bg-brand-400 transition-colors text-sm disabled:opacity-50">
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Coupon'}
          </button>
        </div>
      </div>
    </div>
  );
}

const OD_STATUS_COLORS: Record<string, string> = {
  PAID: 'text-camp-400 bg-camp-500/10 border-camp-500/30',
  PROCESSING: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  SHIPPED: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  DELIVERED: 'text-brand-400 bg-brand-500/10 border-brand-500/30',
  CANCELLED: 'text-red-400 bg-red-500/10 border-red-500/30',
  REFUNDED: 'text-gray-400 bg-surface-700 border-surface-600',
  PENDING: 'text-gray-400 bg-surface-700 border-surface-600',
};

function OrderDetailPanel({
  orderId, onClose, onUpdate,
}: {
  orderId: string | null;
  onClose: () => void;
  onUpdate: (updated: AdminOrder) => void;
}) {
  const [order, setOrder]         = useState<OrderDetail | null>(null);
  const [loading, setLoading]     = useState(false);
  const [tracking, setTracking]   = useState('');
  const [notes, setNotes]         = useState('');
  const [updating, setUpdating]   = useState(false);

  useEffect(() => {
    if (!orderId) { setOrder(null); return; }
    setLoading(true);
    api.get(`/admin/orders/${orderId}`)
      .then((r) => {
        setOrder(r.data.order);
        setTracking(r.data.order.trackingNumber ?? '');
        setNotes(r.data.order.notes ?? '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orderId]);

  async function updateOrder(payload: object) {
    if (!order) return;
    setUpdating(true);
    try {
      const { data } = await api.patch(`/admin/orders/${order.id}`, payload);
      setOrder((prev) => prev ? { ...prev, ...data.order } : prev);
      onUpdate(data.order);
    } catch {}
    setUpdating(false);
  }

  if (!orderId) return null;

  const colorClass = order ? (OD_STATUS_COLORS[order.status] ?? OD_STATUS_COLORS.PENDING) : '';

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-md bg-surface-900 border-l border-surface-700 h-full overflow-y-auto flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-700 sticky top-0 bg-surface-900 z-10">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-0.5">Order</p>
            <p className="text-white font-black text-lg leading-none">
              #{order?.id.slice(-8).toUpperCase() ?? '…'}
            </p>
          </div>
          {order && (
            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${colorClass}`}>
              {order.status}
            </span>
          )}
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-surface-700 ml-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && order && (
          <>
            {/* Customer + date */}
            <div className="px-6 py-4 border-b border-surface-800 bg-surface-800/40">
              <p className="text-sm text-white font-semibold">
                {order.user?.displayName || order.user?.username || order.email}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{order.email}</p>
              <p className="text-xs text-gray-600 mt-1">
                {new Date(order.createdAt).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>

            {/* Cart items */}
            <div className="px-6 py-5 border-b border-surface-800 space-y-4">
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Items</p>
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-surface-700 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {item.product?.imageUrl ? (
                      <img src={item.product.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl opacity-30">{item.product?.type === 'DIGITAL' ? '📦' : '👕'}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold leading-snug truncate">{item.name}</p>
                    {item.variantName && <p className="text-gray-500 text-xs mt-0.5">{item.variantName}</p>}
                    <p className="text-gray-500 text-xs mt-0.5">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-brand-400 font-bold text-sm flex-shrink-0">
                    ${(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="px-6 py-4 border-b border-surface-800 space-y-1.5">
              <div className="flex justify-between text-sm text-gray-400">
                <span>Subtotal</span>
                <span>${order.subtotal.toFixed(2)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-sm text-brand-400">
                  <span>Member discount</span>
                  <span>−${order.discount.toFixed(2)}</span>
                </div>
              )}
              {order.couponDiscount > 0 && (
                <div className="flex justify-between text-sm text-camp-400">
                  <span>Coupon {order.couponCode && <span className="font-mono text-xs bg-surface-700 px-1.5 py-0.5 rounded ml-1">{order.couponCode}</span>}</span>
                  <span>−${order.couponDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-white pt-1 border-t border-surface-700 mt-1">
                <span>Total</span>
                <span className="text-brand-400">${order.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Shipping address */}
            {order.shippingLine1 && (
              <div className="px-6 py-4 border-b border-surface-800">
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2">Ship To</p>
                <p className="text-sm text-gray-300 leading-relaxed">
                  {order.shippingName && <span className="text-white font-semibold block">{order.shippingName}</span>}
                  {order.shippingLine1}<br />
                  {order.shippingLine2 && <>{order.shippingLine2}<br /></>}
                  {[order.shippingCity, order.shippingState, order.shippingZip].filter(Boolean).join(', ')}
                  {order.shippingCountry && <>, {order.shippingCountry}</>}
                </p>
              </div>
            )}

            {/* Tracking */}
            <div className="px-6 py-4 border-b border-surface-800">
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2">Tracking Number</p>
              <div className="flex gap-2">
                <input
                  value={tracking}
                  onChange={(e) => setTracking(e.target.value)}
                  placeholder="e.g. 1Z999AA10123456784"
                  className="flex-1 bg-surface-700 border border-surface-600 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
                />
                <button
                  onClick={() => updateOrder({ trackingNumber: tracking })}
                  disabled={updating}
                  className="px-4 py-2 bg-surface-700 hover:bg-surface-600 border border-surface-600 text-gray-300 rounded-xl text-xs font-medium transition-colors disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>

            {/* Notes */}
            <div className="px-6 py-4 border-b border-surface-800">
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2">Internal Notes</p>
              <div className="flex flex-col gap-2">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Add notes for this order…"
                  className="w-full bg-surface-700 border border-surface-600 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-400 resize-none"
                />
                <button
                  onClick={() => updateOrder({ notes })}
                  disabled={updating}
                  className="self-end px-4 py-1.5 bg-surface-700 hover:bg-surface-600 border border-surface-600 text-gray-300 rounded-xl text-xs font-medium transition-colors disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>

            {/* Status controls */}
            <div className="px-6 py-5">
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-3">Update Status</p>
              <div className="grid grid-cols-2 gap-2">
                {(['PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const).map((s) => (
                  <button
                    key={s}
                    disabled={order.status === s || updating}
                    onClick={() => updateOrder({ status: s })}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-colors disabled:opacity-40 ${
                      order.status === s
                        ? (OD_STATUS_COLORS[s] ?? 'border-brand-500 text-brand-400 bg-brand-500/10')
                        : 'border-surface-600 text-gray-400 hover:text-white bg-surface-800 hover:bg-surface-700'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ShopTab() {
  const [subTab, setSubTab] = useState<'products' | 'orders' | 'coupons'>('products');

  // ── Products state ───────────────────────────────────────────────────────────
  const [products, setProducts]   = useState<AdminProduct[]>([]);
  const [prodLoading, setProdLoad] = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editProduct, setEditProduct] = useState<AdminProduct | null>(null);

  // ── Orders state ─────────────────────────────────────────────────────────────
  const [orders, setOrders]         = useState<AdminOrder[]>([]);
  const [ordersLoading, setOrdLoad] = useState(false);
  const [orderStatus, setOrderStatus] = useState('ALL');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // ── Coupons state ─────────────────────────────────────────────────────────────
  const [coupons, setCoupons]           = useState<AdminCoupon[]>([]);
  const [couponsLoading, setCoupLoad]   = useState(false);
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [editCoupon, setEditCoupon]     = useState<AdminCoupon | null>(null);

  useEffect(() => {
    api.get('/admin/products').then((r) => setProducts(r.data.products)).catch(() => {}).finally(() => setProdLoad(false));
  }, []);

  useEffect(() => {
    if (subTab !== 'orders') return;
    setOrdLoad(true);
    const q = orderStatus !== 'ALL' ? `?status=${orderStatus}` : '';
    api.get(`/admin/orders${q}`).then((r) => setOrders(r.data.orders)).catch(() => {}).finally(() => setOrdLoad(false));
  }, [subTab, orderStatus]);

  useEffect(() => {
    if (subTab !== 'coupons') return;
    setCoupLoad(true);
    api.get('/admin/coupons').then((r) => setCoupons(r.data.coupons)).catch(() => {}).finally(() => setCoupLoad(false));
  }, [subTab]);

  function onProductSaved(p: AdminProduct) {
    setProducts((prev) => {
      const idx = prev.findIndex((x) => x.id === p.id);
      return idx >= 0 ? prev.map((x, i) => (i === idx ? p : x)) : [p, ...prev];
    });
    setShowForm(false);
    setEditProduct(null);
  }

  async function toggleStatus(p: AdminProduct) {
    const next = p.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE';
    try {
      const { data } = await api.patch(`/admin/products/${p.id}`, { status: next });
      setProducts((prev) => prev.map((x) => (x.id === p.id ? data.product : x)));
    } catch {}
  }

  const ORDER_STATUS_COLORS: Record<string, string> = {
    PAID: 'text-camp-400 bg-camp-500/10 border-camp-500/30',
    PROCESSING: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    SHIPPED: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    DELIVERED: 'text-brand-400 bg-brand-500/10 border-brand-500/30',
    CANCELLED: 'text-red-400 bg-red-500/10 border-red-500/30',
    REFUNDED: 'text-gray-400 bg-surface-700 border-surface-600',
    PENDING: 'text-gray-400 bg-surface-700 border-surface-600',
  };

  return (
    <div>
      {/* Sub-tab bar */}
      <div className="flex gap-2 mb-6">
        {(['products', 'orders', 'coupons'] as const).map((t) => (
          <button key={t} onClick={() => setSubTab(t)}
            className={`px-5 py-2 rounded-xl text-sm font-medium transition-colors border ${
              subTab === t ? 'bg-brand-500 text-black border-brand-500' : 'border-surface-600 text-gray-400 hover:text-white bg-surface-800'
            }`}>
            {t === 'products' ? '📦 Products' : t === 'orders' ? '🧾 Orders' : '🏷️ Coupons'}
          </button>
        ))}
      </div>

      {/* ── Products ── */}
      {subTab === 'products' && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <p className="text-gray-400 text-sm">{products.length} product{products.length !== 1 ? 's' : ''}</p>
            <button onClick={() => { setEditProduct(null); setShowForm(true); }}
              className="bg-brand-500 hover:bg-brand-600 text-black font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
              + New Product
            </button>
          </div>

          {prodLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-surface-800 rounded-xl h-14 animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-4xl mb-3">📦</p>
              <p className="text-gray-400 mb-4">No products yet. Add your first one.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-surface-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-700 bg-surface-800/60">
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Product</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Type</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Price</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Variants</th>
                    <th className="text-right px-4 py-3 text-gray-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-700">
                  {products.map((p) => (
                    <tr key={p.id} className="bg-surface-800 hover:bg-surface-700/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {p.imageUrl && p.imageUrl.startsWith('http') ? (
                            <img src={p.imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-surface-700 flex items-center justify-center text-lg flex-shrink-0">
                              {p.type === 'DIGITAL' ? '📦' : '👕'}
                            </div>
                          )}
                          <div>
                            <p className="text-white font-medium leading-snug">{p.name}</p>
                            {p.featured && <span className="text-xs text-brand-400">Featured</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-400">{p.type === 'DIGITAL' ? 'Digital' : 'Physical'}</td>
                      <td className="px-4 py-3">
                        <span className="text-brand-400 font-semibold">${p.price.toFixed(2)}</span>
                        {p.comparePrice && <span className="text-gray-600 text-xs line-through ml-1">${p.comparePrice.toFixed(2)}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold ${STATUS_COLORS[p.status] || 'text-gray-400'}`}>{p.status}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-400">{p.variants.length}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => { setEditProduct(p); setShowForm(true); }}
                            className="text-xs text-gray-400 hover:text-white border border-surface-600 hover:border-surface-400 px-3 py-1.5 rounded-lg transition-colors">
                            Edit
                          </button>
                          <button onClick={() => toggleStatus(p)}
                            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                              p.status === 'ACTIVE'
                                ? 'text-red-400 border-red-500/30 hover:bg-red-500/10'
                                : 'text-camp-400 border-camp-500/30 hover:bg-camp-500/10'
                            }`}>
                            {p.status === 'ACTIVE' ? 'Archive' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Orders ── */}
      {subTab === 'orders' && (
        <div>
          {selectedOrderId && (
            <OrderDetailPanel
              orderId={selectedOrderId}
              onClose={() => setSelectedOrderId(null)}
              onUpdate={(updated) => setOrders((prev) => prev.map((o) => o.id === updated.id ? { ...o, ...updated } : o))}
            />
          )}

          {/* Status filter */}
          <div className="flex gap-2 flex-wrap mb-5">
            {ORDER_STATUSES.map((s) => (
              <button key={s} onClick={() => setOrderStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  orderStatus === s ? 'bg-brand-500 text-black border-brand-500' : 'border-surface-600 text-gray-400 hover:text-white bg-surface-800'
                }`}>
                {s}
              </button>
            ))}
          </div>

          {ordersLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="bg-surface-800 rounded-xl h-14 animate-pulse" />)}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-4xl mb-3">🧾</p>
              <p className="text-gray-400">No orders found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-surface-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-700 bg-surface-800/60">
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Order</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Customer</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Items</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Date</th>
                    <th className="text-right px-4 py-3 text-gray-400 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-700">
                  {orders.map((order) => {
                    const colorClass = ORDER_STATUS_COLORS[order.status] || 'text-gray-400 bg-surface-700 border-surface-600';
                    return (
                      <tr key={order.id} className="bg-surface-800 hover:bg-surface-700/40 transition-colors">
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setSelectedOrderId(order.id)}
                            className="text-brand-400 hover:text-brand-300 font-black text-sm font-mono underline-offset-2 hover:underline transition-colors"
                          >
                            #{order.id.slice(-8).toUpperCase()}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-gray-300 text-xs">{order.user?.username || order.email}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${colorClass}`}>{order.status}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                          {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3 text-right text-brand-400 font-bold">${order.total.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Coupons ── */}
      {subTab === 'coupons' && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <p className="text-gray-400 text-sm">{coupons.length} coupon{coupons.length !== 1 ? 's' : ''}</p>
            <button onClick={() => { setEditCoupon(null); setShowCouponForm(true); }}
              className="bg-brand-500 hover:bg-brand-600 text-black font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
              + New Coupon
            </button>
          </div>

          {couponsLoading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="bg-surface-800 rounded-xl h-12 animate-pulse" />)}</div>
          ) : coupons.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-4xl mb-3">🏷️</p>
              <p className="text-gray-400">No coupons yet. Create one above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-surface-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-700 bg-surface-800/60">
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Code</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Discount</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Min Order</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Uses</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Expires</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
                    <th className="text-right px-4 py-3 text-gray-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-700">
                  {coupons.map((c) => {
                    const expired = c.expiresAt && new Date(c.expiresAt) < new Date();
                    const exhausted = c.maxUses != null && c.usedCount >= c.maxUses;
                    const statusLabel = !c.active ? 'Inactive' : expired ? 'Expired' : exhausted ? 'Exhausted' : 'Active';
                    const statusColor = !c.active || expired || exhausted ? 'text-gray-500' : 'text-camp-400';
                    return (
                      <tr key={c.id} className="bg-surface-800 hover:bg-surface-700/50 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-white">{c.code}</td>
                        <td className="px-4 py-3 text-brand-400 font-semibold">
                          {c.type === 'PERCENTAGE' ? `${c.value}%` : `$${c.value.toFixed(2)}`}
                        </td>
                        <td className="px-4 py-3 text-gray-400">{c.minOrderAmount ? `$${c.minOrderAmount.toFixed(2)}` : '—'}</td>
                        <td className="px-4 py-3 text-gray-400">
                          {c.usedCount}{c.maxUses != null ? ` / ${c.maxUses}` : ''}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold ${statusColor}`}>{statusLabel}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => { setEditCoupon(c); setShowCouponForm(true); }}
                              className="text-xs text-gray-400 hover:text-white border border-surface-600 hover:border-surface-400 px-3 py-1.5 rounded-lg transition-colors">
                              Edit
                            </button>
                            <button
                              onClick={async () => {
                                const next = !c.active;
                                try {
                                  const { data } = await api.patch(`/admin/coupons/${c.id}`, { active: next });
                                  setCoupons((prev) => prev.map((x) => x.id === c.id ? { ...x, ...data.coupon } : x));
                                } catch {}
                              }}
                              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                                c.active ? 'text-red-400 border-red-500/30 hover:bg-red-500/10' : 'text-camp-400 border-camp-500/30 hover:bg-camp-500/10'
                              }`}>
                              {c.active ? 'Disable' : 'Enable'}
                            </button>
                            <button
                              onClick={async () => {
                                if (!confirm(`Delete coupon ${c.code}?`)) return;
                                try {
                                  await api.delete(`/admin/coupons/${c.id}`);
                                  setCoupons((prev) => prev.filter((x) => x.id !== c.id));
                                } catch {}
                              }}
                              className="text-xs text-gray-600 hover:text-red-400 border border-surface-700 hover:border-red-500/30 px-3 py-1.5 rounded-lg transition-colors">
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Product form modal */}
      {showForm && (
        <ProductFormModal
          initial={editProduct}
          onSave={onProductSaved}
          onClose={() => { setShowForm(false); setEditProduct(null); }}
        />
      )}

      {/* Coupon form modal */}
      {showCouponForm && (
        <CouponFormModal
          initial={editCoupon}
          onSave={(c) => {
            setCoupons((prev) => {
              const idx = prev.findIndex((x) => x.id === c.id);
              return idx >= 0 ? prev.map((x, i) => (i === idx ? c : x)) : [c, ...prev];
            });
            setShowCouponForm(false);
            setEditCoupon(null);
          }}
          onClose={() => { setShowCouponForm(false); setEditCoupon(null); }}
        />
      )}
    </div>
  );
}

// ── Homepage Content Editor ───────────────────────────────────────────────────

function HpSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-surface-700 rounded-xl overflow-hidden">
      <button onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-surface-800/60 transition-colors">
        <span className="text-white font-semibold text-sm">{title}</span>
        <span className={`text-gray-400 text-lg transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>⌄</span>
      </button>
      {open && (
        <div className="px-5 pb-5 pt-2 space-y-6 border-t border-surface-700/50">{children}</div>
      )}
    </div>
  );
}

const HP_SNIP = [
  { tag: 'bold',      css: 'font-weight: bold;' },
  { tag: 'semibold',  css: 'font-weight: 600;' },
  { tag: 'light',     css: 'font-weight: 300;' },
  { tag: 'italic',    css: 'font-style: italic;' },
  { tag: 'uppercase', css: 'text-transform: uppercase;' },
  { tag: 'capitalize',css: 'text-transform: capitalize;' },
  { tag: 'center',    css: 'text-align: center;' },
  { tag: 'left',      css: 'text-align: left;' },
  { tag: 'right',     css: 'text-align: right;' },
  { tag: 'underline', css: 'text-decoration: underline;' },
  { tag: 'strike',    css: 'text-decoration: line-through;' },
  { tag: 'gold',      css: 'color: #e8b800;' },
  { tag: 'green',     css: 'color: #024119;' },
  { tag: 'white',     css: 'color: #ffffff;' },
  { tag: 'muted',     css: 'color: #9ca3af;' },
  { tag: 'wide',      css: 'letter-spacing: 0.1em;' },
  { tag: 'wider',     css: 'letter-spacing: 0.25em;' },
  { tag: 'tight',     css: 'letter-spacing: -0.02em;' },
  { tag: 'shadow',    css: 'text-shadow: 0 2px 8px rgba(0,0,0,0.6);' },
  { tag: 'glow-gold', css: 'text-shadow: 0 0 16px rgba(232,184,0,0.6);' },
  { tag: 'no-wrap',   css: 'white-space: nowrap;' },
  { tag: 'italic-off',css: 'font-style: normal;' },
];

// ── Banner Slides Admin ───────────────────────────────────────────────────────

interface AdminBannerSlide {
  id: string;
  page: string;
  imageUrl: string;
  linkUrl: string | null;
  caption: string | null;
  objectPosition: string;
  objectFit: string;
  sortOrder: number;
  active: boolean;
}

function BannerSlidesAdmin({ page }: { page: 'HOME' | 'ARK' }) {
  const { settings, set, save } = useContext(SettingsCtx);
  const [slides, setSlides] = useState<AdminBannerSlide[]>([]);
  const [loadingSlides, setLoadingSlides] = useState(true);
  const [addUrl, setAddUrl] = useState('');
  const [addCaption, setAddCaption] = useState('');
  const [addLink, setAddLink] = useState('');
  const [addPosition, setAddPosition] = useState('center');
  const [addFit, setAddFit] = useState('cover');
  const [adding, setAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const intervalKey = page === 'HOME' ? 'home_banner_interval' : 'ark_banner_interval';
  const aspectKey   = page === 'HOME' ? 'home_banner_aspect'   : 'ark_banner_aspect';
  const overlayKey  = page === 'HOME' ? 'home_cinematic_overlay' : 'ark_banner_overlay';
  const gradientKey = page === 'HOME' ? 'home_cinematic_gradient' : 'ark_banner_gradient';

  useEffect(() => {
    setLoadingSlides(true);
    api.get('/admin/banners', { params: { page } })
      .then((r) => setSlides(r.data.slides))
      .catch(() => {})
      .finally(() => setLoadingSlides(false));
  }, [page]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const { data } = await api.post('/admin/banners/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAddUrl(data.url);
    } catch {}
    finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleAdd() {
    if (!addUrl.trim()) return;
    setAdding(true);
    try {
      const { data } = await api.post('/admin/banners', {
        page,
        imageUrl: addUrl.trim(),
        linkUrl: addLink.trim() || null,
        caption: addCaption.trim() || null,
        objectPosition: addPosition,
        objectFit: addFit,
      });
      setSlides((prev) => [...prev, data.slide]);
      setAddUrl('');
      setAddCaption('');
      setAddLink('');
      setAddPosition('center');
      setAddFit('cover');
    } catch {}
    finally { setAdding(false); }
  }

  async function handleToggleActive(id: string, active: boolean) {
    await api.patch(`/admin/banners/${id}`, { active: !active }).catch(() => {});
    setSlides((prev) => prev.map((s) => s.id === id ? { ...s, active: !active } : s));
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this slide?')) return;
    await api.delete(`/admin/banners/${id}`).catch(() => {});
    setSlides((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleMove(id: string, dir: -1 | 1) {
    const i = slides.findIndex((s) => s.id === id);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= slides.length) return;
    const next = [...slides];
    [next[i], next[j]] = [next[j], next[i]];
    const withOrder = next.map((s, k) => ({ ...s, sortOrder: k }));
    setSlides(withOrder);
    await Promise.all(
      [withOrder[i], withOrder[j]].map((s) =>
        api.patch(`/admin/banners/${s.id}`, { sortOrder: s.sortOrder }).catch(() => {})
      )
    );
  }

  async function handleUpdateField(id: string, field: 'caption' | 'linkUrl' | 'objectPosition' | 'objectFit', value: string) {
    setSaving(id);
    await api.patch(`/admin/banners/${id}`, { [field]: value || null }).catch(() => {});
    setSlides((prev) => prev.map((s) => s.id === id ? { ...s, [field]: value || null } : s));
    setSaving(null);
  }

  return (
    <div className="space-y-6">

      {/* Playback settings */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
            Rotation Interval (seconds)
          </label>
          <div className="flex gap-2">
            <input
              type="number" min="3" max="120" step="1"
              value={settings[intervalKey] ?? '15'}
              onChange={(e) => set(intervalKey, e.target.value)}
              className="flex-1 bg-surface-900 border border-surface-600 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400"
            />
            <SaveBtn k={intervalKey} />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
            Aspect Ratio <span className="text-gray-600 font-normal normal-case">(height % of width)</span>
          </label>
          <div className="flex gap-2">
            <select
              value={settings[aspectKey] ?? '42.85'}
              onChange={(e) => set(aspectKey, e.target.value)}
              className="flex-1 bg-surface-900 border border-surface-600 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400"
            >
              <option value="25">25% — 4:1 ultra-wide</option>
              <option value="33.33">33% — 3:1 panoramic</option>
              <option value="42.85">43% — 21:9 cinematic</option>
              <option value="56.25">56% — 16:9 standard</option>
              <option value="66.67">67% — 3:2</option>
              <option value="75">75% — 4:3</option>
              <option value="100">100% — square</option>
            </select>
            <SaveBtn k={aspectKey} />
          </div>
        </div>
      </div>

      {/* Overlay & gradient */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
            Dark Overlay <span className="text-gray-600 font-normal normal-case">(0 = none)</span>
          </label>
          <div className="flex gap-2 items-center">
            <input type="range" min="0" max="1" step="0.05"
              value={settings[overlayKey] ?? '0'}
              onChange={(e) => set(overlayKey, e.target.value)}
              className="flex-1 accent-brand-500"
            />
            <span className="text-white text-sm w-10 text-center font-mono tabular-nums">
              {parseFloat(settings[overlayKey] ?? '0').toFixed(2)}
            </span>
            <SaveBtn k={overlayKey} />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
            Bottom Gradient <span className="text-gray-600 font-normal normal-case">(px)</span>
          </label>
          <div className="flex gap-2 items-center">
            <input type="range" min="0" max="400" step="8"
              value={settings[gradientKey] ?? '0'}
              onChange={(e) => set(gradientKey, e.target.value)}
              className="flex-1 accent-brand-500"
            />
            <span className="text-white text-sm w-14 text-center font-mono tabular-nums">
              {settings[gradientKey] ?? '0'}px
            </span>
            <SaveBtn k={gradientKey} />
          </div>
        </div>
      </div>

      {/* Slide list */}
      <div>
        <h3 className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-3">
          Slides ({slides.length})
        </h3>
        {loadingSlides ? (
          <div className="h-16 bg-surface-800 rounded-xl animate-pulse" />
        ) : slides.length === 0 ? (
          <p className="text-gray-600 text-sm py-4 text-center">No slides yet — add one below.</p>
        ) : (
          <div className="space-y-2">
            {slides.map((slide, i) => (
              <div
                key={slide.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                  slide.active ? 'border-surface-600 bg-surface-800' : 'border-surface-700 bg-surface-900 opacity-50'
                }`}
              >
                {/* Thumbnail */}
                <div className="w-20 h-12 rounded-lg overflow-hidden bg-surface-700 flex-shrink-0">
                  <img src={slide.imageUrl} alt="" className="w-full h-full object-cover" />
                </div>

                {/* Editable fields */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <input
                    defaultValue={slide.caption || ''}
                    onBlur={(e) => handleUpdateField(slide.id, 'caption', e.target.value)}
                    placeholder="Caption (optional)"
                    className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-brand-400"
                  />
                  <input
                    defaultValue={slide.linkUrl || ''}
                    onBlur={(e) => handleUpdateField(slide.id, 'linkUrl', e.target.value)}
                    placeholder="Link URL (optional)"
                    className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-brand-400"
                  />
                  <div className="flex gap-1.5">
                    <select
                      defaultValue={slide.objectPosition || 'center'}
                      onChange={(e) => handleUpdateField(slide.id, 'objectPosition', e.target.value)}
                      className="flex-1 bg-surface-700 border border-surface-600 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-brand-400"
                    >
                      <option value="top">Position: Top</option>
                      <option value="center">Position: Center</option>
                      <option value="bottom">Position: Bottom</option>
                      <option value="left">Position: Left</option>
                      <option value="right">Position: Right</option>
                      <option value="top left">Position: Top-Left</option>
                      <option value="top right">Position: Top-Right</option>
                    </select>
                    <select
                      defaultValue={slide.objectFit || 'cover'}
                      onChange={(e) => handleUpdateField(slide.id, 'objectFit', e.target.value)}
                      className="flex-1 bg-surface-700 border border-surface-600 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-brand-400"
                    >
                      <option value="cover">Fit: Cover (crop)</option>
                      <option value="contain">Fit: Contain (letterbox)</option>
                      <option value="fill">Fit: Stretch (no crop)</option>
                    </select>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleMove(slide.id, -1)}
                    disabled={i === 0}
                    className="w-7 h-7 rounded-lg bg-surface-700 hover:bg-surface-600 text-gray-400 hover:text-white text-xs flex items-center justify-center disabled:opacity-30 transition-colors"
                    title="Move up"
                  >↑</button>
                  <button
                    onClick={() => handleMove(slide.id, 1)}
                    disabled={i === slides.length - 1}
                    className="w-7 h-7 rounded-lg bg-surface-700 hover:bg-surface-600 text-gray-400 hover:text-white text-xs flex items-center justify-center disabled:opacity-30 transition-colors"
                    title="Move down"
                  >↓</button>
                </div>
                <button
                  onClick={() => handleToggleActive(slide.id, slide.active)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex-shrink-0 transition-colors ${
                    slide.active ? 'bg-camp-500/20 text-camp-400 hover:bg-camp-500/30' : 'bg-surface-700 text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {slide.active ? 'On' : 'Off'}
                </button>
                <button
                  onClick={() => handleDelete(slide.id)}
                  className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm flex items-center justify-center flex-shrink-0 transition-colors"
                  title="Delete slide"
                >×</button>
                {saving === slide.id && <span className="text-xs text-brand-400 flex-shrink-0">Saving…</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add slide */}
      <div className="border border-surface-700 rounded-xl p-4 space-y-3">
        <h3 className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Add Slide</h3>
        <div className="flex gap-2">
          <input
            type="url"
            value={addUrl}
            onChange={(e) => setAddUrl(e.target.value)}
            placeholder="Image URL or upload below"
            className="flex-1 bg-surface-900 border border-surface-600 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400"
          />
          <label className={`px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-colors flex items-center gap-1.5 ${
            uploading ? 'bg-surface-700 text-gray-500' : 'bg-surface-700 hover:bg-surface-600 text-gray-300'
          }`}>
            {uploading ? 'Uploading…' : '↑ Upload'}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        </div>
        {addUrl && (
          <div className="w-full h-28 rounded-xl overflow-hidden bg-surface-900">
            <img src={addUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <input
            value={addCaption}
            onChange={(e) => setAddCaption(e.target.value)}
            placeholder="Caption (optional)"
            className="bg-surface-900 border border-surface-600 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
          />
          <input
            value={addLink}
            onChange={(e) => setAddLink(e.target.value)}
            placeholder="Link URL (optional)"
            className="bg-surface-900 border border-surface-600 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
          />
          <select
            value={addPosition}
            onChange={(e) => setAddPosition(e.target.value)}
            className="bg-surface-900 border border-surface-600 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
          >
            <option value="top">Position: Top</option>
            <option value="center">Position: Center</option>
            <option value="bottom">Position: Bottom</option>
            <option value="left">Position: Left</option>
            <option value="right">Position: Right</option>
            <option value="top left">Position: Top-Left</option>
            <option value="top right">Position: Top-Right</option>
          </select>
          <select
            value={addFit}
            onChange={(e) => setAddFit(e.target.value)}
            className="bg-surface-900 border border-surface-600 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
          >
            <option value="cover">Fit: Cover (crop to fill)</option>
            <option value="contain">Fit: Contain (show full image)</option>
            <option value="fill">Fit: Stretch (no crop)</option>
          </select>
        </div>
        <button
          onClick={handleAdd}
          disabled={adding || !addUrl.trim()}
          className="w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-black font-bold text-sm transition-colors disabled:opacity-50"
        >
          {adding ? 'Adding…' : '+ Add Slide'}
        </button>
      </div>
    </div>
  );
}

function CinematicBannerAdmin() {
  const { settings, set, loading } = useContext(SettingsCtx);
  return (
    <div className="space-y-5">
      <p className="text-gray-500 text-xs leading-relaxed">
        Paste a direct URL to an image or video file. When set, it fills the homepage hero full-screen behind the logo and copy. Leave blank to use the default atmospheric gradient.
      </p>

      <div>
        <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
          Media URL <span className="text-gray-600 font-normal normal-case">(direct link to .jpg, .png, .mp4, etc.)</span>
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            value={settings['home_cinematic_url'] ?? ''}
            onChange={(e) => set('home_cinematic_url', e.target.value)}
            placeholder="https://..."
            disabled={loading}
            className="flex-1 bg-surface-900 border border-surface-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400 transition-colors placeholder:text-gray-700 disabled:opacity-50"
          />
          <UploadBannerBtn settingKey="home_cinematic_url" />
          <SaveBtn k="home_cinematic_url" />
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1.5">Media Type</label>
        <div className="flex gap-2 items-center">
          {(['image', 'video'] as const).map((val) => (
            <button
              key={val}
              disabled={loading}
              onClick={() => set('home_cinematic_type', val)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold border transition-colors disabled:opacity-50 ${
                (settings['home_cinematic_type'] || 'image') === val
                  ? 'bg-brand-500 text-black border-brand-500'
                  : 'border-surface-600 text-gray-400 hover:text-white bg-surface-900'
              }`}
            >
              {val === 'image' ? '🖼 Image' : '🎬 Video'}
            </button>
          ))}
          <SaveBtn k="home_cinematic_type" />
        </div>
      </div>

      {settings['home_cinematic_type'] === 'video' && (
        <div>
          <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
            Poster Image URL <span className="text-gray-600 font-normal normal-case">(shown while video loads)</span>
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={settings['home_cinematic_poster'] ?? ''}
              onChange={(e) => set('home_cinematic_poster', e.target.value)}
              placeholder="https://..."
              disabled={loading}
              className="flex-1 bg-surface-900 border border-surface-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400 transition-colors placeholder:text-gray-700 disabled:opacity-50"
            />
            <SaveBtn k="home_cinematic_poster" />
          </div>
        </div>
      )}

      <div>
        <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
          Overlay Darkness <span className="text-gray-600 font-normal normal-case">(0 = fully visible · 1 = solid black · default 0.2)</span>
        </label>
        <div className="flex gap-3 items-center">
          <input
            type="range" min="0" max="1" step="0.05"
            value={settings['home_cinematic_overlay'] ?? '0.55'}
            onChange={(e) => set('home_cinematic_overlay', e.target.value)}
            disabled={loading}
            className="flex-1 accent-brand-500"
          />
          <span className="text-white text-sm w-10 text-center font-mono tabular-nums">
            {parseFloat(settings['home_cinematic_overlay'] ?? '0.55').toFixed(2)}
          </span>
          <SaveBtn k="home_cinematic_overlay" />
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
          Bottom Gradient Height <span className="text-gray-600 font-normal normal-case">(0 = none · 400 = 400px fade into page · default 0)</span>
        </label>
        <div className="flex gap-3 items-center">
          <input
            type="range" min="0" max="400" step="8"
            value={settings['home_cinematic_gradient'] ?? '0'}
            onChange={(e) => set('home_cinematic_gradient', e.target.value)}
            disabled={loading}
            className="flex-1 accent-brand-500"
          />
          <span className="text-white text-sm w-14 text-center font-mono tabular-nums">
            {settings['home_cinematic_gradient'] ?? '0'}px
          </span>
          <SaveBtn k="home_cinematic_gradient" />
        </div>
      </div>

    </div>
  );
}

function HomepageContentSection() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-1">Homepage Content</h2>
        <p className="text-gray-500 text-sm">Edit text, font size, line height, color, weight, decoration, alignment and any other CSS property for every section. Click a section to expand.</p>
      </div>
      <div className="space-y-3">

        <HpSection title="🎞 Rotating Banner Slides">
          <BannerSlidesAdmin page="HOME" />
        </HpSection>

        <HpSection title="🎯 Hero">
          <FieldBlock label="Est. line" textKey="hero_est" placeholder="Est. 2023"
            cssKey="hero_est_css" cssClass="hero-est" fontSizeKey="hero_est_font_size" snippets={HP_SNIP} />
          <FieldBlock label="Tagline" textKey="hero_tagline" placeholder="Discipline · Identity · Legacy"
            cssKey="hero_tagline_css" cssClass="hero-tagline" fontSizeKey="hero_tagline_font_size" lineHeightKey="hero_tagline_line_height" snippets={HP_SNIP} />
          <FieldBlock label="Headline" textKey="hero_headline" placeholder="Music. Film. Teachings."
            cssKey="hero_headline_css" cssClass="hero-headline" fontSizeKey="hero_headline_font_size" lineHeightKey="hero_headline_line_height" snippets={HP_SNIP} />
          <FieldBlock label="Sub-text" textKey="hero_sub" placeholder="Independent content rooted in the DaddyMan philosophy..."
            cssKey="hero_sub_css" cssClass="hero-sub" fontSizeKey="hero_sub_font_size" lineHeightKey="hero_sub_line_height" snippets={HP_SNIP} />
          <FieldBlock label="Browse CTA button" textKey="hero_cta_browse" placeholder="Browse all"
            cssKey="hero_cta_browse_css" cssClass="hero-cta-browse" fontSizeKey="hero_cta_browse_font_size" snippets={HP_SNIP} />
          <FieldBlock label="Join CTA button" textKey="hero_cta_join" placeholder="Join for free →"
            cssKey="hero_cta_join_css" cssClass="hero-cta-join" fontSizeKey="hero_cta_join_font_size" snippets={HP_SNIP} />
        </HpSection>

        <HpSection title="🎵 Browse by Category">
          <FieldBlock label="Eyebrow" textKey="browse_eyebrow" placeholder="Explore the Camp"
            cssKey="browse_eyebrow_css" cssClass="browse-eyebrow" fontSizeKey="browse_eyebrow_font_size" snippets={HP_SNIP} />
          <FieldBlock label="Title" textKey="browse_title" placeholder="What are you feeling?"
            cssKey="browse_title_css" cssClass="browse-title" fontSizeKey="browse_title_font_size" lineHeightKey="browse_title_line_height" snippets={HP_SNIP} />
          <FieldBlock label="Direction — bold text" textKey="browse_banner_bold" placeholder="Pick your format"
            cssKey="browse_banner_bold_css" cssClass="browse-banner-bold" fontSizeKey="browse_banner_bold_font_size" snippets={HP_SNIP} />
          <FieldBlock label="Direction — body text" textKey="browse_banner_body" placeholder="tap any category below to dive straight into..."
            cssKey="browse_banner_body_css" cssClass="browse-banner-body" fontSizeKey="browse_banner_body_font_size" lineHeightKey="browse_banner_body_line_height" snippets={HP_SNIP} />
        </HpSection>

        <HpSection title="⚔️ Built on Three Pillars">
          <FieldBlock label="Eyebrow" textKey="pillars_eyebrow" placeholder="The Foundation"
            cssKey="pillars_eyebrow_css" cssClass="pillars-eyebrow" fontSizeKey="pillars_eyebrow_font_size" snippets={HP_SNIP} />
          <FieldBlock label="Title" textKey="pillars_title" placeholder="Built on three pillars"
            cssKey="pillars_title_css" cssClass="pillars-title" fontSizeKey="pillars_title_font_size" lineHeightKey="pillars_title_line_height" snippets={HP_SNIP} />
          {[
            { n: 1, iDef: '⚔️', wDef: 'Discipline', bDef: 'Consistent creative output rooted in craft, not trends.' },
            { n: 2, iDef: '👑', wDef: 'Identity',   bDef: 'Know who you are and let it shape your art.' },
            { n: 3, iDef: '🔥', wDef: 'Legacy',     bDef: 'Create work that lasts.' },
          ].map(({ n, iDef, wDef, bDef }) => (
            <div key={n} className="border border-surface-700/50 rounded-xl p-4 space-y-4">
              <p className="text-xs text-brand-400/70 font-bold uppercase tracking-widest">Pillar {n}</p>
              <FieldBlock label="Icon (emoji)" textKey={`pillar${n}_icon`} placeholder={iDef}
                cssKey={`pillar${n}_icon_css`} cssClass={`pillar${n}-icon`} snippets={HP_SNIP} />
              <FieldBlock label="Word / Title" textKey={`pillar${n}_word`} placeholder={wDef}
                cssKey={`pillar${n}_word_css`} cssClass={`pillar${n}-word`} fontSizeKey={`pillar${n}_word_font_size`} lineHeightKey={`pillar${n}_word_line_height`} snippets={HP_SNIP} />
              <FieldBlock label="Body text" textKey={`pillar${n}_body`} placeholder={bDef}
                cssKey={`pillar${n}_body_css`} cssClass={`pillar${n}-body`} fontSizeKey={`pillar${n}_body_font_size`} lineHeightKey={`pillar${n}_body_line_height`} snippets={HP_SNIP} />
            </div>
          ))}
        </HpSection>

        <HpSection title="✨ Everything in One Place">
          <FieldBlock label="Eyebrow" textKey="features_eyebrow" placeholder="Why Join"
            cssKey="features_eyebrow_css" cssClass="features-eyebrow" fontSizeKey="features_eyebrow_font_size" snippets={HP_SNIP} />
          <FieldBlock label="Title" textKey="features_title" placeholder="Everything in one place"
            cssKey="features_title_css" cssClass="features-title" fontSizeKey="features_title_font_size" lineHeightKey="features_title_line_height" snippets={HP_SNIP} />
          {[
            { n: 1, iDef: '🎵', tDef: 'Music & Film',         bDef: 'Stream original tracks, albums, short films...' },
            { n: 2, iDef: '🎙️', tDef: 'Podcasts & Teachings', bDef: 'Weekly conversations, long-form interviews...' },
            { n: 3, iDef: '🔒', tDef: 'Members-only content', bDef: 'Subscriber access unlocks exclusive drops...' },
            { n: 4, iDef: '👥', tDef: 'Follow creators',      bDef: 'Build your feed...' },
            { n: 5, iDef: '📱', tDef: 'Watch anywhere',       bDef: 'Web and mobile — your watch history syncs...' },
            { n: 6, iDef: '🏕️', tDef: 'Join the Camp',        bDef: "This isn't just content..." },
          ].map(({ n, iDef, tDef, bDef }) => (
            <div key={n} className="border border-surface-700/50 rounded-xl p-4 space-y-4">
              <p className="text-xs text-brand-400/70 font-bold uppercase tracking-widest">Feature {n}</p>
              <FieldBlock label="Icon (emoji)" textKey={`feature${n}_icon`} placeholder={iDef}
                cssKey={`feature${n}_icon_css`} cssClass={`feature${n}-icon`} snippets={HP_SNIP} />
              <FieldBlock label="Title" textKey={`feature${n}_title`} placeholder={tDef}
                cssKey={`feature${n}_title_css`} cssClass={`feature${n}-title`} fontSizeKey={`feature${n}_title_font_size`} snippets={HP_SNIP} />
              <FieldBlock label="Body text" textKey={`feature${n}_body`} placeholder={bDef}
                cssKey={`feature${n}_body_css`} cssClass={`feature${n}-body`} fontSizeKey={`feature${n}_body_font_size`} lineHeightKey={`feature${n}_body_line_height`} snippets={HP_SNIP} />
            </div>
          ))}
        </HpSection>

        <HpSection title="💳 Pricing Section">
          <FieldBlock label="Eyebrow" textKey="pricing_eyebrow" placeholder="Membership"
            cssKey="pricing_eyebrow_css" cssClass="pricing-eyebrow" fontSizeKey="pricing_eyebrow_font_size" snippets={HP_SNIP} />
          <FieldBlock label="Title" textKey="pricing_title" placeholder="Simple, transparent pricing"
            cssKey="pricing_title_css" cssClass="pricing-title" fontSizeKey="pricing_title_font_size" lineHeightKey="pricing_title_line_height" snippets={HP_SNIP} />
          <FieldBlock label="Subtitle" textKey="pricing_sub" placeholder="Start free. Upgrade when you're ready."
            cssKey="pricing_sub_css" cssClass="pricing-sub" fontSizeKey="pricing_sub_font_size" lineHeightKey="pricing_sub_line_height" snippets={HP_SNIP} />
        </HpSection>

        <HpSection title="🎤 Creator CTA">
          <FieldBlock label="Eyebrow" textKey="creator_eyebrow" placeholder="For Creators"
            cssKey="creator_eyebrow_css" cssClass="creator-eyebrow" fontSizeKey="creator_eyebrow_font_size" snippets={HP_SNIP} />
          <FieldBlock label="Headline" textKey="creator_headline" placeholder="Your voice deserves its own platform."
            cssKey="creator_headline_css" cssClass="creator-headline" fontSizeKey="creator_headline_font_size" lineHeightKey="creator_headline_line_height" snippets={HP_SNIP} />
          <FieldBlock label="Body text" textKey="creator_sub" placeholder="Upload your music, films, podcasts..."
            cssKey="creator_sub_css" cssClass="creator-sub" fontSizeKey="creator_sub_font_size" lineHeightKey="creator_sub_line_height" snippets={HP_SNIP} />
          <FieldBlock label="Primary CTA button" textKey="creator_cta_start" placeholder="Start creating →"
            cssKey="creator_cta_start_css" cssClass="creator-cta-start" fontSizeKey="creator_cta_start_font_size" snippets={HP_SNIP} />
          <FieldBlock label="Secondary CTA button" textKey="creator_cta_explore" placeholder="Explore first"
            cssKey="creator_cta_explore_css" cssClass="creator-cta-explore" fontSizeKey="creator_cta_explore_font_size" snippets={HP_SNIP} />
        </HpSection>

      </div>
    </div>
  );
}

// ── Settings Tab ──────────────────────────────────────────────────────────────

interface SettingsCtxType {
  settings: Record<string, string>;
  set: (key: string, value: string) => void;
  loading: boolean;
  saving: string | null;
  saved: string | null;
  save: (key: string) => Promise<void>;
}

const SettingsCtx = createContext<SettingsCtxType>({
  settings: {}, set: () => {}, loading: false, saving: null, saved: null, save: async () => {},
});

function SaveBtn({ k }: { k: string }) {
  const { saving, saved, save, loading } = useContext(SettingsCtx);
  return (
    <button
      onClick={() => save(k)}
      disabled={saving === k || loading}
      className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors whitespace-nowrap ${
        saved === k ? 'bg-camp-500 text-white' : 'bg-brand-500 hover:bg-brand-600 text-black disabled:opacity-50'
      }`}
    >
      {saving === k ? 'Saving…' : saved === k ? '✓ Saved' : 'Save'}
    </button>
  );
}

function UploadBannerBtn({ settingKey }: { settingKey: string }) {
  const { set } = useContext(SettingsCtx);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setDone(false);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const { data } = await api.post('/admin/settings/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      set(settingKey, data.url);
      await api.put('/admin/settings', { key: settingKey, value: data.url });
      setDone(true);
      setTimeout(() => setDone(false), 2500);
    } catch {}
    finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={`px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-colors disabled:opacity-50 ${
          done ? 'bg-camp-500 text-white' : 'bg-surface-700 hover:bg-surface-600 text-gray-300 hover:text-white'
        }`}
      >
        {uploading ? 'Uploading…' : done ? '✓ Saved' : '⬆ Upload'}
      </button>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />
    </>
  );
}

function FieldBlock({
  label, textKey, placeholder, textEntries, cssKey, cssClass, fontSizeKey, lineHeightKey, snippets,
}: {
  label: string;
  textKey?: string; placeholder?: string;
  textEntries?: { key: string; label: string; placeholder: string }[];
  cssKey: string; cssClass: string; fontSizeKey?: string; lineHeightKey?: string;
  snippets: { tag: string; css: string }[];
}) {
  const { settings, set, loading } = useContext(SettingsCtx);

  const parseFontSize = (raw: string) => {
    const m = (raw ?? '').trim().match(/^([\d.]+)(px|rem|em|vw|vh|%)$/);
    return { num: m?.[1] ?? '', unit: (m?.[2] ?? 'px') as string };
  };

  const parseLineHeight = (raw: string) => {
    const m = (raw ?? '').trim().match(/^([\d.]+)(px|rem|em|%)?$/);
    return { num: m?.[1] ?? '', unit: m?.[2] ?? '' }; // '' = unitless
  };

  const hasTextEditor = !!(textKey || textEntries?.length);

  return (
    <div className="space-y-2 pb-6 border-b border-surface-800/50 last:border-0">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-white">{label}</span>
        <code className="text-[10px] text-brand-400/70 bg-surface-800 px-2 py-0.5 rounded font-mono">.{cssClass}</code>
      </div>

      {textKey && (
        <div className="flex gap-2">
          <input
            type="text"
            value={settings[textKey] ?? ''}
            onChange={(e) => set(textKey, e.target.value)}
            placeholder={placeholder}
            disabled={loading}
            className="flex-1 bg-surface-900 border border-surface-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400 transition-colors placeholder:text-gray-700 disabled:opacity-50"
          />
          <SaveBtn k={textKey} />
        </div>
      )}

      {textEntries?.map((entry) => (
        <div key={entry.key}>
          <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">{entry.label}</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={settings[entry.key] ?? ''}
              onChange={(e) => set(entry.key, e.target.value)}
              placeholder={entry.placeholder}
              disabled={loading}
              className="flex-1 bg-surface-900 border border-surface-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400 transition-colors placeholder:text-gray-700 disabled:opacity-50"
            />
            <SaveBtn k={entry.key} />
          </div>
        </div>
      ))}

      {!hasTextEditor && (
        <p className="text-xs text-gray-600 italic">Values are live counts from the database.</p>
      )}

      {fontSizeKey && (() => {
        const { num, unit } = parseFontSize(settings[fontSizeKey] ?? '');
        return (
          <div>
            <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Font Size</label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                min={1}
                step={1}
                value={num}
                onChange={(e) => set(fontSizeKey, e.target.value ? `${e.target.value}${unit}` : '')}
                placeholder="24"
                disabled={loading}
                className="w-24 bg-surface-900 border border-surface-600 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400 transition-colors placeholder:text-gray-700 disabled:opacity-50"
              />
              <select
                value={unit}
                onChange={(e) => set(fontSizeKey, num ? `${num}${e.target.value}` : '')}
                disabled={loading}
                className="bg-surface-900 border border-surface-600 text-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <option value="px">px</option>
                <option value="rem">rem</option>
                <option value="em">em</option>
                <option value="vw">vw</option>
                <option value="%">%</option>
              </select>
              <SaveBtn k={fontSizeKey} />
            </div>
          </div>
        );
      })()}

      {lineHeightKey && (() => {
        const { num, unit } = parseLineHeight(settings[lineHeightKey] ?? '');
        return (
          <div>
            <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Line Height</label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                min={0}
                step={0.1}
                value={num}
                onChange={(e) => set(lineHeightKey, e.target.value ? `${e.target.value}${unit}` : '')}
                placeholder="1.5"
                disabled={loading}
                className="w-24 bg-surface-900 border border-surface-600 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400 transition-colors placeholder:text-gray-700 disabled:opacity-50"
              />
              <select
                value={unit}
                onChange={(e) => set(lineHeightKey, num ? `${num}${e.target.value}` : '')}
                disabled={loading}
                className="bg-surface-900 border border-surface-600 text-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <option value="">unitless</option>
                <option value="px">px</option>
                <option value="rem">rem</option>
                <option value="em">em</option>
                <option value="%">%</option>
              </select>
              <SaveBtn k={lineHeightKey} />
            </div>
          </div>
        );
      })()}

      <div className="flex gap-2">
        <textarea
          value={settings[cssKey] ?? ''}
          onChange={(e) => set(cssKey, e.target.value)}
          placeholder={`/* styles for .${cssClass} */\ncolor: #ffffff;`}
          disabled={loading}
          rows={3}
          spellCheck={false}
          className="flex-1 bg-surface-900 border border-surface-600 text-gray-200 font-mono text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-brand-400 resize-y transition-colors placeholder:text-gray-700 disabled:opacity-50 leading-relaxed"
        />
        <SaveBtn k={cssKey} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {snippets.map(({ tag, css }) => (
          <button
            key={tag}
            onClick={() => {
              const cur = (settings[cssKey] ?? '').trim();
              set(cssKey, cur ? `${cur}\n${css}` : css);
            }}
            className="px-2.5 py-1 rounded-lg text-[10px] font-semibold text-gray-500 hover:text-brand-400 border border-surface-800 hover:border-brand-500/40 bg-surface-900/40 transition-colors"
          >
            + {tag}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Series Tab ────────────────────────────────────────────────────────────────

interface SeriesRow {
  id: string; title: string; description: string | null; coverUrl: string | null;
  trailerUrl: string | null;
  genre: string | null; tags: string[]; status: string; privacy: string; createdAt: string;
  creator: { username: string; displayName: string | null };
  _count: { seasons: number };
  seasons?: SeasonRow[];
}

interface SeasonRow {
  id: string; number: number; title: string | null; description: string | null;
  coverUrl?: string | null;
  _count?: { episodes: number };
  episodes?: EpisodeRow[];
}

interface EpisodeRow {
  id: string;
  episodeNumber: number;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  mediaUrl: string | null;
  duration: number | null;
  views: number;
  rating: string | null;
}

function SeriesTab() {
  const [seriesList, setSeriesList]       = useState<SeriesRow[]>([]);
  const [loading, setLoading]             = useState(true);
  const [editSeries, setEditSeries]       = useState<SeriesRow | null>(null);
  const [expandedSeason, setExpandedSeason] = useState<string | null>(null);
  const [showCreate, setShowCreate]       = useState(false);
  const [saving, setSaving]               = useState(false);
  const [addingEpTo, setAddingEpTo]       = useState<string | null>(null); // seasonId
  const [epForm, setEpForm]               = useState({ title: '', description: '' });
  const [epThumbnailFile, setEpThumbnailFile] = useState<File | null>(null);
  const [epVideoFile, setEpVideoFile]     = useState<File | null>(null);
  const [epThumbnailPreview, setEpThumbnailPreview] = useState<string | null>(null);
  const [epSaving, setEpSaving]           = useState(false);
  const [epUploadProg, setEpUploadProg]   = useState<{ thumb?: number; video?: number }>({});
  const [editingEpId, setEditingEpId]     = useState<string | null>(null);
  const [editEpForm, setEditEpForm]       = useState({ title: '', description: '' });
  const [editEpThumbFile, setEditEpThumbFile] = useState<File | null>(null);
  const [editEpVideoFile, setEditEpVideoFile] = useState<File | null>(null);
  const [editEpThumbPreview, setEditEpThumbPreview] = useState<string | null>(null);
  const [editEpSaving, setEditEpSaving]   = useState(false);
  const [newSeasonNum, setNewSeasonNum]   = useState('');
  const [newSeasonTitle, setNewSeasonTitle] = useState('');
  const [newSeasonCoverFile, setNewSeasonCoverFile] = useState<File | null>(null);
  const [newSeasonCoverPreview, setNewSeasonCoverPreview] = useState<string | null>(null);
  const [addingSeasonTo, setAddingSeasonTo] = useState<string | null>(null); // seriesId

  const [form, setForm] = useState({
    title: '', description: '', genre: '', tags: '', status: 'ACTIVE', privacy: 'PUBLIC',
  });
  const [pendingCoverFile, setPendingCoverFile]   = useState<File | null>(null);
  const [pendingTrailerFile, setPendingTrailerFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview]           = useState<string | null>(null);
  const [uploadProg, setUploadProg]               = useState<{ cover?: number; trailer?: number }>({});
  const [uploadError, setUploadError]             = useState('');

  function resetForm() {
    setForm({ title: '', description: '', genre: '', tags: '', status: 'ACTIVE', privacy: 'PUBLIC' });
    setPendingCoverFile(null);
    setPendingTrailerFile(null);
    setCoverPreview(null);
    setUploadProg({});
    setUploadError('');
  }

  useEffect(() => {
    api.get('/series').then((r) => setSeriesList(r.data.series)).catch(() => {}).finally(() => setLoading(false));
  }, []);

async function uploadFiles(seriesId: string): Promise<SeriesRow | null> {
    let latest: SeriesRow | null = null;
    setUploadError('');
    if (pendingCoverFile) {
      const fd = new FormData(); fd.append('cover', pendingCoverFile);
      const cr = await api.patch(`/series/${seriesId}/cover`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (ev) => { if (ev.total) setUploadProg((p) => ({ ...p, cover: Math.round(ev.loaded / ev.total! * 100) })); },
      });
      latest = cr.data.series;
    }
    if (pendingTrailerFile) {
      const fd = new FormData(); fd.append('trailer', pendingTrailerFile);
      try {
        const tr = await api.patch(`/series/${seriesId}/trailer`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (ev) => { if (ev.total) setUploadProg((p) => ({ ...p, trailer: Math.round(ev.loaded / ev.total! * 100) })); },
        });
        latest = tr.data.series;
      } catch (e: any) {
        const msg = e?.response?.data?.error || 'Trailer upload failed';
        setUploadError(msg);
        throw new Error(msg);
      }
    }
    return latest;
  }

  async function handleCreate() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const r = await api.post('/series', {
        title: form.title, description: form.description || null, genre: form.genre || null,
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        status: form.status, privacy: form.privacy,
      });
      const created = r.data.series;
      const withMedia = await uploadFiles(created.id);
      setSeriesList((prev) => [withMedia ?? created, ...prev]);
      setShowCreate(false); resetForm();
    } catch { } finally { setSaving(false); }
  }

  async function handleUpdate() {
    if (!editSeries) return;
    setSaving(true);
    try {
      await api.patch(`/series/${editSeries.id}`, {
        title: form.title, description: form.description || null, genre: form.genre || null,
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        status: form.status, privacy: form.privacy,
      });
      await uploadFiles(editSeries.id);
      const r = await api.get('/series');
      setSeriesList(r.data.series);
      setEditSeries(null); resetForm();
    } catch { } finally { setSaving(false); }
  }

  async function handleDeleteSeries(id: string) {
    if (!confirm('Delete this series? Seasons and episode links will also be removed.')) return;
    await api.delete(`/series/${id}`).catch(() => {});
    setSeriesList((prev) => prev.filter((s) => s.id !== id));
    if (editSeries?.id === id) setEditSeries(null);
  }

  function openEdit(s: SeriesRow) {
    setEditSeries(s);
    setForm({
      title: s.title, description: s.description || '', genre: s.genre || '',
      tags: s.tags?.join(', ') || '', status: s.status, privacy: s.privacy,
    });
    setPendingCoverFile(null);
    setPendingTrailerFile(null);
    setCoverPreview(null);
    setUploadProg({});
    setShowCreate(false);
    loadSeriesDetail(s.id);
  }

  async function loadSeriesDetail(seriesId: string) {
    const r = await api.get(`/series/${seriesId}`).catch(() => null);
    if (!r) return;
    setSeriesList((prev) => prev.map((s) => s.id === seriesId ? { ...s, seasons: r.data.series.seasons } : s));
    setEditSeries((prev) => prev?.id === seriesId ? { ...prev, seasons: r.data.series.seasons } : prev);
  }

  async function handleAddSeason(seriesId: string) {
    if (!newSeasonNum.trim()) { alert('Enter a season number'); return; }
    try {
      const r = await api.post(`/series/${seriesId}/seasons`, {
        number: Number(newSeasonNum), title: newSeasonTitle || null,
      });
      const newSeasonId = r.data.season.id;
      if (newSeasonCoverFile) {
        const fd = new FormData(); fd.append('cover', newSeasonCoverFile);
        await api.patch(`/series/${seriesId}/seasons/${newSeasonId}/cover`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        }).catch(() => {});
      }
      setNewSeasonNum(''); setNewSeasonTitle('');
      setNewSeasonCoverFile(null); setNewSeasonCoverPreview(null);
      setAddingSeasonTo(null);
      setExpandedSeason(newSeasonId); // auto-expand so user can add episodes immediately
      await loadSeriesDetail(seriesId);
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to add season');
    }
  }

  async function handleDeleteSeason(seriesId: string, seasonId: string) {
    if (!confirm('Delete this season and all its episode links?')) return;
    await api.delete(`/series/${seriesId}/seasons/${seasonId}`).catch(() => {});
    await loadSeriesDetail(seriesId);
  }

  function resetEpForm() {
    setEpForm({ title: '', description: '' });
    setEpThumbnailFile(null);
    setEpVideoFile(null);
    setEpThumbnailPreview(null);
    setEpUploadProg({});
  }

  async function handleAddEpisode(seriesId: string, seasonId: string) {
    if (!epForm.title.trim()) { alert('Episode title is required'); return; }
    const season = editSeries?.seasons?.find((s) => s.id === seasonId);
    const nextNum = (season?.episodes?.length ?? 0) + 1;
    setEpSaving(true);
    try {
      const r = await api.post(`/series/${seriesId}/seasons/${seasonId}/episodes`, {
        title: epForm.title.trim(),
        description: epForm.description || null,
        episodeNumber: nextNum,
      });
      const epId = r.data.episode.id;
      if (epThumbnailFile) {
        const fd = new FormData(); fd.append('thumbnail', epThumbnailFile);
        await api.patch(`/series/${seriesId}/seasons/${seasonId}/episodes/${epId}/thumbnail`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (ev) => { if (ev.total) setEpUploadProg((p) => ({ ...p, thumb: Math.round(ev.loaded / ev.total! * 100) })); },
        }).catch(() => {});
      }
      if (epVideoFile) {
        const fd = new FormData(); fd.append('video', epVideoFile);
        await api.patch(`/series/${seriesId}/seasons/${seasonId}/episodes/${epId}/video`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (ev) => { if (ev.total) setEpUploadProg((p) => ({ ...p, video: Math.round(ev.loaded / ev.total! * 100) })); },
        }).catch(() => {});
      }
      resetEpForm();
      setAddingEpTo(null);
      await loadSeriesDetail(seriesId);
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to add episode');
    } finally {
      setEpSaving(false);
    }
  }

  async function handleRemoveEpisode(seriesId: string, seasonId: string, episodeId: string) {
    await api.delete(`/series/${seriesId}/seasons/${seasonId}/episodes/${episodeId}`).catch(() => {});
    await loadSeriesDetail(seriesId);
  }

  function openEditEp(ep: EpisodeRow) {
    setEditingEpId(ep.id);
    setEditEpForm({ title: ep.title, description: ep.description || '' });
    setEditEpThumbFile(null);
    setEditEpVideoFile(null);
    setEditEpThumbPreview(null);
    setAddingEpTo(null);
  }

  async function handleUpdateEpisode(seriesId: string, seasonId: string, episodeId: string) {
    if (!editEpForm.title.trim()) { alert('Title is required'); return; }
    setEditEpSaving(true);
    try {
      await api.patch(`/series/${seriesId}/seasons/${seasonId}/episodes/${episodeId}`, {
        title: editEpForm.title.trim(),
        description: editEpForm.description || null,
      });
      if (editEpThumbFile) {
        const fd = new FormData(); fd.append('thumbnail', editEpThumbFile);
        await api.patch(`/series/${seriesId}/seasons/${seasonId}/episodes/${episodeId}/thumbnail`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        }).catch(() => {});
      }
      if (editEpVideoFile) {
        const fd = new FormData(); fd.append('video', editEpVideoFile);
        await api.patch(`/series/${seriesId}/seasons/${seasonId}/episodes/${episodeId}/video`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        }).catch(() => {});
      }
      setEditingEpId(null);
      await loadSeriesDetail(seriesId);
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to update episode');
    } finally {
      setEditEpSaving(false);
    }
  }

  function fmtDur(s: number | null) {
    if (!s) return '';
    const m = Math.floor(s / 60); const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  }

  const seriesFormJsx = (
    <div className="bg-surface-900 border border-surface-700 rounded-2xl p-6 space-y-4">
      <h3 className="text-white font-semibold text-sm">{editSeries ? 'Edit Series' : 'New Series'}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Title *</label>
          <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Series title"
            className="w-full bg-surface-800 border border-surface-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Status</label>
          <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            className="w-full bg-surface-800 border border-surface-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400">
            <option value="ACTIVE">Ongoing</option>
            <option value="ENDED">Complete</option>
            <option value="HIATUS">On Hiatus</option>
            <option value="UPCOMING">Upcoming</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Visibility</label>
          <select value={form.privacy} onChange={(e) => setForm((f) => ({ ...f, privacy: e.target.value }))}
            className="w-full bg-surface-800 border border-surface-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400">
            <option value="PUBLIC">Public</option>
            <option value="SUBSCRIBERS_ONLY">Members Only</option>
            <option value="PRIVATE">Private (Admin only)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Genre</label>
          <input value={form.genre} onChange={(e) => setForm((f) => ({ ...f, genre: e.target.value }))} placeholder="e.g. Drama, Documentary"
            className="w-full bg-surface-800 border border-surface-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Tags (comma-separated)</label>
          <input value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} placeholder="reggae, motivation"
            className="w-full bg-surface-800 border border-surface-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Description</label>
          <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} placeholder="Optional description"
            className="w-full bg-surface-800 border border-surface-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400 resize-none" />
        </div>

        {/* Cover image */}
        <div className="sm:col-span-2">
          <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">
            Cover Image <span className="font-normal normal-case text-gray-600">— optional</span>
          </label>
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-xl bg-surface-700 border border-surface-600 overflow-hidden flex items-center justify-center flex-shrink-0">
              {coverPreview || editSeries?.coverUrl
                ? <img src={coverPreview || editSeries?.coverUrl || ''} alt="" className="w-full h-full object-cover" />
                : <span className="text-2xl opacity-30">🖼</span>
              }
            </div>
            <div className="space-y-1.5">
              <label className="cursor-pointer inline-block px-4 py-2 bg-surface-700 border border-surface-600 text-gray-300 rounded-xl text-sm hover:bg-surface-600 transition-colors">
                {pendingCoverFile ? pendingCoverFile.name : 'Choose image'}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setPendingCoverFile(f);
                    setCoverPreview(URL.createObjectURL(f));
                  }} />
              </label>
              {uploadProg.cover !== undefined && uploadProg.cover < 100 && (
                <div className="w-40 h-1.5 bg-surface-600 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-500 transition-all" style={{ width: `${uploadProg.cover}%` }} />
                </div>
              )}
              <p className="text-xs text-gray-600">JPEG, PNG or WebP · max 8 MB</p>
            </div>
          </div>
        </div>

        {/* Trailer video */}
        <div className="sm:col-span-2">
          <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">
            Trailer / Promo Video <span className="font-normal normal-case text-gray-600">— optional</span>
          </label>
          <div className="flex items-center gap-4 flex-wrap">
            <label className="cursor-pointer inline-block px-4 py-2 bg-surface-700 border border-surface-600 text-gray-300 rounded-xl text-sm hover:bg-surface-600 transition-colors">
              {pendingTrailerFile ? pendingTrailerFile.name : (editSeries?.trailerUrl ? 'Replace trailer' : 'Choose video')}
              <input type="file" accept="video/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) setPendingTrailerFile(f); }} />
            </label>
            {editSeries?.trailerUrl && !pendingTrailerFile && (() => {
              // Extract original filename from R2 URL path: strip timestamp prefix (digits-)
              const raw = editSeries.trailerUrl!.split('?')[0].split('/').pop() ?? '';
              const name = raw.replace(/^\d+-/, '');
              return (
                <span className="text-xs text-green-500 flex items-center gap-1">
                  <span>✓</span>
                  <span className="truncate max-w-[200px]" title={name}>{name}</span>
                </span>
              );
            })()}
            {uploadProg.trailer !== undefined && uploadProg.trailer < 100 && (
              <div className="flex items-center gap-2">
                <div className="w-32 h-1.5 bg-surface-600 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-500 transition-all" style={{ width: `${uploadProg.trailer}%` }} />
                </div>
                <span className="text-xs text-gray-400">{uploadProg.trailer}%</span>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-600 mt-1">MP4, WebM, MOV, AVI, MKV · max 500 MB</p>
        </div>

      </div>
      {uploadError && (
        <p className="text-red-400 text-sm">{uploadError}</p>
      )}
      <div className="flex gap-3 pt-2">
        <button onClick={editSeries ? handleUpdate : handleCreate} disabled={saving || !form.title.trim()}
          className="px-5 py-2 bg-brand-500 text-black rounded-xl text-sm font-bold hover:bg-brand-400 disabled:opacity-50 transition-colors">
          {saving ? 'Saving…' : editSeries ? 'Save Changes' : 'Create Series'}
        </button>
        <button onClick={() => { setShowCreate(false); setEditSeries(null); resetForm(); }}
          className="px-5 py-2 bg-surface-700 text-gray-300 rounded-xl text-sm hover:bg-surface-600 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Series</h2>
          <p className="text-gray-500 text-sm">{seriesList.length} series · manage seasons &amp; episodes</p>
        </div>
        <button onClick={() => { setShowCreate(true); setEditSeries(null); resetForm(); }}
          className="px-4 py-2 bg-brand-500 text-black rounded-xl text-sm font-bold hover:bg-brand-400 transition-colors">
          + New Series
        </button>
      </div>

      {showCreate && !editSeries && seriesFormJsx}

      {editSeries && (
        <div className="space-y-4">
          {seriesFormJsx}

          {/* Season management */}
          <div className="bg-surface-900 border border-surface-700 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold text-sm">Seasons — {editSeries.title}</h3>
              <button
                onClick={() => setAddingSeasonTo(addingSeasonTo === editSeries.id ? null : editSeries.id)}
                className="text-xs px-3 py-1.5 bg-brand-500/20 text-brand-400 rounded-lg hover:bg-brand-500/30 transition-colors"
              >
                + Add Season
              </button>
            </div>

            {addingSeasonTo === editSeries.id && (
              <div className="space-y-3 bg-surface-800 border border-surface-700 rounded-xl p-4">
                <div className="flex gap-2 items-end">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Season #</label>
                    <input type="number" min="1" value={newSeasonNum} onChange={(e) => setNewSeasonNum(e.target.value)} placeholder="1"
                      className="w-20 bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 block mb-1">Title (optional)</label>
                    <input value={newSeasonTitle} onChange={(e) => setNewSeasonTitle(e.target.value)} placeholder="e.g. The Beginning"
                      className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400" />
                  </div>
                </div>
                {/* Season cover image */}
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">Cover Image <span className="text-gray-600 font-normal">(optional)</span></label>
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-20 rounded-lg bg-surface-700 border border-surface-600 overflow-hidden flex items-center justify-center flex-shrink-0">
                      {newSeasonCoverPreview
                        ? <img src={newSeasonCoverPreview} alt="" className="w-full h-full object-cover" />
                        : <span className="text-xl opacity-30">🎬</span>
                      }
                    </div>
                    <label className="cursor-pointer px-3 py-1.5 bg-surface-700 border border-surface-600 text-gray-300 rounded-lg text-xs hover:bg-surface-600 transition-colors">
                      {newSeasonCoverFile ? newSeasonCoverFile.name : 'Choose image'}
                      <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          setNewSeasonCoverFile(f);
                          setNewSeasonCoverPreview(URL.createObjectURL(f));
                        }} />
                    </label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => handleAddSeason(editSeries.id)}
                    className="px-4 py-2 bg-brand-500 text-black rounded-lg text-sm font-bold hover:bg-brand-400 transition-colors">
                    Add Season
                  </button>
                  <button type="button" onClick={() => { setAddingSeasonTo(null); setNewSeasonNum(''); setNewSeasonTitle(''); setNewSeasonCoverFile(null); setNewSeasonCoverPreview(null); }}
                    className="px-3 py-2 bg-surface-700 text-gray-400 rounded-lg text-sm hover:bg-surface-600 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {!editSeries.seasons ? (
              <p className="text-gray-600 text-sm text-center py-4 animate-pulse">Loading seasons…</p>
            ) : editSeries.seasons.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-4">No seasons yet. Add one above.</p>
            ) : (
              <div className="space-y-3">
                {editSeries.seasons.map((season) => (
                  <div key={season.id} className="border border-surface-700 rounded-xl overflow-hidden">
                    {/* Season header */}
                    <div className="flex items-center gap-3 px-4 py-3 bg-surface-800">
                      <div className="w-8 h-11 rounded bg-surface-700 border border-surface-600 overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {season.coverUrl
                          ? <img src={season.coverUrl} alt="" className="w-full h-full object-cover" />
                          : <span className="text-xs opacity-30">🎬</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium">{season.title || `Season ${season.number}`}</p>
                        <p className="text-gray-600 text-xs">{season.episodes?.length ?? season._count?.episodes ?? 0} episodes</p>
                      </div>
                      <button type="button"
                        onClick={() => { setAddingEpTo(addingEpTo === season.id ? null : season.id); resetEpForm(); }}
                        className="text-xs px-2 py-1 bg-brand-500/20 text-brand-400 rounded-lg hover:bg-brand-500/30 transition-colors"
                      >
                        + Add Episode
                      </button>
                      <button type="button"
                        onClick={() => handleDeleteSeason(editSeries.id, season.id)}
                        className="text-xs px-2 py-1 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
                      >
                        Delete
                      </button>
                    </div>

                    {/* Add episode form */}
                    {addingEpTo === season.id && (
                      <div className="px-4 py-4 border-t border-surface-700 space-y-3 bg-surface-900/50">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">New Episode</p>
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Title *</label>
                          <input value={epForm.title} onChange={(e) => setEpForm((f) => ({ ...f, title: e.target.value }))}
                            placeholder="Episode title" autoFocus
                            className="w-full bg-surface-800 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Description <span className="text-gray-600 font-normal">(optional)</span></label>
                          <textarea value={epForm.description} onChange={(e) => setEpForm((f) => ({ ...f, description: e.target.value }))}
                            placeholder="Short description…" rows={2}
                            className="w-full bg-surface-800 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400 resize-none" />
                        </div>
                        <div className="flex gap-4 flex-wrap">
                          {/* Thumbnail */}
                          <div>
                            <label className="text-xs text-gray-500 block mb-1.5">Thumbnail <span className="text-gray-600 font-normal">(optional)</span></label>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-10 rounded bg-surface-700 border border-surface-600 overflow-hidden flex items-center justify-center flex-shrink-0">
                                {epThumbnailPreview
                                  ? <img src={epThumbnailPreview} alt="" className="w-full h-full object-cover" />
                                  : <span className="text-sm opacity-30">🖼</span>
                                }
                              </div>
                              <label className="cursor-pointer px-3 py-1.5 bg-surface-700 border border-surface-600 text-gray-300 rounded-lg text-xs hover:bg-surface-600 transition-colors">
                                {epThumbnailFile ? epThumbnailFile.name.slice(0, 18) : 'Choose'}
                                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (!f) return;
                                    setEpThumbnailFile(f);
                                    setEpThumbnailPreview(URL.createObjectURL(f));
                                  }} />
                              </label>
                            </div>
                          </div>
                          {/* Video */}
                          <div>
                            <label className="text-xs text-gray-500 block mb-1.5">Video File <span className="text-gray-600 font-normal">(optional)</span></label>
                            <div className="flex items-center gap-2">
                              <label className="cursor-pointer px-3 py-1.5 bg-surface-700 border border-surface-600 text-gray-300 rounded-lg text-xs hover:bg-surface-600 transition-colors">
                                {epVideoFile ? epVideoFile.name.slice(0, 22) : 'Choose video'}
                                <input type="file" accept="video/*" className="hidden"
                                  onChange={(e) => { const f = e.target.files?.[0]; if (f) setEpVideoFile(f); }} />
                              </label>
                              {epVideoFile && <span className="text-xs text-green-500">✓ {(epVideoFile.size / 1024 / 1024).toFixed(0)} MB</span>}
                            </div>
                          </div>
                        </div>
                        {/* Upload progress */}
                        {(epUploadProg.thumb !== undefined || epUploadProg.video !== undefined) && (
                          <div className="space-y-1">
                            {epUploadProg.thumb !== undefined && epUploadProg.thumb < 100 && (
                              <div className="flex items-center gap-2 text-xs text-gray-400">
                                <span>Thumbnail</span>
                                <div className="flex-1 h-1 bg-surface-600 rounded-full overflow-hidden">
                                  <div className="h-full bg-brand-500" style={{ width: `${epUploadProg.thumb}%` }} />
                                </div>
                                <span>{epUploadProg.thumb}%</span>
                              </div>
                            )}
                            {epUploadProg.video !== undefined && epUploadProg.video < 100 && (
                              <div className="flex items-center gap-2 text-xs text-gray-400">
                                <span>Video</span>
                                <div className="flex-1 h-1 bg-surface-600 rounded-full overflow-hidden">
                                  <div className="h-full bg-brand-500" style={{ width: `${epUploadProg.video}%` }} />
                                </div>
                                <span>{epUploadProg.video}%</span>
                              </div>
                            )}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button type="button" onClick={() => handleAddEpisode(editSeries.id, season.id)} disabled={epSaving || !epForm.title.trim()}
                            className="px-4 py-2 bg-brand-500 text-black rounded-lg text-sm font-bold hover:bg-brand-400 disabled:opacity-50 transition-colors">
                            {epSaving ? 'Saving…' : 'Save Episode'}
                          </button>
                          <button type="button" onClick={() => { setAddingEpTo(null); resetEpForm(); }}
                            className="px-3 py-2 bg-surface-700 text-gray-400 rounded-lg text-sm hover:bg-surface-600 transition-colors">
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Episode list — always visible */}
                    <div className="border-t border-surface-700">
                        {!season.episodes || season.episodes.length === 0 ? (
                          <p className="text-gray-600 text-xs text-center py-4">No episodes yet.</p>
                        ) : (
                          <div>
                            {season.episodes.map((ep) => (
                              <div key={ep.id}>
                                {/* Episode row */}
                                <div className="flex items-center gap-3 px-4 py-2.5 border-b border-surface-700/50 group">
                                  <span className="text-gray-600 text-xs w-5 text-center flex-shrink-0">{ep.episodeNumber}</span>
                                  <div className="w-14 h-8 rounded bg-surface-700 border border-surface-600 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                    {(editingEpId === ep.id ? editEpThumbPreview : null) || ep.thumbnailUrl
                                      ? <img src={editEpThumbPreview && editingEpId === ep.id ? editEpThumbPreview : ep.thumbnailUrl!} alt="" className="w-full h-full object-cover" />
                                      : <span className="text-xs opacity-30">🎬</span>
                                    }
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white truncate">{ep.title}</p>
                                    <p className="text-xs text-gray-500">
                                      {ep.mediaUrl ? '✓ video' : 'no video'}
                                      {fmtDur(ep.duration) ? ` · ${fmtDur(ep.duration)}` : ''}
                                    </p>
                                  </div>
                                  <button type="button" onClick={() => editingEpId === ep.id ? setEditingEpId(null) : openEditEp(ep)}
                                    className="opacity-0 group-hover:opacity-100 text-xs text-brand-400 hover:text-brand-300 transition-all">
                                    {editingEpId === ep.id ? 'Close' : 'Edit'}
                                  </button>
                                  <button type="button" onClick={() => handleRemoveEpisode(editSeries.id, season.id, ep.id)}
                                    className="opacity-0 group-hover:opacity-100 text-xs text-red-400 hover:text-red-300 transition-all">
                                    Remove
                                  </button>
                                </div>

                                {/* Inline edit panel */}
                                {editingEpId === ep.id && (
                                  <div className="px-4 py-4 border-b border-surface-700 space-y-3 bg-surface-900/60">
                                    <div>
                                      <label className="text-xs text-gray-500 block mb-1">Title *</label>
                                      <input value={editEpForm.title} onChange={(e) => setEditEpForm((f) => ({ ...f, title: e.target.value }))}
                                        className="w-full bg-surface-800 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400" />
                                    </div>
                                    <div>
                                      <label className="text-xs text-gray-500 block mb-1">Description</label>
                                      <textarea value={editEpForm.description} onChange={(e) => setEditEpForm((f) => ({ ...f, description: e.target.value }))}
                                        rows={2} placeholder="Optional description…"
                                        className="w-full bg-surface-800 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400 resize-none" />
                                    </div>
                                    <div className="flex gap-4 flex-wrap">
                                      <div>
                                        <label className="text-xs text-gray-500 block mb-1.5">Replace Thumbnail</label>
                                        <div className="flex items-center gap-2">
                                          <div className="w-16 h-10 rounded bg-surface-700 border border-surface-600 overflow-hidden flex items-center justify-center flex-shrink-0">
                                            {editEpThumbPreview
                                              ? <img src={editEpThumbPreview} alt="" className="w-full h-full object-cover" />
                                              : ep.thumbnailUrl
                                              ? <img src={ep.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                                              : <span className="text-sm opacity-30">🖼</span>
                                            }
                                          </div>
                                          <label className="cursor-pointer px-3 py-1.5 bg-surface-700 border border-surface-600 text-gray-300 rounded-lg text-xs hover:bg-surface-600 transition-colors">
                                            {editEpThumbFile ? editEpThumbFile.name.slice(0, 16) : 'Choose'}
                                            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                                              onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; setEditEpThumbFile(f); setEditEpThumbPreview(URL.createObjectURL(f)); }} />
                                          </label>
                                        </div>
                                      </div>
                                      <div>
                                        <label className="text-xs text-gray-500 block mb-1.5">{ep.mediaUrl ? 'Replace Video' : 'Upload Video'}</label>
                                        <div className="flex items-center gap-2">
                                          <label className="cursor-pointer px-3 py-1.5 bg-surface-700 border border-surface-600 text-gray-300 rounded-lg text-xs hover:bg-surface-600 transition-colors">
                                            {editEpVideoFile ? editEpVideoFile.name.slice(0, 20) : 'Choose video'}
                                            <input type="file" accept="video/*" className="hidden"
                                              onChange={(e) => { const f = e.target.files?.[0]; if (f) setEditEpVideoFile(f); }} />
                                          </label>
                                          {editEpVideoFile && <span className="text-xs text-green-500">✓ {(editEpVideoFile.size / 1024 / 1024).toFixed(0)} MB</span>}
                                          {ep.mediaUrl && !editEpVideoFile && <span className="text-xs text-green-500">✓ uploaded</span>}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <button type="button" onClick={() => handleUpdateEpisode(editSeries.id, season.id, ep.id)} disabled={editEpSaving || !editEpForm.title.trim()}
                                        className="px-4 py-2 bg-brand-500 text-black rounded-lg text-sm font-bold hover:bg-brand-400 disabled:opacity-50 transition-colors">
                                        {editEpSaving ? 'Saving…' : 'Save Changes'}
                                      </button>
                                      <button type="button" onClick={() => setEditingEpId(null)}
                                        className="px-3 py-2 bg-surface-700 text-gray-400 rounded-lg text-sm hover:bg-surface-600 transition-colors">
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Series list */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-20 bg-surface-800 rounded-2xl animate-pulse" />)}</div>
      ) : seriesList.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-3">📺</p>
          <p>No series yet. Create your first one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {seriesList.map((s) => (
            <div key={s.id} className="bg-surface-800 border border-surface-700 rounded-2xl overflow-hidden">
              {/* Thumbnail — full width */}
              <div className="w-full aspect-video bg-surface-700 overflow-hidden">
                {s.coverUrl
                  ? <img src={s.coverUrl} alt={s.title} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-4xl opacity-20">📺</div>
                }
              </div>
              {/* Info + actions below image */}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.status === 'ACTIVE' ? 'bg-green-500/15 text-green-400' : 'bg-surface-700 text-gray-500'}`}>
                    {s.status.toLowerCase()}
                  </span>
                  {s.privacy !== 'PUBLIC' && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500">
                      {s.privacy.replace('_', ' ').toLowerCase()}
                    </span>
                  )}
                </div>
                <p className="text-white font-bold text-base leading-snug mb-1">{s.title}</p>
                <p className="text-gray-500 text-sm mb-4">
                  {s._count.seasons} season{s._count.seasons !== 1 ? 's' : ''}
                  {s.genre && ` · ${s.genre}`}
                </p>
                <div className="flex gap-2">
                  <a href={`/series/${s.id}`} target="_blank" rel="noreferrer"
                    className="flex-1 text-center text-sm py-2.5 bg-surface-700 text-gray-300 rounded-xl hover:bg-surface-600 transition-colors font-semibold">
                    View
                  </a>
                  <button onClick={() => openEdit(s)}
                    className="flex-1 text-sm py-2.5 bg-brand-500/20 text-brand-400 rounded-xl hover:bg-brand-500/30 transition-colors font-bold">
                    Edit
                  </button>
                  <button onClick={() => handleDeleteSeries(s.id)}
                    className="flex-1 text-sm py-2.5 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20 transition-colors font-semibold">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Albums Tab ────────────────────────────────────────────────────────────────

interface AlbumRow {
  id: string; title: string; description: string | null; coverUrl: string | null;
  releaseDate: string | null; genre: string | null; privacy: string; releaseType: string;
  creator: { username: string; displayName: string | null };
  _count: { tracks: number };
}

interface AlbumTrackRow {
  albumId: string; contentId: string; trackNumber: number; discNumber: number;
  content: { id: string; title: string; duration: number | null; thumbnailUrl: string | null; mediaUrl: string | null; privacy: string; status: string; views: number; creator: { username: string; displayName: string | null } };
}

interface MusicContent {
  id: string; title: string; duration: number | null;
  creator: { username: string; displayName: string | null };
}

function AlbumsTab() {
  const [albums, setAlbums]             = useState<AlbumRow[]>([]);
  const [loading, setLoading]           = useState(true);
  const [editAlbum, setEditAlbum]       = useState<AlbumRow | null>(null);
  const [tracks, setTracks]             = useState<AlbumTrackRow[]>([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [musicSearch, setMusicSearch]   = useState('');
  const [musicResults, setMusicResults] = useState<MusicContent[]>([]);
  const [showCreate, setShowCreate]     = useState(false);
  const [saving, setSaving]             = useState(false);
  const [coverFile, setCoverFile]       = useState<File | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [newTrackForm, setNewTrackForm] = useState<{ title: string; description: string; duration: string; privacy: string; discNumber: string } | null>(null);
  const [newTrackArt, setNewTrackArt]   = useState<File | null>(null);
  const newTrackArtRef = useRef<HTMLInputElement>(null);
  const [addingTrack, setAddingTrack]   = useState(false);
  const [editingTrack, setEditingTrack] = useState<AdminContent | null>(null);

  const [form, setForm] = useState({ title: '', description: '', releaseDate: '', genre: '', privacy: 'PUBLIC', releaseType: 'ALBUM' });

  function resetForm() { setForm({ title: '', description: '', releaseDate: '', genre: '', privacy: 'PUBLIC', releaseType: 'ALBUM' }); setCoverFile(null); }

  useEffect(() => {
    api.get('/albums').then((r) => setAlbums(r.data.albums)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!editAlbum) return;
    setTracksLoading(true);
    api.get(`/albums/${editAlbum.id}`).then((r) => setTracks(r.data.album.tracks)).catch(() => {}).finally(() => setTracksLoading(false));
  }, [editAlbum]);

  useEffect(() => {
    if (!musicSearch.trim()) { setMusicResults([]); return; }
    const t = setTimeout(() => {
      api.get('/content', { params: { type: 'MUSIC', search: musicSearch, limit: 10 } })
        .then((r) => setMusicResults(r.data.content || r.data.items || []))
        .catch(() => {});
    }, 350);
    return () => clearTimeout(t);
  }, [musicSearch]);

  async function handleCreate() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const r = await api.post('/albums', { ...form, releaseDate: form.releaseDate || null, description: form.description || null, genre: form.genre || null, releaseType: form.releaseType });
      const created = r.data.album;
      if (coverFile) {
        const fd = new FormData(); fd.append('cover', coverFile);
        const cr = await api.post(`/albums/${created.id}/cover`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        created.coverUrl = cr.data.coverUrl;
      }
      setAlbums((prev) => [created, ...prev]);
      setShowCreate(false); resetForm();
      openEdit(created);
    } catch { } finally { setSaving(false); }
  }

  async function handleUpdate() {
    if (!editAlbum) return;
    setSaving(true);
    try {
      await api.patch(`/albums/${editAlbum.id}`, { ...form, releaseDate: form.releaseDate || null, description: form.description || null, genre: form.genre || null });
      if (coverFile) {
        const fd = new FormData(); fd.append('cover', coverFile);
        await api.post(`/albums/${editAlbum.id}/cover`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      const r = await api.get('/albums');
      setAlbums(r.data.albums);
      setEditAlbum(null); resetForm();
    } catch { } finally { setSaving(false); }
  }

  async function handleAddTrack(content: MusicContent) {
    if (!editAlbum) return;
    const nextNum = tracks.length + 1;
    try {
      const r = await api.post(`/albums/${editAlbum.id}/tracks`, { contentId: content.id, trackNumber: nextNum, discNumber: 1 });
      setTracks((prev) => [...prev, r.data.track]);
      setMusicSearch(''); setMusicResults([]);
    } catch { }
  }

  async function handleRemoveTrack(contentId: string) {
    if (!editAlbum) return;
    await api.delete(`/albums/${editAlbum.id}/tracks/${contentId}`).catch(() => {});
    setTracks((prev) => prev.filter((t) => t.contentId !== contentId));
  }

  async function handleDelete(albumId: string) {
    if (!confirm('Delete this album? Tracks are not deleted, only the grouping.')) return;
    await api.delete(`/albums/${albumId}`).catch(() => {});
    setAlbums((prev) => prev.filter((a) => a.id !== albumId));
    if (editAlbum?.id === albumId) setEditAlbum(null);
  }

  function openEdit(album: AlbumRow) {
    setEditAlbum(album);
    setForm({ title: album.title, description: album.description || '', releaseDate: album.releaseDate ? album.releaseDate.slice(0, 10) : '', genre: album.genre || '', privacy: album.privacy, releaseType: album.releaseType || 'ALBUM' });
    setCoverFile(null);
    setShowCreate(false);
  }

  async function openTrackEdit(contentId: string) {
    try {
      const { data } = await api.get(`/content/${contentId}`);
      const c = data.content;
      setEditingTrack({
        id: c.id, title: c.title, description: c.description || '', type: c.type,
        status: c.status, privacy: c.privacy, views: c.views ?? 0, createdAt: c.createdAt ?? '',
        mediaUrl: c.mediaUrl ?? null, thumbnailUrl: c.thumbnailUrl ?? null,
        tags: c.tags ?? [], featured: c.featured ?? false,
        creator: { username: c.creator?.username ?? '', email: c.creator?.email ?? '' },
        _count: { likes: c._count?.likes ?? 0, comments: c._count?.comments ?? 0 },
        credits: c.credits ?? [],
      });
    } catch {}
  }

  async function handleCreateTrack() {
    if (!newTrackForm?.title.trim() || !editAlbum) return;
    setAddingTrack(true);
    try {
      const fd = new FormData();
      fd.append('title', newTrackForm.title.trim());
      if (newTrackForm.description.trim()) fd.append('description', newTrackForm.description.trim());
      if (newTrackForm.duration.trim()) {
        const parts = newTrackForm.duration.trim().split(':');
        const secs = parts.length === 2 ? Number(parts[0]) * 60 + Number(parts[1]) : Number(parts[0]);
        if (!isNaN(secs) && secs > 0) fd.append('duration', String(secs));
      }
      fd.append('privacy', newTrackForm.privacy);
      fd.append('discNumber', newTrackForm.discNumber || '1');
      fd.append('trackNumber', String(tracks.length + 1));
      if (newTrackArt) fd.append('thumbnail', newTrackArt);
      const r = await api.post(`/albums/${editAlbum.id}/tracks/create`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const newTrack = r.data.track;
      setTracks((prev) => [...prev, newTrack]);
      setNewTrackForm(null);
      setNewTrackArt(null);
      openTrackEdit(newTrack.contentId);
    } catch {} finally { setAddingTrack(false); }
  }

  function fmtDur(s: number | null) {
    if (!s) return '';
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  const AlbumForm = () => (
    <div className="bg-surface-900 border border-surface-700 rounded-2xl p-6 space-y-4">
      <h3 className="text-white font-semibold text-sm">{editAlbum ? 'Edit Album' : 'New Album'}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Release Type</label>
          <select value={form.releaseType} onChange={(e) => setForm((f) => ({ ...f, releaseType: e.target.value }))}
            className="w-full bg-surface-800 border border-surface-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400">
            <option value="SINGLE">Single</option>
            <option value="EP">EP</option>
            <option value="ALBUM">Album</option>
            <option value="COMPILATION">Compilation</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Title *</label>
          <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Title"
            className="w-full bg-surface-800 border border-surface-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Genre</label>
          <select value={form.genre} onChange={(e) => setForm((f) => ({ ...f, genre: e.target.value }))}
            className="w-full bg-surface-800 border border-surface-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400">
            <option value="">Select genre…</option>
            <option>Acoustic</option>
            <option>Afrobeats</option>
            <option>Afro-Pop</option>
            <option>Alternative</option>
            <option>Alternative R&amp;B</option>
            <option>Ambient</option>
            <option>Americana</option>
            <option>Blues</option>
            <option>Bluegrass</option>
            <option>Boom Bap</option>
            <option>Calypso</option>
            <option>Children's Music</option>
            <option>Chillhop</option>
            <option>Christian / Gospel</option>
            <option>Christian Hip-Hop</option>
            <option>Classical</option>
            <option>Comedy / Spoken Word</option>
            <option>Contemporary Gospel</option>
            <option>Contemporary R&amp;B</option>
            <option>Country</option>
            <option>Dance</option>
            <option>Dancehall</option>
            <option>Dark Ambient</option>
            <option>Deep House</option>
            <option>Disco</option>
            <option>Drill</option>
            <option>Drum &amp; Bass</option>
            <option>Dubstep</option>
            <option>EDM</option>
            <option>Electronic</option>
            <option>Experimental</option>
            <option>Folk</option>
            <option>Funk</option>
            <option>Future Bass</option>
            <option>Garage</option>
            <option>Gospel</option>
            <option>Gospel Rap</option>
            <option>Grime</option>
            <option>Grunge</option>
            <option>Hard Rock</option>
            <option>Heavy Metal</option>
            <option>Hip-Hop</option>
            <option>House</option>
            <option>Indie</option>
            <option>Indie Pop</option>
            <option>Indie Rock</option>
            <option>Inspirational</option>
            <option>Instrumental</option>
            <option>JaFolk Mix</option>
            <option>Jazz</option>
            <option>Jazz Fusion</option>
            <option>K-Pop</option>
            <option>Kumina</option>
            <option>Latin</option>
            <option>Lo-Fi</option>
            <option>Lo-Fi Hip-Hop</option>
            <option>Lovers Rock</option>
            <option>Melodic Rap</option>
            <option>Mento</option>
            <option>Metal</option>
            <option>Motivational / Spoken Word</option>
            <option>Motown</option>
            <option>Musical Theatre</option>
            <option>Neo-Soul</option>
            <option>New Age</option>
            <option>Nyabinghi</option>
            <option>Oldies</option>
            <option>Opera</option>
            <option>Orchestral</option>
            <option>Piano</option>
            <option>Pocomania</option>
            <option>Pop</option>
            <option>Pop Punk</option>
            <option>Pop Rap</option>
            <option>Progressive Rock</option>
            <option>Psychedelic</option>
            <option>Punk</option>
            <option>Punk Rock</option>
            <option>Quiet Storm</option>
            <option>R&amp;B / Soul</option>
            <option>Ragga</option>
            <option>Rap</option>
            <option>Reggae</option>
            <option>Reggae Fusion</option>
            <option>Reggaeton</option>
            <option>Revival Zion</option>
            <option>Rock</option>
            <option>Rocksteady</option>
            <option>Roots</option>
            <option>Roots Reggae</option>
            <option>Rub-A-Dub</option>
            <option>Sacred / Worship</option>
            <option>Singer-Songwriter</option>
            <option>Ska</option>
            <option>Smooth Jazz</option>
            <option>Soft Rock</option>
            <option>Soca</option>
            <option>Soul</option>
            <option>Soundtrack / Score</option>
            <option>Southern Hip-Hop</option>
            <option>Spiritual</option>
            <option>Spoken Word</option>
            <option>Swing</option>
            <option>Techno</option>
            <option>Trap</option>
            <option>Trap Soul</option>
            <option>Trip-Hop</option>
            <option>Tropical</option>
            <option>Urban Gospel</option>
            <option>World Music</option>
            <option>Worship</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Release Date</label>
          <input type="date" value={form.releaseDate} onChange={(e) => setForm((f) => ({ ...f, releaseDate: e.target.value }))}
            className="w-full bg-surface-800 border border-surface-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Visibility</label>
          <select value={form.privacy} onChange={(e) => setForm((f) => ({ ...f, privacy: e.target.value }))}
            className="w-full bg-surface-800 border border-surface-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400">
            <option value="PUBLIC">Public</option>
            <option value="SUBSCRIBERS_ONLY">Subscribers Only</option>
            <option value="PRIVATE">Private (Admin only)</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Description</label>
          <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} placeholder="Optional description"
            className="w-full bg-surface-800 border border-surface-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400 resize-none" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Cover Art</label>
          <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
          <div className="flex items-center gap-3">
            <button onClick={() => coverInputRef.current?.click()}
              className="w-16 h-16 bg-surface-700 rounded-xl overflow-hidden flex items-center justify-center text-2xl flex-shrink-0 hover:ring-2 hover:ring-brand-400 transition-all">
              {coverFile
                ? <img src={URL.createObjectURL(coverFile)} alt="" className="w-full h-full object-cover" />
                : editAlbum?.coverUrl
                  ? <img src={editAlbum.coverUrl} alt="" className="w-full h-full object-cover" />
                  : '🎵'}
            </button>
            <button onClick={() => coverInputRef.current?.click()}
              className="px-4 py-2 bg-surface-800 border border-surface-600 text-gray-400 rounded-xl text-sm hover:border-surface-400 transition-colors">
              {coverFile ? coverFile.name : editAlbum?.coverUrl ? 'Replace cover' : 'Choose image…'}
            </button>
            {coverFile && (
              <button onClick={() => setCoverFile(null)} className="text-red-500 text-xs hover:text-red-400 transition-colors">Remove</button>
            )}
          </div>
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={editAlbum ? handleUpdate : handleCreate} disabled={saving || !form.title.trim()}
          className="px-5 py-2 bg-brand-500 text-black rounded-xl text-sm font-bold hover:bg-brand-400 disabled:opacity-50 transition-colors">
          {saving ? 'Saving…' : editAlbum ? 'Save Changes' : 'Create Album'}
        </button>
        <button onClick={() => { setShowCreate(false); setEditAlbum(null); resetForm(); }}
          className="px-5 py-2 bg-surface-700 text-gray-300 rounded-xl text-sm hover:bg-surface-600 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Albums</h2>
          <p className="text-gray-500 text-sm">{albums.length} album{albums.length !== 1 ? 's' : ''} · manage tracklists and artwork</p>
        </div>
        <button onClick={() => { setShowCreate(true); setEditAlbum(null); resetForm(); }}
          className="px-4 py-2 bg-brand-500 text-black rounded-xl text-sm font-bold hover:bg-brand-400 transition-colors">
          + New Album
        </button>
      </div>

      {(showCreate && !editAlbum) && AlbumForm()}

      {editAlbum && (
        <div className="space-y-4">
          {AlbumForm()}

          {/* Track management */}
          <div className="bg-surface-900 border border-surface-700 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-semibold text-sm">Tracklist — {editAlbum.title}</h3>
                <p className="text-gray-600 text-xs mt-0.5">{tracks.length} track{tracks.length !== 1 ? 's' : ''} · no limit</p>
              </div>
              {!newTrackForm && (
                <button
                  onClick={() => setNewTrackForm({ title: '', description: '', duration: '', privacy: 'PUBLIC', discNumber: '1' })}
                  className="text-xs px-3 py-1.5 bg-brand-500/20 text-brand-400 rounded-lg hover:bg-brand-500/30 transition-colors font-semibold"
                >
                  + Add Track
                </button>
              )}
            </div>

            {/* New track form */}
            {newTrackForm && (
              <div className="bg-surface-800 border border-brand-500/30 rounded-2xl p-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-brand-500">New Track</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Title *</label>
                    <input
                      value={newTrackForm.title}
                      onChange={(e) => setNewTrackForm((t) => t && { ...t, title: e.target.value })}
                      placeholder="Track title"
                      className="w-full bg-surface-700 border border-surface-600 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Duration</label>
                    <input
                      value={newTrackForm.duration}
                      onChange={(e) => setNewTrackForm((t) => t && { ...t, duration: e.target.value })}
                      placeholder="e.g. 3:45"
                      className="w-full bg-surface-700 border border-surface-600 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400"
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="w-24">
                      <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Disc #</label>
                      <input
                        value={newTrackForm.discNumber}
                        onChange={(e) => setNewTrackForm((t) => t && { ...t, discNumber: e.target.value })}
                        placeholder="1"
                        className="w-full bg-surface-700 border border-surface-600 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Visibility</label>
                      <select
                        value={newTrackForm.privacy}
                        onChange={(e) => setNewTrackForm((t) => t && { ...t, privacy: e.target.value })}
                        className="w-full bg-surface-700 border border-surface-600 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400"
                      >
                        <option value="PUBLIC">Public</option>
                        <option value="SUBSCRIBERS_ONLY">Members Only</option>
                      </select>
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Description / Lyrics / Notes</label>
                    <textarea
                      value={newTrackForm.description}
                      onChange={(e) => setNewTrackForm((t) => t && { ...t, description: e.target.value })}
                      placeholder="Optional — lyrics, production credits, notes…"
                      rows={3}
                      className="w-full bg-surface-700 border border-surface-600 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400 resize-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Track Artwork</label>
                    <input ref={newTrackArtRef} type="file" accept="image/*" className="hidden"
                      onChange={(e) => setNewTrackArt(e.target.files?.[0] || null)} />
                    <div className="flex items-center gap-3">
                      {newTrackArt && (
                        <img src={URL.createObjectURL(newTrackArt)} alt="" className="w-14 h-14 rounded-xl object-cover border border-surface-600" />
                      )}
                      <button
                        onClick={() => newTrackArtRef.current?.click()}
                        className="px-4 py-2 bg-surface-700 border border-surface-600 text-gray-400 rounded-xl text-sm hover:border-surface-400 hover:text-gray-200 transition-colors"
                      >
                        {newTrackArt ? 'Change image' : 'Upload track artwork'}
                      </button>
                      {newTrackArt && (
                        <button onClick={() => setNewTrackArt(null)} className="text-red-500 text-xs hover:text-red-400 transition-colors">Remove</button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleCreateTrack}
                    disabled={addingTrack || !newTrackForm.title.trim()}
                    className="px-5 py-2 bg-brand-500 text-black rounded-xl text-sm font-bold hover:bg-brand-400 disabled:opacity-50 transition-colors"
                  >
                    {addingTrack ? 'Adding…' : 'Add to Tracklist'}
                  </button>
                  <button
                    onClick={() => { setNewTrackForm(null); setNewTrackArt(null); }}
                    className="px-5 py-2 bg-surface-700 text-gray-400 rounded-xl text-sm hover:bg-surface-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Link existing uploaded content */}
            <div className="relative">
              <p className="text-xs text-gray-600 mb-1.5">Or link already-uploaded music:</p>
              <input value={musicSearch} onChange={(e) => setMusicSearch(e.target.value)} placeholder="Search your uploaded tracks…"
                className="w-full bg-surface-800 border border-surface-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400 placeholder:text-gray-700" />
              {musicResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-surface-800 border border-surface-600 rounded-xl overflow-hidden shadow-xl">
                  {musicResults.map((c) => (
                    <button key={c.id} onClick={() => handleAddTrack(c)}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-surface-700 transition-colors text-left">
                      <span className="text-sm text-white truncate">{c.title}</span>
                      <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                        {fmtDur(c.duration)} · {c.creator.displayName || c.creator.username}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Track list */}
            {tracksLoading ? (
              <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-14 bg-surface-800 rounded-xl animate-pulse" />)}</div>
            ) : tracks.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-6">No tracks yet. Use "+ Add Track" above to build the tracklist.</p>
            ) : (
              <div className="space-y-1.5">
                {tracks.sort((a, b) => a.discNumber - b.discNumber || a.trackNumber - b.trackNumber).map((t) => (
                  <div key={t.contentId} className="flex items-center gap-3 px-3 py-2.5 bg-surface-800 rounded-xl group">
                    <span className="text-gray-600 text-xs w-5 text-center flex-shrink-0">{t.trackNumber}</span>
                    <button onClick={() => openTrackEdit(t.contentId)} className="w-10 h-10 rounded-lg overflow-hidden bg-surface-700 flex-shrink-0 flex items-center justify-center text-base hover:ring-2 hover:ring-brand-400 transition-all">
                      {t.content.thumbnailUrl
                        ? <img src={t.content.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                        : '🎵'}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{t.content.title}</p>
                      <p className="text-xs text-gray-500">
                        {fmtDur(t.content.duration) || 'no duration'}
                        {t.content.mediaUrl
                          ? <span className="ml-2 text-green-500">● audio</span>
                          : <span className="ml-2 text-yellow-600">○ no audio</span>}
                      </p>
                    </div>
                    <button onClick={() => openTrackEdit(t.contentId)}
                      className="opacity-0 group-hover:opacity-100 text-brand-400 hover:text-brand-300 text-xs px-2 py-1 transition-all flex-shrink-0">
                      Edit
                    </button>
                    <button onClick={() => handleRemoveTrack(t.contentId)}
                      className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 text-xs px-2 py-1 transition-all flex-shrink-0">
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Album list */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-20 bg-surface-800 rounded-2xl animate-pulse" />)}</div>
      ) : albums.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-3">🎵</p>
          <p>No albums yet. Create your first one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {albums.map((album) => (
            <div key={album.id} className="flex items-center gap-4 bg-surface-800 border border-surface-700 rounded-2xl p-4">
              <button onClick={() => openEdit(album)} className="w-14 h-14 bg-surface-700 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center text-2xl hover:ring-2 hover:ring-brand-400 transition-all">
                {album.coverUrl ? (
                  <img src={album.coverUrl} alt={album.title} className="w-full h-full object-cover" />
                ) : '🎵'}
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">{album.title}</p>
                <p className="text-gray-500 text-xs">
                  <span className="text-gray-400 font-medium">{album.releaseType?.charAt(0) + album.releaseType?.slice(1).toLowerCase()}</span>
                  {` · ${album._count.tracks} track${album._count.tracks !== 1 ? 's' : ''}`}
                  {album.genre && ` · ${album.genre}`}
                  {album.releaseDate && ` · ${new Date(album.releaseDate).getFullYear()}`}
                  {album.privacy !== 'PUBLIC' && <span className="ml-1 text-yellow-600">· {album.privacy.replace('_', ' ').toLowerCase()}</span>}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a href={`/albums/${album.id}`} target="_blank" rel="noreferrer"
                  className="text-xs px-3 py-1.5 bg-surface-700 text-gray-400 rounded-lg hover:bg-surface-600 transition-colors">
                  View
                </a>
                <button onClick={() => openEdit(album)}
                  className="text-xs px-3 py-1.5 bg-brand-500/20 text-brand-400 rounded-lg hover:bg-brand-500/30 transition-colors">
                  Edit
                </button>
                <button onClick={() => handleDelete(album.id)}
                  className="text-xs px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingTrack && (
        <EditContentModal
          item={editingTrack}
          onClose={() => setEditingTrack(null)}
          onSaved={(updated) => {
            setEditingTrack(null);
            setTracks((prev) => prev.map((t) =>
              t.contentId === updated.id
                ? { ...t, content: { ...t.content, title: updated.title, mediaUrl: updated.mediaUrl ?? null, thumbnailUrl: updated.thumbnailUrl ?? null } }
                : t
            ));
          }}
        />
      )}
    </div>
  );
}

// ── Newsletter Tab ────────────────────────────────────────────────────────────

function NewsletterTab() {
  const [subscribers, setSubscribers] = useState<{ id: string; email: string; name: string | null; source: string; subscribedAt: string }[]>([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [pages, setPages]   = useState(1);
  const [loading, setLoading] = useState(true);
  const [q, setQ]           = useState('');
  const [status, setStatus] = useState<'active' | 'unsub'>('active');

  function load(p = 1, search = q, st = status) {
    setLoading(true);
    api.get(`/admin/newsletter?page=${p}&limit=50&q=${encodeURIComponent(search)}&status=${st}`)
      .then((r) => {
        setSubscribers(r.data.subscribers);
        setTotal(r.data.total);
        setPage(r.data.page);
        setPages(r.data.pages);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(1); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load(1, q, status);
  }

  function handleStatusChange(s: 'active' | 'unsub') {
    setStatus(s);
    load(1, q, s);
  }

  async function handleDelete(id: string) {
    await api.delete(`/admin/newsletter/${id}`).catch(() => {});
    setSubscribers((prev) => prev.filter((s) => s.id !== id));
    setTotal((t) => t - 1);
  }

  function handleExport() {
    window.open(`${process.env.NEXT_PUBLIC_API_URL}/admin/newsletter/export`, '_blank');
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Newsletter Subscribers</h2>
          <p className="text-gray-500 text-sm mt-1">{total.toLocaleString()} {status === 'active' ? 'active' : 'unsubscribed'}</p>
        </div>
        <button onClick={handleExport} className="text-sm bg-surface-700 hover:bg-surface-600 text-white px-4 py-2 rounded-lg transition-colors">
          Export CSV
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by email…"
            className="flex-1 bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
          />
          <button type="submit" className="bg-brand-500 hover:bg-brand-400 text-black font-semibold text-sm px-4 py-2 rounded-lg">Search</button>
        </form>
        <div className="flex gap-1 bg-surface-800 border border-surface-700 rounded-lg p-1">
          {(['active', 'unsub'] as const).map((s) => (
            <button
              key={s}
              onClick={() => handleStatusChange(s)}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors ${status === s ? 'bg-brand-500 text-black font-bold' : 'text-gray-400 hover:text-white'}`}
            >
              {s === 'active' ? 'Active' : 'Unsubscribed'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-10 bg-surface-700 rounded-lg animate-pulse" />)}</div>
      ) : subscribers.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-12">No subscribers found.</p>
      ) : (
        <>
          <div className="bg-surface-800 border border-surface-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-700 text-left text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700">
                {subscribers.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-700/50">
                    <td className="px-4 py-3">
                      <p className="text-white">{s.email}</p>
                      {s.name && <p className="text-gray-500 text-xs">{s.name}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-400">{s.source}</td>
                    <td className="px-4 py-3 text-gray-400">{new Date(s.subscribedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDelete(s.id)} className="text-red-400 hover:text-red-300 text-xs">Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <button onClick={() => load(page - 1)} disabled={page <= 1} className="text-sm text-gray-400 hover:text-white disabled:opacity-40">← Prev</button>
              <span className="text-sm text-gray-500">Page {page} of {pages}</span>
              <button onClick={() => load(page + 1)} disabled={page >= pages} className="text-sm text-gray-400 hover:text-white disabled:opacity-40">Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SettingsTab() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState('');

  const [perkProds, setPerkProds] = useState<AdminProduct[]>([]);
  const [perkLoading, setPerkLoading] = useState(true);
  const [editPerkProd, setEditPerkProd] = useState<AdminProduct | null>(null);
  const [showNewPerkProd, setShowNewPerkProd] = useState(false);

  useEffect(() => {
    api.get('/admin/settings')
      .then((r) => setSettings(r.data.settings ?? {}))
      .catch(() => setError('Failed to load settings.'))
      .finally(() => setLoading(false));
    api.get('/admin/products')
      .then((r) => setPerkProds((r.data.products as AdminProduct[]).filter((p) => p.memberDiscountEnabled)))
      .finally(() => setPerkLoading(false));
  }, []);

  function set(key: string, value: string) {
    setSettings((s) => ({ ...s, [key]: value }));
    setSaved(null);
  }

  function onPerkSaved(p: AdminProduct) {
    setPerkProds((prev) => {
      const exists = prev.some((x) => x.id === p.id);
      const updated = exists ? prev.map((x) => x.id === p.id ? p : x) : [...prev, p];
      return updated.filter((x) => x.memberDiscountEnabled);
    });
    setEditPerkProd(null);
    setShowNewPerkProd(false);
  }

  async function archivePerkProd(id: string) {
    if (!confirm('Archive this product? It will be hidden from the shop.')) return;
    await api.patch(`/admin/products/${id}`, { status: 'ARCHIVED' });
    setPerkProds((prev) => prev.filter((p) => p.id !== id));
  }

  async function save(key: string) {
    setSaving(key);
    setError('');
    try {
      await api.put('/admin/settings', { key, value: settings[key] ?? '' });
      setSaved(key);
      setTimeout(() => setSaved(null), 2500);
    } catch {
      setError('Failed to save. Try again.');
    } finally {
      setSaving(null);
    }
  }

  return (
    <SettingsCtx.Provider value={{ settings, set, loading, saving, saved, save }}>
    <div className="max-w-4xl space-y-10">

      {error && (
        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">{error}</p>
      )}

      {/* ── Homepage Content ── */}
      <HomepageContentSection />

      {/* ── Ark Rotating Banner ── */}
      <div className="border border-surface-700/50 rounded-2xl p-6 bg-surface-900/40 space-y-5">
        <div>
          <h2 className="text-lg font-bold text-white mb-1">The Ark — Rotating Banner Slides</h2>
          <p className="text-gray-500 text-sm">Upload and manage the rotating banner carousel at the top of The Ark shop page.</p>
        </div>
        <BannerSlidesAdmin page="ARK" />
      </div>

      {/* ── Shop Page Content ── */}
      <div>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white mb-1">Shop Page Content</h2>
          <p className="text-gray-500 text-sm">Edit text and style every element in The Ark shop intro. Click + buttons to insert decorations.</p>
        </div>

        <div className="space-y-0">
          <FieldBlock
            label="Eyebrow Label"
            textKey="shop_eyebrow"
            placeholder="Camp DaddyMan Official Store"
            cssKey="shop_eyebrow_css"
            cssClass="shop-eyebrow"
            fontSizeKey="shop_eyebrow_font_size"
            lineHeightKey="shop_eyebrow_line_height"
            snippets={[
              { tag: 'Gold',       css: 'color: #f8c202;' },
              { tag: 'Teal',       css: 'color: #0ba691;' },
              { tag: 'White',      css: 'color: #ffffff;' },
              { tag: 'Glow Gold',  css: 'text-shadow: 0 0 16px rgba(248,194,2,0.9);' },
              { tag: 'Glow Teal',  css: 'text-shadow: 0 0 16px rgba(11,166,145,0.9);' },
              { tag: 'Uppercase',  css: 'text-transform: uppercase;' },
              { tag: 'Spaced',     css: 'letter-spacing: 0.35em;' },
              { tag: 'Bold',       css: 'font-weight: 900;' },
              { tag: 'Italic',     css: 'font-style: italic;' },
              { tag: 'Small',      css: 'font-size: 0.65rem;' },
              { tag: 'Large',      css: 'font-size: 1rem;' },
            ]}
          />

          <FieldBlock
            label="Main Heading"
            textKey="shop_heading"
            placeholder="Merch, Music & Limited Drops"
            cssKey="shop_heading_css"
            cssClass="shop-title"
            fontSizeKey="shop_heading_font_size"
            lineHeightKey="shop_heading_line_height"
            snippets={[
              { tag: 'Glow Gold',    css: 'text-shadow: 0 0 40px rgba(248,194,2,0.7), 0 0 80px rgba(248,194,2,0.3);' },
              { tag: 'Glow Teal',    css: 'text-shadow: 0 0 40px rgba(11,166,145,0.8), 0 0 80px rgba(11,166,145,0.3);' },
              { tag: 'Glow White',   css: 'text-shadow: 0 0 30px rgba(255,255,255,0.6);' },
              { tag: 'Shadow',       css: 'text-shadow: 3px 4px 10px rgba(0,0,0,0.95);' },
              { tag: 'Outline Teal', css: '-webkit-text-stroke: 1px #0ba691; color: transparent;' },
              { tag: 'Outline Gold', css: '-webkit-text-stroke: 2px #f8c202; color: transparent;' },
              { tag: 'Gold',         css: 'color: #f8c202;' },
              { tag: 'Teal',         css: 'color: #0ba691;' },
              { tag: 'White',        css: 'color: #ffffff;' },
              { tag: 'Serif',        css: "font-family: Georgia, 'Times New Roman', serif;" },
              { tag: 'Sans',         css: 'font-family: system-ui, -apple-system, sans-serif;' },
              { tag: 'Italic',       css: 'font-style: italic;' },
              { tag: 'Uppercase',    css: 'text-transform: uppercase; letter-spacing: 0.05em;' },
              { tag: 'Spaced',       css: 'letter-spacing: 0.12em;' },
            ]}
          />

          <FieldBlock
            label='Subheading — "Straight from the Camp."'
            textKey="shop_subheading"
            placeholder="Straight from the Camp."
            cssKey="shop_subheading_css"
            cssClass="shop-subheading"
            fontSizeKey="shop_subheading_font_size"
            lineHeightKey="shop_subheading_line_height"
            snippets={[
              { tag: 'White',     css: 'color: #ffffff;' },
              { tag: 'Gold',      css: 'color: #f8c202;' },
              { tag: 'Teal',      css: 'color: #0ba691;' },
              { tag: 'Glow',      css: 'text-shadow: 0 0 20px currentColor;' },
              { tag: 'Shadow',    css: 'text-shadow: 1px 2px 6px rgba(0,0,0,0.9);' },
              { tag: 'Serif',     css: "font-family: Georgia, serif; font-style: italic;" },
              { tag: 'Large',     css: 'font-size: 1.5rem;' },
              { tag: 'XLarge',    css: 'font-size: 2rem;' },
              { tag: 'Small',     css: 'font-size: 0.8rem;' },
              { tag: 'Bold',      css: 'font-weight: 700;' },
              { tag: 'Spaced',    css: 'letter-spacing: 0.2em;' },
              { tag: 'Uppercase', css: 'text-transform: uppercase;' },
            ]}
          />

          <FieldBlock
            label="Stat Values (product count &amp; featured count are live; Max Discount is editable)"
            textEntries={[
              { key: 'shop_stat_max_discount', label: 'Max Discount value', placeholder: '15%' },
            ]}
            cssKey="shop_stat_value_css"
            cssClass="shop-stat-value"
            fontSizeKey="shop_stat_value_font_size"
            lineHeightKey="shop_stat_value_line_height"
            snippets={[
              { tag: 'Glow Gold',    css: 'text-shadow: 0 0 24px rgba(248,194,2,1), 0 0 56px rgba(248,194,2,0.5);' },
              { tag: 'Glow Green',   css: 'text-shadow: 0 0 24px rgba(11,166,145,1), 0 0 56px rgba(11,166,145,0.5);' },
              { tag: 'Glow White',   css: 'text-shadow: 0 0 20px rgba(255,255,255,0.8);' },
              { tag: 'Outline Gold', css: '-webkit-text-stroke: 2px #f8c202; color: transparent;' },
              { tag: 'Outline Teal', css: '-webkit-text-stroke: 1px #0ba691; color: transparent;' },
              { tag: 'Gold',         css: 'color: #f8c202;' },
              { tag: 'Teal',         css: 'color: #0ba691;' },
              { tag: 'White',        css: 'color: #ffffff;' },
              { tag: 'Serif',        css: "font-family: Georgia, serif;" },
              { tag: 'Sans',         css: 'font-family: system-ui, sans-serif;' },
              { tag: 'Larger',       css: 'font-size: 3.5rem;' },
              { tag: 'Italic',       css: 'font-style: italic;' },
              { tag: 'Bold',         css: 'font-weight: 900;' },
            ]}
          />

          <FieldBlock
            label="Stat Labels"
            textEntries={[
              { key: 'shop_stat_products_label',  label: 'Label 1',  placeholder: 'Products' },
              { key: 'shop_stat_discount_label',  label: 'Label 2',  placeholder: 'Max Discount' },
              { key: 'shop_stat_featured_label',  label: 'Label 3',  placeholder: 'Featured Drop' },
            ]}
            cssKey="shop_stat_label_css"
            cssClass="shop-stat-label"
            fontSizeKey="shop_stat_label_font_size"
            lineHeightKey="shop_stat_label_line_height"
            snippets={[
              { tag: 'Gold',      css: 'color: #f8c202;' },
              { tag: 'Teal',      css: 'color: #0ba691;' },
              { tag: 'White',     css: 'color: #ffffff;' },
              { tag: 'Glow',      css: 'text-shadow: 0 0 12px currentColor;' },
              { tag: 'Uppercase', css: 'text-transform: uppercase;' },
              { tag: 'Spaced',    css: 'letter-spacing: 0.35em;' },
              { tag: 'Small',     css: 'font-size: 0.6rem;' },
              { tag: 'Bold',      css: 'font-weight: 900;' },
              { tag: 'Serif',     css: "font-family: Georgia, serif; font-style: italic;" },
            ]}
          />

          <FieldBlock
            label="Member Line"
            textEntries={[
              { key: 'shop_nonmember_line',     label: 'Logged-out text',                          placeholder: 'Members save up to 15%.' },
              { key: 'shop_member_saving_line', label: 'Member text (use {rate} for the %)',       placeholder: "You're saving {rate}% today." },
            ]}
            cssKey="shop_member_line_css"
            cssClass="shop-member-line"
            fontSizeKey="shop_member_line_font_size"
            lineHeightKey="shop_member_line_line_height"
            snippets={[
              { tag: 'Green',     css: 'color: #00c878;' },
              { tag: 'Gold',      css: 'color: #f8c202;' },
              { tag: 'Teal',      css: 'color: #0ba691;' },
              { tag: 'White',     css: 'color: #ffffff;' },
              { tag: 'Glow',      css: 'text-shadow: 0 0 16px currentColor;' },
              { tag: 'Bold',      css: 'font-weight: 900;' },
              { tag: 'Italic',    css: 'font-style: italic;' },
              { tag: 'Uppercase', css: 'text-transform: uppercase;' },
              { tag: 'Spaced',    css: 'letter-spacing: 0.15em;' },
            ]}
          />

          {/* Text alignment */}
          <div className="pt-5">
            <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1.5">Text Alignment</label>
            <div className="flex gap-2 items-center">
              {(['left', 'center'] as const).map((val) => (
                <button
                  key={val}
                  disabled={loading}
                  onClick={() => set('shop_intro_align', val)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold border transition-colors capitalize disabled:opacity-50 ${
                    (settings['shop_intro_align'] || 'center') === val
                      ? 'bg-brand-500 text-black border-brand-500'
                      : 'border-surface-600 text-gray-400 hover:text-white bg-surface-900'
                  }`}
                >
                  {val === 'left' ? '⬅ Left' : '↔ Center'}
                </button>
              ))}
              <SaveBtn k="shop_intro_align" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Membership Perks Section Copy ── */}
      <div className="border border-surface-700/50 rounded-2xl p-6 bg-surface-900/40">
        <h2 className="text-lg font-bold text-white mb-1">Membership Perks Section</h2>
        <p className="text-gray-500 text-sm mb-5">The heading block above the carousel on the shop page.</p>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1.5">Eyebrow Tag</label>
            <div className="flex gap-2">
              <input
                value={settings['shop_perks_eyebrow'] ?? ''}
                onChange={(e) => set('shop_perks_eyebrow', e.target.value)}
                placeholder="Membership Perks"
                className="flex-1 bg-surface-900 border border-surface-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400 transition-colors placeholder:text-gray-700 disabled:opacity-50"
              />
              <SaveBtn k="shop_perks_eyebrow" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1.5">Heading — Line 1 <span className="text-gray-600 font-normal normal-case">(white)</span></label>
            <div className="flex gap-2">
              <input
                value={settings['shop_perks_line1'] ?? ''}
                onChange={(e) => set('shop_perks_line1', e.target.value)}
                placeholder="Camp Members"
                className="flex-1 bg-surface-900 border border-surface-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400 transition-colors placeholder:text-gray-700 disabled:opacity-50"
              />
              <SaveBtn k="shop_perks_line1" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1.5">Heading — Line 2 <span className="text-gray-600 font-normal normal-case">(gold highlight)</span></label>
            <div className="flex gap-2">
              <input
                value={settings['shop_perks_line2'] ?? ''}
                onChange={(e) => set('shop_perks_line2', e.target.value)}
                placeholder="Save Up To 15%"
                className="flex-1 bg-surface-900 border border-surface-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400 transition-colors placeholder:text-gray-700 disabled:opacity-50"
              />
              <SaveBtn k="shop_perks_line2" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1.5">Heading — Line 3 <span className="text-gray-600 font-normal normal-case">(white)</span></label>
            <div className="flex gap-2">
              <input
                value={settings['shop_perks_line3'] ?? ''}
                onChange={(e) => set('shop_perks_line3', e.target.value)}
                placeholder="on Every Order."
                className="flex-1 bg-surface-900 border border-surface-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400 transition-colors placeholder:text-gray-700 disabled:opacity-50"
              />
              <SaveBtn k="shop_perks_line3" />
            </div>
          </div>

          <div className="pt-2 border-t border-surface-700/50">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">CTA Button</p>
            <div className="mb-4">
              <label className="block text-xs text-gray-400 mb-1">Button text <span className="text-gray-600 font-normal">(shown to non-members)</span></label>
              <div className="flex gap-2">
                <input
                  value={settings['shop_perks_cta'] ?? ''}
                  onChange={(e) => set('shop_perks_cta', e.target.value)}
                  placeholder="Join the Camp →"
                  className="flex-1 bg-surface-900 border border-surface-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400 transition-colors placeholder:text-gray-700 disabled:opacity-50"
                />
                <SaveBtn k="shop_perks_cta" />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-surface-700/50">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">Plan Descriptions</p>
            {([
              { key: 'shop_perks_pro_desc',     label: 'PRO description',     placeholder: 'Unlock discounts + exclusive content' },
              { key: 'shop_perks_premium_desc', label: 'PREMIUM description', placeholder: 'Maximum savings, all access' },
              { key: 'shop_perks_creator_desc', label: 'CREATOR description', placeholder: 'Creator tier — full benefits' },
            ]).map(({ key, label, placeholder }) => (
              <div key={key} className="mb-3">
                <label className="block text-xs text-gray-400 mb-1">{label}</label>
                <div className="flex gap-2">
                  <input
                    value={settings[key] ?? ''}
                    onChange={(e) => set(key, e.target.value)}
                    placeholder={placeholder}
                    className="flex-1 bg-surface-900 border border-surface-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400 transition-colors placeholder:text-gray-700 disabled:opacity-50"
                  />
                  <SaveBtn k={key} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Membership Perk Products ── */}
      <div>
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Membership Perk Products</h2>
            <p className="text-gray-500 text-sm">
              Products shown in the &ldquo;With your membership&rdquo; carousel on the shop page. Full product management — images, size &amp; color options, per-variant inventory, and price modifiers.
            </p>
          </div>
          <button
            onClick={() => setShowNewPerkProd(true)}
            className="flex-shrink-0 mt-1 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-black font-black text-sm transition-colors"
          >
            + Add Product
          </button>
        </div>

        {perkLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-surface-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : perkProds.length === 0 ? (
          <div className="border border-dashed border-surface-700 rounded-2xl py-12 text-center">
            <p className="text-4xl mb-3">✦</p>
            <p className="text-gray-400 font-bold mb-1">No perk products yet</p>
            <p className="text-gray-600 text-sm mb-5">
              Add products with member discounts enabled to showcase them in the carousel.
            </p>
            <button
              onClick={() => setShowNewPerkProd(true)}
              className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-black font-black text-sm transition-colors"
            >
              + Add First Product
            </button>
          </div>
        ) : (
          <div className="divide-y divide-surface-700/50 border border-surface-700/50 rounded-2xl overflow-hidden">
            {perkProds.map((p) => (
              <div key={p.id} className="flex items-center gap-4 px-4 py-3 bg-surface-900/40 hover:bg-surface-800/40 transition-colors">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-surface-700 flex-shrink-0">
                  {p.imagePreviewUrl ? (
                    <img src={p.imagePreviewUrl} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl opacity-20">👕</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm truncate">{p.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-xs font-bold ${STATUS_COLORS[p.status] || 'text-gray-400'}`}>{p.status}</span>
                    <span className="text-gray-700 text-xs">·</span>
                    <span className="text-gray-500 text-xs">${p.price.toFixed(2)}</span>
                    {p.variants.length > 0 && (
                      <>
                        <span className="text-gray-700 text-xs">·</span>
                        <span className="text-gray-500 text-xs">{p.variants.length} variant{p.variants.length !== 1 ? 's' : ''}</span>
                      </>
                    )}
                    {p.optionGroups && p.optionGroups.length > 0 && (
                      <>
                        <span className="text-gray-700 text-xs">·</span>
                        <span className="text-gray-500 text-xs">{p.optionGroups.map((g) => g.name).join(', ')}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setEditPerkProd(p)}
                    className="px-3 py-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 border border-surface-600 text-gray-300 hover:text-white text-xs font-bold transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => archivePerkProd(p.id)}
                    className="px-3 py-1.5 rounded-lg hover:bg-red-500/10 border border-surface-700 hover:border-red-500/30 text-gray-600 hover:text-red-400 text-xs font-bold transition-colors"
                  >
                    Archive
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {(showNewPerkProd || editPerkProd) && (
          <ProductFormModal
            initial={editPerkProd}
            presetMemberDiscount={true}
            onSave={onPerkSaved}
            onClose={() => { setEditPerkProd(null); setShowNewPerkProd(false); }}
          />
        )}
      </div>

      {/* ── Custom CSS ── */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Custom CSS</h2>
          <p className="text-gray-500 text-sm">
            Injected into every page. Changes go live within ~60 seconds.
          </p>
        </div>

        <div className="relative">
          <textarea
            value={loading ? '' : (settings['custom_css'] ?? '')}
            onChange={(e) => set('custom_css', e.target.value)}
            placeholder={loading ? 'Loading…' : '/* Add custom CSS here */'}
            disabled={loading}
            spellCheck={false}
            rows={24}
            className="w-full bg-surface-900 border border-surface-600 text-gray-200 font-mono text-sm rounded-2xl px-5 py-4 focus:outline-none focus:border-brand-400 resize-y transition-colors leading-relaxed placeholder:text-gray-700 disabled:opacity-50"
          />
          <div className="absolute bottom-3 right-3 text-[10px] text-gray-700 font-mono">
            {(settings['custom_css'] ?? '').length} chars
          </div>
        </div>

        <div className="flex items-center gap-3">
          <SaveBtn k="custom_css" />
          <button
            onClick={() => set('custom_css', '')}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-sm text-gray-500 hover:text-red-400 border border-surface-700 transition-colors disabled:opacity-40"
          >
            Clear
          </button>
        </div>
      </div>

    </div>
    </SettingsCtx.Provider>
  );
}

// ── Live Tab ──────────────────────────────────────────────────────────────────

interface AdminLiveStream {
  id: string; title: string; description: string | null; status: string;
  thumbnailUrl: string | null; cfStreamId: string; cfStreamKey: string;
  cfPlaybackUrl: string; cfWebRtcUrl: string | null;
  scheduledAt: string | null; startedAt: string | null; endedAt: string | null;
  creator: { username: string; displayName: string | null };
}

function LiveTab() {
  const [streams, setStreams]     = useState<AdminLiveStream[]>([]);
  const [loading, setLoading]     = useState(true);
  const [loadError, setLoadError] = useState('');
  const [creating, setCreating]   = useState(false);
  const [form, setForm]           = useState({ title: '', description: '', scheduledAt: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState('');
  const [rtmpUrl, setRtmpUrl]     = useState<string | null>(null);
  const [keyVisible, setKeyVisible] = useState<string | null>(null);

  function load() {
    setLoading(true); setLoadError('');
    api.get('/live')
      .then((r) => { if (r.data.streams) setStreams(r.data.streams); })
      .catch((err) => setLoadError(err?.response?.data?.error || err?.message || 'Failed to load streams'))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || submitting) return;
    setSubmitting(true); setError('');
    try {
      const r = await api.post('/live', {
        title: form.title.trim(),
        description: form.description || null,
        scheduledAt: form.scheduledAt || null,
      });
      setStreams((prev) => [r.data.stream, ...prev]);
      setRtmpUrl(r.data.rtmpUrl);
      setForm({ title: '', description: '', scheduledAt: '' });
      setCreating(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create stream');
    } finally {
      setSubmitting(false);
    }
  }

  async function setStatus(id: string, status: string) {
    await api.patch(`/live/${id}`, { status });
    setStreams((prev) => prev.map((s) => s.id === id ? { ...s, status } : s));
  }

  async function refreshCredentials(id: string) {
    try {
      const r = await api.post(`/live/${id}/refresh`);
      setStreams((prev) => prev.map((s) => s.id === id ? { ...s, ...r.data.stream } : s));
      setRtmpUrl(r.data.rtmpUrl);
    } catch {
      alert('Failed to refresh credentials');
    }
  }

  async function deleteStream(id: string) {
    if (!confirm('Delete this stream?')) return;
    await api.delete(`/live/${id}`);
    setStreams((prev) => prev.filter((s) => s.id !== id));
  }

  const STATUS_COLOR: Record<string, string> = {
    idle: 'text-gray-400 bg-surface-700',
    live: 'text-red-400 bg-red-900/30',
    ended: 'text-gray-600 bg-surface-800',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Live Streams</h2>
        <button
          onClick={() => setCreating(!creating)}
          className="px-4 py-2 bg-brand-500 hover:bg-brand-400 text-black text-sm font-semibold rounded-lg transition-colors"
        >
          + New Stream
        </button>
      </div>

      {rtmpUrl && (
        <div className="mb-6 p-4 bg-green-900/30 border border-green-600/40 rounded-xl space-y-2">
          <p className="text-green-400 font-semibold text-sm">Stream created! Configure OBS → Settings → Stream → Custom:</p>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Server (paste into OBS Server field):</p>
            <code className="text-xs text-green-300 break-all">rtmps://live.cloudflare.com:443/live/</code>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Stream Key (paste into OBS Stream Key field):</p>
            <code className="text-xs text-green-300 break-all">{rtmpUrl.replace('rtmps://live.cloudflare.com:443/live/', '')}</code>
          </div>
          <button onClick={() => setRtmpUrl(null)} className="text-xs text-gray-500 hover:text-gray-300">dismiss</button>
        </div>
      )}

      {creating && (
        <form onSubmit={handleCreate} className="mb-6 p-5 bg-surface-800 border border-surface-700 rounded-xl space-y-3">
          <h3 className="text-white font-semibold text-sm">New Live Stream</h3>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <input
            value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Stream title *" required
            className="w-full bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-500"
          />
          <textarea
            value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Description (optional)" rows={2}
            className="w-full bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 resize-none"
          />
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Schedule (optional)</label>
            <input
              type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
              className="bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-black text-sm font-semibold rounded-lg transition-colors">
              {submitting ? 'Creating…' : 'Create Stream'}
            </button>
            <button type="button" onClick={() => setCreating(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
          </div>
          <p className="text-xs text-gray-600">Requires CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_STREAM_TOKEN env vars.</p>
        </form>
      )}

      {loading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-16 bg-surface-700 rounded-xl animate-pulse" />)}</div>
      ) : loadError ? (
        <div className="py-10 text-center space-y-3">
          <p className="text-red-400 text-sm">Failed to load streams: {loadError}</p>
          <button onClick={load} className="text-xs text-brand-400 hover:underline">Try again</button>
        </div>
      ) : streams.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-12">No streams yet.</p>
      ) : (
        <div className="space-y-3">
          {streams.map((s) => (
            <div key={s.id} className="bg-surface-800 border border-surface-700 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[s.status] ?? STATUS_COLOR.idle}`}>
                      {s.status.toUpperCase()}
                    </span>
                    <span className="text-white font-medium text-sm">{s.title}</span>
                  </div>
                  <p className="text-gray-500 text-xs">by {s.creator.displayName || s.creator.username}</p>
                  {s.scheduledAt && s.status === 'idle' && (
                    <p className="text-gray-600 text-xs mt-0.5">Scheduled: {new Date(s.scheduledAt).toLocaleString()}</p>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => setKeyVisible(keyVisible === s.id ? null : s.id)}
                      className="text-xs text-gray-500 hover:text-brand-400 transition-colors"
                    >
                      {keyVisible === s.id ? 'Hide stream key' : 'Show stream key'}
                    </button>
                    <a href={`/live/${s.id}`} target="_blank" rel="noopener" className="text-xs text-brand-400 hover:underline">View page ↗</a>
                    <a href={`/admin/studio/${s.id}`} className="text-xs text-brand-500 font-semibold hover:text-brand-400 transition-colors">🎙 Browser Studio</a>
                  </div>
                  {keyVisible === s.id && (
                    <div className="mt-2 space-y-2">
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">RTMP Server:</p>
                        <code className="text-xs text-green-300 break-all">rtmps://live.cloudflare.com:443/live/</code>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Stream Key:</p>
                        <code className="text-xs text-green-300 break-all">{s.cfStreamKey}</code>
                      </div>
                      {s.cfWebRtcUrl && (
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">WHIP URL (OBS WebRTC — recommended):</p>
                          <code className="text-xs text-green-300 break-all">{s.cfWebRtcUrl}</code>
                        </div>
                      )}
                      {!s.cfWebRtcUrl && (
                        <button onClick={() => refreshCredentials(s.id)} className="text-xs text-brand-400 hover:underline">
                          Refresh credentials to get WHIP URL
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                  {s.status === 'idle'  && <button onClick={() => setStatus(s.id, 'live')}  className="text-xs px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg transition-colors">Go Live</button>}
                  {s.status === 'live'  && <button onClick={() => setStatus(s.id, 'ended')} className="text-xs px-3 py-1.5 bg-surface-600 hover:bg-surface-500 text-white rounded-lg transition-colors">End Stream</button>}
                  <button onClick={() => deleteStream(s.id)} className="text-xs px-3 py-1.5 text-gray-600 hover:text-red-400 border border-surface-700 hover:border-red-900/50 rounded-lg transition-colors ml-4">🗑 Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Push Tab ──────────────────────────────────────────────────────────────────

function PushTab() {
  const [form, setForm]       = useState({ title: '', body: '', url: '' });
  const [sending, setSending] = useState(false);
  const [result, setResult]   = useState<{ sent: number; total: number } | null>(null);
  const [error, setError]     = useState('');

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim() || sending) return;
    setSending(true); setError(''); setResult(null);
    try {
      const r = await api.post('/push/broadcast', {
        title: form.title.trim(),
        body:  form.body.trim(),
        url:   form.url.trim() || '/',
      });
      setResult(r.data);
      setForm({ title: '', body: '', url: '' });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send notification');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Push Notifications</h2>
        <p className="text-gray-500 text-sm mt-1">Broadcast a push notification to all subscribed users.</p>
      </div>

      {result && (
        <div className="mb-4 p-3 bg-green-900/30 border border-green-600/40 rounded-xl text-green-400 text-sm">
          Sent to {result.sent} of {result.total} subscribers.
        </div>
      )}
      {error && <p className="mb-4 text-red-400 text-sm">{error}</p>}

      <form onSubmit={handleSend} className="space-y-4">
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Notification title *</label>
          <input
            value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. New Drop: Father Figures" required
            className="w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Message body *</label>
          <textarea
            value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
            placeholder="A new episode just dropped — tap to watch." required rows={3}
            className="w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 resize-none"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Deep link URL (optional)</label>
          <input
            value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })}
            placeholder="/watch/abc123 or /series/xyz"
            className="w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-500"
          />
        </div>
        <button
          type="submit" disabled={sending}
          className="w-full py-3 bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-black font-bold rounded-xl text-sm transition-colors"
        >
          {sending ? 'Sending…' : 'Send Push Notification'}
        </button>
      </form>

      <div className="mt-6 p-4 bg-surface-800 border border-surface-700 rounded-xl text-xs text-gray-500 space-y-1">
        <p className="font-semibold text-gray-400">Setup required</p>
        <p>Set <code className="text-brand-300">VAPID_PUBLIC_KEY</code>, <code className="text-brand-300">VAPID_PRIVATE_KEY</code>, and <code className="text-brand-300">VAPID_EMAIL</code> on Cloud Run.</p>
        <p>Set <code className="text-brand-300">NEXT_PUBLIC_VAPID_PUBLIC_KEY</code> on Vercel.</p>
        <p>Users must opt in via the bell icon in the navbar.</p>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function AdminInner() {
  const { user, loading } = useAuth();
  const router       = useRouter();
  const searchParams = useSearchParams();

  const urlTab = searchParams.get('tab') as Tab | null;
  const urlAction = searchParams.get('action');

  const [tab, setTab]                   = useState<Tab>(urlTab || 'overview');
  const [userPlanFilter, setPlanFilter] = useState('ALL');
  const [autoCreatePoll]                = useState(urlTab === 'polls' && urlAction === 'create');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function navTo(targetTab: Tab, plan?: string) {
    setPlanFilter(plan || 'ALL');
    setTab(targetTab);
  }

  useEffect(() => {
    if (!loading && (!user || !user.isAdmin)) router.push('/');
  }, [user, loading, router]);

  if (loading || !user?.isAdmin) return null;

  const TABS: { key: Tab; label: string; emoji: string }[] = [
    { key: 'overview',  label: 'Overview',  emoji: '📊' },
    { key: 'users',     label: 'Users',     emoji: '👥' },
    { key: 'content',   label: 'Content',   emoji: '🎵' },
    { key: 'reports',   label: 'Reports',   emoji: '⚑' },
    { key: 'polls',     label: 'Polls',     emoji: '🗳️' },
    { key: 'partners',  label: 'Partners',  emoji: '🤝' },
    { key: 'shop',      label: 'The Ark',   emoji: '🛒' },
    { key: 'albums',    label: 'Albums',    emoji: '💿' },
    { key: 'series',    label: 'Series',    emoji: '📺' },
    { key: 'live',      label: 'Live',      emoji: '📡' },
    { key: 'push',       label: 'Push',       emoji: '🔔' },
    { key: 'newsletter', label: 'Newsletter', emoji: '📧' },
    { key: 'loyalty',    label: 'Loyalty',    emoji: '⭐' },
    { key: 'livity',     label: 'Livity',     emoji: '🌱' },
    { key: 'settings',   label: 'Settings',   emoji: '🎨' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 sm:py-8">
      <div className="flex items-center justify-between mb-4 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Admin Panel</h1>
          <p className="text-gray-400 text-xs sm:text-sm mt-0.5">Camp DaddyMan platform management</p>
        </div>
        <span className="text-xs bg-brand-500 text-black px-3 py-1.5 rounded-full font-bold">Admin</span>
      </div>

      {/* Tab bar — desktop */}
      <div className="hidden md:flex gap-2 mb-8 border-b border-surface-700 pb-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
              tab === t.key
                ? 'bg-surface-800 text-white border border-surface-700 border-b-surface-800 -mb-px'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>{t.emoji}</span> {t.label}
          </button>
        ))}
      </div>

      {/* Tab bar — mobile navigation */}
      <div className="md:hidden mb-5">
        <button
          onClick={() => setMobileMenuOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-surface-800 border border-surface-700 rounded-xl text-white transition-colors active:bg-surface-700"
        >
          <span className="flex items-center gap-2.5">
            <span className="text-lg">{TABS.find((t) => t.key === tab)?.emoji}</span>
            <span className="text-white font-bold text-sm">{TABS.find((t) => t.key === tab)?.label}</span>
          </span>
          <span className="flex items-center gap-1.5 text-brand-400 text-sm font-semibold">
            {mobileMenuOpen ? 'Close ▲' : 'Switch ▼'}
          </span>
        </button>

        {mobileMenuOpen && (
          <div className="mt-1.5 bg-surface-800 border border-surface-700 rounded-xl overflow-hidden shadow-xl">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors border-b border-surface-700/60 last:border-0 text-left ${
                  tab === t.key
                    ? 'bg-brand-500 text-black'
                    : 'text-gray-300 hover:bg-surface-700'
                }`}
              >
                <span className="w-6 text-center flex-shrink-0">{t.emoji}</span>
                <span className="flex-1">{t.label}</span>
                {tab === t.key && <span className="text-xs font-black opacity-50">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {tab === 'overview'  && <OverviewTab onNav={navTo} />}
      {tab === 'users'     && <UsersTab initialPlan={userPlanFilter} key={userPlanFilter} />}
      {tab === 'content'   && <ContentTab />}
      {tab === 'reports'   && <ReportsTab />}
      {tab === 'polls'     && <PollsTab autoCreate={autoCreatePoll} />}
      {tab === 'partners'  && <PartnersTab />}
      {tab === 'shop'      && <ShopTab />}
      {tab === 'albums'    && <AlbumsTab />}
      {tab === 'series'    && <SeriesTab />}
      {tab === 'live'      && <LiveTab />}
      {tab === 'push'       && <PushTab />}
      {tab === 'newsletter' && <NewsletterTab />}
      {tab === 'loyalty'    && <LoyaltyTab />}
      {tab === 'livity'     && <LivityAdminTab />}
      {tab === 'settings'   && <SettingsTab />}
    </div>
  );
}

// ── Loyalty Tab ───────────────────────────────────────────────────────────────

function LoyaltyTab() {
  const TYPES = ['DISCOUNT', 'EARLY_ACCESS', 'EXCLUSIVE_CONTENT', 'CUSTOM'];
  const TYPE_LABEL: Record<string, string> = {
    DISCOUNT: 'Discount Code', EARLY_ACCESS: 'Early Access',
    EXCLUSIVE_CONTENT: 'Exclusive Content', CUSTOM: 'Custom Reward',
  };
  const [rewards, setRewards] = useState<any[]>([]);
  const [form, setForm]       = useState({ name: '', description: '', xpCost: '', type: 'DISCOUNT', value: '', stock: '' });
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState('');

  useEffect(() => { load(); }, []);

  function load() {
    api.get('/loyalty/admin/rewards').then((r) => setRewards(r.data.rewards)).catch(() => {});
  }

  function blank() { setForm({ name: '', description: '', xpCost: '', type: 'DISCOUNT', value: '', stock: '' }); setEditing(null); }

  function startEdit(r: any) {
    setEditing(r);
    setForm({ name: r.name, description: r.description || '', xpCost: String(r.xpCost), type: r.type, value: r.value || '', stock: r.stock != null ? String(r.stock) : '' });
  }

  async function handleSave() {
    if (!form.name.trim() || !form.xpCost) return;
    setSaving(true); setMsg('');
    const payload = { ...form, xpCost: Number(form.xpCost), stock: form.stock !== '' ? Number(form.stock) : null };
    try {
      if (editing) { await api.patch(`/loyalty/admin/rewards/${editing.id}`, payload); }
      else { await api.post('/loyalty/admin/rewards', payload); }
      setMsg('Saved!'); blank(); load();
    } catch { setMsg('Save failed'); }
    finally { setSaving(false); setTimeout(() => setMsg(''), 2500); }
  }

  async function handleToggle(r: any) {
    await api.patch(`/loyalty/admin/rewards/${r.id}`, { active: !r.active }).catch(() => {});
    load();
  }

  async function handleDelete(r: any) {
    if (!confirm(`Delete "${r.name}"?`)) return;
    await api.delete(`/loyalty/admin/rewards/${r.id}`).catch(() => {});
    load();
  }

  const F = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-8">
      <div className="bg-surface-800 border border-surface-700 rounded-xl p-6">
        <h2 className="text-base font-bold text-white mb-4">{editing ? 'Edit Reward' : 'New Reward'}</h2>
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Name *</label>
            <input value={form.name} onChange={(e) => F('name', e.target.value)} placeholder="e.g. 10% Off The Ark" className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Type *</label>
            <select value={form.type} onChange={(e) => F('type', e.target.value)} className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400">
              {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">XP Cost *</label>
            <input type="number" min={1} value={form.xpCost} onChange={(e) => F('xpCost', e.target.value)} placeholder="500" className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Value (code / link / detail)</label>
            <input value={form.value} onChange={(e) => F('value', e.target.value)} placeholder="e.g. CAMP10OFF" className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Stock (blank = unlimited)</label>
            <input type="number" min={0} value={form.stock} onChange={(e) => F('stock', e.target.value)} placeholder="Unlimited" className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Description</label>
            <input value={form.description} onChange={(e) => F('description', e.target.value)} placeholder="Short description shown to fans" className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400" />
          </div>
        </div>
        <div className="flex gap-3 items-center">
          <button onClick={handleSave} disabled={saving} className="bg-brand-500 hover:bg-brand-400 text-black font-semibold text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Reward'}
          </button>
          {editing && <button onClick={blank} className="text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>}
          {msg && <span className="text-xs text-brand-400">{msg}</span>}
        </div>
      </div>

      <div className="bg-surface-800 border border-surface-700 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-700 flex items-center justify-between">
          <h2 className="text-base font-bold text-white">Rewards ({rewards.length})</h2>
        </div>
        {rewards.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-10">No rewards yet. Create one above.</p>
        ) : (
          <div className="divide-y divide-surface-700">
            {rewards.map((r) => (
              <div key={r.id} className="flex items-center gap-4 px-6 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white font-semibold text-sm">{r.name}</p>
                    <span className="text-xs bg-surface-700 text-gray-400 px-2 py-0.5 rounded-full">{TYPE_LABEL[r.type]}</span>
                    {!r.active && <span className="text-xs bg-red-900/30 text-red-400 px-2 py-0.5 rounded-full">Inactive</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    <span className="text-brand-400 font-semibold">{r.xpCost.toLocaleString()} XP</span>
                    {r.stock != null && <span className="ml-2">{r.stock} remaining</span>}
                    {r.value && <span className="ml-2 font-mono text-gray-600">{r.value}</span>}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => handleToggle(r)} className="text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 bg-surface-700 rounded-lg">
                    {r.active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => startEdit(r)} className="text-xs text-brand-400 hover:text-brand-300 transition-colors px-2 py-1 bg-surface-700 rounded-lg">Edit</button>
                  <button onClick={() => handleDelete(r)} className="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1 bg-surface-700 rounded-lg">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense>
      <AdminInner />
    </Suspense>
  );
}

// ── Livity Admin Tab ─────────────────────────────────────────────────────────

interface LivityAdminAct {
  id: string;
  type: string;
  typeLabel: string;
  description: string;
  status: string;
  witnessNote?: string | null;
  verifiedAt?: string | null;
  createdAt: string;
  user: { id: string; username: string; displayName?: string; xp: number; station?: string | null };
  verifiedBy?: { username: string } | null;
}

function LivityAdminTab() {
  const [acts, setActs]       = useState<LivityAdminAct[]>([]);
  const [total, setTotal]     = useState(0);
  const [status, setStatus]   = useState('PENDING');
  const [acting, setActing]   = useState<string | null>(null);
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});

  useEffect(() => { load(); }, [status]); // eslint-disable-line

  function load() {
    api.get('/admin/livity', { params: { status, limit: '50' } })
      .then((r) => { setActs(r.data.acts); setTotal(r.data.total); })
      .catch(() => {});
  }

  async function witness(id: string, action: 'APPROVED' | 'REJECTED') {
    const witnessNote = noteMap[id] ?? '';
    if (action === 'REJECTED' && !witnessNote.trim()) {
      alert('A witness note is required when rejecting.');
      return;
    }
    setActing(id);
    try {
      await api.post(`/admin/livity/${id}/witness`, { action, witnessNote });
      setActs((prev) => prev.filter((a) => a.id !== id));
      setTotal((n) => n - 1);
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Witnessing failed.');
    } finally {
      setActing(null);
    }
  }

  const STATUS_OPTS = ['PENDING', 'APPROVED', 'REJECTED', 'ALL'];
  const STATUS_STYLE: Record<string, string> = {
    PENDING:  'bg-amber-500/10 text-amber-400 border-amber-500/30',
    APPROVED: 'bg-green-500/10 text-green-400 border-green-500/30',
    REJECTED: 'bg-red-500/10  text-red-400  border-red-500/30',
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <h2 className="text-white font-semibold">Livity — Elder Witnessing</h2>
        <span className="text-xs text-gray-500 ml-auto">{total} act{total !== 1 ? 's' : ''}</span>
      </div>

      <div className="flex gap-2 mb-5">
        {STATUS_OPTS.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              status === s
                ? 'bg-brand-500 text-black'
                : 'bg-surface-700 text-gray-400 hover:text-white border border-surface-600'
            }`}
          >
            {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {acts.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          No {status === 'ALL' ? '' : status.toLowerCase() + ' '}acts to witness.
        </div>
      ) : (
        <div className="space-y-3">
          {acts.map((a) => (
            <div key={a.id} className="bg-surface-800 border border-surface-700 rounded-xl p-5">
              <div className="flex items-start gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-white font-semibold text-sm">
                      {a.user.displayName || a.user.username}
                    </span>
                    <span className="text-gray-500 text-xs">@{a.user.username}</span>
                    <span className="text-xs text-gray-600 font-mono">{a.user.xp.toLocaleString()} XP</span>
                    {a.user.station && (
                      <span className="text-[10px] text-amber-400 border border-amber-500/30 px-1.5 rounded">
                        {{ ARK_BUILDER: '🌱', GARDENER: '🌿', FAADA: '🌍' }[a.user.station] ?? ''} {a.user.station.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-brand-400 font-semibold">{a.typeLabel}</span>
                    <span className="text-gray-600 text-xs">·</span>
                    <span className="text-xs text-gray-500">
                      {new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLE[a.status] ?? ''}`}>
                      {a.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed">{a.description}</p>
                  {a.witnessNote && (
                    <p className="text-xs text-gray-500 mt-1.5 italic">
                      Elder ({a.verifiedBy?.username}): &ldquo;{a.witnessNote}&rdquo;
                    </p>
                  )}
                </div>

                {a.status === 'PENDING' && (
                  <div className="flex flex-col gap-2 flex-shrink-0 min-w-[200px]">
                    <textarea
                      placeholder="Witness note (required to reject)"
                      rows={2}
                      value={noteMap[a.id] ?? ''}
                      onChange={(e) => setNoteMap((prev) => ({ ...prev, [a.id]: e.target.value }))}
                      className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-brand-400 resize-none placeholder:text-gray-600"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => witness(a.id, 'APPROVED')}
                        disabled={acting === a.id}
                        className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30 font-semibold transition-colors disabled:opacity-40"
                      >
                        {acting === a.id ? '…' : 'Witness'}
                      </button>
                      <button
                        onClick={() => witness(a.id, 'REJECTED')}
                        disabled={acting === a.id}
                        className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 font-semibold transition-colors disabled:opacity-40"
                      >
                        {acting === a.id ? '…' : 'Return'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
