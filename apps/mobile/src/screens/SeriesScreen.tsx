import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import api from '../lib/api';
import { RootStackParamList } from '../navigation/RootNavigator';

interface Series {
  id: string;
  title: string;
  description?: string;
  coverUrl?: string;
  bannerUrl?: string;
  genre?: string;
  status: string;
  creator?: { username: string; displayName?: string };
  _count?: { seasons: number };
}

export default function SeriesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [items, setItems]           = useState<Series[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState('');

  function load(isRefresh = false) {
    if (!isRefresh) setLoading(true);
    setError('');
    api.get('/series')
      .then((r) => setItems(r.data.series ?? r.data.items ?? r.data ?? []))
      .catch(() => setError('Could not load series.'))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }

  useEffect(() => { load(); }, []);

  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" color="#f8c202" /></View>
  );

  return (
    <FlatList
      data={items}
      keyExtractor={(i) => i.id.toString()}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(true); }}
          tintColor="#f8c202"
        />
      }
      ListHeaderComponent={
        <View style={styles.pageHeader}>
          <Text style={styles.heading}>Series</Text>
          <Text style={styles.headingSub}>
            {items.length === 0
              ? 'New shows coming soon'
              : `${items.length} show${items.length !== 1 ? 's' : ''} available`}
          </Text>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          {error ? (
            <>
              <Ionicons name="cloud-offline-outline" size={56} color="#2a2a2a" style={{ marginBottom: 18 }} />
              <Text style={styles.emptyTitle}>Couldn't load series</Text>
              <Text style={styles.emptySub}>{error}{'\n'}Pull down to retry.</Text>
            </>
          ) : (
            <>
              <Ionicons name="film-outline" size={56} color="#2a2a2a" style={{ marginBottom: 18 }} />
              <Text style={styles.emptyTitle}>No series yet</Text>
              <Text style={styles.emptySub}>Original shows are on the way.{'\n'}Pull down to refresh.</Text>
            </>
          )}
        </View>
      }
      renderItem={({ item }) => {
        const imgUrl = item.bannerUrl ?? item.coverUrl;
        const seasons = item._count?.seasons ?? 0;

        return (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.88}
            onPress={() => navigation.navigate('SeriesDetail', { id: item.id })}
            accessibilityLabel={`${item.title}${seasons > 0 ? `, ${seasons} season${seasons !== 1 ? 's' : ''}` : ''}. Tap to watch.`}
            accessibilityRole="button"
          >
            {/* ── Artwork: nothing overlaid ──────────────────────────── */}
            <View style={styles.banner}>
              {imgUrl ? (
                <Image
                  source={{ uri: imgUrl }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.bannerPlaceholder}>
                  <Ionicons name="film-outline" size={52} color="#2a2a2a" />
                </View>
              )}
            </View>

            {/* ── All info sits BELOW the artwork ───────────────────── */}
            <View style={styles.infoBlock}>

              {/* Genre + season count as small pills */}
              {(item.genre || seasons > 0) && (
                <View style={styles.pillRow}>
                  {item.genre ? (
                    <View style={styles.genrePill}>
                      <Text style={styles.genreText}>{item.genre}</Text>
                    </View>
                  ) : null}
                  {seasons > 0 && (
                    <View style={styles.seasonPill}>
                      <Text style={styles.seasonText}>
                        {seasons} Season{seasons !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              <Text style={styles.title}>{item.title}</Text>

              {item.creator && (
                <Text style={styles.creator}>
                  {item.creator.displayName || item.creator.username}
                </Text>
              )}

              {item.description ? (
                <Text style={styles.description} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}

              <TouchableOpacity
                style={styles.watchBtn}
                onPress={() => navigation.navigate('SeriesDetail', { id: item.id })}
                accessibilityLabel={`Watch ${item.title}`}
              >
                <Ionicons name="play-circle" size={16} color="#000" />
                <Text style={styles.watchBtnText}>Watch Now</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center' },
  list: { backgroundColor: '#0a0a0a', paddingBottom: 48 },

  pageHeader: { paddingHorizontal: 18, paddingTop: 22, paddingBottom: 20 },
  heading: { color: '#fff', fontSize: 30, fontWeight: '900', letterSpacing: -0.5 },
  headingSub: { color: '#555', fontSize: 14, fontWeight: '500', marginTop: 4 },

  card: {
    marginHorizontal: 16,
    marginBottom: 32,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },

  // ── Artwork: pure image, nothing on top ──────────────────────
  banner: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#141414',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#141414',
  },

  // ── Info block below the image ────────────────────────────────
  infoBlock: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },

  pillRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  genrePill: {
    backgroundColor: 'rgba(248,194,2,0.12)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(248,194,2,0.3)',
  },
  genreText: {
    color: '#f8c202',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  seasonPill: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  seasonText: { color: '#aaa', fontSize: 10, fontWeight: '600' },

  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 26,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  creator: {
    color: '#f8c202',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    color: '#888',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16,
  },
  watchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#f8c202',
    alignSelf: 'flex-start',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    marginTop: 4,
  },
  watchBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },

  // ── Empty / error ─────────────────────────────────────────────
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  emptySub: { color: '#555', fontSize: 15, textAlign: 'center', lineHeight: 23 },
});
