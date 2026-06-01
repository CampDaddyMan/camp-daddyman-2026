import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import api from '../lib/api';
import { getLevel } from '../lib/xp';
import { RootStackParamList } from '../navigation/RootNavigator';

interface DashboardData {
  totalContent: number;
  totalViews: number;
  followerCount: number;
  recentLikes: number;
  recentComments: number;
  recentViews: number;
  content: {
    id: string;
    title: string;
    type: string;
    views: number;
    status: string;
    _count: { likes: number; comments: number };
  }[];
}

interface XpData {
  xp: number;
  currentStreak: number;
  longestStreak: number;
  index: number;
  name: string;
  identity: string;
  emoji: string;
  nextName: string | null;
  nextMin: number | null;
  progress: number;
  isJShape: boolean;
  isMaxLevel: boolean;
}

interface LivityAct {
  id: string;
  type: string;
  description: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  witnessNote?: string | null;
  createdAt: string;
}

const LIVITY_TYPES = [
  { value: 'GOOD',           label: 'Conscious Living' },
  { value: 'CREATION',       label: 'Creation' },
  { value: 'PRESERVATION',   label: 'Preservation' },
  { value: 'RECONCILIATION', label: 'Healing' },
];

const LIVITY_STATUS_COLOR: Record<string, string> = {
  PENDING:  '#f8c202',
  APPROVED: '#4ade80',
  REJECTED: '#f87171',
};

