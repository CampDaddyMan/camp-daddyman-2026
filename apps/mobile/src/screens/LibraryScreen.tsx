import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, Modal,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import api from '../lib/api';
import ContentCard, { ContentItem } from '../components/ContentCard';
import { RootStackParamList } from '../navigation/RootNavigator';

type Section = 'liked' | 'saved' | 'history' | 'playlists';

interface Playlist {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  _count: { items: number };
}

const CONTENT_TABS: { key: Exclude<Section, 'playlists'>; label: string; emptyIcon: string; emptyMsg: string }[] = [
  { key: 'liked',   label: 'Liked',   emptyIcon: 'heart-outline',  emptyMsg: "Content you've liked will appear here." },
  { key: 'saved',   label: 'Saved',   emptyIcon: 'time-outline',   emptyMsg: "Save content to watch later." },
  { key: 'history', label: 'History', emptyIcon: 'list-outline',   emptyMsg: "Your recently watched content will appear here." },
];

const CONTENT_ENDPOINT: Record<Exclude<Section, 'playlists'>, string> = {
  liked:   '/content/liked',
  saved:   '/content/saved',
  history: '/content/history',
};

// ── Playlists panel ───────────────────────────────────────────────────────────

function PlaylistsPanel() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [playlists, setPlaylists]   = useState<Playlist[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating]     = useState(false);
  const [newName, setNewName]       = useState('');
  const [saving, setSaving]         = useState(false);
  const inputRef = useRef<TextInput>(null);

  const load = useCallback((refresh = false) => {
    if (!refresh) setLoading(true);
    api.get('/playlists')
      .then((r) => setPlaylists(r.data.playlists ?? []))
      .catch(() => {})
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleCreate() {
    if (!newName.trim() || saving) return;
    setSaving(true);
    try {
      const { data } = await api.post('/playlists', { name: newName.trim() });
      setPlaylists((p) => [data.playlist, ...p]);
      setNewName('');
      setCreating(false);
    } catch {}
    setSaving(false);
  }

  function confirmDelete(playlist: Playlist) {
    Alert.alert('Delete Playlist', `Delete "${playlist.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await api.delete(`/playlists/${playlist.id}`).catch(() => {});
          setPlaylists((p) => p.filter((pl) => pl.id !== playlist.id));
        },
      },
    ]);
  }

  if (loading) return (
    <View style={styles.center}><ActivityIndicator color="#f8c202" size="large" /></View>
  );

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={playlists}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor="#f8c202" />
        }
        ListHeaderComponent={
          <View style={styles.plHeader}>
            {creating ? (
              <View style={styles.createRow}>
                <TextInput
                  ref={inputRef}
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="Playlist name"
                  placeholderTextColor="#444"
                  style={styles.createInput}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleCreate}
                />
                <TouchableOpacity
                  style={[styles.createConfirmBtn, (!newName.trim() || saving) && { opacity: 0.4 }]}
                  onPress={handleCreate}
                  disabled={!newName.trim() || saving}
                >
                  {saving ? <ActivityIndicator color="#000" size="small" /> : <Text style={styles.createConfirmText}>Create</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setCreating(false); setNewName(''); }} style={styles.cancelBtn}>
                  <Ionicons name="close" size={18} color="#555" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.newPlaylistBtn} onPress={() => setCreating(true)}>
                <Ionicons name="add" size={18} color="#000" />
                <Text style={styles.newPlaylistText}>New Playlist</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="list-outline" size={52} color="#1e1e1e" style={{ marginBottom: 16 }} />
            <Text style={styles.emptyTitle}>No playlists yet</Text>
            <Text style={styles.emptySub}>Create a playlist to organize your favorite content.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.playlistCard}
            onPress={() => navigation.navigate('PlaylistDetail', { id: item.id, name: item.name })}
            activeOpacity={0.75}
          >
            <View style={styles.playlistCardIcon}>
              <Ionicons name="list" size={22} color="#f8c202" />
            </View>
            <View style={styles.playlistCardInfo}>
              <Text style={styles.playlistCardName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.playlistCardMeta}>
                {item._count.items} item{item._count.items !== 1 ? 's' : ''}
                {item.isPublic ? '  ·  Public' : ''}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => confirmDelete(item)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.deleteBtn}
            >
              <Ionicons name="trash-outline" size={17} color="#333" />
            </TouchableOpacity>
            <Ionicons name="chevron-forward" size={16} color="#2a2a2a" />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

// ── Main Library screen ───────────────────────────────────────────────────────

export default function LibraryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [tab, setTab]               = useState<Section>('liked');
  const [items, setItems]           = useState<ContentItem[]>([]);
  const [loading, setLoading]       = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  function loadContent(section: Exclude<Section, 'playlists'>, isRefresh = false) {
    if (!isRefresh) setLoading(true);
    api.get(CONTENT_ENDPOINT[section])
      .then((r) => setItems(r.data.items ?? r.data ?? []))
      .catch(() => setItems([]))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }

  useEffect(() => {
    if (tab !== 'playlists') loadContent(tab as Exclude<Section, 'playlists'>);
  }, [tab]);

  const ALL_TABS: { key: Section; label: string }[] = [
    { key: 'liked',     label: 'Liked' },
    { key: 'saved',     label: 'Saved' },
    { key: 'history',   label: 'History' },
    { key: 'playlists', label: 'Playlists' },
  ];

  const activeContentTab = CONTENT_TABS.find((t) => t.key === tab);

  return (
    <View style={styles.container}>
      {/* Wrapped banner */}
      <TouchableOpacity
        style={styles.wrappedBanner}
        onPress={() => navigation.navigate('Wrapped')}
        activeOpacity={0.85}
      >
        <View style={styles.wrappedBannerLeft}>
          <Text style={styles.wrappedBannerYear}>{new Date().getFullYear()}</Text>
          <Text style={styles.wrappedBannerTitle}>Wrapped</Text>
          <Text style={styles.wrappedBannerSub}>Your year in review →</Text>
        </View>
        <Text style={styles.wrappedBannerEmoji}>🎵🎬🎙️</Text>
      </TouchableOpacity>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {ALL_TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
            onPress={() => setTab(t.key)}
            activeOpacity={0.75}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'playlists' ? (
        <PlaylistsPanel />
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#f8c202" size="large" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id.toString()}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadContent(tab as Exclude<Section, 'playlists'>, true);
              }}
              tintColor="#f8c202"
            />
          }
          ListHeaderComponent={
            items.length > 0 ? (
              <Text style={styles.count}>{items.length} item{items.length !== 1 ? 's' : ''}</Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name={activeContentTab?.emptyIcon as any ?? 'list-outline'} size={52} color="#1e1e1e" style={{ marginBottom: 18 }} />
              <Text style={styles.emptyTitle}>Nothing here yet</Text>
              <Text style={styles.emptySub}>{activeContentTab?.emptyMsg ?? ''}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <ContentCard
              item={item}
              onPress={() => navigation.navigate('Watch', { id: item.id })}
              fullWidth
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },

  wrappedBanner: {
    marginHorizontal: 14, marginTop: 14, marginBottom: 6,
    borderRadius: 16, backgroundColor: '#1a0a00',
    borderWidth: 1, borderColor: '#f8c202',
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 18, gap: 12,
  },
  wrappedBannerLeft: { flex: 1 },
  wrappedBannerYear: { color: 'rgba(248,194,2,0.6)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' },
  wrappedBannerTitle: { color: '#f8c202', fontSize: 22, fontWeight: '900', lineHeight: 26 },
  wrappedBannerSub: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 },
  wrappedBannerEmoji: { fontSize: 28 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },

  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 6,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#1e1e1e',
    paddingHorizontal: 4,
  },
  tabBtnActive: { backgroundColor: '#f8c202', borderColor: '#f8c202' },
  tabText: { color: '#666', fontSize: 11, fontWeight: '700' },
  tabTextActive: { color: '#000', fontWeight: '800' },

  grid: { paddingHorizontal: 14, paddingBottom: 32 },
  count: {
    color: '#3a3a3a', fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14,
  },
  empty: { alignItems: 'center', paddingTop: 64, paddingHorizontal: 32 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 10 },
  emptySub: { color: '#555', fontSize: 14, textAlign: 'center', lineHeight: 21 },

  // Playlists panel
  plHeader: { marginBottom: 12 },
  newPlaylistBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#f8c202', borderRadius: 12,
    paddingHorizontal: 18, paddingVertical: 11,
    marginBottom: 4,
  },
  newPlaylistText: { color: '#000', fontWeight: '800', fontSize: 14 },
  createRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  createInput: {
    flex: 1, backgroundColor: '#141414', borderWidth: 1, borderColor: '#2a2a2a',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: '#fff', fontSize: 14,
  },
  createConfirmBtn: {
    backgroundColor: '#f8c202', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    minWidth: 72, alignItems: 'center',
  },
  createConfirmText: { color: '#000', fontWeight: '800', fontSize: 14 },
  cancelBtn: { padding: 8 },

  playlistCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#0f0f0f', borderRadius: 14,
    borderWidth: 1, borderColor: '#191919',
    padding: 14, marginBottom: 8,
  },
  playlistCardIcon: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#222',
    alignItems: 'center', justifyContent: 'center',
  },
  playlistCardInfo: { flex: 1 },
  playlistCardName: { color: '#e8e8e8', fontSize: 15, fontWeight: '700', marginBottom: 3 },
  playlistCardMeta: { color: '#555', fontSize: 12 },
  deleteBtn: { padding: 6 },
});
