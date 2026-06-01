import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Linking, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import api from '../lib/api';

const { width: SW } = Dimensions.get('window');

interface LiveStream {
  id: string;
  title: string;
  description?: string;
  status: string;
  viewerCount?: number;
  thumbnailUrl?: string;
  playbackUrl?: string;
  creator?: { username: string; displayName?: string };
}

const STATUS_LABEL: Record<string, string> = {
  LIVE: 'LIVE',
  UPCOMING: 'UPCOMING',
  ENDED: 'ENDED',
};

export default function LiveScreen() {
  const [streams, setStreams]        = useState<LiveStream[]>([]);
  const [loading, setLoading]        = useState(true);
  const [refreshing, setRefreshing]  = useState(false);
  const [error, setError]            = useState('');

  function load(isRefresh = false) {
    if (!isRefresh) setLoading(true);
    setError('');
    api.get('/live')
      .then((r) => setStreams(r.data.streams ?? r.data ?? []))
      .catch(() => setError('Could not load live streams.'))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }

  useEffect(() => { load(); }, []);

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#f8c202" />
    </View>
  );

  const liveCount = streams.filter((s) => s.status === 'LIVE').length;

  return (
    <FlatList
      data={streams}
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
          <View style={styles.headerLeft}>
            <View style={styles.liveDot} />
            <Text style={styles.heading}>Live</Text>
          </View>
          {liveCount > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{liveCount} streaming now</Text>
            </View>
          )}
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <>
              <Ionicons name="radio-outline" size={56} color="#2a2a2a" style={{ marginBottom: 18 }} />
              <Text style={styles.emptyTitle}>No live streams right now</Text>
              <Text style={styles.emptySub}>Camp DaddyMan goes live regularly.{'\n'}Pull down to check again.</Text>
            </>
          )}
        </View>
      }
      renderItem={({ item }) => {
        const isLive = item.status === 'LIVE';
        const canPlay = !!item.playbackUrl;
        return (
          <TouchableOpacity
            style={[styles.card, !canPlay && styles.cardDisabled]}
            activeOpacity={canPlay ? 0.82 : 1}
            disabled={!canPlay}
            onPress={() => item.playbackUrl && Linking.openURL(item.playbackUrl)}
          >
            {/* Thumbnail */}
            <View style={styles.thumb}>
              {item.thumbnailUrl ? (
                <Image source={{ uri: item.thumbnailUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <View style={styles.thumbPlaceholder}>
                  <Ionicons name="radio-outline" size={48} color="#2a2a2a" />
                </View>
              )}
              <View style={styles.thumbOverlay} />

              {/* Status badge */}
              <View style={[styles.statusBadge, isLive && styles.statusBadgeLive]}>
                {isLive && <View style={styles.statusDot} />}
                <Text style={styles.statusText}>{STATUS_LABEL[item.status] ?? item.status}</Text>
              </View>

              {/* Viewer count */}
              {isLive && item.viewerCount != null && (
                <View style={styles.viewerBadge}>
                  <Ionicons name="eye-outline" size={11} color="#fff" />
                  <Text style={styles.viewerText}>{item.viewerCount.toLocaleString()}</Text>
                </View>
              )}

              {/* Play overlay */}
              {canPlay && (
                <View style={styles.playOverlay}>
                  <Ionicons name="play-circle" size={52} color="rgba(248,194,2,0.9)" />
                </View>
              )}
            </View>

            {/* Meta */}
            <View style={styles.meta}>
              <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
              {item.creator && (
                <View style={styles.creatorRow}>
                  <View style={styles.creatorAvatar}>
                    <Text style={styles.creatorAvatarText}>
                      {(item.creator.displayName || item.creator.username).charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.creator}>
                    {item.creator.displayName || item.creator.username}
                  </Text>
                </View>
              )}
              {item.description ? (
                <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
              ) : null}
            </View>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center' },
  list: { backgroundColor: '#0a0a0a', paddingBottom: 40 },

  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 18,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444' },
  heading: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  countBadge: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  countText: { color: '#ef4444', fontSize: 12, fontWeight: '700' },

  card: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#111',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1c1c1c',
  },
  cardDisabled: { opacity: 0.6 },

  thumb: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#141414',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbPlaceholder: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f0f0f',
  },
  thumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  statusBadgeLive: { backgroundColor: '#ef4444' },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  viewerBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  viewerText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },

  meta: { padding: 14 },
  title: { color: '#f0f0f0', fontSize: 17, fontWeight: '700', lineHeight: 23, marginBottom: 10 },
  creatorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  creatorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1e1e1e',
    borderWidth: 1,
    borderColor: '#f8c202',
    alignItems: 'center',
    justifyContent: 'center',
  },
  creatorAvatarText: { color: '#f8c202', fontSize: 11, fontWeight: '800' },
  creator: { color: '#999', fontSize: 13, fontWeight: '500' },
  description: { color: '#777', fontSize: 13, lineHeight: 19 },

  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 10 },
  emptySub: { color: '#666', fontSize: 14, textAlign: 'center', lineHeight: 22 },
  errorText: { color: '#f87171', fontSize: 14, textAlign: 'center' },
});
