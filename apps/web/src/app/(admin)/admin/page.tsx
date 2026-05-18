'use client';
import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

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
  subscription?: { plan: string; status: string } | null;
  _count: { content: number; followers: number };
}

interface AdminContent {
  id: string; title: string; description?: string; type: string; status: string; privacy: string;
  views: number; createdAt: string; mediaUrl?: string | null; thumbnailUrl?: string | null; tags?: string[];
  creator: { username: string; email: string };
  _count: { likes: number; comments: number };
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

type Tab = 'overview' | 'users' | 'content' | 'reports' | 'polls' | 'partners' | 'shop';

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
                <td className="px-4 py-3 text-gray-400 text-right hidden sm:table-cell">{u._count.content}</td>
                <td className="px-4 py-3 text-gray-400 text-right hidden lg:table-cell">{u._count.followers}</td>
                <td className="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell">{fmtDate(u.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex gap-2 justify-end">
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
  const [type, setType]                 = useState(item.type);
  const [thumbnailUrl, setThumb]        = useState(item.thumbnailUrl || '');
  const [mediaUrl, setMediaUrl]         = useState(item.mediaUrl || '');
  const [privacy, setPrivacy]           = useState(item.privacy);
  const [tags, setTags]                 = useState((item.tags || []).join(', '));
  const [saving, setSaving]             = useState(false);
  const [uploading, setUploading]       = useState(false);
  const [mediaUploading, setMediaUp]    = useState(false);
  const [mediaProgress, setMediaProg]   = useState(0);
  const [error, setError]               = useState('');
  const fileInputRef                    = useRef<HTMLInputElement>(null);
  const mediaInputRef                   = useRef<HTMLInputElement>(null);

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
    } catch {
      setError('Media upload failed');
    } finally {
      setMediaUp(false);
      setMediaProg(0);
      if (mediaInputRef.current) mediaInputRef.current.value = '';
    }
  }

