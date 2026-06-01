import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../lib/api';

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
  EGG: 'The Egg',
  CATERPILLAR: 'The Caterpillar',
  J_SHAPE: 'The J-Shape',
  CHRYSALIS: 'The Chrysalis',
  BUTTERFLY: 'The Butterfly',
};

// ── Start Screen ──────────────────────────────────────────────────────────────

function StartScreen({ onBegin, loading }: { onBegin: () => void; loading: boolean }) {
  return (
    <View style={s.centered}>
      <Text style={s.startEmoji}>🥚</Text>
      <Text style={s.startTitle}>Your journey begins today.</Text>
      <Text style={s.startSub}>One day at a time. Your pace. Your path.</Text>
      <Text style={s.startHint}>You don't need to be ready.{'\n'}You just need to begin.</Text>
      <TouchableOpacity
        style={[s.beginBtn, loading && s.btnDisabled]}
        onPress={onBegin}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading
          ? <ActivityIndicator color="#0d0d0d" />
          : <Text style={s.beginBtnText}>Begin the Journey</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

// ── Body renderer — splits on \n\n, renders — as a rule ───────────────────────

function BodyText({ text }: { text: string }) {
  const paras = text.split('\n\n');
  return (
    <View style={s.bodyBlock}>
      {paras.map((para, i) =>
        para.trim() === '—'
          ? <View key={i} style={s.hrule} />
          : <Text key={i} style={s.bodyPara}>{para}</Text>
      )}
    </View>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ label, prompt, children }: { label: string; prompt: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionLabel}>{label}</Text>
      <Text style={s.sectionPrompt}>{prompt}</Text>
      {children}
    </View>
  );
}

// ── Day Screen ────────────────────────────────────────────────────────────────

function DayScreen({
  dayNumber, day, entry,
  onSave, onComplete,
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
  const [savedFlash, setSavedFlash] = useState(false);
  const isCompleted = !!entry?.completedAt;

  async function handleSave() {
    setSaving(true);
    await onSave({ reflectionText: reflection, challengeText: challenge, journalText: journal });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
    setSaving(false);
  }

  async function handleComplete() {
    Alert.alert(
      'Mark Day Complete',
      `Mark Day ${dayNumber} complete and move on?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            setCompleting(true);
            await onSave({ reflectionText: reflection, challengeText: challenge, journalText: journal });
            await onComplete();
            setCompleting(false);
          },
        },
      ]
    );
  }

  return (
    <ScrollView
      style={s.scrollRoot}
      contentContainerStyle={s.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Phase + day header */}
      <View style={s.dayHeader}>
        <Text style={s.phaseEmoji}>{PHASE_EMOJI[day.phase] ?? '🥚'}</Text>
        <Text style={s.phaseLabel}>{PHASE_LABEL[day.phase] ?? day.phase}</Text>
        <Text style={s.dayNumber}>Day {dayNumber}</Text>
      </View>

      {isCompleted && (
        <View style={s.completedBadge}>
          <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
          <Text style={s.completedText}>Day {dayNumber} completed</Text>
        </View>
      )}

      {/* Title + lie/truth */}
      <Text style={s.dayTitle}>{day.title}</Text>
      <Text style={s.lieTruth}>
        <Text style={s.lieLabel}>The Lie: </Text>
        <Text style={s.lieText}>{day.lie}</Text>
        {'  ·  '}
        <Text style={s.truthLabel}>The Truth: </Text>
        <Text style={s.truthText}>{day.truth}</Text>
      </Text>

      {/* Body */}
      <BodyText text={day.body} />

      {/* DaddyManism */}
      <View style={s.daddyBlock}>
        <View style={s.daddyBar} />
        <Text style={s.daddyText}>"{day.daddyManism}"</Text>
      </View>

      {/* Reflection */}
      <Section label="Today's Reflection" prompt={day.reflectionPrompt}>
        <TextInput
          style={[s.input, isCompleted && s.inputDisabled]}
          value={reflection}
          onChangeText={setReflection}
          multiline
          numberOfLines={4}
          placeholder="Write here…"
          placeholderTextColor="#333"
          editable={!isCompleted}
          textAlignVertical="top"
        />
      </Section>

      {/* Challenge */}
      <Section label="Today's Challenge" prompt={day.challengePrompt}>
        <TextInput
          style={[s.input, isCompleted && s.inputDisabled]}
          value={challenge}
          onChangeText={setChallenge}
          multiline
          numberOfLines={3}
          placeholder="Write here…"
          placeholderTextColor="#333"
          editable={!isCompleted}
          textAlignVertical="top"
        />
      </Section>

      {/* Livity */}
      <Section label="Today's Livity" prompt={day.livityPrompt}>
        <Text style={s.livityNote}>
          Log your Livity act in your Dashboard after you've done it.
        </Text>
      </Section>

      {/* Journal */}
      <Section label="Journal" prompt={day.journalPrompt}>
        <TextInput
          style={[s.input, s.inputTall, isCompleted && s.inputDisabled]}
          value={journal}
          onChangeText={setJournal}
          multiline
          numberOfLines={5}
          placeholder="Write here…"
          placeholderTextColor="#333"
          editable={!isCompleted}
          textAlignVertical="top"
        />
      </Section>

      {/* Closing text */}
      <View style={s.closingBlock}>
        {day.closingText.split('\n\n').map((line, i) =>
          line.trim() === '—'
            ? <View key={i} style={s.hrule} />
            : <Text key={i} style={s.closingText}>{line}</Text>
        )}
      </View>

      {/* Actions */}
      {!isCompleted && (
        <View style={s.actions}>
          <TouchableOpacity
            style={[s.saveBtn, saving && s.btnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving
              ? <ActivityIndicator size="small" color="#f8c202" />
              : <Text style={s.saveBtnText}>{savedFlash ? '✓ Saved' : 'Save progress'}</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.completeBtn, completing && s.btnDisabled]}
            onPress={handleComplete}
            disabled={completing}
            activeOpacity={0.8}
          >
            {completing
              ? <ActivityIndicator size="small" color="#0d0d0d" />
              : <Text style={s.completeBtnText}>Mark Day {dayNumber} Complete →</Text>
            }
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 48 }} />
    </ScrollView>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function JourneyScreen() {
  const [state, setState]     = useState<JourneyState | null>(null);
  const [loading, setLoading] = useState(true);
  const [beginning, setBeginning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const { data } = await api.get('/journey');
      setState(data);
    } catch {
      setState(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, []);

  async function handleBegin() {
    setBeginning(true);
    try {
      await api.post('/journey/begin');
      await load();
    } catch {
      Alert.alert('Error', 'Could not start your journey. Please try again.');
    } finally {
      setBeginning(false);
    }
  }

  async function handleSave(fields: Partial<JourneyEntry>) {
    try {
      await api.post('/journey/entry', fields);
    } catch {
      Alert.alert('Error', 'Could not save. Please try again.');
    }
  }

  async function handleComplete() {
    try {
      await api.post('/journey/complete');
      await load();
    } catch {
      Alert.alert('Error', 'Could not complete the day. Please try again.');
    }
  }

  if (loading) {
    return (
      <View style={s.loadingRoot}>
        <ActivityIndicator size="large" color="#f8c202" />
      </View>
    );
  }

  if (!state?.started) {
    return (
      <ScrollView
        style={s.scrollRoot}
        contentContainerStyle={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f8c202" />}
      >
        <StartScreen onBegin={handleBegin} loading={beginning} />
      </ScrollView>
    );
  }

  if (!state.day) {
    return (
      <ScrollView
        style={s.scrollRoot}
        contentContainerStyle={s.centered}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f8c202" />}
      >
        <Text style={{ fontSize: 48, marginBottom: 16 }}>🥚</Text>
        <Text style={s.notReadyTitle}>Day {state.dayNumber}</Text>
        <Text style={s.notReadyText}>{state.message ?? 'This day is being written. Check back soon.'}</Text>
      </ScrollView>
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

// ── Styles ────────────────────────────────────────────────────────────────────

const GOLD   = '#f8c202';
const BG     = '#0d0d0d';
const SURF   = '#141414';
const SURF2  = '#1a1a1a';
const TEXT   = '#e5e5e5';
const MUTED  = '#888';
const DIM    = '#555';

const s = StyleSheet.create({
  scrollRoot:    { flex: 1, backgroundColor: BG },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 24 },
  loadingRoot:   { flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
  centered:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 48 },

  // Start screen
  startEmoji:    { fontSize: 64, marginBottom: 24 },
  startTitle:    { fontSize: 26, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 10 },
  startSub:      { fontSize: 15, color: MUTED, textAlign: 'center', marginBottom: 8 },
  startHint:     { fontSize: 13, color: DIM, textAlign: 'center', fontStyle: 'italic', marginBottom: 40, lineHeight: 20 },
  beginBtn:      { backgroundColor: GOLD, paddingHorizontal: 40, paddingVertical: 18, borderRadius: 18, minWidth: 220, alignItems: 'center' },
  beginBtnText:  { color: BG, fontSize: 18, fontWeight: '900' },

  // Day header
  dayHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  phaseEmoji:   { fontSize: 22, marginRight: 8 },
  phaseLabel:   { fontSize: 11, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 1.5, flex: 1 },
  dayNumber:    { fontSize: 12, color: DIM, fontFamily: 'monospace' },

  completedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 16, alignSelf: 'flex-start' },
  completedText:  { fontSize: 12, color: '#22c55e' },

  // Title + lie/truth
  dayTitle:  { fontSize: 30, fontWeight: '900', color: '#fff', marginBottom: 10, lineHeight: 36 },
  lieTruth:  { fontSize: 12, color: DIM, marginBottom: 28, lineHeight: 18 },
  lieLabel:  { color: DIM, fontStyle: 'italic' },
  lieText:   { color: MUTED, fontStyle: 'italic' },
  truthLabel:{ color: DIM, fontStyle: 'italic' },
  truthText: { color: GOLD, fontStyle: 'italic' },

  // Body
  bodyBlock: { marginBottom: 28 },
  bodyPara:  { color: TEXT, fontSize: 16, lineHeight: 26, marginBottom: 16 },
  hrule:     { height: 1, backgroundColor: SURF2, marginVertical: 20 },

  // DaddyManism
  daddyBlock: { flexDirection: 'row', alignItems: 'stretch', marginBottom: 36 },
  daddyBar:   { width: 3, backgroundColor: GOLD, borderRadius: 2, marginRight: 16 },
  daddyText:  { flex: 1, color: GOLD, fontSize: 18, fontWeight: '700', fontStyle: 'italic', lineHeight: 26 },

  // Sections
  section:       { marginBottom: 28 },
  sectionLabel:  { fontSize: 11, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 },
  sectionPrompt: { fontSize: 14, color: '#aaa', lineHeight: 21, marginBottom: 12 },

  // Inputs
  input:        { backgroundColor: SURF, borderWidth: 1, borderColor: SURF2, color: TEXT, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, lineHeight: 22, minHeight: 90 },
  inputTall:    { minHeight: 120 },
  inputDisabled:{ opacity: 0.5 },

  // Livity
  livityNote: { fontSize: 14, color: GOLD, fontWeight: '600' },

  // Closing
  closingBlock: { marginTop: 12, marginBottom: 32 },
  closingText:  { color: DIM, fontSize: 14, lineHeight: 22, fontStyle: 'italic', marginBottom: 10 },

  // Actions
  actions:      { gap: 12 },
  saveBtn:      { paddingVertical: 14, paddingHorizontal: 20, borderRadius: 14, backgroundColor: SURF, borderWidth: 1, borderColor: SURF2, alignItems: 'center' },
  saveBtnText:  { color: TEXT, fontSize: 15, fontWeight: '700' },
  completeBtn:  { paddingVertical: 16, paddingHorizontal: 20, borderRadius: 14, backgroundColor: GOLD, alignItems: 'center' },
  completeBtnText: { color: BG, fontSize: 15, fontWeight: '900' },
  btnDisabled:  { opacity: 0.5 },

  // Not ready
  notReadyTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 12 },
  notReadyText:  { fontSize: 15, color: MUTED, textAlign: 'center', lineHeight: 22 },
});
