'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { ContentType, ContentStatus, Privacy } from '@/types';
import Button from '@/components/ui/Button';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DashboardContent {
  id: string; title: string; type: ContentType;
  status: ContentStatus; privacy: Privacy;
  views: number; thumbnailUrl?: string; createdAt: string;
  _count: { likes: number; comments: number };
}

interface ActivityDay { date: string; views: number; likes: number; comments: number }

interface DashboardData {
  stats: {
    totalViews: number; totalLikes: number;
    totalComments: number; totalContent: number; followerCount: number;
  };
  topContent: DashboardContent[];
  activity: ActivityDay[];
  content: DashboardContent[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const TYPE_LABEL: Record<ContentType, string> = {
  FILM: 'Film', MUSIC: 'Music', PODCAST: 'Podcast', SPOKEN_WORD: 'Spoken Word', DADDYMAN_ISMS: 'DaddyMan-Ism', BOOK: 'Book',
};

const PRIVACY_LABEL: Record<Privacy, string> = {
  PUBLIC: 'Public', PRIVATE: 'Private', SUBSCRIBERS_ONLY: 'Members Only',
};

// ── Views area chart (pure SVG) ───────────────────────────────────────────────

function ViewsChart({ data }: { data: ActivityDay[] }) {
  const W = 700, H = 90, PAD_LEFT = 4, PAD_RIGHT = 4;
  const n = data.length;
  const maxViews = Math.max(...data.map((d) => d.views), 1);

  const xPos = (i: number) => PAD_LEFT + (i / (n - 1)) * (W - PAD_LEFT - PAD_RIGHT);
  const yPos = (v: number) => H - Math.round((v / maxViews) * H);

  const linePoints = data.map((d, i) => `${xPos(i)},${yPos(d.views)}`).join(' L ');
  const areaPoints = `M ${xPos(0)},${H} L ${linePoints} L ${xPos(n - 1)},${H} Z`;

  const labelStep = n <= 7 ? 1 : n <= 30 ? Math.ceil(n / 6) : Math.ceil(n / 7);
  const totalViews = data.reduce((s, d) => s + d.views, 0);

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full" preserveAspectRatio="none" style={{ minWidth: 280 }}>
        <defs>
          <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f8c202" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#f8c202" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaPoints} fill="url(#viewsGrad)" />
        <path d={`M ${linePoints}`} fill="none" stroke="#f8c202" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => {
          if (i % labelStep !== 0 && i !== n - 1) return null;
          return (
            <text key={d.date} x={xPos(i)} y={H + 15} textAnchor="middle" fill="#6b7280" fontSize={9}>
              {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </text>
          );
        })}
      </svg>
      <p className="text-xs text-gray-500 mt-1">{totalViews.toLocaleString()} views in this period</p>
    </div>
  );
}

// ── Engagement bar chart ───────────────────────────────────────────────────────

function EngagementChart({ data }: { data: ActivityDay[] }) {
  const W = 700, H = 60, PAD = 2;
  const n = data.length;
  const barW = Math.max(2, Math.floor((W - PAD * (n - 1)) / n));
  const maxVal = Math.max(...data.map((d) => d.likes + d.comments), 1);

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ minWidth: 280 }}>
        {data.map((d, i) => {
          const total = d.likes + d.comments;
          const barH = Math.round((total / maxVal) * H);
          const likeH = Math.round((d.likes / maxVal) * H);
          const x = i * (barW + PAD);
          return (
            <g key={d.date}>
              <rect x={x} y={H - barH} width={barW} height={barH - likeH} fill="#7c3aed" opacity={0.5} rx={1} />
              <rect x={x} y={H - likeH} width={barW} height={likeH} fill="#f8c202" opacity={0.85} rx={1} />
            </g>
          );
        })}
      </svg>
      <div className="flex gap-4 mt-2 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: '#f8c202', opacity: 0.85 }} />Likes</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: '#7c3aed', opacity: 0.5 }} />Comments</span>
      </div>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, emoji }: { label: string; value: number; emoji: string }) {
  return (
    <div className="bg-surface-800 border border-surface-700 rounded-xl px-5 py-4">
      <div className="text-2xl mb-2">{emoji}</div>
      <div className="text-2xl font-bold text-white">{fmt(value)}</div>
      <div className="text-sm text-gray-400 mt-0.5">{label}</div>
    </div>
  );
}

// ── Edit content modal ────────────────────────────────────────────────────────

