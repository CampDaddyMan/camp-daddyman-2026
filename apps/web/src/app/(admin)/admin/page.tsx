'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface GrowthDay { date: string; users: number; content: number }

interface OverviewData {
  stats: { totalUsers: number; totalContent: number; activeSubscriptions: number; totalViews: number };
  planCounts: Record<string, number>;
  growth: GrowthDay[];
  recentUsers: { id: string; username: string; displayName?: string; createdAt: string; subscription?: { plan: string } | null }[];
}

interface AdminUser {
  id: string; username: string; email: string; displayName?: string;
  isAdmin: boolean; isCreator: boolean; isBanned: boolean; createdAt: string;
  subscription?: { plan: string; status: string } | null;
  _count: { content: number; followers: number };
}

interface AdminContent {
  id: string; title: string; type: string; status: string; privacy: string;
  views: number; createdAt: string;
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

type Tab = 'overview' | 'users' | 'content' | 'reports';

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

function StatCard({ label, value, emoji, sub }: { label: string; value: string | number; emoji: string; sub?: string }) {
  return (
    <div className="bg-surface-800 border border-surface-700 rounded-xl px-5 py-4">
      <div className="text-xl mb-2">{emoji}</div>
      <div className="text-2xl font-bold text-white">{typeof value === 'number' ? fmt(value) : value}</div>
      <div className="text-xs text-gray-400 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-600 mt-1">{sub}</div>}
    </div>
  );
}

// ── Plan badge ────────────────────────────────────────────────────────────────

function PlanBadge({ plan }: { plan?: string }) {
  const p = plan || 'FREE';
  const cls = p === 'PREMIUM' ? 'bg-brand-500/20 text-brand-400'
            : p === 'PRO'     ? 'bg-camp-500/20 text-camp-400'
            :                   'bg-surface-600 text-gray-400';
  return <span className={`text-xs px-2 py-0.5 rounded-full ${cls}`}>{p}</span>;
}

// ── Overview tab ──────────────────────────────────────────────────────────────

function OverviewTab() {
  const [data, setData] = useState<OverviewData | null>(null);

  useEffect(() => {
    api.get('/admin/stats').then((r) => setData(r.data)).catch(() => {});
  }, []);

  if (!data) return <div className="animate-pulse space-y-4">{Array.from({length:3}).map((_,i)=><div key={i} className="h-24 bg-surface-700 rounded-xl"/>)}</div>;

  const { stats, planCounts, growth, recentUsers } = data;
  const paidRevenue = (planCounts.PRO || 0) * 19.99 + (planCounts.PREMIUM || 0) * (99.99 / 12);

  return (
    <div className="space-y-8">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Users"       value={stats.totalUsers}          emoji="👥" />
        <StatCard label="Active Content"    value={stats.totalContent}        emoji="🎵" />
        <StatCard label="Paid Members"      value={stats.activeSubscriptions}  emoji="💳" />
        <StatCard label="Total Views"       value={stats.totalViews}          emoji="👁️" />
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
        {/* Plan breakdown */}
        <div className="bg-surface-800 border border-surface-700 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Subscription Breakdown</h3>
          <div className="space-y-3">
            {(['PREMIUM', 'PRO', 'FREE'] as const).map((plan) => {
              const count = planCounts[plan] || 0;
              const pct   = stats.totalUsers > 0 ? Math.round((count / stats.totalUsers) * 100) : 0;
              return (
                <div key={plan}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-300">{plan}</span>
                    <span className="text-gray-400">{count.toLocaleString()} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${plan === 'PREMIUM' ? 'bg-brand-400' : plan === 'PRO' ? 'bg-camp-500' : 'bg-surface-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 mt-4 pt-4 border-t border-surface-700">
            Est. MRR: <span className="text-white font-semibold">${paidRevenue.toLocaleString()}</span>
            <span className="text-gray-600 ml-1">(PRO×$19.99 + PREMIUM×$8.33/mo)</span>
          </p>
        </div>

        {/* Recent signups */}
        <div className="bg-surface-800 border border-surface-700 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Recent Signups</h3>
          <div className="space-y-2">
            {recentUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between text-sm">
                <span className="text-white">{u.displayName || u.username}</span>
                <div className="flex items-center gap-3">
                  <PlanBadge plan={u.subscription?.plan} />
                  <span className="text-gray-500 text-xs">{fmtDate(u.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Users tab ─────────────────────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers]   = useState<AdminUser[]>([]);
  const [total, setTotal]   = useState(0);
  const [pages, setPages]   = useState(1);
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState('');
  const [plan, setPlan]     = useState('ALL');
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
  const dSearch = useDebounce(search);

  function load(p: number) {
    const params: Record<string, string> = { page: String(p), limit: '20' };
    if (dSearch)       params.search = dSearch;
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

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('overview');

  useEffect(() => {
    if (!loading && (!user || !user.isAdmin)) router.push('/');
  }, [user, loading, router]);

  if (loading || !user?.isAdmin) return null;

  const TABS: { key: Tab; label: string; emoji: string }[] = [
    { key: 'overview', label: 'Overview', emoji: '📊' },
    { key: 'users',    label: 'Users',    emoji: '👥' },
    { key: 'content',  label: 'Content',  emoji: '🎵' },
    { key: 'reports',  label: 'Reports',  emoji: '⚑' },
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

      {tab === 'overview' && <OverviewTab />}
      {tab === 'users'    && <UsersTab />}
      {tab === 'content'  && <ContentTab />}
      {tab === 'reports'  && <ReportsTab />}
    </div>
  );
}
