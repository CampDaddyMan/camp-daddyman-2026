import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useVideoPlayer, VideoView } from 'expo-video';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../navigation/RootNavigator';

type WatchRoute = RouteProp<RootStackParamList, 'Watch'>;

interface Content {
  id: string; title: string; description?: string; type: string;
  mediaUrl: string; views: number; tags: string[]; createdAt: string;
  creator: { username: string; displayName?: string };
  _count?: { likes: number; comments: number };
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

  const [content, setContent]         = useState<Content | null>(null);
  const [comments, setComments]       = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [liked, setLiked]             = useState(false);
  const [savedProgress, setSavedProgress] = useState(0);
  const [showResume, setShowResume]   = useState(false);
  const [loading, setLoading]         = useState(true);
  const [subRequired, setSubRequired] = useState(false);

  const progressRef    = useRef(0);
  const intervalRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasResumedRef  = useRef(false);

  const player = useVideoPlayer(content?.mediaUrl ?? null, (p) => {
    p.loop = false;
  });

  // Seek to saved position once player is ready
  useEffect(() => {
    if (!player || !savedProgress || hasResumedRef.current) return;
    // expo-video fires timeUpdate; we watch for it to confirm player is ready
    const sub = player.addListener('playingChange', (e) => {
      if (e.isPlaying && !hasResumedRef.current && showResume === false) {
        hasResumedRef.current = true;
        player.seekBy(savedProgress);
        sub.remove();
      }
    });
    return () => sub.remove();
  }, [player, savedProgress, showResume]);

  // Track current position
  useEffect(() => {
    if (!player) return;
    const sub = player.addListener('timeUpdate' as any, (e: any) => {
      progressRef.current = e.currentTime ?? 0;
    });
    return () => sub.remove();
  }, [player]);

  const saveProgress = useCallback(() => {
    if (!user || progressRef.current < 5) return;
    api.post(`/content/${params.id}/progress`, { progress: Math.floor(progressRef.current) }).catch(() => {});
  }, [params.id, user]);

