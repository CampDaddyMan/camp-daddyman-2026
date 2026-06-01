import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
  Image, Alert,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { usePlayer, AUDIO_TYPES } from '../context/PlayerContext';
import AddToPlaylistModal from '../components/AddToPlaylistModal';
import CanvasBackground from '../components/CanvasBackground';
import { RootStackParamList } from '../navigation/RootNavigator';

type WatchRoute = RouteProp<RootStackParamList, 'Watch'>;

interface Content {
  id: string; title: string; description?: string; type: string;
  mediaUrl: string; thumbnailUrl?: string; views: number; tags: string[]; createdAt: string;
  creator: { username: string; displayName?: string };
  _count?: { likes: number; comments: number };
}

interface RelatedItem {
  id: string; title: string; type: string;
  thumbnailUrl?: string; views: number;
  creator: { username: string; displayName?: string };
}

interface Comment {
  id: string; text: string; createdAt: string;
  user: { username: string; displayName?: string };
}

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  return `${d}d ago`;
}

function formatTime(s: number) {
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function WatchScreen() {
  const { params } = useRoute<WatchRoute>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const playerCtx = usePlayer();

  const [content, setContent]         = useState<Content | null>(null);
  const [comments, setComments]       = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [liked, setLiked]             = useState(false);
  const [saved, setSaved]             = useState(false);
  const [savedProgress, setSavedProgress] = useState(0);
  const [showResume, setShowResume]   = useState(false);
  const [loading, setLoading]         = useState(true);
  const [subRequired, setSubRequired] = useState(false);
  const [playlistModal, setPlaylistModal] = useState(false);
  const [related, setRelated]         = useState<{ fromCreator: RelatedItem[]; sameType: RelatedItem[] }>({ fromCreator: [], sameType: [] });
  const [lyricsExpanded, setLyricsExpanded] = useState(false);

  const progressRef    = useRef(0);      // for video progress (expo-video)
  const audioPositionRef = useRef(0);   // for audio progress (expo-av via PlayerContext)
  const intervalRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasResumedRef  = useRef(false);
  const introStartRef  = useRef<number | null>(null);
  const introEndRef    = useRef<number | null>(null);
  const [showSkipIntro, setShowSkipIntro] = useState(false);

  const isAudio = content ? AUDIO_TYPES.has(content.type) : false;

  // expo-video player — always initialized (hook rules), only used for non-audio types
  const videoPlayer = useVideoPlayer(
    (!isAudio && content?.mediaUrl) ? content.mediaUrl : null,
    (p) => { p.loop = false; },
  );

  // Keep audio position ref in sync for progress saving
  useEffect(() => {
    if (isAudio) audioPositionRef.current = playerCtx.position;
  }, [isAudio, playerCtx.position]);

  // Start audio via PlayerContext when audio content loads
  useEffect(() => {
    if (!content || !isAudio) return;
    // Don't restart if same track is already loaded
    if (playerCtx.track?.id === content.id) return;
    playerCtx.play({
      id: content.id,
      title: content.title,
      creatorName: content.creator?.displayName || content.creator?.username || '',
      mediaUrl: content.mediaUrl,
      thumbnailUrl: content.thumbnailUrl,
      type: content.type,
      routeName: 'Watch',
      routeParams: { id: content.id },
    }, 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content?.id, isAudio]);

  // Video: seek to saved position on first play
  useEffect(() => {
    if (!videoPlayer || !savedProgress || hasResumedRef.current || isAudio) return;
    const sub = videoPlayer.addListener('playingChange', (e) => {
      if (e.isPlaying && !hasResumedRef.current && showResume === false) {
        hasResumedRef.current = true;
        videoPlayer.seekBy(savedProgress);
        sub.remove();
      }
    });
    return () => sub.remove();
  }, [videoPlayer, savedProgress, showResume, isAudio]);

  // Sync intro timestamps from content into refs (so timeUpdate listener sees them)
  useEffect(() => {
    if (!content) return;
    introStartRef.current = (content as any).introStart ?? null;
    introEndRef.current   = (content as any).introEnd   ?? null;
  }, [content]);

  // Video: track position via listener + Skip Intro detection
  useEffect(() => {
    if (!videoPlayer || isAudio) return;
    const sub = videoPlayer.addListener('timeUpdate' as any, (e: any) => {
      const t = e.currentTime ?? 0;
      progressRef.current = t;
      if (introStartRef.current != null && introEndRef.current != null) {
        setShowSkipIntro(t >= introStartRef.current && t < introEndRef.current);
      }
    });
    return () => sub.remove();
  }, [videoPlayer, isAudio]);

  const saveProgress = useCallback(() => {
    const pos = isAudio ? audioPositionRef.current : progressRef.current;
    if (!user || pos < 5) return;
    api.post(`/content/${params.id}/progress`, { progress: Math.floor(pos) }).catch(() => {});
  }, [params.id, user, isAudio]);

  useEffect(() => {
    intervalRef.current = setInterval(saveProgress, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      saveProgress();
      // Audio keeps playing — don't stop PlayerContext on unmount
    };
  }, [saveProgress]);

  useEffect(() => {
    setLoading(true);
    hasResumedRef.current = false;
    setSavedProgress(0);
    setShowResume(false);
    api.get(`/content/${params.id}/related`).then((r) => setRelated(r.data)).catch(() => {});

    Promise.all([
      api.get(`/content/${params.id}`),
      api.get(`/content/${params.id}/comments`),
      user ? api.get(`/content/${params.id}/progress`) : Promise.resolve(null),
    ])
      .then(([c, cm, p]) => {
        setContent(c.data.content);
        setLiked(c.data.isLiked ?? false);
        setSaved(c.data.isSaved ?? false);
        setComments(cm.data.comments);
        if (p && p.data.progress > 10) {
          setSavedProgress(p.data.progress);
          setShowResume(true);
        }
      })
      .catch((err) => {
        if (err.response?.data?.requiresSubscription) setSubRequired(true);
      })
      .finally(() => setLoading(false));
  }, [params.id, user]);

  function handleResume() {
    if (isAudio) {
      playerCtx.seekTo(savedProgress);
    } else {
      videoPlayer?.seekBy(savedProgress);
    }
    hasResumedRef.current = true;
    setShowResume(false);
  }

  async function handleLike() {
    if (!user || !content) return;
    setLiked((v) => !v);
    await api.post(`/content/${params.id}/like`).catch(() => setLiked((v) => !v));
  }

  async function handleSave() {
    if (!user || !content) return;
    setSaved((v) => !v);
    await api.post(`/content/${params.id}/save`).catch(() => setSaved((v) => !v));
  }

  async function handleComment() {
    if (!commentText.trim() || !user) return;
    const { data } = await api.post(`/content/${params.id}/comment`, { text: commentText });
    setComments((prev) => [data.comment, ...prev]);
    setCommentText('');
  }

  if (loading) return (
    <View style={styles.center}><ActivityIndicator color="#f8c202" size="large" /></View>
  );

  if (subRequired) return (
    <View style={styles.center}>
      <View style={styles.lockCard}>
        <Ionicons name="lock-closed" size={40} color="#f8c202" style={{ marginBottom: 16 }} />
        <Text style={styles.lockTitle}>Members Only</Text>
        <Text style={styles.lockSub}>This content requires an active subscription.</Text>
      </View>
    </View>
  );

  if (!content) return (
    <View style={styles.center}><Text style={styles.errText}>Content not found.</Text></View>
  );

  const likeCount = (content._count?.likes ?? 0) + (liked ? 1 : 0);
  const audioProgress = playerCtx.duration > 0
    ? Math.min(playerCtx.position / playerCtx.duration, 1)
    : 0;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        {/* ── Media player area ─────────────────────────────────────── */}
        {isAudio ? (
          <View style={styles.audioWrap}>
            {/* Canvas looping background */}
            {(content as any).canvasUrl ? (
              <CanvasBackground uri={(content as any).canvasUrl} />
            ) : null}
            {content.thumbnailUrl ? (
              <Image source={{ uri: content.thumbnailUrl }} style={styles.audioArt} />
            ) : (
              <View style={[styles.audioArt, styles.audioArtFallback]}>
                <Ionicons name="musical-notes" size={72} color="#f8c202" />
              </View>
            )}

            {/* Progress bar */}
            <View style={styles.audioProgressTrack}>
              <View style={[styles.audioProgressFill, { width: `${audioProgress * 100}%` }]} />
            </View>

            {/* Time */}
            <View style={styles.audioTimeRow}>
              <Text style={styles.audioTimeText}>{formatTime(playerCtx.position)}</Text>
              <Text style={styles.audioTimeText}>{formatTime(playerCtx.duration)}</Text>
            </View>

            {/* Controls */}
            <View style={styles.audioControls}>
              <TouchableOpacity
                onPress={() => playerCtx.seekTo(Math.max(0, playerCtx.position - 15))}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="play-skip-back" size={30} color="#ccc" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => playerCtx.isPlaying ? playerCtx.pause() : playerCtx.resume()}
                style={styles.audioPlayBtn}
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
            <VideoView
              player={videoPlayer}
              style={styles.player}
              allowsPictureInPicture
              fullscreenOptions={{ isFullscreenAllowed: true }}
            />
            {showSkipIntro && (
              <TouchableOpacity
                style={styles.skipIntroBtn}
                onPress={() => {
                  const end = introEndRef.current;
                  if (end != null) {
                    const amount = end - progressRef.current;
                    if (amount > 0) videoPlayer.seekBy(amount);
                  }
                  setShowSkipIntro(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.skipIntroText}>Skip Intro ›</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Resume banner */}
        {showResume && (
          <View style={styles.resumeBanner}>
            <Ionicons name="time-outline" size={16} color="#f8c202" />
            <Text style={styles.resumeText}>Left off at {formatTime(savedProgress)}</Text>
            <View style={styles.resumeActions}>
              <TouchableOpacity onPress={() => setShowResume(false)} style={styles.resumeSkipBtn}>
                <Text style={styles.resumeSkip}>Start over</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.resumeBtn} onPress={handleResume}>
                <Text style={styles.resumeBtnText}>Resume</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.body}>
          {/* Title + meta */}
          <Text style={styles.title}>{content.title}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaType}>{content.type.replace('_', ' ')}</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaViews}>{content.views.toLocaleString()} views</Text>
          </View>

          {/* Tags */}
          {content.tags.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsScroll} contentContainerStyle={styles.tagsContent}>
              {content.tags.map((t) => (
                <View key={t} style={styles.tag}>
                  <Text style={styles.tagText}>#{t}</Text>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Actions row */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, liked && styles.actionBtnActive]}
              onPress={handleLike}
              disabled={!user}
            >
              <Ionicons name={liked ? 'heart' : 'heart-outline'} size={18} color={liked ? '#000' : '#ccc'} />
              <Text style={[styles.actionBtnText, liked && styles.actionBtnTextActive]}>{likeCount}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, saved && styles.actionBtnSaved]}
              onPress={handleSave}
              disabled={!user}
            >
              <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={18} color={saved ? '#000' : '#ccc'} />
              <Text style={[styles.actionBtnText, saved && styles.actionBtnTextActive]}>{saved ? 'Saved' : 'Save'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => content.creator && navigation.navigate('Creator', { username: content.creator.username })}
            >
              <Ionicons name="person-circle-outline" size={18} color="#ccc" />
              <Text style={styles.actionBtnText} numberOfLines={1}>
                {content.creator?.displayName || content.creator?.username || ''}
              </Text>
            </TouchableOpacity>

            {user && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => setPlaylistModal(true)}
              >
                <Ionicons name="list-outline" size={18} color="#ccc" />
                <Text style={styles.actionBtnText}>Playlist</Text>
              </TouchableOpacity>
            )}

            {user && isAudio && content && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => {
                  const track = {
                    id: content.id,
                    title: content.title,
                    creatorName: content.creator?.displayName || content.creator?.username || '',
                    mediaUrl: content.mediaUrl,
                    thumbnailUrl: content.thumbnailUrl,
                    type: content.type,
                    routeName: 'Watch' as const,
                    routeParams: { id: content.id },
                  };
                  Alert.alert(content.title, undefined, [
                    { text: 'Play Next', onPress: () => playerCtx.playNext(track) },
                    { text: 'Add to Queue', onPress: () => playerCtx.addToQueue(track) },
                    { text: 'Cancel', style: 'cancel' },
                  ]);
                }}
              >
                <Ionicons name="musical-notes-outline" size={18} color="#ccc" />
                <Text style={styles.actionBtnText}>Queue</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Description */}
          {content.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.description}>{content.description}</Text>
            </View>
          ) : null}

          {/* Lyrics */}
          {isAudio && (content as any).lyrics ? (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.lyricsTitleRow}
                onPress={() => setLyricsExpanded((v) => !v)}
                activeOpacity={0.7}
              >
                <Text style={styles.sectionTitle}>Lyrics</Text>
                <Text style={styles.lyricsToggle}>{lyricsExpanded ? '▲ Less' : '▼ Show all'}</Text>
              </TouchableOpacity>
              <Text
                style={styles.lyricsText}
                numberOfLines={lyricsExpanded ? undefined : 8}
              >
                {(content as any).lyrics}
              </Text>
              {!lyricsExpanded && (
                <TouchableOpacity onPress={() => setLyricsExpanded(true)}>
                  <Text style={styles.lyricsShowMore}>Show full lyrics</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null}

          {/* Comments */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {comments.length > 0 ? `${comments.length} Comment${comments.length !== 1 ? 's' : ''}` : 'Comments'}
            </Text>

            {user ? (
              <View style={styles.commentInput}>
                <View style={styles.commentAvatar}>
                  <Text style={styles.commentAvatarText}>
                    {(user.displayName || user.username).charAt(0).toUpperCase()}
                  </Text>
                </View>
                <TextInput
                  value={commentText}
                  onChangeText={setCommentText}
                  placeholder="Add a comment..."
                  placeholderTextColor="#444"
                  style={styles.input}
                  multiline
                />
                <TouchableOpacity
                  style={[styles.postBtn, !commentText.trim() && styles.postBtnDisabled]}
                  onPress={handleComment}
                  disabled={!commentText.trim()}
                >
                  <Ionicons name="send" size={16} color="#000" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.signInPrompt} onPress={() => navigation.navigate('Login')}>
                <Text style={styles.signInPromptText}>Sign in to comment</Text>
              </TouchableOpacity>
            )}

            {comments.length === 0 && (
              <Text style={styles.noComments}>No comments yet. Be the first.</Text>
            )}

            {comments.map((c) => (
              <View key={c.id} style={styles.comment}>
                <View style={styles.commentAvatar}>
                  <Text style={styles.commentAvatarText}>
                    {(c.user?.displayName || c.user?.username || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.commentBody}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentUser}>{c.user?.displayName || c.user?.username || 'User'}</Text>
                    <Text style={styles.commentTime}>{timeAgo(c.createdAt)}</Text>
                  </View>
                  <Text style={styles.commentText}>{c.text}</Text>
                </View>
              </View>
            ))}
          </View>
          {/* More from creator */}
          {related.fromCreator.length > 0 && (
            <View style={styles.section}>
              <View style={styles.relatedHeader}>
                <Text style={styles.sectionTitle}>
                  More from {content.creator.displayName || content.creator.username}
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Creator', { username: content.creator.username })}>
                  <Text style={styles.relatedViewAll}>View all</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.relatedRow}>
                {related.fromCreator.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.relatedCard}
                    onPress={() => navigation.navigate('Watch', { id: item.id })}
                    activeOpacity={0.75}
                  >
                    <View style={styles.relatedThumb}>
                      {item.thumbnailUrl ? (
                        <Image source={{ uri: item.thumbnailUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                      ) : (
                        <Ionicons name="musical-notes" size={22} color="#555" />
                      )}
                    </View>
                    <Text style={styles.relatedTitle} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.relatedCreator} numberOfLines={1}>
                      {item.creator.displayName || item.creator.username}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* More like this */}
          {related.sameType.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>More Like This</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.relatedRow}>
                {related.sameType.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.relatedCard}
                    onPress={() => navigation.navigate('Watch', { id: item.id })}
                    activeOpacity={0.75}
                  >
                    <View style={styles.relatedThumb}>
                      {item.thumbnailUrl ? (
                        <Image source={{ uri: item.thumbnailUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                      ) : (
                        <Ionicons name="musical-notes" size={22} color="#555" />
                      )}
                    </View>
                    <Text style={styles.relatedTitle} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.relatedCreator} numberOfLines={1}>
                      {item.creator.displayName || item.creator.username}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

        </View>
      </ScrollView>

      {content && (
        <AddToPlaylistModal
          contentId={content.id}
          visible={playlistModal}
          onClose={() => setPlaylistModal(false)}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  center: { flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center', padding: 24 },
  lockCard: { alignItems: 'center', backgroundColor: '#141414', borderRadius: 20, padding: 32, borderWidth: 1, borderColor: '#222' },
  lockTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 10 },
  lockSub: { color: '#888', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  errText: { color: '#888', fontSize: 16 },

  // Video
  playerWrap: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000', position: 'relative' },
  skipIntroBtn: {
    position: 'absolute', bottom: 48, right: 10,
    backgroundColor: 'rgba(0,0,0,0.78)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 8, paddingHorizontal: 16, paddingVertical: 9,
  },
  skipIntroText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  player: { flex: 1 },

  // Audio
  audioWrap: { backgroundColor: '#0d0d0d', paddingTop: 32, paddingBottom: 24, paddingHorizontal: 24, alignItems: 'center', overflow: 'hidden' },
  audioArt: { width: 220, height: 220, borderRadius: 20, marginBottom: 28 },
  audioArtFallback: { backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#222' },
  audioProgressTrack: { width: '100%', height: 3, backgroundColor: '#2a2a2a', borderRadius: 2, marginBottom: 8 },
  audioProgressFill: { height: 3, backgroundColor: '#f8c202', borderRadius: 2 },
  audioTimeRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 20 },
  audioTimeText: { color: '#555', fontSize: 12 },
  audioControls: { flexDirection: 'row', alignItems: 'center', gap: 40 },
  audioPlayBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#f8c202', alignItems: 'center', justifyContent: 'center',
  },

  // Resume
  resumeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#141414', borderBottomWidth: 1, borderBottomColor: '#1e1e1e',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  resumeText: { color: '#ccc', fontSize: 13, fontWeight: '500', flex: 1 },
  resumeActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  resumeSkipBtn: { padding: 4 },
  resumeSkip: { color: '#666', fontSize: 13 },
  resumeBtn: { backgroundColor: '#f8c202', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 7 },
  resumeBtnText: { color: '#000', fontSize: 13, fontWeight: '800' },

  // Body
  body: { padding: 18 },
  title: { color: '#fff', fontSize: 20, fontWeight: '800', lineHeight: 28, marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  metaType: { color: '#f8c202', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  metaDot: { color: '#444', fontSize: 12 },
  metaViews: { color: '#888', fontSize: 13 },
  tagsScroll: { marginBottom: 18 },
  tagsContent: { gap: 8 },
  tag: { backgroundColor: '#1a1a1a', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: '#2a2a2a' },
  tagText: { color: '#999', fontSize: 12, fontWeight: '500' },
  actions: {
    flexDirection: 'row', gap: 10, marginBottom: 24,
    paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: '#1a1a1a', flexWrap: 'wrap',
  },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 16, paddingVertical: 11,
    borderRadius: 10, backgroundColor: '#161616',
    borderWidth: 1, borderColor: '#252525',
    minHeight: 44,
  },
  actionBtnActive: { backgroundColor: '#f8c202', borderColor: '#f8c202' },
  actionBtnSaved: { backgroundColor: '#f8c202', borderColor: '#f8c202' },
  actionBtnText: { color: '#ccc', fontSize: 13, fontWeight: '600' },
  actionBtnTextActive: { color: '#000' },
  section: { marginBottom: 28 },
  sectionTitle: { color: '#fff', fontSize: 17, fontWeight: '800', marginBottom: 14 },
  relatedHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  relatedViewAll: { color: '#f8c202', fontSize: 12, fontWeight: '600' },
  relatedRow: { gap: 12, paddingRight: 4 },
  relatedCard: { width: 148 },
  relatedThumb: {
    width: 148, height: 83, borderRadius: 10,
    backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center',
    marginBottom: 8, overflow: 'hidden',
  },
  description: { color: '#aaa', fontSize: 14, lineHeight: 22 },
  lyricsTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  lyricsToggle: { color: '#555', fontSize: 12 },
  lyricsText: { color: '#aaa', fontSize: 14, lineHeight: 24, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  lyricsShowMore: { color: '#f8c202', fontSize: 13, fontWeight: '600', marginTop: 10 },
  commentInput: { flexDirection: 'row', gap: 10, marginBottom: 20, alignItems: 'flex-end' },
  commentAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#1e1e1e', borderWidth: 1.5, borderColor: '#f8c202',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  commentAvatarText: { color: '#f8c202', fontSize: 14, fontWeight: '800' },
  input: {
    flex: 1, backgroundColor: '#161616', borderWidth: 1, borderColor: '#252525',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
    color: '#fff', fontSize: 14, minHeight: 44,
  },
  postBtn: {
    backgroundColor: '#f8c202', borderRadius: 10,
    width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
  },
  postBtnDisabled: { opacity: 0.35 },
  signInPrompt: {
    backgroundColor: '#161616', borderRadius: 12, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: '#252525', marginBottom: 16,
  },
  signInPromptText: { color: '#f8c202', fontSize: 14, fontWeight: '600' },
  noComments: { color: '#555', fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  relatedTitle: { color: '#ddd', fontSize: 12, fontWeight: '600', lineHeight: 17, marginBottom: 3 },
  relatedCreator: { color: '#666', fontSize: 11 },
  comment: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  commentBody: { flex: 1, backgroundColor: '#141414', borderRadius: 12, padding: 12 },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  commentUser: { color: '#e0e0e0', fontSize: 13, fontWeight: '700' },
  commentTime: { color: '#555', fontSize: 11 },
  commentText: { color: '#bbb', fontSize: 14, lineHeight: 20 },
});
