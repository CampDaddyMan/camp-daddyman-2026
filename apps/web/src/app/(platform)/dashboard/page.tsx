'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { ContentType, ContentStatus, Privacy } from '@/types';
import Button from '@/components/ui/Button';
import { getLevel } from '@/lib/xp';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DashboardContent {
  id: string; title: string; type: ContentType;
  status: ContentStatus; privacy: Privacy;
  views: number; thumbnailUrl?: string; createdAt: string; publishAt?: string;
  _count: { likes: number; comments: number };
}

interface ActivityDay { date: string; views: number; likes: number; comments: number }

interface TipItem {
  id: string;
  amountCents: number;
  message: string | null;
  createdAt: string;
  sender: { username: string; displayName?: string; avatar?: string } | null;
}

interface EarningsData {
  totalCents: number;
  tipCount: number;
  recentTips: TipItem[];
  monthlyTotals: { label: string; cents: number }[];
}

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

// ── XP Level card ─────────────────────────────────────────────────────────────

const LEVEL_EMOJI = ['🥚', '🐛', '🫘', '🦋'] as const;
const LEVEL_COLORS = [
  'from-stone-500/20 to-stone-600/10 border-stone-600/40',
  'from-green-700/20 to-green-900/10 border-green-700/40',
  'from-violet-700/20 to-violet-900/10 border-violet-700/40',
  'from-brand-500/20 to-brand-600/10 border-brand-500/40',
] as const;

function XpCard({ xp, currentStreak, longestStreak }: { xp: number; currentStreak: number; longestStreak: number }) {
  const { index, name, nextName, nextMin, progress } = getLevel(xp);
  const i = index - 1;
  const pct = Math.round(progress * 100);

  return (
    <div className={`bg-gradient-to-br ${LEVEL_COLORS[i]} border rounded-xl p-5 mb-8`}>
      <div className="flex items-start gap-4 flex-wrap">
        <div className="text-4xl leading-none mt-0.5">{LEVEL_EMOJI[i]}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-white font-bold text-base">{name}</span>
            <span className="text-xs text-gray-500 font-mono">{xp.toLocaleString()} XP</span>
          </div>
          {nextMin !== null ? (
            <>
              <div className="w-full h-2 bg-black/30 rounded-full overflow-hidden mb-1.5">
                <div
                  className="h-full bg-brand-500 rounded-full transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-xs text-gray-500">
                {(nextMin - xp).toLocaleString()} XP to <span className="text-brand-400 font-medium">{nextName}</span>
              </p>
            </>
          ) : (
            <p className="text-xs text-brand-400 font-medium">Max level achieved 🏆</p>
          )}
        </div>

        {/* Streak */}
        <div className="flex flex-col items-center gap-0.5 flex-shrink-0 min-w-[64px]">
          <div className={`text-3xl leading-none ${currentStreak > 0 ? '' : 'opacity-30'}`}>
            🔥
          </div>
          <span className={`text-xl font-black leading-none ${currentStreak > 0 ? 'text-brand-400' : 'text-gray-600'}`}>
            {currentStreak}
          </span>
          <span className="text-[10px] text-gray-500 uppercase tracking-wide">
            {currentStreak === 1 ? 'day' : 'days'}
          </span>
          {longestStreak > 0 && (
            <span className="text-[10px] text-gray-600 mt-0.5">best {longestStreak}</span>
          )}
        </div>

        <div className="text-right flex-shrink-0 hidden sm:block">
          <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Earn XP by</p>
          <p className="text-xs text-gray-500">Watching (+10) · Liking (+2)</p>
          <p className="text-xs text-gray-500">Commenting (+5) · Following (+10)</p>
          <p className="text-xs text-gray-500">Purchasing (+25)</p>
        </div>
      </div>
    </div>
  );
}

// ── Onboarding checklist ──────────────────────────────────────────────────────