  async function handleSave() {
    if (!title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    setError('');
    try {
      const payload: Record<string, string> = { title, privacy, type };
      if (description !== (item.description || ''))   payload.description  = description;
      if (thumbnailUrl !== (item.thumbnailUrl || ''))  payload.thumbnailUrl = thumbnailUrl;
      if (tags         !== (item.tags || []).join(', ')) payload.tags       = tags;
      const { data } = await api.patch(`/content/${item.id}`, payload);
      onSaved({ ...item, ...data.content });
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
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
              {mediaUrl ? mediaUrl.split('/').pop() : 'No file'}
            </div>
            {mediaUploading && (
              <div className="mb-2">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Uploading...</span><span>{mediaProgress}%</span>
                </div>
                <div className="h-1.5 bg-surface-600 rounded-full overflow-hidden">
                  <div className="h-full bg-camp-500 rounded-full transition-all" style={{ width: `${mediaProgress}%` }} />
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => mediaInputRef.current?.click()}
              disabled={mediaUploading}
              className="px-3 py-2 rounded-lg bg-surface-600 hover:bg-surface-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {mediaUploading ? `Uploading ${mediaProgress}%` : 'Replace File'}
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
                  <Link href={`/watch/${c.id}`} className="text-white hover:text-brand-400 font-medium transition-colors line-clamp-1">
                    {c.title}
                  </Link>
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
            setEditing(null);
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
  const [title, setTitle]           = useState('');
  const [description, setDesc]      = useState('');
  const [endsAt, setEndsAt]         = useState('');
  const [pollType, setPollType]     = useState<PollType>('CONTENT_VOTE');
  const [options, setOptions]       = useState<FlexOption[]>([blankOption(), blankOption()]);
  const [content, setContent]       = useState<ContentPick[]>([]);
  const [artists, setArtists]       = useState<ArtistPick[]>([]);
  const [imageFile, setImageFile]   = useState<File | null>(null);
  const [imagePreview, setPreview]  = useState('');
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const imgRef                      = useRef<HTMLInputElement>(null);

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

  function addOption() { setOptions((prev) => [...prev, blankOption()]); }
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
        endsAt: endsAt || undefined,
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

          <div>
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">End Date / Time (optional)</label>
            <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)}
              className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400" />
          </div>

          {/* Options — different UI per type */}
          <div>
            <label className="block text-xs text-gray-400 mb-3 uppercase tracking-wide">
              {pollType === 'CONTENT_VOTE' ? 'Song Versions' : pollType === 'ARTIST_VOTE' ? 'Artists' : 'Options'}
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
            <button onClick={addOption}
              className="mt-3 text-sm text-brand-400 hover:text-brand-300 transition-colors">
              + Add another option
            </button>
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
  const [title, setTitle]         = useState(poll.title);
  const [description, setDesc]    = useState(poll.description || '');
  const [endsAt, setEndsAt]       = useState(poll.endsAt ? new Date(poll.endsAt).toISOString().slice(0, 16) : '');
  const [imagePreview, setPreview] = useState(poll.imageUrl || '');
  const [imageFile, setImageFile]  = useState<File | null>(null);
  const [saving, setSaving]        = useState(false);
  const [error, setError]          = useState('');
  const imgRef                     = useRef<HTMLInputElement>(null);

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    if (!title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    setError('');
    try {
      const { data } = await api.patch(`/polls/${poll.id}`, {
        title: title.trim(),
        description: description.trim() || null,
        endsAt: endsAt || null,
      });
      if (imageFile) {
        const fd = new FormData();
        fd.append('image', imageFile);
        await api.post(`/polls/${poll.id}/image`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      onSaved({ ...data.poll, imageUrl: imageFile ? imagePreview : poll.imageUrl });
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-md bg-surface-800 border-l border-surface-700 h-full overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-700">
          <div>
            <h2 className="text-white font-semibold">Edit Poll</h2>
            <p className="text-gray-500 text-xs mt-0.5">Votes are not affected</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="flex-1 px-6 py-6 space-y-5">
          {/* Cover image */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Cover Image</label>
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

          {/* Title */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400" />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Description</label>
            <textarea value={description} onChange={(e) => setDesc(e.target.value)} rows={4}
              className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400 resize-none" />
          </div>

          {/* End date */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">End Date / Time</label>
            <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)}
              className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400" />
            {endsAt && <button type="button" onClick={() => setEndsAt('')} className="text-xs text-gray-500 hover:text-gray-300 mt-1 transition-colors">✕ Clear end date</button>}
          </div>

          <div className="text-xs text-gray-600 bg-surface-700 rounded-lg px-3 py-2">
            Poll type and voting options cannot be changed after creation — only metadata above.
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
            <div key={p.id} className="bg-surface-800 border border-surface-700 rounded-xl px-5 py-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
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
  PENDING:   'bg-yellow-500/20 text-yellow-400',
  ACTIVE:    'bg-green-500/20 text-green-400',
  PAUSED:    'bg-surface-600 text-gray-400',
  COMPLETED: 'bg-blue-500/20 text-blue-400',
  CANCELLED: 'bg-red-500/20 text-red-400',
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
  const [showAddAd, setAddAd]     = useState(false);
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
    if (view === 'ads')        loadAds();
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
              <button onClick={() => handleDeletePlacement(pl.id, pl.name)} disabled={acting === pl.id}
                className="text-xs px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-40 flex-shrink-0">
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Ads list */}
      {!loading && view === 'ads' && (
        <div className="space-y-3">
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
                        {a.status}
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

      {/* Add ad modal */}
      {showAddAd && (
        <AddAdModal
          partners={partners.filter((p) => p.status === 'APPROVED')}
          placements={placements.filter((pl) => pl.active)}
          onClose={() => setAddAd(false)}
          onCreated={(a) => { setAds((prev) => [a, ...prev]); setAddAd(false); }}
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

function AddPlacementModal({ onClose, onCreated }: { onClose: () => void; onCreated: (pl: AdminPlacement) => void }) {
  const [name, setName]         = useState('');
  const [location, setLoc]      = useState('');
  const [description, setDesc]  = useState('');
  const [pricePerDay, setPrice] = useState('');
  const [width, setWidth]       = useState('');
  const [height, setHeight]     = useState('');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  async function handleCreate() {
    if (!name.trim() || !location.trim()) { setError('Name and location key are required'); return; }
    setSaving(true); setError('');
    try {
      const { data } = await api.post('/partners/placements', { name, location, description, pricePerDay, width, height });
      onCreated(data.placement);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Create failed');
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-md bg-surface-800 border-l border-surface-700 h-full overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-700">
          <h2 className="text-white font-semibold">Add Ad Placement</h2>
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
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Width (px)</label>
              <input type="number" value={width} onChange={(e) => setWidth(e.target.value)} placeholder="728"
                className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400" />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Height (px)</label>
              <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="90"
                className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400" />
            </div>
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
          <button onClick={handleCreate} disabled={saving}
            className="flex-1 px-4 py-2 rounded-lg bg-brand-500 text-black font-semibold hover:bg-brand-400 transition-colors text-sm disabled:opacity-50">
            {saving ? 'Creating…' : 'Create Placement'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddAdModal({ partners, placements, onClose, onCreated }: {
  partners: AdminPartner[]; placements: AdminPlacement[];
  onClose: () => void; onCreated: (a: AdminAd) => void;
}) {
  const [partnerId, setPartnerId]   = useState('');
  const [placementId, setPlacement] = useState('');
  const [title, setTitle]           = useState('');
  const [body, setBody]             = useState('');
  const [linkUrl, setLinkUrl]       = useState('');
  const [startsAt, setStart]        = useState('');
  const [endsAt, setEnd]            = useState('');
  const [paidAmount, setPaid]       = useState('');
  const [notes, setNotes]           = useState('');
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');

  async function handleCreate() {
    if (!partnerId || !placementId || !title.trim() || !linkUrl.trim() || !startsAt || !endsAt) {
      setError('Partner, placement, title, link URL, start and end dates are all required');
      return;
    }
    setSaving(true); setError('');
    try {
      const { data } = await api.post('/partners/ads', {
        partnerId, placementId, title, body, linkUrl, startsAt, endsAt, paidAmount, notes,
      });
      onCreated(data.ad);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Create failed');
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-md bg-surface-800 border-l border-surface-700 h-full overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-700">
          <h2 className="text-white font-semibold">New Ad Campaign</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
        </div>
        <div className="flex-1 px-6 py-6 space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Partner *</label>
            <select value={partnerId} onChange={(e) => setPartnerId(e.target.value)}
              className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="">— select partner —</option>
              {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Placement *</label>
            <select value={placementId} onChange={(e) => setPlacement(e.target.value)}
              className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="">— select placement —</option>
              {placements.map((pl) => <option key={pl.id} value={pl.id}>{pl.name} (${pl.pricePerDay}/day)</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Ad Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Summer Drop — Camp DaddyMan Gear"
              className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Body / Tagline</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2}
              className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400 resize-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Click URL *</label>
            <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://partner.com/offer"
              className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Starts *</label>
              <input type="datetime-local" value={startsAt} onChange={(e) => setStart(e.target.value)}
                className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none" />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Ends *</label>
              <input type="datetime-local" value={endsAt} onChange={(e) => setEnd(e.target.value)}
                className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Amount Paid ($)</label>
            <input type="number" value={paidAmount} onChange={(e) => setPaid(e.target.value)} placeholder="0.00"
              className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Internal Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400 resize-none" />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
        <div className="px-6 py-5 border-t border-surface-700 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg bg-surface-700 text-gray-300 hover:bg-surface-600 transition-colors text-sm">Cancel</button>
          <button onClick={handleCreate} disabled={saving}
            className="flex-1 px-4 py-2 rounded-lg bg-brand-500 text-black font-semibold hover:bg-brand-400 transition-colors text-sm disabled:opacity-50">
            {saving ? 'Creating…' : 'Create Campaign'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Shop Tab ──────────────────────────────────────────────────────────────────

interface AdminProduct {
  id: string; name: string; slug: string; type: string; price: number;
  comparePrice?: number; status: string; featured: boolean; tags: string[];
  imageUrl?: string; description?: string;
  variants: { id: string; name: string; inventory: number; price?: number; options?: Record<string,string> }[];
}

interface AdminOrder {
  id: string; email: string; status: string; total: number; discount: number;
  trackingNumber?: string; createdAt: string;
  user?: { username: string; email: string } | null;
  items: { name: string; variantName?: string; quantity: number; price: number }[];
}

const ORDER_STATUSES = ['ALL','PENDING','PAID','PROCESSING','SHIPPED','DELIVERED','CANCELLED','REFUNDED'];
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'text-camp-400', DRAFT: 'text-yellow-400', ARCHIVED: 'text-gray-500',
  PAID: 'text-camp-400', PROCESSING: 'text-yellow-400', SHIPPED: 'text-blue-400',
  DELIVERED: 'text-brand-400', CANCELLED: 'text-red-400', REFUNDED: 'text-gray-400', PENDING: 'text-gray-400',
};

const EMPTY_PRODUCT = {
  name: '', type: 'PHYSICAL', price: '', comparePrice: '', description: '',
  imageUrl: '', status: 'DRAFT', featured: false, tags: '',
  variants: [] as { name: string; inventory: string; price: string; options?: Record<string,string> }[],
};

const VARIANT_PRESETS: Record<string, { group: string; values: string[] }> = {
  'sizes-standard': { group: 'Size',     values: ['XS', 'S', 'M', 'L', 'XL'] },
  'sizes-extended': { group: 'Size',     values: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'] },
  'colors-basic':   { group: 'Color',    values: ['Black', 'White', 'Gray', 'Navy', 'Red'] },
  'colors-extended':{ group: 'Color',    values: ['Black', 'White', 'Gray', 'Navy', 'Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Pink'] },
  'editions':       { group: 'Edition',  values: ['Standard', 'Deluxe', 'Limited Edition'] },
  'format':         { group: 'Format',   values: ['Digital', 'Physical'] },
};

function ProductFormModal({
  initial, onSave, onClose,
}: {
  initial?: AdminProduct | null;
  onSave: (p: AdminProduct) => void;
  onClose: () => void;
}) {
  const editing = !!initial;
  const [form, setForm] = useState<any>(() => {
    if (!initial) return { ...EMPTY_PRODUCT };
    return {
      name: initial.name, type: initial.type, price: String(initial.price),
      comparePrice: initial.comparePrice ? String(initial.comparePrice) : '',
      description: initial.description || '', imageUrl: initial.imageUrl || '',
      status: initial.status, featured: initial.featured,
      tags: initial.tags.join(', '),
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
  const imgInputRef = useRef<HTMLInputElement>(null);

  async function handleImageUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const { data } = await api.post('/admin/products/upload-image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setField('imageUrl', data.url);
    } catch {
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
      const existing = f.variants.filter((v: any) => v.name.trim());
      if (existing.length === 0) {
        return {
          ...f,
          variants: preset.values.map((val) => ({ name: val, inventory: '0', price: '', options: { [preset.group]: val } })),
        };
      }
      // Cross-multiply existing variants with the new group
      return {
        ...f,
        variants: existing.flatMap((e: any) =>
          preset.values.map((val) => ({
            name: `${e.name} / ${val}`,
            inventory: '0',
            price: '',
            options: { ...(e.options || {}), [preset.group]: val },
          }))
        ),
      };
    });
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
        tags: form.tags.split(',').map((t: string) => t.trim()).filter(Boolean),
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
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="ARCHIVED">Archived</option>
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
                {form.imageUrl ? (
                  <img src={form.imageUrl} alt="preview" className="w-full h-full object-cover" />
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
                  onChange={(e) => setField('imageUrl', e.target.value)}
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

          {/* Variants */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-400 font-medium">Variants</label>
              <div className="flex items-center gap-2">
                <select
                  defaultValue=""
                  onChange={(e) => { if (e.target.value) { quickAdd(e.target.value); e.target.value = ''; } }}
                  className="text-xs bg-surface-700 border border-surface-600 text-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-400"
                >
                  <option value="" disabled>Quick add…</option>
                  <optgroup label="Sizes">
                    <option value="sizes-standard">Sizes — XS, S, M, L, XL</option>
                    <option value="sizes-extended">Sizes — XS, S, M, L, XL, 2XL, 3XL, 4XL, 5XL</option>
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
                <button onClick={addVariant} className="text-xs text-brand-400 hover:text-brand-300 whitespace-nowrap">+ Custom</button>
              </div>
            </div>
            {form.variants.length === 0 && (
              <p className="text-xs text-gray-600 mb-2">No variants yet. Use Quick add or + Custom.</p>
            )}
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
            {form.variants.length > 0 && (
              <p className="text-xs text-gray-600 mt-1.5">$ overrides base price for that variant. Leave blank to use base price.</p>
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

function ShopTab() {
  const [subTab, setSubTab] = useState<'products' | 'orders'>('products');

  // ── Products state ───────────────────────────────────────────────────────────
  const [products, setProducts]   = useState<AdminProduct[]>([]);
  const [prodLoading, setProdLoad] = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editProduct, setEditProduct] = useState<AdminProduct | null>(null);

  // ── Orders state ─────────────────────────────────────────────────────────────
  const [orders, setOrders]         = useState<AdminOrder[]>([]);
  const [ordersLoading, setOrdLoad] = useState(false);
  const [orderStatus, setOrderStatus] = useState('ALL');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [trackingInput, setTrackingInput] = useState<Record<string, string>>({});
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);

  useEffect(() => {
    api.get('/admin/products').then((r) => setProducts(r.data.products)).catch(() => {}).finally(() => setProdLoad(false));
  }, []);

  useEffect(() => {
    if (subTab !== 'orders') return;
    setOrdLoad(true);
    const q = orderStatus !== 'ALL' ? `?status=${orderStatus}` : '';
    api.get(`/admin/orders${q}`).then((r) => setOrders(r.data.orders)).catch(() => {}).finally(() => setOrdLoad(false));
  }, [subTab, orderStatus]);

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

  async function updateOrder(orderId: string, payload: object) {
    setUpdatingOrder(orderId);
    try {
      const { data } = await api.patch(`/admin/orders/${orderId}`, payload);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...data.order } : o)));
    } catch {}
    setUpdatingOrder(null);
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
        {(['products', 'orders'] as const).map((t) => (
          <button key={t} onClick={() => setSubTab(t)}
            className={`px-5 py-2 rounded-xl text-sm font-medium transition-colors border ${
              subTab === t ? 'bg-brand-500 text-black border-brand-500' : 'border-surface-600 text-gray-400 hover:text-white bg-surface-800'
            }`}>
            {t === 'products' ? '📦 Products' : '🧾 Orders'}
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
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="bg-surface-800 rounded-xl h-14 animate-pulse" />)}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-4xl mb-3">🧾</p>
              <p className="text-gray-400">No orders found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const isOpen = expandedOrder === order.id;
                const colorClass = ORDER_STATUS_COLORS[order.status] || 'text-gray-400 bg-surface-700 border-surface-600';
                return (
                  <div key={order.id} className="bg-surface-800 border border-surface-700 rounded-xl overflow-hidden">
                    <button onClick={() => setExpandedOrder(isOpen ? null : order.id)}
                      className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-surface-700/40 transition-colors">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${colorClass}`}>{order.status}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium">#{order.id.slice(-8).toUpperCase()}</p>
                        <p className="text-gray-500 text-xs">{order.user?.username || order.email} · {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                      <span className="text-brand-400 font-bold text-sm">${order.total.toFixed(2)}</span>
                      <span className="text-gray-500 text-xs">{isOpen ? '▲' : '▼'}</span>
                    </button>

                    {isOpen && (
                      <div className="border-t border-surface-700 px-5 py-4 space-y-4">
                        {/* Items */}
                        <div className="space-y-1">
                          {order.items.map((item, i) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span className="text-gray-300">{item.name}{item.variantName ? ` — ${item.variantName}` : ''} ×{item.quantity}</span>
                              <span className="text-gray-400">${(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                          {order.discount > 0 && (
                            <div className="flex justify-between text-xs text-brand-400">
                              <span>Member discount</span><span>−${order.discount.toFixed(2)}</span>
                            </div>
                          )}
                        </div>

                        {/* Tracking */}
                        <div className="flex gap-2">
                          <input
                            value={trackingInput[order.id] ?? order.trackingNumber ?? ''}
                            onChange={(e) => setTrackingInput((t) => ({ ...t, [order.id]: e.target.value }))}
                            placeholder="Tracking number"
                            className="flex-1 bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-brand-400"
                          />
                          <button
                            onClick={() => updateOrder(order.id, { trackingNumber: trackingInput[order.id] ?? order.trackingNumber ?? '' })}
                            disabled={updatingOrder === order.id}
                            className="px-3 py-2 bg-surface-700 hover:bg-surface-600 border border-surface-600 text-gray-300 rounded-lg text-xs transition-colors disabled:opacity-50">
                            Save
                          </button>
                        </div>

                        {/* Status controls */}
                        <div className="flex gap-2 flex-wrap">
                          {['PROCESSING','SHIPPED','DELIVERED','CANCELLED'].map((s) => (
                            <button key={s} disabled={order.status === s || updatingOrder === order.id}
                              onClick={() => updateOrder(order.id, { status: s })}
                              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-40 ${
                                order.status === s
                                  ? 'border-brand-500 text-brand-400 bg-brand-500/10'
                                  : 'border-surface-600 text-gray-400 hover:text-white bg-surface-800'
                              }`}>
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
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
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function AdminInner() {
  const { user, loading } = useAuth();
  const router       = useRouter();
  const searchParams = useSearchParams();

  const urlTab    = searchParams.get('tab') as Tab | null;
  const urlAction = searchParams.get('action');

  const [tab, setTab]                   = useState<Tab>(urlTab || 'overview');
  const [userPlanFilter, setPlanFilter] = useState('ALL');
  const [autoCreatePoll]                = useState(urlTab === 'polls' && urlAction === 'create');

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
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          <p className="text-gray-400 text-sm mt-0.5">Camp DaddyMan platform management</p>
        </div>
        <span className="text-xs bg-brand-500 text-black px-3 py-1.5 rounded-full font-bold">Admin</span>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 mb-8 border-b border-surface-700 pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              tab === t.key
                ? 'bg-surface-800 text-white border border-surface-700 border-b-surface-800 -mb-px'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>{t.emoji}</span> {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview'  && <OverviewTab onNav={navTo} />}
      {tab === 'users'     && <UsersTab initialPlan={userPlanFilter} key={userPlanFilter} />}
      {tab === 'content'   && <ContentTab />}
      {tab === 'reports'   && <ReportsTab />}
      {tab === 'polls'     && <PollsTab autoCreate={autoCreatePoll} />}
      {tab === 'partners'  && <PartnersTab />}
      {tab === 'shop'      && <ShopTab />}
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
