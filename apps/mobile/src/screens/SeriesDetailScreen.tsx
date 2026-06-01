import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import api from '../lib/api';
import { RootStackParamList } from '../navigation/RootNavigator';

const { width: SW } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'SeriesDetail'>;

interface Episode {
  id: string;
  title: string;
  type?: string;
  description?: string;
  episodeNumber: number;
  thumbnailUrl?: string;
  duration?: number;
  mediaUrl?: string;
  hlsUrl?: string;
}

interface Season {
  id: string;
  title: string;
  number: number;
  coverUrl?: string;
  episodes: Episode[];
}

interface SeriesDetail {
  id: string;
  title: string;
  description?: string;
  coverUrl?: string;
  bannerUrl?: string;
  trailerUrl?: string;
  genre?: string;
  creator?: { username: string; displayName?: string };
  seasons: Season[];
}

function formatDuration(s: number) {
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function SeriesDetailScreen() {
  const route = useRoute<Props['route']>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [series, setSeries] = useState<SeriesDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [openSeason, setOpenSeason] = useState<string | null>(null);
  const [showTrailer, setShowTrailer] = useState(false);

  useEffect(() => {
    api.get(`/series/${route.params.id}`)
      .then((r) => {
        const s = r.data.series ?? r.data;
        setSeries(s);
        if (s.seasons?.length > 0) setOpenSeason(s.seasons[0].id);
      })
      .catch(() => setError('Could not load series.'))
      .finally(() => setLoading(false));
  }, [route.params.id]);

  const trailerPlayer = useVideoPlayer(
    showTrailer && series?.trailerUrl ? series.trailerUrl : null,
    (p) => { p.loop = false; p.play(); },
  );

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#f8c202" /></View>;
  if (error || !series) return <View style={styles.center}><Text style={styles.errorText}>{error || 'Not found'}</Text></View>;

  function playEpisode(ep: Episode, season: Season) {
    if (!ep.mediaUrl && !ep.hlsUrl) return;

    // Build a flat ordered list to find the next episode
    const flat: { ep: Episode; season: Season }[] = [];
    for (const s of series!.seasons) {
      for (const e of s.episodes) flat.push({ ep: e, season: s });
    }
    const idx = flat.findIndex(({ ep: e }) => e.id === ep.id);
    const nextEntry = idx !== -1 && idx < flat.length - 1 ? flat[idx + 1] : null;

    navigation.navigate('EpisodePlayer', {
      id:            ep.id,
      title:         ep.title,
      type:          ep.type,
      mediaUrl:      ep.mediaUrl,
      hlsUrl:        ep.hlsUrl,
      thumbnailUrl:  ep.thumbnailUrl,
      description:   ep.description,
      seriesTitle:   series!.title,
      episodeNumber: ep.episodeNumber,
      seasonNumber:  season.number,
      nextEpisode:   nextEntry ? {
        id:            nextEntry.ep.id,
        title:         nextEntry.ep.title,
        type:          nextEntry.ep.type,
        mediaUrl:      nextEntry.ep.mediaUrl,
        hlsUrl:        nextEntry.ep.hlsUrl,
        thumbnailUrl:  nextEntry.ep.thumbnailUrl,
        description:   nextEntry.ep.description,
        seriesTitle:   series!.title,
        episodeNumber: nextEntry.ep.episodeNumber,
        seasonNumber:  nextEntry.season.number,
      } : undefined,
    });
  }

  const totalEpisodes = series.seasons.reduce((a, s) => a + s.episodes.length, 0);

  return (
    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

      {/* ── Hero: artwork only, no text overlaid ──────────────────── */}
      <View style={styles.hero}>
        {showTrailer && series.trailerUrl ? (
          <VideoView
            player={trailerPlayer}
            style={StyleSheet.absoluteFill}
            allowsPictureInPicture
            fullscreenOptions={{ isFullscreenAllowed: true }}
            contentFit="contain"
          />
        ) : (
          <>
            {series.bannerUrl || series.coverUrl
              ? <Image source={{ uri: series.bannerUrl ?? series.coverUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
              : <View style={styles.heroBg} />
            }
            <View style={styles.heroOverlay} />
          </>
        )}

        {/* Trailer toggle — small pill in bottom-right corner only */}
        {series.trailerUrl && (
          <TouchableOpacity
            style={styles.trailerPill}
            onPress={() => setShowTrailer((v) => !v)}
          >
            <Ionicons
              name={showTrailer ? 'close-circle-outline' : 'play-circle'}
              size={14}
              color="#000"
            />
            <Text style={styles.trailerPillText}>
              {showTrailer ? 'Close' : 'Trailer'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Series info block — cleanly BELOW the image ───────────── */}
      <View style={styles.seriesInfo}>
        <Text style={styles.seriesTitle}>{series.title}</Text>

        {series.creator && (
          <TouchableOpacity
            onPress={() => navigation.navigate('Creator', { username: series.creator!.username })}
            style={{ marginBottom: 16 }}
          >
            <Text style={styles.seriesCreator}>
              {series.creator.displayName || series.creator.username}
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.badgeRow}>
          {series.genre && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{series.genre}</Text>
            </View>
          )}
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {series.seasons.length} Season{series.seasons.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {totalEpisodes} Ep{totalEpisodes !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {series.description ? (
          <Text style={styles.description}>{series.description}</Text>
        ) : null}
      </View>

      {/* ── Seasons accordion ─────────────────────────────────────── */}
      <View style={styles.seasonsWrap}>
        {series.seasons.map((season) => (
          <View key={season.id} style={styles.season}>
            <TouchableOpacity
              style={styles.seasonHeader}
              onPress={() => setOpenSeason(openSeason === season.id ? null : season.id)}
              activeOpacity={0.7}
            >
              <View style={styles.seasonHeaderLeft}>
                <Text style={styles.seasonTitle}>
                  Season {season.number}{season.title ? ` · ${season.title}` : ''}
                </Text>
                <Text style={styles.seasonEpCount}>{season.episodes.length} episodes</Text>
              </View>
              <Ionicons
                name={openSeason === season.id ? 'chevron-up' : 'chevron-down'}
                size={18}
                color="#f8c202"
              />
            </TouchableOpacity>

            {openSeason === season.id && (
              <View style={styles.episodeList}>
                {season.episodes.map((ep) => {
                  const hasVideo = !!(ep.mediaUrl || ep.hlsUrl);
                  return (
                    <TouchableOpacity
                      key={ep.id}
                      style={[styles.episode, !hasVideo && styles.episodeLocked]}
                      activeOpacity={hasVideo ? 0.75 : 1}
                      onPress={() => playEpisode(ep, season)}
                      disabled={!hasVideo}
                    >
                      <View style={styles.epThumb}>
                        {ep.thumbnailUrl
                          ? <Image source={{ uri: ep.thumbnailUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                          : (
                            <View style={styles.epThumbEmpty}>
                              <Text style={styles.epNum}>{ep.episodeNumber}</Text>
                            </View>
                          )
                        }
                        <View style={styles.epPlayOverlay}>
                          {hasVideo
                            ? <Ionicons name="play-circle" size={32} color="rgba(248,194,2,0.9)" />
                            : <Ionicons name="lock-closed" size={18} color="rgba(255,255,255,0.25)" />
                          }
                        </View>
                        {ep.duration != null && (
                          <View style={styles.epDurBadge}>
                            <Text style={styles.epDurText}>{formatDuration(ep.duration)}</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.epMeta}>
                        <Text style={[styles.epTitle, !hasVideo && styles.epTitleLocked]} numberOfLines={2}>
                          E{ep.episodeNumber} · {ep.title}
                        </Text>
                        {ep.description ? (
                          <Text style={styles.epDesc} numberOfLines={2}>{ep.description}</Text>
                        ) : null}
                        {!hasVideo && <Text style={styles.epComingSoon}>Coming soon</Text>}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        ))}
      </View>

      <View style={{ height: 48 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#0a0a0a' },
  center: { flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#f87171', fontSize: 15 },

  // ── Hero: pure art, no text ────────────────────────────────────
  hero: {
    width: SW,
    aspectRatio: 16 / 9,
    maxHeight: 260,
    position: 'relative',
    backgroundColor: '#111',
  },
  heroBg: { flex: 1, backgroundColor: '#111' },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  trailerPill: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8c202',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  trailerPillText: { color: '#000', fontSize: 12, fontWeight: '800' },

  // ── Series info: always below the image ───────────────────────
  seriesInfo: {
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 8,
  },
  seriesTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 32,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  seriesCreator: {
    color: '#f8c202',
    fontSize: 14,
    fontWeight: '600',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  badgeText: { color: '#bbb', fontSize: 11, fontWeight: '600' },
  description: {
    color: '#999',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
  },

  // ── Seasons ───────────────────────────────────────────────────
  seasonsWrap: { paddingHorizontal: 0 },
  season: { borderTopWidth: 1, borderTopColor: '#181818' },
  seasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: '#0f0f0f',
  },
  seasonHeaderLeft: { flex: 1 },
  seasonTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  seasonEpCount: { color: '#666', fontSize: 12, marginTop: 2 },

  episodeList: { paddingHorizontal: 16, paddingBottom: 8 },
  episode: {
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#141414',
    alignItems: 'flex-start',
  },
  episodeLocked: { opacity: 0.45 },
  epThumb: {
    width: 130,
    aspectRatio: 16 / 9,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#141414',
    flexShrink: 0,
  },
  epThumbEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  epNum: { color: '#f8c202', fontSize: 22, fontWeight: '900' },
  epPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  epDurBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  epDurText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  epMeta: { flex: 1, paddingTop: 2 },
  epTitle: { color: '#f0f0f0', fontSize: 14, fontWeight: '700', lineHeight: 20, marginBottom: 5 },
  epTitleLocked: { color: '#555' },
  epDesc: { color: '#888', fontSize: 12, lineHeight: 17 },
  epComingSoon: { color: '#555', fontSize: 11, marginTop: 6, fontStyle: 'italic' },
});
