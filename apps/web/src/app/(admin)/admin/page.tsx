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

type Tab = 'overview' | 'users' | 'content' | 'reports' | 'polls';

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
  id: string; title: string; description?: string | null;
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
  const [title, setTitle]       = useState('');
  const [description, setDesc]  = useState('');
  const [endsAt, setEndsAt]     = useState('');
  const [pollType, setPollType] = useState<PollType>('CONTENT_VOTE');
  const [options, setOptions]   = useState<FlexOption[]>([blankOption(), blankOption()]);
  const [content, setContent]   = useState<ContentPick[]>([]);
  const [artists, setArtists]   = useState<ArtistPick[]>([]);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

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
      onCreated(data.poll);
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Create failed');
    } finally {
      setSaving(false);
    }
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

function PollsTab() {
  const [polls, setPolls]       = useState<AdminPoll[]>([]);
  const [loading, setLoading]   = useState(true);
  const [creating, setCreating] = useState(false);
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
    { key: 'polls',    label: 'Polls',    emoji: '🗳️' },
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
      {tab === 'polls'    && <PollsTab />}
    </div>
  );
}
