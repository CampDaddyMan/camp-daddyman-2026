'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface JourneyDay {
  dayNumber: number;
  phase: string;
  title: string;
  lie: string;
  truth: string;
  body: string;
  daddyManism: string;
  reflectionPrompt: string;
  challengePrompt: string;
  livityPrompt: string;
  journalPrompt: string;
  closingText: string;
}

interface JourneyEntry {
  reflectionText?: string | null;
  challengeText?: string | null;
  journalText?: string | null;
  completedAt?: string | null;
}

interface JourneyState {
  started: boolean;
  dayNumber?: number;
  day?: JourneyDay | null;
  entry?: JourneyEntry | null;
  message?: string;
}

const PHASE_EMOJI: Record<string, string> = {
  EGG: '🥚', CATERPILLAR: '🐛', J_SHAPE: '🔄', CHRYSALIS: '🫘', BUTTERFLY: '🦋',
};

const PHASE_LABEL: Record<string, string> = {
  EGG: 'The Egg', CATERPILLAR: 'The Caterpillar', J_SHAPE: 'The J-Shape',
  CHRYSALIS: 'The Chrysalis', BUTTERFLY: 'The Butterfly',
};

// ── Start screen ──────────────────────────────────────────────────────────────

function StartScreen({ onBegin }: { onBegin: () => Promise<void> }) {
  const [loading, setLoading] = useState(false);

  async function handleBegin() {
    setLoading(true);
    await onBegin();
    setLoading(false);
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        <div className="text-6xl mb-8">🥚</div>
        <h1 className="text-3xl font-black text-white mb-4 leading-tight">
          Your journey begins today.
        </h1>
        <p className="text-gray-400 text-lg mb-3">365 days. One day at a time.</p>
        <p className="text-gray-500 mb-10">Your pace. Your path.</p>
        <p className="text-gray-600 text-sm mb-10 italic">
          You don't need to be ready.<br />You just need to begin.
        </p>
        <button
          onClick={handleBegin}
          disabled={loading}
          className="bg-brand-500 text-black font-black text-lg px-10 py-4 rounded-2xl hover:bg-brand-400 transition-colors disabled:opacity-50"
        >
          {loading ? 'Beginning…' : 'Begin the Journey'}
        </button>
      </div>
    </div>
  );
}

// ── Day screen ────────────────────────────────────────────────────────────────

