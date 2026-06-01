import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Image, ActivityIndicator, Share,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import api from '../lib/api';

// ── Types ──────────────────────────────────────────────────────────────────────

interface TopItem {
  id: string; title: string; type: string;
  thumbnailUrl?: string; progress: number;
  creator: { username: string; displayName: string };
}

interface WrappedData {
  year: number;
  empty: boolean;
  totalItems: number;
  totalSeconds: number;
  topContent: TopItem[];
  topCreator: { username: string; displayName: string; seconds: number; count: number } | null;
  topType: string | null;
  typeStats: Record<string, { count: number; seconds: number }>;
  firstContent: (TopItem & { watchedAt: string }) | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtTime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const TYPE_EMOJI: Record<string, string> = {
  MUSIC: '🎵', FILM: '🎬', PODCAST: '🎙️', SPOKEN_WORD: '📖',
  DADDYMAN_ISMS: '✊', BOOK: '📚',
};

const TYPE_LABEL: Record<string, string> = {
  MUSIC: 'Music', FILM: 'Film', PODCAST: 'Podcast',
  SPOKEN_WORD: 'Spoken Word', DADDYMAN_ISMS: 'DaddyMan-Isms', BOOK: 'Books',
};

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function WrappedScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [year]    = useState(new Date().getFullYear());
  const [data, setData]     = useState<WrappedData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/content/wrapped?year=${year}`)
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [year]);

  async function handleShare() {
    if (!data || data.empty) return;
    const h = Math.floor(data.totalSeconds / 3600);
    const m = Math.floor((data.totalSeconds % 3600) / 60);
    const timeStr = h > 0 ? `${h} hours and ${m} minutes` : `${m} minutes`;
    const text =
      `My ${data.year} Camp DaddyMan Wrapped:\n` +
      `🎧 ${data.totalItems} titles across ${timeStr}\n` +
      (data.topType ? `${TYPE_EMOJI[data.topType] || '🎵'} Mostly ${TYPE_LABEL[data.topType] || data.topType}\n` : '') +
      (data.topContent[0] ? `🏆 Top pick: "${data.topContent[0].title}"\n` : '') +
      `\ncampdaddyman.com`;
    await Share.share({ message: text });
  }

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color="#f8c202" size="large" />
      </View>
    );
  }

  if (!data || data.empty) {
    return (
      <View style={s.center}>
        <Text style={s.emptyEmoji}>🎵</Text>
        <Text style={s.emptyTitle}>Nothing to show yet</Text>
        <Text style={s.emptySub}>Start watching & listening to build your {year} Wrapped.</Text>
      </View>
    );
  }

  const sortedTypes = Object.entries(data.typeStats).sort((a, b) => b[1].seconds - a[1].seconds);

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {/* Hero card */}
      <View style={s.hero}>
        <Text style={s.heroYear}>Your {data.year}</Text>
        <Text style={s.heroTitle}>Wrapped.</Text>
        <View style={s.heroStats}>
          <View style={s.heroStat}>
            <Text style={s.heroStatValue}>{fmtTime(data.totalSeconds)}</Text>
            <Text style={s.heroStatLabel}>of Camp DaddyMan</Text>
          </View>
          <View style={s.heroDivider} />
          <View style={s.heroStat}>
            <Text style={s.heroStatValue}>{data.totalItems}</Text>
            <Text style={s.heroStatLabel}>{data.totalItems === 1 ? 'title' : 'titles'} explored</Text>
          </View>
        </View>
      </View>

      {/* Quick stats row */}
      <View style={s.statsRow}>
        {data.topType && (
          <View style={[s.statCard, { flex: 1 }]}>
            <Text style={s.statLabel}>Top format</Text>
            <Text style={s.statValue}>{TYPE_EMOJI[data.topType] || '🎵'} {TYPE_LABEL[data.topType] || data.topType}</Text>
            <Text style={s.statSub}>{fmtTime(data.typeStats[data.topType]?.seconds ?? 0)}</Text>
          </View>
        )}
        {data.topCreator && (
          <View style={[s.statCard, { flex: 1 }]}>
            <Text style={s.statLabel}>Top creator</Text>
            <Text style={s.statValue} numberOfLines={1}>{data.topCreator.displayName}</Text>
            <Text style={s.statSub}>{data.topCreator.count} titles</Text>
          </View>
        )}
      </View>

      {/* First watched */}
      {data.firstContent && (
        <View style={s.firstCard}>
          <Text style={s.sectionLabel}>First played in {data.year}</Text>
          <TouchableOpacity
            style={s.firstRow}
            onPress={() => navigation.navigate('Watch', { id: data.firstContent!.id })}
            activeOpacity={0.75}
          >
            {data.firstContent.thumbnailUrl ? (
              <Image source={{ uri: data.firstContent.thumbnailUrl }} style={s.firstThumb} />
            ) : (
              <View style={[s.firstThumb, s.firstThumbFallback]}>
                <Text style={s.thumbEmoji}>{TYPE_EMOJI[data.firstContent.type] || '🎵'}</Text>
              </View>
            )}
            <View style={s.firstInfo}>
              <Text style={s.firstTitle} numberOfLines={2}>{data.firstContent.title}</Text>
              <Text style={s.firstCreator}>{data.firstContent.creator.displayName}</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Type breakdown */}
      {sortedTypes.length > 1 && (
        <View style={s.section}>
          <Text style={s.sectionLabel}>Your mix</Text>
          {sortedTypes.map(([type, stats]) => {
            const pct = data.totalSeconds > 0 ? Math.round((stats.seconds / data.totalSeconds) * 100) : 0;
            return (
              <View key={type} style={s.typeRow}>
                <Text style={s.typeEmoji}>{TYPE_EMOJI[type] || '🎵'}</Text>
                <View style={s.typeInfo}>
                  <View style={s.typeLabelRow}>
                    <Text style={s.typeName}>{TYPE_LABEL[type] || type}</Text>
                    <Text style={s.typeTime}>{fmtTime(stats.seconds)}</Text>
                  </View>
                  <View style={s.barBg}>
                    <View style={[s.barFill, { width: `${pct}%` }]} />
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Top 5 */}
      {data.topContent.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionLabel}>Your top {data.topContent.length}</Text>
          {data.topContent.map((item, i) => (
            <TouchableOpacity
              key={item.id}
              style={s.topItem}
              onPress={() => navigation.navigate('Watch', { id: item.id })}
              activeOpacity={0.75}
            >
              <Text style={s.topRank}>#{i + 1}</Text>
              {item.thumbnailUrl ? (
                <Image source={{ uri: item.thumbnailUrl }} style={s.topThumb} />
              ) : (
                <View style={[s.topThumb, s.topThumbFallback]}>
                  <Text style={s.thumbEmoji}>{TYPE_EMOJI[item.type] || '🎵'}</Text>
                </View>
              )}
              <View style={s.topInfo}>
                <Text style={s.topTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={s.topCreator}>{item.creator.displayName}</Text>
              </View>
              <Text style={s.topTime}>{fmtTime(item.progress)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Share button */}
      <TouchableOpacity style={s.shareBtn} onPress={handleShare} activeOpacity={0.85}>
        <Text style={s.shareBtnText}>Share your {data.year} Wrapped</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { padding: 16, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a', padding: 32 },

  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 8 },
  emptySub: { color: '#555', fontSize: 14, textAlign: 'center', lineHeight: 22 },

  hero: {
    borderRadius: 24,
    overflow: 'hidden',
    padding: 28,
    marginBottom: 16,
    backgroundColor: '#1a0a00',
    borderWidth: 1,
    borderColor: '#f8c202',
  },
  heroYear: { color: 'rgba(248,194,2,0.6)', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 },
  heroTitle: { color: '#f8c202', fontSize: 44, fontWeight: '900', marginBottom: 24 },
  heroStats: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  heroStat: { flex: 1 },
  heroStatValue: { color: '#fff', fontSize: 32, fontWeight: '900', lineHeight: 36 },
  heroStatLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 },
  heroDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.1)' },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  statCard: {
    backgroundColor: '#111', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#1e1e1e',
  },
  statLabel: { color: '#555', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 },
  statValue: { color: '#fff', fontSize: 16, fontWeight: '800', marginBottom: 2 },
  statSub: { color: '#555', fontSize: 11 },

  firstCard: {
    backgroundColor: '#111', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#1e1e1e', marginBottom: 10,
  },
  firstRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  firstThumb: { width: 56, height: 56, borderRadius: 10 },
  firstThumbFallback: { backgroundColor: '#1e1e1e', alignItems: 'center', justifyContent: 'center' },
  firstInfo: { flex: 1 },
  firstTitle: { color: '#e8e8e8', fontSize: 15, fontWeight: '700', marginBottom: 2 },
  firstCreator: { color: '#555', fontSize: 12 },
  thumbEmoji: { fontSize: 22 },

  section: {
    backgroundColor: '#111', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#1e1e1e', marginBottom: 10,
  },
  sectionLabel: { color: '#555', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 },

  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  typeEmoji: { fontSize: 22, width: 28 },
  typeInfo: { flex: 1 },
  typeLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  typeName: { color: '#ccc', fontSize: 13, fontWeight: '600' },
  typeTime: { color: '#555', fontSize: 12 },
  barBg: { height: 4, backgroundColor: '#1e1e1e', borderRadius: 2, overflow: 'hidden' },
  barFill: { height: 4, backgroundColor: '#f8c202', borderRadius: 2 },

  topItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#191919',
  },
  topRank: { color: '#f8c202', fontSize: 18, fontWeight: '900', width: 32, textAlign: 'center' },
  topThumb: { width: 44, height: 44, borderRadius: 8 },
  topThumbFallback: { backgroundColor: '#1e1e1e', alignItems: 'center', justifyContent: 'center' },
  topInfo: { flex: 1 },
  topTitle: { color: '#e8e8e8', fontSize: 13, fontWeight: '700', marginBottom: 2 },
  topCreator: { color: '#555', fontSize: 11 },
  topTime: { color: '#555', fontSize: 11 },

  shareBtn: {
    backgroundColor: '#f8c202', borderRadius: 20,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  shareBtnText: { color: '#000', fontSize: 16, fontWeight: '800' },
});
