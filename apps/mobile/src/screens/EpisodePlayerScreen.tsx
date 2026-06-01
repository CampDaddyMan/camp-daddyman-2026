import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Dimensions, ActivityIndicator, Image,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useVideoPlayer, VideoView, useEventListener } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer, AUDIO_TYPES } from '../context/PlayerContext';
import { RootStackParamList } from '../navigation/RootNavigator';

type EpisodeRoute = RouteProp<RootStackParamList, 'EpisodePlayer'>;

const { width: SW } = Dimensions.get('window');
const VIDEO_HEIGHT = Math.round(SW * 9 / 16);

function formatTime(s: number) {
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function EpisodePlayerScreen() {
  const { params } = useRoute<EpisodeRoute>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const playerCtx = usePlayer();

  const isAudio = params.type ? AUDIO_TYPES.has(params.type) : false;
  const videoUrl = (!isAudio && (params.hlsUrl || params.mediaUrl)) || null;

  // expo-video — only active for video content
  const videoPlayer = useVideoPlayer(videoUrl, (p) => {
    p.loop = false;
    p.play();
  });

  // Start audio via PlayerContext when screen mounts with an audio-type episode
  useEffect(() => {
    if (!isAudio) return;
    const trackId = params.id || params.title;
    if (playerCtx.track?.id === trackId) return; // already playing this episode
    const mediaUrl = params.mediaUrl || params.hlsUrl;
    if (!mediaUrl) return;
    playerCtx.play({
      id: trackId,
      title: params.title,
      creatorName: params.seriesTitle || '',
      mediaUrl,
      thumbnailUrl: params.thumbnailUrl,
      type: params.type!,
      routeName: 'EpisodePlayer',
      routeParams: params as Record<string, any>,
    }, 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id || params.title, isAudio]);

  // ── Autoplay next episode ────────────────────────────────────────────────────
  const [countdown, setCountdown] = useState<number | null>(null);
  const audioStartedRef = useRef(false);
  const audioEndedRef   = useRef(false);

  // Video: detect playback end
  useEventListener(videoPlayer, 'playToEnd', () => {
    if (params.nextEpisode) setCountdown(10);
  });

  // Audio: detect playback end via position/duration
  useEffect(() => {
    if (!isAudio || !params.nextEpisode) return;
    if (playerCtx.isPlaying) {
      audioStartedRef.current = true;
      audioEndedRef.current = false;
    }
    if (
      audioStartedRef.current &&
      !playerCtx.isPlaying &&
      !audioEndedRef.current &&
      playerCtx.duration > 0 &&
      playerCtx.position >= playerCtx.duration - 2
    ) {
      audioEndedRef.current = true;
      setCountdown(10);
    }
  }, [isAudio, playerCtx.isPlaying, playerCtx.position, playerCtx.duration, params.nextEpisode]);

  // Countdown tick → navigate
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      navigation.replace('EpisodePlayer', params.nextEpisode!);
      return;
    }
    const t = setTimeout(() => setCountdown((c) => (c !== null ? c - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const audioProgress = playerCtx.duration > 0
    ? Math.min(playerCtx.position / playerCtx.duration, 1)
    : 0;

  return (
    <View style={styles.root}>
      {/* ── Media area ───────────────────────────────────────────── */}
      {countdown !== null && params.nextEpisode && (
        <View style={styles.countdownOverlay}>
          <Text style={styles.countdownUpNext}>Up next</Text>
          <Text style={styles.countdownTitle} numberOfLines={2}>{params.nextEpisode.title}</Text>
          <View style={styles.countdownCircle}>
            <Text style={styles.countdownNum}>{countdown}</Text>
          </View>
          <TouchableOpacity
            style={styles.countdownCancel}
            onPress={() => setCountdown(null)}
          >
            <Text style={styles.countdownCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
      {isAudio ? (
        <View style={styles.audioWrap}>
          {params.thumbnailUrl ? (
            <Image source={{ uri: params.thumbnailUrl }} style={styles.audioArt} />
          ) : (
            <View style={[styles.audioArt, styles.audioArtFallback]}>
              <Ionicons name="musical-notes" size={64} color="#f8c202" />
            </View>
          )}

          <View style={styles.audioProgressTrack}>
            <View style={[styles.audioProgressFill, { width: `${audioProgress * 100}%` }]} />
          </View>

          <View style={styles.audioTimeRow}>
            <Text style={styles.audioTimeText}>{formatTime(playerCtx.position)}</Text>
            <Text style={styles.audioTimeText}>{formatTime(playerCtx.duration)}</Text>
          </View>

          <View style={styles.audioControls}>
            <TouchableOpacity
              onPress={() => playerCtx.seekTo(Math.max(0, playerCtx.position - 15))}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="play-skip-back" size={30} color="#ccc" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.audioPlayBtn}
              onPress={() => playerCtx.isPlaying ? playerCtx.pause() : playerCtx.resume()}
            >
              {playerCtx.isLoading ? (
                <ActivityIndicator color="#000" size="large" />
              ) : (
                <Ionicons
                  name={playerCtx.isPlaying ? 'pause' : 'play'}
                  size={32}
                  color="#000"
                />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => playerCtx.seekTo(Math.min(playerCtx.duration, playerCtx.position + 15))}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="play-skip-forward" size={30} color="#ccc" />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.playerWrap}>
          {videoUrl ? (
            <VideoView
              player={videoPlayer}
              style={styles.video}
              allowsPictureInPicture
              fullscreenOptions={{ isFullscreenAllowed: true }}
              contentFit="contain"
            />
          ) : (
            <View style={styles.noVideo}>
              <Ionicons name="videocam-off-outline" size={40} color="#555" />
              <Text style={styles.noVideoText}>Video not available</Text>
            </View>
          )}
        </View>
      )}

      {/* ── Episode info ─────────────────────────────────────────── */}
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {params.seriesTitle ? (
          <Text style={styles.seriesLabel}>{params.seriesTitle}</Text>
        ) : null}

        <Text style={styles.title}>
          {params.episodeNumber != null && params.seasonNumber != null
            ? `S${params.seasonNumber} E${params.episodeNumber} · ${params.title}`
            : params.title
          }
        </Text>

        {params.description ? (
          <Text style={styles.description}>{params.description}</Text>
        ) : null}

        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back-outline" size={16} color="#f8c202" />
          <Text style={styles.backBtnText}>Back to series</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0d0d0d' },

  // Video
  playerWrap: { width: SW, height: VIDEO_HEIGHT, backgroundColor: '#000' },
  video: { width: SW, height: VIDEO_HEIGHT },
  noVideo: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  noVideoText: { color: '#555', fontSize: 14 },

  // Audio
  audioWrap: {
    backgroundColor: '#0d0d0d', paddingTop: 28, paddingBottom: 20,
    paddingHorizontal: 24, alignItems: 'center',
  },
  audioArt: { width: 180, height: 180, borderRadius: 16, marginBottom: 24 },
  audioArtFallback: {
    backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#222',
  },
  audioProgressTrack: { width: '100%', height: 3, backgroundColor: '#2a2a2a', borderRadius: 2, marginBottom: 6 },
  audioProgressFill: { height: 3, backgroundColor: '#f8c202', borderRadius: 2 },
  audioTimeRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 18 },
  audioTimeText: { color: '#555', fontSize: 12 },
  audioControls: { flexDirection: 'row', alignItems: 'center', gap: 36 },
  audioPlayBtn: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: '#f8c202', alignItems: 'center', justifyContent: 'center',
  },

  // Info
  scroll: { flex: 1 },
  seriesLabel: {
    color: '#f8c202', fontSize: 12, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1,
    marginHorizontal: 16, marginTop: 16, marginBottom: 4,
  },
  title: {
    color: '#fff', fontSize: 18, fontWeight: '800',
    marginHorizontal: 16, marginTop: 8, lineHeight: 24,
  },
  description: {
    color: '#aaa', fontSize: 14, lineHeight: 21,
    marginHorizontal: 16, marginTop: 10,
  },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 20,
    paddingVertical: 12, paddingHorizontal: 16,
    backgroundColor: '#161616', borderRadius: 10,
    borderWidth: 1, borderColor: '#282828', alignSelf: 'flex-start',
  },
  backBtnText: { color: '#f8c202', fontSize: 14, fontWeight: '600' },

  // Autoplay countdown
  countdownOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.88)', zIndex: 99,
    alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  countdownUpNext: {
    color: 'rgba(255,255,255,0.4)', fontSize: 11,
    letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10,
  },
  countdownTitle: {
    color: '#fff', fontSize: 18, fontWeight: '700',
    textAlign: 'center', marginBottom: 28, lineHeight: 24,
  },
  countdownCircle: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 3, borderColor: '#f8c202',
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  countdownNum: { color: '#f8c202', fontSize: 26, fontWeight: '900' },
  countdownCancel: {
    paddingHorizontal: 24, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  countdownCancelText: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
});
