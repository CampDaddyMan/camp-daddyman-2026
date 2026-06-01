import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Image, RefreshControl, Modal,
  TextInput, KeyboardAvoidingView, Platform, Share,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import api from '../lib/api';
import { usePlayer, AUDIO_TYPES } from '../context/PlayerContext';
import { RootStackParamList } from '../navigation/RootNavigator';

type PlaylistRoute = RouteProp<RootStackParamList, 'PlaylistDetail'>;

interface PlaylistContent {
  id: string;
  title: string;
  type: string;
  thumbnailUrl?: string;
  mediaUrl?: string;
  duration?: number;
  views: number;
  creator: { username: string; displayName?: string };
}

interface PlaylistItem {
  id: string;
  position: number;
  content: PlaylistContent;
}

interface Playlist {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  items: PlaylistItem[];
  _count: { items: number };
}

function formatDuration(s: number) {
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function PlaylistDetailScreen() {
  const { params } = useRoute<PlaylistRoute>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const playerCtx = usePlayer();

  const [playlist, setPlaylist]   = useState<Playlist | null>(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [renaming, setRenaming]   = useState(false);
  const [newName, setNewName]     = useState('');
  const renameRef = useRef<TextInput>(null);

  const load = useCallback((refresh = false) => {
    if (!refresh) setLoading(true);
    api.get(`/playlists/${params.id}`)
      .then((r) => setPlaylist(r.data.playlist))
      .catch(() => {})
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  function openRename() {
    setNewName(playlist?.name ?? '');
    setRenaming(true);
    setTimeout(() => renameRef.current?.focus(), 100);
  }

  async function submitRename() {
    if (!newName.trim()) return;
    setRenaming(false);
    await api.patch(`/playlists/${params.id}`, { name: newName.trim() }).catch(() => {});
    setPlaylist((p) => p ? { ...p, name: newName.trim() } : p);
  }

  async function handleTogglePublic() {
    if (!playlist) return;
    const next = !playlist.isPublic;
    await api.patch(`/playlists/${params.id}`, { isPublic: next }).catch(() => {});
    setPlaylist((p) => p ? { ...p, isPublic: next } : p);
  }

  async function handleShare() {
    if (!playlist) return;
    if (!playlist.isPublic) {
      Alert.alert(
        'Private Playlist',
        'Make this playlist public so others can view it?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Make Public & Share',
            onPress: async () => {
              await api.patch(`/playlists/${params.id}`, { isPublic: true }).catch(() => {});
              setPlaylist((p) => p ? { ...p, isPublic: true } : p);
              await Share.share({ message: `https://campdaddyman.com/playlists/${params.id}`, url: `https://campdaddyman.com/playlists/${params.id}` });
            },
          },
        ],
      );
    } else {
      await Share.share({
        message: `Check out "${playlist.name}" on Camp DaddyMan: https://campdaddyman.com/playlists/${params.id}`,
        url: `https://campdaddyman.com/playlists/${params.id}`,
      });
    }
  }

  function confirmRemove(contentId: string) {
    Alert.alert('Remove from Playlist', 'Remove this item from the playlist?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          await api.delete(`/playlists/${params.id}/items/${contentId}`).catch(() => {});
          setPlaylist((p) => p
            ? { ...p, items: p.items.filter((i) => i.content.id !== contentId) }
            : p
          );
        },
      },
    ]);
  }

  function playItem(content: PlaylistContent) {
    if (AUDIO_TYPES.has(content.type) && content.mediaUrl) {
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
    } else {
      navigation.navigate('Watch', { id: content.id });
    }
  }

  if (loading) return (
    <View style={styles.center}><ActivityIndicator color="#f8c202" size="large" /></View>
  );

  if (!playlist) return (
    <View style={styles.center}><Text style={styles.errText}>Playlist not found.</Text></View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={playlist.items}
        keyExtractor={(i) => i.id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(true); }}
            tintColor="#f8c202"
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <Text style={styles.playlistName}>{playlist.name}</Text>
                <Text style={styles.playlistMeta}>
                  {playlist.items.length} item{playlist.items.length !== 1 ? 's' : ''}
                  {playlist.isPublic ? '  ·  Public' : '  ·  Private'}
                </Text>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity onPress={handleShare} style={styles.editBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="share-outline" size={18} color="#f8c202" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleTogglePublic} style={styles.editBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name={playlist.isPublic ? 'globe-outline' : 'lock-closed-outline'} size={18} color="#888" />
                </TouchableOpacity>
                <TouchableOpacity onPress={openRename} style={styles.editBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="pencil-outline" size={18} color="#f8c202" />
                </TouchableOpacity>
              </View>
            </View>
            {playlist.description ? (
              <Text style={styles.playlistDesc}>{playlist.description}</Text>
            ) : null}
            {playlist.items.length > 0 && (
              <TouchableOpacity
                style={styles.playAllBtn}
                onPress={() => playItem(playlist.items[0].content)}
              >
                <Ionicons name="play" size={16} color="#000" />
                <Text style={styles.playAllText}>Play All</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="list-outline" size={52} color="#1e1e1e" style={{ marginBottom: 16 }} />
            <Text style={styles.emptyTitle}>No items yet</Text>
            <Text style={styles.emptySub}>Tap the playlist icon on any Watch screen to add content here.</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => (
          <TouchableOpacity style={styles.row} onPress={() => playItem(item.content)} activeOpacity={0.75}>
            <Text style={styles.rowIndex}>{index + 1}</Text>
            {item.content.thumbnailUrl ? (
              <Image source={{ uri: item.content.thumbnailUrl }} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, styles.thumbFallback]}>
                <Ionicons
                  name={AUDIO_TYPES.has(item.content.type) ? 'musical-note' : 'film-outline'}
                  size={18}
                  color="#555"
                />
              </View>
            )}
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle} numberOfLines={2}>{item.content.title}</Text>
              <Text style={styles.rowMeta}>
                {item.content.type.replace('_', ' ')}
                {item.content.duration ? `  ·  ${formatDuration(item.content.duration)}` : ''}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => confirmRemove(item.content.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.removeBtn}
            >
              <Ionicons name="close-circle" size={22} color="#2a2a2a" />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />

      {/* Rename modal */}
      <Modal visible={renaming} transparent animationType="fade" onRequestClose={() => setRenaming(false)}>
        <KeyboardAvoidingView style={styles.modalWrap} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setRenaming(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rename Playlist</Text>
            <TextInput
              ref={renameRef}
              value={newName}
              onChangeText={setNewName}
              style={styles.modalInput}
              placeholderTextColor="#444"
              placeholder="Playlist name"
              returnKeyType="done"
              onSubmitEditing={submitRename}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setRenaming(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, !newName.trim() && { opacity: 0.4 }]}
                onPress={submitRename}
                disabled={!newName.trim()}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a' },
  errText: { color: '#666', fontSize: 15 },

  header: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 },
  headerLeft: { flex: 1, marginRight: 12 },
  playlistName: { color: '#fff', fontSize: 22, fontWeight: '800', lineHeight: 28, marginBottom: 4 },
  playlistMeta: { color: '#555', fontSize: 13 },
  playlistDesc: { color: '#888', fontSize: 14, lineHeight: 20, marginTop: 6, marginBottom: 4 },
  headerActions: { flexDirection: 'row', gap: 8 },
  editBtn: { padding: 6, backgroundColor: '#161616', borderRadius: 10, borderWidth: 1, borderColor: '#222' },
  playAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    alignSelf: 'flex-start',
    marginTop: 14, marginBottom: 6,
    backgroundColor: '#f8c202', borderRadius: 10,
    paddingHorizontal: 18, paddingVertical: 10,
  },
  playAllText: { color: '#000', fontWeight: '800', fontSize: 14 },

  listContent: { paddingBottom: 40 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#111',
    gap: 10,
  },
  rowIndex: { color: '#333', fontSize: 13, width: 20, textAlign: 'center' },
  thumb: { width: 52, height: 52, borderRadius: 8 },
  thumbFallback: { backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#1e1e1e' },
  rowInfo: { flex: 1 },
  rowTitle: { color: '#e8e8e8', fontSize: 14, fontWeight: '600', lineHeight: 19, marginBottom: 3 },
  rowMeta: { color: '#555', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4 },
  removeBtn: { padding: 4 },

  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 36 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 10 },
  emptySub: { color: '#555', fontSize: 14, textAlign: 'center', lineHeight: 21 },

  // Rename modal
  modalWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)' },
  modalCard: { backgroundColor: '#141414', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#222' },
  modalTitle: { color: '#fff', fontSize: 17, fontWeight: '800', marginBottom: 16, textAlign: 'center' },
  modalInput: {
    backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#2a2a2a',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13,
    color: '#fff', fontSize: 15, marginBottom: 18,
  },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalCancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: '#1a1a1a', alignItems: 'center' },
  modalCancelText: { color: '#666', fontWeight: '700', fontSize: 15 },
  modalSaveBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: '#f8c202', alignItems: 'center' },
  modalSaveText: { color: '#000', fontWeight: '800', fontSize: 15 },
});