  // Save every 30s + on unmount
  useEffect(() => {
    intervalRef.current = setInterval(saveProgress, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      saveProgress();
    };
  }, [saveProgress]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/content/${params.id}`),
      api.get(`/content/${params.id}/comments`),
      user ? api.get(`/content/${params.id}/progress`) : Promise.resolve(null),
    ])
      .then(([c, cm, p]) => {
        setContent(c.data.content);
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
    player?.seekBy(savedProgress);
    hasResumedRef.current = true;
    setShowResume(false);
  }

  async function handleLike() {
    if (!user || !content) return;
    await api.post(`/content/${params.id}/like`);
    setLiked(!liked);
  }

  async function handleComment() {
    if (!commentText.trim() || !user) return;
    const { data } = await api.post(`/content/${params.id}/comment`, { text: commentText });
    setComments((prev) => [data.comment, ...prev]);
    setCommentText('');
  }

  if (loading) return (
    <View style={styles.center}><ActivityIndicator color="#a78bfa" size="large" /></View>
  );

  if (subRequired) return (
    <View style={styles.center}>
      <Text style={styles.lockEmoji}>🔒</Text>
      <Text style={styles.lockTitle}>Members Only</Text>
      <Text style={styles.lockSub}>This content requires an active subscription.</Text>
    </View>
  );

  if (!content) return (
    <View style={styles.center}><Text style={styles.errText}>Content not found.</Text></View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Video player */}
        <View style={styles.playerWrap}>
          <VideoView
            player={player}
            style={styles.player}
            allowsFullscreen
            allowsPictureInPicture
          />
        </View>

        {/* Resume banner */}
        {showResume && (
          <View style={styles.resumeBanner}>
            <Text style={styles.resumeText}>Left off at {formatTime(savedProgress)}</Text>
            <View style={styles.resumeActions}>
              <TouchableOpacity onPress={() => setShowResume(false)}>
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
          <Text style={styles.meta}>
            {content.views.toLocaleString()} views · {content.type.replace('_', ' ')}
          </Text>

          {/* Tags */}
          {content.tags.length > 0 && (
            <View style={styles.tags}>
              {content.tags.map((t) => (
                <View key={t} style={styles.tag}>
                  <Text style={styles.tagText}>#{t}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, liked && styles.actionBtnActive]}
              onPress={handleLike}
              disabled={!user}
            >
              <Text style={styles.actionBtnText}>
                👍 {(content._count?.likes ?? 0) + (liked ? 1 : 0)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigation.navigate('Creator', { username: content.creator.username })}
            >
              <Text style={styles.actionBtnText}>
                {content.creator.displayName || content.creator.username}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Description */}
          {content.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.description}>{content.description}</Text>
            </View>
          ) : null}

          {/* Comments */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Comments ({comments.length})</Text>

            {user && (
              <View style={styles.commentInput}>
                <TextInput
                  value={commentText}
                  onChangeText={setCommentText}
                  placeholder="Add a comment..."
                  placeholderTextColor="#555"
                  style={styles.input}
                  multiline
                />
                <TouchableOpacity
                  style={[styles.postBtn, !commentText.trim() && styles.postBtnDisabled]}
                  onPress={handleComment}
                  disabled={!commentText.trim()}
                >
                  <Text style={styles.postBtnText}>Post</Text>
                </TouchableOpacity>
              </View>
            )}

            {comments.map((c) => (
              <View key={c.id} style={styles.comment}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentUser}>{c.user.displayName || c.user.username}</Text>
                  <Text style={styles.commentTime}>{timeAgo(c.createdAt)}</Text>
                </View>
                <Text style={styles.commentText}>{c.text}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f17' },
  center: { flex: 1, backgroundColor: '#0f0f17', alignItems: 'center', justifyContent: 'center', padding: 24 },
  playerWrap: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' },
  player: { flex: 1 },
  resumeBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1e1e2e', borderBottomWidth: 1, borderBottomColor: '#2e2e3e',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  resumeText: { color: '#ccc', fontSize: 13 },
  resumeActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  resumeSkip: { color: '#666', fontSize: 13 },
  resumeBtn: { backgroundColor: '#a78bfa', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  resumeBtnText: { color: '#000', fontSize: 13, fontWeight: '700' },
  body: { padding: 16 },
  title: { color: '#fff', fontSize: 18, fontWeight: '700', lineHeight: 24, marginBottom: 6 },
  meta: { color: '#6b6b80', fontSize: 12, marginBottom: 10 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  tag: { backgroundColor: '#1e1e2e', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { color: '#a0a0b0', fontSize: 11 },
  actions: { flexDirection: 'row', gap: 10, marginBottom: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#1e1e2e' },
  actionBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: '#1e1e2e', borderWidth: 1, borderColor: '#2e2e3e' },
  actionBtnActive: { backgroundColor: '#a78bfa', borderColor: '#a78bfa' },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  section: { marginBottom: 24 },
  sectionTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 12 },
  description: { color: '#a0a0b0', fontSize: 13, lineHeight: 20 },
  commentInput: { flexDirection: 'row', gap: 10, marginBottom: 16, alignItems: 'flex-end' },
  input: {
    flex: 1, backgroundColor: '#1e1e2e', borderWidth: 1, borderColor: '#2e2e3e',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: '#fff', fontSize: 13,
  },
  postBtn: { backgroundColor: '#a78bfa', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  postBtnDisabled: { opacity: 0.4 },
  postBtnText: { color: '#000', fontSize: 13, fontWeight: '700' },
  comment: { backgroundColor: '#1e1e2e', borderRadius: 10, padding: 12, marginBottom: 8 },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  commentUser: { color: '#fff', fontSize: 12, fontWeight: '600' },
  commentTime: { color: '#555', fontSize: 11 },
  commentText: { color: '#ccc', fontSize: 13, lineHeight: 18 },
  lockEmoji: { fontSize: 48, marginBottom: 12 },
  lockTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  lockSub: { color: '#666', fontSize: 14, textAlign: 'center' },
  errText: { color: '#666', fontSize: 16 },
});