function LivitySection({ onSubmit }: { onSubmit: (type: string, desc: string) => Promise<LivityAct> }) {
  const [acts, setActs]     = useState<LivityAct[]>([]);
  const [open, setOpen]     = useState(false);
  const [type, setType]     = useState('GOOD');
  const [desc, setDesc]     = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/livity')
      .then((r) => setActs(r.data.acts ?? []))
      .catch(() => {});
  }, []);

  async function handleSubmit() {
    if (desc.trim().length < 10) {
      Alert.alert('Too short', 'Describe your Livity in at least 10 characters.');
      return;
    }
    setSaving(true);
    try {
      const act = await onSubmit(type, desc.trim());
      setActs((prev) => [act, ...prev]);
      setDesc('');
      setOpen(false);
    } catch {
      Alert.alert('Error', 'Failed to submit. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={gdStyles.container}>
      <View style={gdStyles.header}>
        <View>
          <Text style={gdStyles.title}>Livity</Text>
          <Text style={gdStyles.sub}>Your righteous living, witnessed</Text>
        </View>
        <TouchableOpacity onPress={() => setOpen((v) => !v)} style={gdStyles.logBtn}>
          <Text style={gdStyles.logBtnText}>{open ? 'Cancel' : '+ Log Livity'}</Text>
        </TouchableOpacity>
      </View>

      {open && (
        <View style={gdStyles.form}>
          <View style={gdStyles.typeRow}>
            {LIVITY_TYPES.map((t) => (
              <TouchableOpacity
                key={t.value}
                onPress={() => setType(t.value)}
                style={[gdStyles.typeChip, type === t.value && gdStyles.typeChipActive]}
              >
                <Text style={[gdStyles.typeChipText, type === t.value && gdStyles.typeChipTextActive]} numberOfLines={2}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            value={desc}
            onChangeText={setDesc}
            placeholder="Describe your Livity — what you did, where, who was touched by it…"
            placeholderTextColor="#444"
            multiline
            maxLength={1000}
            style={gdStyles.input}
          />
          <TouchableOpacity onPress={handleSubmit} disabled={saving} style={[gdStyles.submitBtn, saving && { opacity: 0.5 }]}>
            <Text style={gdStyles.submitBtnText}>{saving ? 'Submitting…' : 'Submit for witnessing'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {acts.length > 0 && (
        <View style={gdStyles.historyList}>
          {acts.map((a) => (
            <View key={a.id} style={gdStyles.actRow}>
              <View style={[gdStyles.statusDot, { backgroundColor: LIVITY_STATUS_COLOR[a.status] ?? '#888' }]} />
              <View style={{ flex: 1 }}>
                <Text style={gdStyles.actType}>
                  {LIVITY_TYPES.find((t) => t.value === a.type)?.label ?? a.type}
                </Text>
                <Text style={gdStyles.actDesc} numberOfLines={2}>{a.description}</Text>
                {a.witnessNote && (
                  <Text style={gdStyles.witnessNote} numberOfLines={2}>Elder: "{a.witnessNote}"</Text>
                )}
              </View>
              <Text style={gdStyles.actStatus}>{a.status}</Text>
            </View>
          ))}
        </View>
      )}

      {acts.length === 0 && !open && (
        <Text style={gdStyles.empty}>No Livity logged yet.</Text>
      )}
    </View>
  );
}

const gdStyles = StyleSheet.create({
  container: {
    marginHorizontal: 14, marginBottom: 10,
    backgroundColor: '#111', borderRadius: 18, borderWidth: 1, borderColor: '#1e1e1e', padding: 18,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { color: '#fff', fontSize: 14, fontWeight: '800' },
  sub: { color: '#555', fontSize: 11, marginTop: 2 },
  logBtn: { backgroundColor: '#f8c202', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  logBtnText: { color: '#000', fontSize: 12, fontWeight: '800' },
  form: { marginBottom: 12 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  typeChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#2a2a2a',
  },
  typeChipActive: { backgroundColor: 'rgba(248,194,2,0.12)', borderColor: 'rgba(248,194,2,0.5)' },
  typeChipText: { color: '#666', fontSize: 11, fontWeight: '600' },
  typeChipTextActive: { color: '#f8c202' },
  input: {
    backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#2a2a2a',
    borderRadius: 12, padding: 14, color: '#fff', fontSize: 13, minHeight: 90,
    textAlignVertical: 'top', marginBottom: 10,
  },
  submitBtn: {
    backgroundColor: '#f8c202', borderRadius: 12,
    paddingVertical: 13, alignItems: 'center',
  },
  submitBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },
  historyList: { borderTopWidth: 1, borderTopColor: '#1a1a1a', paddingTop: 12, gap: 10 },
  actRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5, flexShrink: 0 },
  actType: { color: '#f8c202', fontSize: 11, fontWeight: '700', marginBottom: 2 },
  actDesc: { color: '#ccc', fontSize: 13, lineHeight: 18 },
  witnessNote: { color: '#666', fontSize: 11, fontStyle: 'italic', marginTop: 3 },
  actStatus: { color: '#555', fontSize: 10, fontWeight: '700', flexShrink: 0, marginTop: 3 },
  empty: { color: '#444', fontSize: 13, textAlign: 'center', paddingVertical: 8 },
});

const TYPE_ICON: Record<string, string> = {
  FILM: 'film-outline',
  MUSIC: 'musical-notes-outline',
  PODCAST: 'mic-outline',
  SPOKEN_WORD: 'chatbubble-outline',
};

const TYPE_COLOR: Record<string, string> = {
  FILM: '#60a5fa',
  MUSIC: '#f8c202',
  PODCAST: '#a78bfa',
  SPOKEN_WORD: '#4ade80',
};

// ── XP Card ───────────────────────────────────────────────────────────────────

function XpCard({ xp: xpData }: { xp: XpData }) {
  const { xp, currentStreak, longestStreak, name, identity, emoji, nextName, nextMin, progress, isJShape, isMaxLevel } = xpData;
  const pct = Math.round(progress * 100);

  const cardBg   = isJShape ? '#1a1200' : '#111';
  const cardBorder = isJShape ? 'rgba(248,194,2,0.35)' : '#1e1e1e';
  const accentColor = isJShape ? '#f8c202' : '#f8c202';

  return (
    <View style={[styles.xpCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      <View style={styles.xpCardRow}>
        {/* Emoji + level info */}
        <View style={styles.xpLeft}>
          <Text style={styles.xpEmoji}>{emoji}</Text>
          <View>
            <Text style={styles.xpName}>{name}</Text>
            <Text style={styles.xpIdentity}>{identity}</Text>
          </View>
        </View>

        {/* Streak */}
        <View style={styles.xpStreakWrap}>
          <Text style={[styles.xpStreakFire, currentStreak === 0 && { opacity: 0.25 }]}>🔥</Text>
          <Text style={[styles.xpStreakCount, { color: currentStreak > 0 ? accentColor : '#444' }]}>
            {currentStreak}
          </Text>
          <Text style={styles.xpStreakLabel}>{currentStreak === 1 ? 'day' : 'days'}</Text>
          {longestStreak > 0 && (
            <Text style={styles.xpStreakBest}>best {longestStreak}</Text>
          )}
        </View>
      </View>

      {/* XP amount */}
      {!isJShape && (
        <Text style={styles.xpAmount}>{xp.toLocaleString()} XP</Text>
      )}

      {/* Progress bar */}
      {!isJShape && !isMaxLevel && nextMin !== null && (
        <>
          <View style={styles.xpBarTrack}>
            <View style={[styles.xpBarFill, { width: `${pct}%` }]} />
          </View>
          <Text style={styles.xpBarLabel}>
            {(nextMin - xp).toLocaleString()} XP to{' '}
            <Text style={{ color: accentColor }}>{nextName}</Text>
          </Text>
        </>
      )}

      {/* J-Shape special message */}
      {isJShape && (
        <View style={styles.xpJShapeMsg}>
          <Ionicons name="person-outline" size={13} color="#f8c202" />
          <Text style={styles.xpJShapeMsgText}>
            An Elder will meet you here. Log your Livity below.
          </Text>
        </View>
      )}

      {/* Max level */}
      {isMaxLevel && (
        <Text style={[styles.xpBarLabel, { color: accentColor }]}>Max level achieved 🏆</Text>
      )}
    </View>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, color = '#f8c202', bg,
}: {
  icon: string; label: string; value: number; color?: string; bg?: string;
}) {
  return (
    <View style={[styles.statCard, bg ? { backgroundColor: bg } : {}]}>
      <View style={[styles.statIconWrap, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={[styles.statValue, { color }]}>{value.toLocaleString()}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [data, setData]             = useState<DashboardData | null>(null);
  const [xpData, setXpData]         = useState<XpData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState('');

  async function submitLivity(type: string, description: string): Promise<LivityAct> {
    const { data } = await api.post('/livity', { type, description });
    return data.act;
  }

  function load(isRefresh = false) {
    if (!isRefresh) setLoading(true);
    setError('');
    Promise.all([
      api.get('/dashboard'),
      api.get('/xp'),
    ]).then(([dashRes, xpRes]) => {
      const d = dashRes.data;
      setData({
        totalContent:   d.totalContent ?? d.content?.length ?? 0,
        totalViews:     d.totalViews ?? 0,
        followerCount:  d.followerCount ?? 0,
        recentLikes:    d.recentLikes ?? d.likesLast30 ?? 0,
        recentComments: d.recentComments ?? d.commentsLast30 ?? 0,
        recentViews:    d.recentViews ?? d.viewsLast30 ?? 0,
        content:        d.content ?? [],
      });
      const x = xpRes.data;
      const computed = getLevel(x.xp ?? 0);
      setXpData({
        xp:            x.xp ?? 0,
        currentStreak: x.currentStreak ?? 0,
        longestStreak: x.longestStreak ?? 0,
        index:         x.index ?? computed.index,
        name:          x.name ?? computed.name,
        identity:      x.identity ?? computed.identity,
        emoji:         x.emoji ?? computed.emoji,
        nextName:      x.nextName ?? computed.nextName,
        nextMin:       x.nextMin ?? computed.nextMin,
        progress:      x.progress ?? computed.progress,
        isJShape:      x.isJShape ?? computed.isJShape,
        isMaxLevel:    x.isMaxLevel ?? computed.isMaxLevel,
      });
    }).catch(() => setError('Could not load dashboard.'))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }

  useEffect(() => { load(); }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#f8c202" /></View>;
  if (error || !data) return (
    <View style={styles.center}><Text style={styles.errorText}>{error || 'Error loading dashboard'}</Text></View>
  );

  return (
    <ScrollView
      style={styles.scroll}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor="#f8c202" />}
    >
      {/* Page header */}
      <View style={styles.pageHeader}>
        <Text style={styles.heading}>Dashboard</Text>
        <Text style={styles.headingSub}>Your creator stats</Text>
      </View>

      {/* XP / Level card */}
      {xpData && (
        <>
          <Text style={styles.sectionLabel}>Transformation Level</Text>
          <View style={styles.xpCardWrap}>
            <XpCard xp={xpData} />
          </View>
        </>
      )}

      {/* Livity — visible at Caterpillar (index 2) and above */}
      {xpData && xpData.index >= 2 && (
        <LivitySection onSubmit={submitLivity} />
      )}

      {/* All-time stats */}
      <Text style={styles.sectionLabel}>All Time</Text>
      <View style={styles.statsGrid}>
        <StatCard icon="play-circle-outline" label="Content" value={data.totalContent} color="#f8c202" />
        <StatCard icon="eye-outline" label="Total Views" value={data.totalViews} color="#60a5fa" />
        <StatCard icon="people-outline" label="Followers" value={data.followerCount} color="#4ade80" />
      </View>

      {/* Last 30 days */}
      <Text style={styles.sectionLabel}>Last 30 Days</Text>
      <View style={styles.statsGrid}>
        <StatCard icon="eye-outline" label="Views" value={data.recentViews} color="#60a5fa" />
        <StatCard icon="heart-outline" label="Likes" value={data.recentLikes} color="#f87171" />
        <StatCard icon="chatbubble-outline" label="Comments" value={data.recentComments} color="#a78bfa" />
      </View>

      {/* Content list */}
      <View style={styles.contentHeader}>
        <Text style={styles.sectionLabel}>Your Content</Text>
        <Text style={styles.contentCount}>{data.content.length} piece{data.content.length !== 1 ? 's' : ''}</Text>
      </View>

      {data.content.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="cloud-upload-outline" size={48} color="#2a2a2a" style={{ marginBottom: 14 }} />
          <Text style={styles.emptyTitle}>No content yet</Text>
          <Text style={styles.emptySub}>Upload your first piece to start growing your audience.</Text>
        </View>
      ) : (
        <View style={styles.contentList}>
          {data.content.map((item) => {
            const iconName  = TYPE_ICON[item.type] ?? 'play-outline';
            const iconColor = TYPE_COLOR[item.type] ?? '#f8c202';
            const isActive  = item.status === 'ACTIVE';
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.contentRow}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Watch', { id: item.id })}
              >
                <View style={[styles.typeIconWrap, { backgroundColor: `${iconColor}14` }]}>
                  <Ionicons name={iconName as any} size={16} color={iconColor} />
                </View>
                <View style={styles.contentMeta}>
                  <Text style={styles.contentTitle} numberOfLines={1}>{item.title}</Text>
                  <View style={styles.contentStatsRow}>
                    <Ionicons name="eye-outline" size={11} color="#555" />
                    <Text style={styles.contentStat}>{item.views.toLocaleString()}</Text>
                    <Ionicons name="heart-outline" size={11} color="#555" style={{ marginLeft: 8 }} />
                    <Text style={styles.contentStat}>{item._count.likes}</Text>
                    <Ionicons name="chatbubble-outline" size={11} color="#555" style={{ marginLeft: 8 }} />
                    <Text style={styles.contentStat}>{item._count.comments}</Text>
                  </View>
                </View>
                <View style={[styles.statusPill, isActive ? styles.statusActive : styles.statusDraft]}>
                  <Text style={[styles.statusText, isActive && styles.statusTextActive]}>
                    {item.status}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color="#2a2a2a" />
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#0a0a0a' },
  center: { flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#f87171', fontSize: 14 },

  pageHeader: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 6 },
  heading: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  headingSub: { color: '#555', fontSize: 13, marginTop: 3 },

  sectionLabel: {
    color: '#3a3a3a',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginHorizontal: 18,
    marginTop: 22,
    marginBottom: 12,
  },
  contentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 18 },
  contentCount: { color: '#555', fontSize: 12, fontWeight: '600' },

  // ── XP card ────────────────────────────────────────────────────────────────
  xpCardWrap: { paddingHorizontal: 14 },
  xpCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
  xpCardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  xpLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  xpEmoji: { fontSize: 40, lineHeight: 46 },
  xpName: { color: '#fff', fontSize: 16, fontWeight: '800', marginBottom: 2 },
  xpIdentity: { color: '#555', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  xpAmount: { color: '#888', fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'], marginBottom: 10 },
  xpBarTrack: {
    height: 6, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden', marginBottom: 8,
  },
  xpBarFill: { height: '100%', backgroundColor: '#f8c202', borderRadius: 3 },
  xpBarLabel: { color: '#555', fontSize: 11, fontWeight: '600' },
  xpStreakWrap: { alignItems: 'center', minWidth: 52 },
  xpStreakFire: { fontSize: 24, lineHeight: 28 },
  xpStreakCount: { fontSize: 22, fontWeight: '900', lineHeight: 26 },
  xpStreakLabel: { color: '#555', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 },
  xpStreakBest: { color: '#333', fontSize: 10, marginTop: 2 },
  xpJShapeMsg: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  xpJShapeMsgText: { color: '#888', fontSize: 12, flex: 1, lineHeight: 17 },

  // ── Stats ──────────────────────────────────────────────────────────────────
  statsGrid: { flexDirection: 'row', paddingHorizontal: 14, gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  statIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  statValue: { fontSize: 24, fontWeight: '900', marginBottom: 4, letterSpacing: -0.5 },
  statLabel: { color: '#666', fontSize: 11, fontWeight: '600', textAlign: 'center' },

  // ── Content list ───────────────────────────────────────────────────────────
  contentList: { borderTopWidth: 1, borderTopColor: '#141414', marginHorizontal: 0 },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 0,
    minHeight: 64,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
  },
  typeIconWrap: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  contentMeta: { flex: 1 },
  contentTitle: { color: '#f0f0f0', fontSize: 14, fontWeight: '600', marginBottom: 5 },
  contentStatsRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  contentStat: { color: '#555', fontSize: 11, fontWeight: '500' },
  statusPill: {
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20,
    backgroundColor: '#161616', borderWidth: 1, borderColor: '#222',
  },
  statusActive: { backgroundColor: 'rgba(74,222,128,0.1)', borderColor: 'rgba(74,222,128,0.25)' },
  statusDraft: {},
  statusText: { color: '#555', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  statusTextActive: { color: '#4ade80' },

  empty: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 32 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySub: { color: '#666', fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
