'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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

interface ActivityDay { date: string; likes: number; comments: number }

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
  FILM: 'Film', MUSIC: 'Music', PODCAST: 'Podcast', SPOKEN_WORD: 'Spoken Word',
};

const PRIVACY_LABEL: Record<Privacy, string> = {
  PUBLIC: 'Public', PRIVATE: 'Private', SUBSCRIBERS_ONLY: 'Members Only',
};

// ── Activity bar chart (pure SVG, no dependencies) ───────────────────────────

function ActivityChart({ data }: { data: ActivityDay[] }) {
  const W = 700, H = 80, PAD = 2;
  const barW = Math.floor((W - PAD * (data.length - 1)) / data.length);
  const maxVal = Math.max(...data.map((d) => d.likes + d.comments), 1);

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full" preserveAspectRatio="none" style={{ minWidth: 320 }}>
        {data.map((d, i) => {
          const total = d.likes + d.comments;
          const barH = Math.round((total / maxVal) * H);
          const likeH = Math.round((d.likes / maxVal) * H);
          const x = i * (barW + PAD);
          const isLast = i === data.length - 1;
          const isFirst = i === 0;
          const showLabel = isFirst || isLast || i === Math.floor(data.length / 2);

          return (
            <g key={d.date}>
              {/* comments (bottom layer, muted) */}
              <rect
                x={x} y={H - barH} width={barW} height={barH - likeH}
                fill="#4c1d95" opacity={0.6} rx={2}
              />
              {/* likes (top layer, brand) */}
              <rect
                x={x} y={H - likeH} width={barW} height={likeH}
                fill="#a78bfa" rx={2}
              />
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
        <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-brand-400" />Likes</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-purple-900 opacity-60" />Comments</span>
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

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [data, setData]             = useState<DashboardData | null>(null);
  const [fetching, setFetching]     = useState(true);
  const [deleting, setDeleting]     = useState<string | null>(null);
  const [editOpen, setEditOpen]     = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio]               = useState('');
  const [saving, setSaving]         = useState(false);
  const [saveMsg, setSaveMsg]       = useState('');
  const [resendSent, setResendSent] = useState(false);
  const [resending, setResending]   = useState(false);
  const [verifyDismissed, setVerifyDismissed] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName || '');
    setBio((user as any).bio || '');
    api.get('/dashboard')
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [user]);

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

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-10">
        <div>
          <h1 className="text-2xl font-bold text-white">{user.displayName || user.username}</h1>
          <p className="text-gray-400 text-sm mt-1">@{user.username}</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Link href="/upload"><Button size="md">+ Upload</Button></Link>
          {plan === 'FREE'
            ? <Link href="/subscribe"><Button variant="secondary" size="md">Upgrade</Button></Link>
            : <span className="inline-flex items-center px-4 py-2 text-sm bg-surface-700 text-brand-400 rounded-lg font-semibold border border-surface-600">{plan}</span>
          }
        </div>
      </div>

      {/* ── Upgrade banner ── */}
      {plan === 'FREE' && (
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

          {/* ── Engagement chart ── */}
          <div className="bg-surface-800 border border-surface-700 rounded-xl p-6 mb-8">
            <h2 className="text-base font-semibold text-white mb-4">Engagement — last 30 days</h2>
            {data.activity.every((d) => d.likes + d.comments === 0) ? (
              <p className="text-gray-500 text-sm py-6 text-center">No engagement data yet. Share your content to start seeing activity here.</p>
            ) : (
              <ActivityChart data={data.activity} />
            )}
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
                          <button
                            onClick={() => handleDelete(c.id, c.title)}
                            disabled={deleting === c.id}
                            className="text-xs text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                          >
                            {deleting === c.id ? '...' : 'Delete'}
                          </button>
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