function DayScreen({
  dayNumber, day, entry, onSave, onComplete,
}: {
  dayNumber: number;
  day: JourneyDay;
  entry: JourneyEntry | null;
  onSave: (fields: Partial<JourneyEntry>) => Promise<void>;
  onComplete: () => Promise<void>;
}) {
  const [reflection, setReflection] = useState(entry?.reflectionText ?? '');
  const [challenge, setChallenge]   = useState(entry?.challengeText ?? '');
  const [journal, setJournal]       = useState(entry?.journalText ?? '');
  const [saving, setSaving]         = useState(false);
  const [completing, setCompleting] = useState(false);
  const [saved, setSaved]           = useState(false);
  const isCompleted = !!entry?.completedAt;

  async function handleSave() {
    setSaving(true);
    await onSave({ reflectionText: reflection, challengeText: challenge, journalText: journal });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setSaving(false);
  }

  async function handleComplete() {
    if (!confirm('Mark this day complete and move to the next?')) return;
    setCompleting(true);
    await onSave({ reflectionText: reflection, challengeText: challenge, journalText: journal });
    await onComplete();
    setCompleting(false);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">

      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{PHASE_EMOJI[day.phase] ?? '🥚'}</span>
        <span className="text-gray-500 text-sm font-semibold uppercase tracking-widest">
          {PHASE_LABEL[day.phase] ?? day.phase}
        </span>
        <span className="ml-auto text-gray-600 text-sm font-mono">Day {dayNumber}</span>
      </div>

      {isCompleted && (
        <div className="mb-6 text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-2 flex items-center gap-2">
          ✓ Day {dayNumber} completed
        </div>
      )}

      {/* Title */}
      <h1 className="text-3xl font-black text-white mb-1 leading-tight">{day.title}</h1>
      <p className="text-gray-600 text-xs uppercase tracking-wider mb-8">
        The Lie: <span className="text-gray-500 italic">{day.lie}</span>
        <span className="mx-2">·</span>
        The Truth: <span className="text-brand-400 italic">{day.truth}</span>
      </p>

      {/* Body */}
      <div className="prose prose-invert prose-sm max-w-none mb-8 space-y-4">
        {day.body.split('\n\n').map((para, i) => (
          para === '—'
            ? <hr key={i} className="border-surface-700 my-6" />
            : <p key={i} className="text-gray-300 leading-relaxed whitespace-pre-line">{para}</p>
        ))}
      </div>

      {/* DaddyManism */}
      <div className="border-l-2 border-brand-500 pl-5 py-1 mb-10">
        <p className="text-brand-400 font-bold text-lg italic">
          &ldquo;{day.daddyManism}&rdquo;
        </p>
      </div>

      {/* Reflection */}
      <Section label="Today's Reflection" prompt={day.reflectionPrompt}>
        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          rows={4}
          disabled={isCompleted}
          placeholder="Write here…"
          className="w-full bg-surface-900 border border-surface-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 resize-none placeholder:text-gray-700 disabled:opacity-60"
        />
      </Section>

      {/* Challenge */}
      <Section label="Today's Challenge" prompt={day.challengePrompt}>
        <textarea
          value={challenge}
          onChange={(e) => setChallenge(e.target.value)}
          rows={3}
          disabled={isCompleted}
          placeholder="Write here…"
          className="w-full bg-surface-900 border border-surface-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 resize-none placeholder:text-gray-700 disabled:opacity-60"
        />
      </Section>

      {/* Livity */}
      <Section label="Today's Livity" prompt={day.livityPrompt}>
        <a
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-brand-400 hover:text-brand-300 font-semibold transition-colors"
        >
          + Log your Livity →
        </a>
      </Section>

      {/* Journal */}
      <Section label="Journal" prompt={day.journalPrompt}>
        <textarea
          value={journal}
          onChange={(e) => setJournal(e.target.value)}
          rows={5}
          disabled={isCompleted}
          placeholder="Write here…"
          className="w-full bg-surface-900 border border-surface-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 resize-none placeholder:text-gray-700 disabled:opacity-60"
        />
      </Section>

      {/* Closing */}
      <div className="mt-10 mb-8 space-y-3">
        {day.closingText.split('\n\n').map((line, i) => (
          line === '—'
            ? <hr key={i} className="border-surface-700" />
            : <p key={i} className="text-gray-500 text-sm leading-relaxed italic whitespace-pre-line">{line}</p>
        ))}
      </div>

      {/* Actions */}
      {!isCompleted && (
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-surface-700 border border-surface-600 text-gray-300 text-sm font-semibold hover:bg-surface-600 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save progress'}
          </button>
          <button
            onClick={handleComplete}
            disabled={completing}
            className="px-6 py-2.5 rounded-xl bg-brand-500 text-black font-black text-sm hover:bg-brand-400 transition-colors disabled:opacity-50"
          >
            {completing ? 'Completing…' : `Mark Day ${dayNumber} Complete →`}
          </button>
        </div>
      )}
    </div>
  );
}

function Section({ label, prompt, children }: { label: string; prompt: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-2">{label}</h3>
      <p className="text-gray-400 text-sm leading-relaxed mb-3">{prompt}</p>
      {children}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function JourneyPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<JourneyState | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    api.get('/journey')
      .then((r) => setState(r.data))
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [user]);

  async function handleBegin() {
    await api.post('/journey/begin');
    const { data } = await api.get('/journey');
    setState(data);
  }

  async function handleSave(fields: Partial<JourneyEntry>) {
    await api.post('/journey/entry', fields);
  }

  async function handleComplete() {
    const { data } = await api.post('/journey/complete');
    const next = await api.get('/journey');
    setState(next.data);
    if (data.nextDay) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  if (loading || fetching || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!state?.started) {
    return <StartScreen onBegin={handleBegin} />;
  }

  if (!state.day) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 text-center">
        <div>
          <p className="text-4xl mb-4">🥚</p>
          <p className="text-white font-bold text-xl mb-2">Day {state.dayNumber}</p>
          <p className="text-gray-500">{state.message ?? 'This day is being written. Check back soon.'}</p>
        </div>
      </div>
    );
  }

  return (
    <DayScreen
      dayNumber={state.dayNumber!}
      day={state.day}
      entry={state.entry ?? null}
      onSave={handleSave}
      onComplete={handleComplete}
    />
  );
}