function EditContentModal({
  content,
  onClose,
  onSave,
}: {
  content: DashboardContent;
  onClose: () => void;
  onSave: (id: string, fields: { title: string; description: string; privacy: Privacy; tags: string }) => Promise<void>;
}) {
  const [title, setTitle]       = useState(content.title);
  const [description, setDesc]  = useState('');
  const [privacy, setPrivacy]   = useState<Privacy>(content.privacy);
  const [tags, setTags]         = useState('');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  // Load full content detail on mount
  useEffect(() => {
    api.get(`/content/${content.id}`)
      .then((r) => {
        setDesc(r.data.content.description || '');
        setTags((r.data.content.tags || []).join(', '));
      })
      .catch(() => {});
  }, [content.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setError('Title is required');
    setSaving(true);
    setError('');
    try {
      await onSave(content.id, { title: title.trim(), description, privacy, tags });
    } catch {
      setError('Failed to save. Please try again.');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div className="bg-surface-800 border border-surface-600 rounded-2xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-semibold">Edit content</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400 resize-none"
              placeholder="Describe your content..."
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Visibility</label>
            <select
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value as Privacy)}
              className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400"
            >
              <option value="PUBLIC">Public — anyone can watch</option>
              <option value="SUBSCRIBERS_ONLY">Members Only — subscribers only</option>
              <option value="PRIVATE">Private — only you</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Tags (comma-separated)</label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400"
              placeholder="reggae, motivation, live"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="submit" size="sm" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</Button>
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, loading, refresh } = useAuth();
  const router = useRouter();

  const [data, setData]             = useState<DashboardData | null>(null);
  const [fetching, setFetching]     = useState(true);
  const [days, setDays]             = useState<7 | 30 | 90>(30);
  const [prefs, setPrefs]           = useState({ emailNewFollower: true, emailNewContent: true });
  const [prefSaving, setPrefSaving] = useState(false);
  const [deleting, setDeleting]     = useState<string | null>(null);
  const [editOpen, setEditOpen]     = useState(false);
  const [editingContent, setEditingContent] = useState<DashboardContent | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio]               = useState('');
  const [saving, setSaving]         = useState(false);
  const [saveMsg, setSaveMsg]       = useState('');
  const [resendSent, setResendSent] = useState(false);
  const [resending, setResending]   = useState(false);
  const [verifyDismissed, setVerifyDismissed] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName || '');
    setBio((user as any).bio || '');
    setFetching(true);
    api.get('/dashboard', { params: { days } })
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setFetching(false));
    api.get('/notifications/preferences')
      .then((r) => setPrefs(r.data))
      .catch(() => {});
  }, [user, days]);

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setDeleting(id);
    await api.delete(`/content/${id}`).catch(() => {});
    setData((prev) => prev ? {
      ...prev,
      content: prev.content.filter((c) => c.id !== id),
      topContent: prev.topContent.filter((c) => c.id !== id),
      stats: { ...prev.stats, totalContent: prev.stats.totalContent - 1 },
    } : prev);
    setDeleting(null);
  }

  async function handleSaveEdit(id: string, fields: { title: string; description: string; privacy: Privacy; tags: string }) {
    await api.patch(`/content/${id}`, fields);
    setData((prev) => prev ? {
      ...prev,
      content: prev.content.map((c) => c.id === id ? {
        ...c,
        title: fields.title,
        privacy: fields.privacy,
      } : c),
      topContent: prev.topContent.map((c) => c.id === id ? {
        ...c,
        title: fields.title,
        privacy: fields.privacy,
      } : c),
    } : prev);
    setEditingContent(null);
  }

  async function handleSaveProfile() {
    setSaving(true);
    setSaveMsg('');
    try {
      await api.put('/auth/me', { displayName, bio });
      setSaveMsg('Saved!');
      setTimeout(() => setSaveMsg(''), 2500);
    } catch {
      setSaveMsg('Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const form = new FormData();
      form.append('avatar', file);
      await api.post('/auth/me/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      await refresh();
    } catch {}
    finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  }

  async function handlePrefToggle(key: 'emailNewFollower' | 'emailNewContent') {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    setPrefSaving(true);
    await api.put('/notifications/preferences', updated).catch(() => setPrefs(prefs));
    setPrefSaving(false);
  }

  async function handleManageBilling() {
    setPortalLoading(true);
    try {
      const { data } = await api.post('/subscriptions/portal');
      window.location.href = data.url;
    } catch { setPortalLoading(false); }
  }

  async function handleResend() {
    setResending(true);
    try {
      await api.post('/auth/resend-verification');
      setResendSent(true);
    } catch {}
    finally { setResending(false); }
  }

  if (loading || !user) return null;

  const plan = user.subscription?.plan || 'FREE';
  const periodEnd = user.subscription?.currentPeriodEnd;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">

      {/* ── Edit modal ── */}
      {editingContent && (
        <EditContentModal
          content={editingContent}
          onClose={() => setEditingContent(null)}
          onSave={handleSaveEdit}
        />
      )}

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-10">
        <div>
          <h1 className="text-2xl font-bold text-white">{user.displayName || user.username}</h1>
          <p className="text-gray-400 text-sm mt-1">@{user.username}</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Link href="/shop/orders"><Button variant="secondary" size="md">My Orders</Button></Link>
          <Link href="/upload"><Button size="md">+ Upload</Button></Link>
          {!user.isAdmin && !user.isTester && (
            plan === 'FREE'
              ? <Link href="/subscribe"><Button variant="secondary" size="md">Upgrade</Button></Link>
              : (
                <button
                  onClick={handleManageBilling}
                  disabled={portalLoading}
                  className="inline-flex items-center px-4 py-2 text-sm bg-surface-700 text-brand-400 rounded-lg font-semibold border border-surface-600 hover:bg-surface-600 transition-colors disabled:opacity-50"
                >
                  {portalLoading ? 'Redirecting...' : `${plan} · Manage`}
                </button>
              )
          )}
        </div>
      </div>

      {/* ── Upgrade banner ── */}
      {plan === 'FREE' && !user.isAdmin && !user.isTester && (
        <div className="bg-brand-500/10 border border-brand-500/30 rounded-xl px-6 py-4 mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-brand-400 font-semibold text-sm">Free plan</p>
            <p className="text-gray-400 text-sm mt-0.5">Upgrade to unlock members-only content and more storage.</p>
          </div>
          <Link href="/subscribe"><Button size="sm">See plans</Button></Link>
        </div>
      )}

      {/* ── Email verification banner ── */}
      {!user.emailVerified && !verifyDismissed && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-6 py-4 mb-8 flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-yellow-400 font-semibold text-sm">Verify your email address</p>
            {resendSent ? (
              <p className="text-gray-400 text-sm mt-0.5">Verification email sent — check your inbox (and spam folder).</p>
            ) : (
              <p className="text-gray-400 text-sm mt-0.5">
                Check your inbox for a verification link. Didn't get it?{' '}
                <button
                  onClick={handleResend}
                  disabled={resending}
                  className="text-yellow-400 hover:underline disabled:opacity-50"
                >
                  {resending ? 'Sending...' : 'Resend email'}
                </button>
              </p>
            )}
          </div>
          <button
            onClick={() => setVerifyDismissed(true)}
            className="text-gray-500 hover:text-gray-300 text-lg leading-none mt-0.5"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {fetching ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-surface-700 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : data && (
        <>
          {/* ── Stats row ── */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
            <StatCard label="Total Views"     value={data.stats.totalViews}    emoji="👁️" />
            <StatCard label="Followers"        value={data.stats.followerCount} emoji="👥" />
            <StatCard label="Likes"            value={data.stats.totalLikes}    emoji="👍" />
            <StatCard label="Comments"         value={data.stats.totalComments} emoji="💬" />
            <StatCard label="Pieces Published" value={data.stats.totalContent}  emoji="🎵" />
          </div>

          {/* ── Analytics charts ── */}
          <div className="bg-surface-800 border border-surface-700 rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <h2 className="text-base font-semibold text-white">Analytics</h2>
              <div className="flex gap-1 bg-surface-700 rounded-lg p-0.5">
                {([7, 30, 90] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDays(d)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      days === d ? 'bg-brand-500 text-black' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Views</p>
              {data.activity.every((d) => d.views === 0) ? (
                <p className="text-gray-600 text-sm py-4 text-center">No views logged in this period yet.</p>
              ) : (
                <ViewsChart data={data.activity} />
              )}
            </div>

            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Engagement</p>
              {data.activity.every((d) => d.likes + d.comments === 0) ? (
                <p className="text-gray-600 text-sm py-4 text-center">No likes or comments in this period.</p>
              ) : (
                <EngagementChart data={data.activity} />
              )}
            </div>
          </div>

          {/* ── Top content + profile side by side ── */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">

            {/* Top content */}
            <div className="bg-surface-800 border border-surface-700 rounded-xl p-6">
              <h2 className="text-base font-semibold text-white mb-4">Top Performing</h2>
              {data.topContent.length === 0 ? (
                <p className="text-gray-500 text-sm">Upload content to see performance data.</p>
              ) : (
                <div className="space-y-3">
                  {data.topContent.map((c, i) => (
                    <Link key={c.id} href={`/watch/${c.id}`} className="flex items-center gap-3 group">
                      <span className="text-xs font-bold text-gray-500 w-4 flex-shrink-0">{i + 1}</span>
                      <div className="w-14 h-9 rounded-md bg-surface-600 overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {c.thumbnailUrl
                          ? <img src={c.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                          : <span className="text-lg">🎵</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate group-hover:text-brand-400 transition-colors">{c.title}</p>
                        <p className="text-xs text-gray-500">{TYPE_LABEL[c.type]}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-white">{fmt(c.views)}</p>
                        <p className="text-xs text-gray-500">views</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Profile editor */}
            <div className="bg-surface-800 border border-surface-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-white">Profile</h2>
                <button
                  onClick={() => setEditOpen(!editOpen)}
                  className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
                >
                  {editOpen ? 'Cancel' : 'Edit'}
                </button>
              </div>

              {/* Avatar */}
              <div className="flex justify-center mb-5">
                <div className="relative group">
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={avatarUploading}
                    className="relative w-20 h-20 rounded-full overflow-hidden bg-surface-600 flex items-center justify-center text-3xl focus:outline-none"
                    title="Change avatar"
                  >
                    {user.avatar ? (
                      <Image src={user.avatar} alt={user.username} fill className="object-cover" />
                    ) : (
                      <span>{(user.displayName || user.username)[0].toUpperCase()}</span>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                      <span className="text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                        {avatarUploading ? '...' : 'Change'}
                      </span>
                    </div>
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>
              </div>

              {editOpen ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Display name</label>
                    <input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
                      placeholder="Your display name"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Bio</label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={3}
                      className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400 resize-none"
                      placeholder="Tell people about yourself..."
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Button size="sm" onClick={handleSaveProfile} disabled={saving}>
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                    {saveMsg && <span className="text-xs text-brand-400">{saveMsg}</span>}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500">Display name</p>
                    <p className="text-sm text-white mt-0.5">{user.displayName || <span className="text-gray-500 italic">Not set</span>}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Username</p>
                    <p className="text-sm text-white mt-0.5">@{user.username}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm text-white mt-0.5">{user.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Subscription</p>
                    <p className="text-sm text-white mt-0.5">
                      {plan}
                      {periodEnd && plan !== 'FREE' && (
                        <span className="text-gray-500 text-xs ml-2">renews {fmtDate(periodEnd)}</span>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Notification preferences ── */}
          <div className="bg-surface-800 border border-surface-700 rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white">Email Notifications</h2>
              {prefSaving && <span className="text-xs text-gray-500">Saving…</span>}
            </div>
            <div className="space-y-4">
              {[
                { key: 'emailNewFollower' as const, label: 'New follower', desc: 'Email when someone follows you' },
                { key: 'emailNewContent'  as const, label: 'New content from creators',  desc: 'Email when someone you follow posts something new' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-white font-medium">{label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                  </div>
                  <button
                    onClick={() => handlePrefToggle(key)}
                    disabled={prefSaving}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-60 ${
                      prefs[key] ? 'bg-brand-500' : 'bg-surface-600'
                    }`}
                    role="switch"
                    aria-checked={prefs[key]}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                        prefs[key] ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* ── Content table ── */}
          <div className="bg-surface-800 border border-surface-700 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-700">
              <h2 className="text-base font-semibold text-white">All Content</h2>
              <span className="text-xs text-gray-500">{data.content.length} piece{data.content.length !== 1 ? 's' : ''}</span>
            </div>

            {data.content.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">🎬</p>
                <p className="text-gray-400 mb-4">Nothing uploaded yet.</p>
                <Link href="/upload"><Button>Upload your first piece</Button></Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-700 text-left">
                      <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Title</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide hidden md:table-cell">Type</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide hidden md:table-cell">Privacy</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide text-right">Views</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide text-right hidden sm:table-cell">Likes</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide hidden lg:table-cell">Published</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-700">
                    {data.content.map((c) => (
                      <tr key={c.id} className="hover:bg-surface-750 transition-colors group">
                        <td className="px-6 py-3">
                          <Link href={`/watch/${c.id}`} className="text-white hover:text-brand-400 transition-colors font-medium line-clamp-1">
                            {c.title}
                          </Link>
                          {c.status !== 'ACTIVE' && (
                            <span className="ml-2 text-[10px] bg-surface-600 text-gray-400 px-1.5 py-0.5 rounded uppercase">{c.status}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{TYPE_LABEL[c.type]}</td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            c.privacy === 'PUBLIC' ? 'bg-green-900/40 text-green-400' :
                            c.privacy === 'SUBSCRIBERS_ONLY' ? 'bg-brand-900/40 text-brand-400' :
                            'bg-surface-600 text-gray-400'
                          }`}>
                            {PRIVACY_LABEL[c.privacy]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-white font-medium">{fmt(c.views)}</td>
                        <td className="px-4 py-3 text-right text-gray-400 hidden sm:table-cell">{c._count.likes}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell">{fmtDate(c.createdAt)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setEditingContent(c)}
                              className="text-xs text-gray-400 hover:text-brand-400 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(c.id, c.title)}
                              disabled={deleting === c.id}
                              className="text-xs text-gray-600 hover:text-red-400 transition-colors disabled:opacity-50"
                            >
                              {deleting === c.id ? '...' : 'Delete'}
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
        </>
      )}
    </div>
  );
}