function OnboardingChecklist({
  user, contentCount, onEditProfile, onEditAvatar,
}: {
  user: any;
  contentCount: number;
  onEditProfile: () => void;
  onEditAvatar: () => void;
}) {
  const storageKey = `onboarding_done_${user.id}`;
  const [dismissed, setDismissed] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem(storageKey) === '1'
  );
  const [copied, setCopied] = useState(false);
  const [allDone, setAllDone] = useState(false);

  const steps = [
    { label: 'Set your display name', done: !!user.displayName, action: onEditProfile },
    { label: 'Add a bio',             done: !!user.bio,         action: onEditProfile },
    { label: 'Add a profile photo',   done: !!user.avatar,      action: onEditAvatar  },
    { label: 'Upload your first piece of content', done: contentCount > 0 || user.isCreator, href: '/upload' },
    { label: 'Share your profile',    done: false, share: true, hidden: !user.isCreator },
  ];

  const visibleSteps = steps.filter((s) => !s.hidden);
  const completedCount = visibleSteps.filter((s) => s.done).length;
  const pct = Math.round((completedCount / visibleSteps.length) * 100);

  useEffect(() => {
    if (completedCount === visibleSteps.length && !dismissed) {
      setAllDone(true);
      const t = setTimeout(() => {
        localStorage.setItem(storageKey, '1');
        setDismissed(true);
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [completedCount, visibleSteps.length, dismissed, storageKey]);

  function dismiss() {
    localStorage.setItem(storageKey, '1');
    setDismissed(true);
  }

  async function handleShare() {
    const url = `${window.location.origin}/creator/${user.username}`;
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (dismissed) return null;

  if (allDone) {
    return (
      <div className="bg-brand-500/10 border border-brand-500/30 rounded-xl px-6 py-4 mb-8 flex items-center gap-4">
        <span className="text-2xl">🎉</span>
        <p className="text-brand-400 font-semibold text-sm flex-1">You're all set! Your creator profile is ready.</p>
        <span className="text-xs text-gray-500">Closing in 3s…</span>
      </div>
    );
  }

  return (
    <div className="bg-surface-800 border border-surface-700 rounded-xl p-6 mb-8">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-white">🏕️ Creator Setup</h2>
          <p className="text-xs text-gray-500 mt-0.5">{completedCount} of {visibleSteps.length} complete</p>
        </div>
        <button onClick={dismiss} className="text-gray-600 hover:text-gray-400 text-lg leading-none transition-colors">×</button>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-surface-700 rounded-full mb-5 overflow-hidden">
        <div
          className="h-full bg-brand-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="space-y-2">
        {visibleSteps.map((step) => (
          <div key={step.label} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
            step.done ? 'opacity-50' : 'hover:bg-surface-700 cursor-pointer'
          }`}
            onClick={!step.done ? (step.share ? handleShare : step.href ? undefined : step.action) : undefined}
          >
            <span className={`w-5 h-5 rounded-full border flex-shrink-0 flex items-center justify-center text-xs ${
              step.done
                ? 'bg-brand-500 border-brand-500 text-black'
                : 'border-surface-500 text-transparent'
            }`}>
              {step.done && '✓'}
            </span>
            <span className={`text-sm flex-1 ${step.done ? 'text-gray-500 line-through' : 'text-white'}`}>
              {step.label}
            </span>
            {!step.done && (
              step.href ? (
                <Link href={step.href} className="text-xs text-brand-400 hover:text-brand-300 font-medium transition-colors">
                  Go →
                </Link>
              ) : step.share ? (
                <button onClick={handleShare} className="text-xs text-brand-400 hover:text-brand-300 font-medium transition-colors">
                  {copied ? 'Copied!' : 'Copy link'}
                </button>
              ) : (
                <button onClick={step.action} className="text-xs text-brand-400 hover:text-brand-300 font-medium transition-colors">
                  Edit →
                </button>
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Monthly tips bar chart ────────────────────────────────────────────────────

function TipsChart({ data }: { data: { label: string; cents: number }[] }) {
  const W = 400, H = 60, PAD = 6;
  const n = data.length;
  const barW = Math.floor((W - PAD * (n - 1)) / n);
  const maxVal = Math.max(...data.map((d) => d.cents), 1);

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H + 22}`} className="w-full" preserveAspectRatio="none" style={{ minWidth: 240 }}>
        {data.map((d, i) => {
          const barH = Math.max(2, Math.round((d.cents / maxVal) * H));
          const x = i * (barW + PAD);
          return (
            <g key={d.label}>
              <rect x={x} y={H - barH} width={barW} height={barH} fill="#f8c202" opacity={0.85} rx={2} />
              <text x={x + barW / 2} y={H + 15} textAnchor="middle" fill="#6b7280" fontSize={9}>{d.label}</text>
            </g>
          );
        })}
      </svg>
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

// ── Milestone progress card ───────────────────────────────────────────────────

const FOLLOWER_MILESTONES = [10, 25, 50, 100, 250, 500, 1000, 5000, 10000, 50000, 100000];
const VIEW_MILESTONES     = [100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000];

function nextMilestone(current: number, milestones: number[]) {
  return milestones.find((m) => m > current) ?? null;
}

function prevMilestone(current: number, milestones: number[]) {
  const passed = milestones.filter((m) => m <= current);
  return passed[passed.length - 1] ?? 0;
}

function fmtMs(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString()}M`;
  if (n >= 1_000)     return `${(n / 1_000).toLocaleString()}K`;
  return n.toLocaleString();
}

function MilestoneBar({ label, current, milestones, emoji }: { label: string; current: number; milestones: number[]; emoji: string }) {
  const next = nextMilestone(current, milestones);
  const prev = prevMilestone(current, milestones);

  if (!next) {
    return (
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span>{emoji}</span>
          <span className="text-sm font-semibold text-white">{label}</span>
          <span className="text-xs text-brand-400 font-bold ml-auto">All milestones hit! 🏆</span>
        </div>
        <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
          <div className="h-full bg-brand-500 rounded-full" style={{ width: '100%' }} />
        </div>
      </div>
    );
  }

  const progress = prev === 0 ? (current / next) : ((current - prev) / (next - prev));
  const pct = Math.min(Math.round(progress * 100), 100);

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-2">
        <span>{emoji}</span>
        <span className="text-sm font-semibold text-white">{label}</span>
        <span className="text-xs text-gray-500 ml-auto">{fmt(current)} / {fmtMs(next)}</span>
      </div>
      <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-600 mt-1.5">
        {fmtMs(next - current)} more to reach <span className="text-brand-400 font-semibold">{fmtMs(next)} {label.toLowerCase()}</span>
      </p>
    </div>
  );
}

function MilestoneProgress({ followers, views }: { followers: number; views: number }) {
  return (
    <div className="bg-surface-800 border border-surface-700 rounded-xl p-5 mb-8">
      <h2 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Milestone Progress</h2>
      <div className="flex flex-col sm:flex-row gap-6">
        <MilestoneBar label="Followers" current={followers} milestones={FOLLOWER_MILESTONES} emoji="👥" />
        <div className="hidden sm:block w-px bg-surface-700" />
        <MilestoneBar label="Views" current={views} milestones={VIEW_MILESTONES} emoji="👁️" />
      </div>
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
  const [prefs, setPrefs]           = useState({ emailNewFollower: true, emailNewContent: true, emailNewComment: true, emailNewTip: true });
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
  const [earnings, setEarnings]           = useState<EarningsData | null>(null);
  const [referralCount, setReferralCount] = useState<number | null>(null);
  const [linkCopied, setLinkCopied]       = useState(false);
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
    if ((user as any).isCreator || user.isAdmin) {
      api.get('/dashboard/earnings')
        .then((r) => setEarnings(r.data))
        .catch(() => {});
    }
    api.get('/referral')
      .then((r) => setReferralCount(r.data.count))
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

  async function handlePrefToggle(key: 'emailNewFollower' | 'emailNewContent' | 'emailNewComment' | 'emailNewTip') {
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

      {/* ── Onboarding checklist ── */}
      <OnboardingChecklist
        user={user}
        contentCount={data?.stats.totalContent ?? 0}
        onEditProfile={() => setEditOpen(true)}
        onEditAvatar={() => avatarInputRef.current?.click()}
      />

      {fetching ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-surface-700 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : data && (
        <>
          {/* ── Stats row ── */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <StatCard label="Total Views"     value={data.stats.totalViews}    emoji="👁️" />
            <StatCard label="Followers"        value={data.stats.followerCount} emoji="👥" />
            <StatCard label="Likes"            value={data.stats.totalLikes}    emoji="👍" />
            <StatCard label="Comments"         value={data.stats.totalComments} emoji="💬" />
            <StatCard label="Pieces Published" value={data.stats.totalContent}  emoji="🎵" />
          </div>

          {/* ── XP Level card ── */}
          <XpCard
            xp={(user as any).xp ?? 0}
            currentStreak={(user as any).currentStreak ?? 0}
            longestStreak={(user as any).longestStreak ?? 0}
          />

          {/* ── Milestone progress ── */}
          <MilestoneProgress followers={data.stats.followerCount} views={data.stats.totalViews} />

          {/* ── Invite friends ── */}
          {user && (
            <div className="bg-surface-800 border border-surface-700 rounded-xl p-5 mb-8 flex items-center gap-5 flex-wrap">
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold mb-0.5">Invite friends to Camp DaddyMan</p>
                <p className="text-gray-500 text-sm">Share your link — every person who joins via your link is tracked here.</p>
                {referralCount !== null && referralCount > 0 && (
                  <p className="text-brand-400 text-sm font-medium mt-1">{referralCount} referral{referralCount !== 1 ? 's' : ''} so far 🎉</p>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <div className="bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-xs text-gray-400 font-mono truncate max-w-[180px]">
                  campdaddyman.com/join/{user.username}
                </div>
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(`https://campdaddyman.com/join/${user.username}`).catch(() => {});
                    setLinkCopied(true);
                    setTimeout(() => setLinkCopied(false), 2500);
                  }}
                  className="flex-shrink-0 bg-brand-500 hover:bg-brand-400 text-black font-semibold text-xs px-4 py-2 rounded-lg transition-colors"
                >
                  {linkCopied ? '✓ Copied!' : 'Copy link'}
                </button>
              </div>
            </div>
          )}

          {/* ── Earnings section (creators only) ── */}
          {earnings && (
            <div className="bg-surface-800 border border-surface-700 rounded-xl p-6 mb-8">
              <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
                <div>
                  <h2 className="text-base font-semibold text-white">Earnings</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Gross tip income — Stripe fees deducted at payout</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-brand-400">${(earnings.totalCents / 100).toFixed(2)}</p>
                  <p className="text-xs text-gray-500">{earnings.tipCount} tip{earnings.tipCount !== 1 ? 's' : ''} all time</p>
                </div>
              </div>

              {/* Monthly chart */}
              {earnings.monthlyTotals.some((m) => m.cents > 0) ? (
                <div className="mb-6">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Monthly Tips</p>
                  <TipsChart data={earnings.monthlyTotals} />
                </div>
              ) : null}

              {/* Recent tips list */}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Recent Tips</p>
                {earnings.recentTips.length === 0 ? (
                  <p className="text-sm text-gray-600 text-center py-6">No tips received yet — share your profile to get started.</p>
                ) : (
                  <div className="space-y-1">
                    {earnings.recentTips.map((tip) => {
                      const name = tip.sender?.displayName || tip.sender?.username || 'Anonymous';
                      const secs = Math.floor((Date.now() - new Date(tip.createdAt).getTime()) / 1000);
                      const ago = secs < 3600 ? `${Math.floor(secs / 60)}m ago`
                                : secs < 86400 ? `${Math.floor(secs / 3600)}h ago`
                                : new Date(tip.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      return (
                        <div key={tip.id} className="flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-surface-700 transition-colors">
                          <div className="w-8 h-8 rounded-full bg-surface-600 flex items-center justify-center text-sm font-semibold text-white flex-shrink-0">
                            {tip.sender?.avatar
                              ? <img src={tip.sender.avatar} alt="" className="w-full h-full object-cover rounded-full" />
                              : name[0].toUpperCase()
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white font-medium">
                              {tip.sender ? (
                                <Link href={`/creator/${tip.sender.username}`} className="hover:text-brand-400 transition-colors">
                                  {name}
                                </Link>
                              ) : name}
                            </p>
                            {tip.message && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">&ldquo;{tip.message}&rdquo;</p>}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-bold text-brand-400">${(tip.amountCents / 100).toFixed(2)}</p>
                            <p className="text-xs text-gray-500">{ago}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

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
                { key: 'emailNewFollower' as const, label: 'New follower',               desc: 'Email when someone follows you' },
                { key: 'emailNewContent'  as const, label: 'New content from creators',  desc: 'Email when someone you follow posts something new' },
                { key: 'emailNewComment'  as const, label: 'New comment on your content', desc: 'Email when someone comments on your post' },
                { key: 'emailNewTip'      as const, label: 'Tip received',               desc: 'Email when someone sends you a tip' },
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
                          {c.status === 'SCHEDULED' && (
                            <span className="ml-2 text-[10px] bg-brand-500/20 text-brand-400 px-1.5 py-0.5 rounded uppercase">Scheduled</span>
                          )}
                          {c.status === 'PROCESSING' && (
                            <span className="ml-2 text-[10px] bg-surface-600 text-gray-400 px-1.5 py-0.5 rounded uppercase">Processing</span>
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
                        <td className="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell">
                          {c.status === 'SCHEDULED' && c.publishAt
                            ? <span className="text-brand-400">Publishes {fmtDate(c.publishAt)}</span>
                            : fmtDate(c.createdAt)}
                        </td>
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
