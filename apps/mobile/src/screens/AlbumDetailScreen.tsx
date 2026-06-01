import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import api from '../lib/api';
import { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'AlbumDetail'>;

interface Track {
  id: string;          // AlbumTrack junction ID — unique per album, safe for keyExtractor
  trackNumber: number;
  discNumber: number;
  content: {
    id: string;        // actual content ID — use for navigation
    title: string;
    type: string;
    duration?: number;
    thumbnailUrl?: string;
    views: number;
    creator: { username: string; displayName?: string };
  };
}

interface AlbumDetail {
  id: string;
  title: string;
  description?: string;
  coverUrl?: string;
  genre?: string;
  releaseYear?: number;
  creator?: { username: string; displayName?: string };
  tracks: Track[];
}

function formatDuration(s: number) {
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function totalDuration(tracks: Track[]) {
  const secs = tracks.reduce((a, t) => a + (t.content?.duration ?? 0), 0);
  if (!secs) return null;
  const m = Math.floor(secs / 60);
  return `${m} min`;
}

export default function AlbumDetailScreen() {
  const route = useRoute<Props['route']>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [album, setAlbum]   = useState<AlbumDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    api.get(`/albums/${route.params.id}`)
      .then((r) => setAlbum(r.data.album ?? r.data))
      .catch(() => setError('Could not load album.'))
      .finally(() => setLoading(false));
  }, [route.params.id]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#f8c202" /></View>;
  if (error || !album) return (
    <View style={styles.center}><Text style={styles.errorText}>{error || 'Not found'}</Text></View>
  );

  const dur = totalDuration(album.tracks);

  return (
    <FlatList
      data={album.tracks}
      keyExtractor={(t) => t.id.toString()}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View>
          {/* Cover art */}
          <View style={styles.coverWrap}>
            {album.coverUrl
              ? <Image source={{ uri: album.coverUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
              : (
                <View style={styles.coverPlaceholder}>
                  <Ionicons name="disc-outline" size={64} color="#f8c202" />
                </View>
              )
            }
            <View style={styles.coverOverlay} />
          </View>

          {/* Album info */}
          <View style={styles.albumInfo}>
            <Text style={styles.albumTitle}>{album.title}</Text>
            {album.creator && (
              <TouchableOpacity onPress={() => navigation.navigate('Creator', { username: album.creator!.username })}>
                <Text style={styles.albumCreator}>{album.creator.displayName || album.creator.username}</Text>
              </TouchableOpacity>
            )}
            <View style={styles.albumMeta}>
              {album.genre && (
                <View style={styles.metaBadge}>
                  <Text style={styles.metaBadgeText}>{album.genre}</Text>
                </View>
              )}
              {album.releaseYear && (
                <View style={styles.metaBadge}>
                  <Text style={styles.metaBadgeText}>{album.releaseYear}</Text>
                </View>
              )}
              <View style={styles.metaBadge}>
                <Text style={styles.metaBadgeText}>{album.tracks.length} tracks</Text>
              </View>
              {dur && (
                <View style={styles.metaBadge}>
                  <Text style={styles.metaBadgeText}>{dur}</Text>
                </View>
              )}
            </View>
            {album.description ? (
              <Text style={styles.description}>{album.description}</Text>
            ) : null}
          </View>

          <View style={styles.tracksHeader}>
            <Text style={styles.tracksHeading}>Tracklist</Text>
            <Text style={styles.tracksCount}>{album.tracks.length}</Text>
          </View>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="musical-notes-outline" size={40} color="#333" style={{ marginBottom: 12 }} />
          <Text style={styles.emptyText}>No tracks in this album yet.</Text>
        </View>
      }
      renderItem={({ item, index }) => {
        const c = item.content;
        return (
          <TouchableOpacity
            style={styles.track}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('Watch', { id: c.id })}
            accessibilityLabel={`Track ${item.trackNumber}: ${c.title}. Tap to play.`}
            accessibilityRole="button"
          >
            <Text style={styles.trackNum}>{item.trackNumber || index + 1}</Text>
            <View style={styles.trackThumb}>
              {c.thumbnailUrl
                ? <Image source={{ uri: c.thumbnailUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                : (
                  <View style={styles.trackThumbEmpty}>
                    <Ionicons name="musical-note" size={16} color="#f8c202" />
                  </View>
                )
              }
            </View>
            <View style={styles.trackMeta}>
              <Text style={styles.trackTitle} numberOfLines={1}>{c.title}</Text>
              <Text style={styles.trackCreator} numberOfLines={1}>
                {c.creator?.displayName || c.creator?.username || ''}
              </Text>
            </View>
            <View style={styles.trackRight}>
              {c.duration != null && (
                <Text style={styles.trackDur}>{formatDuration(c.duration)}</Text>
              )}
              <View style={styles.playBtn}>
                <Ionicons name="play" size={14} color="#000" style={{ paddingLeft: 1 }} />
              </View>
            </View>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#f87171', fontSize: 15 },
  list: { backgroundColor: '#0a0a0a', paddingBottom: 40 },

  coverWrap: { width: '100%', aspectRatio: 16 / 9, maxHeight: 260, backgroundColor: '#111', position: 'relative' },
  coverPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111' },
  coverOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)' },

  albumInfo: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 8 },
  albumTitle: { color: '#fff', fontSize: 24, fontWeight: '900', lineHeight: 30, marginBottom: 6 },
  albumCreator: { color: '#f8c202', fontSize: 15, fontWeight: '700', marginBottom: 16 },
  albumMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  metaBadge: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  metaBadgeText: { color: '#aaa', fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  description: { color: '#888', fontSize: 13, lineHeight: 20, marginTop: 4 },

  tracksHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: '#161616',
    marginTop: 4,
  },
  tracksHeading: { color: '#fff', fontSize: 16, fontWeight: '800' },
  tracksCount: { color: '#555', fontSize: 13, fontWeight: '600' },

  track: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#131313',
    minHeight: 72,
  },
  trackNum: { color: '#555', fontSize: 13, fontWeight: '600', width: 24, textAlign: 'center' },
  trackThumb: { width: 52, height: 52, borderRadius: 10, overflow: 'hidden', backgroundColor: '#141414', flexShrink: 0 },
  trackThumbEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  trackMeta: { flex: 1 },
  trackTitle: { color: '#f0f0f0', fontSize: 15, fontWeight: '700', lineHeight: 20, marginBottom: 4 },
  trackCreator: { color: '#777', fontSize: 12, fontWeight: '500' },
  trackRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  trackDur: { color: '#555', fontSize: 12, fontWeight: '500' },
  playBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#f8c202',
    alignItems: 'center', justifyContent: 'center',
  },

  empty: { alignItems: 'center', paddingTop: 40 },
  emptyText: { color: '#666', fontSize: 15 },
});
