import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  FlatList, TextInput, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../lib/api';

interface Playlist {
  id: string;
  name: string;
  _count: { items: number };
}

interface Props {
  contentId: string;
  visible: boolean;
  onClose: () => void;
}

export default function AddToPlaylistModal({ contentId, visible, onClose }: Props) {
  const [playlists, setPlaylists]   = useState<Playlist[]>([]);
  const [loading, setLoading]       = useState(false);
  const [creating, setCreating]     = useState(false);
  const [newName, setNewName]       = useState('');
  const [adding, setAdding]         = useState<string | null>(null);
  const [added, setAdded]           = useState<Set<string>>(new Set());
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!visible) { setCreating(false); setNewName(''); setAdded(new Set()); return; }
    setLoading(true);
    api.get('/playlists')
      .then((r) => setPlaylists(r.data.playlists ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [visible]);

  async function handleAdd(playlistId: string) {
    if (added.has(playlistId) || adding) return;
    setAdding(playlistId);
    try {
      await api.post(`/playlists/${playlistId}/items`, { contentId });
      setAdded((s) => new Set([...s, playlistId]));
    } catch {}
    setAdding(null);
  }

  async function handleCreate() {
    if (!newName.trim() || adding) return;
    setAdding('new');
    try {
      const { data } = await api.post('/playlists', { name: newName.trim() });
      const playlist: Playlist = data.playlist;
      await api.post(`/playlists/${playlist.id}/items`, { contentId });
      setPlaylists((prev) => [playlist, ...prev]);
      setAdded((s) => new Set([...s, playlist.id]));
      setNewName('');
      setCreating(false);
    } catch {}
    setAdding(null);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Add to Playlist</Text>

          {/* New playlist row */}
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
                style={[styles.createConfirmBtn, (!newName.trim() || !!adding) && { opacity: 0.4 }]}
                onPress={handleCreate}
                disabled={!newName.trim() || !!adding}
              >
                {adding === 'new'
                  ? <ActivityIndicator color="#000" size="small" />
                  : <Text style={styles.createConfirmText}>Create</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setCreating(false); setNewName(''); }} style={styles.cancelCreateBtn}>
                <Ionicons name="close" size={18} color="#555" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.newBtn} onPress={() => setCreating(true)}>
              <Ionicons name="add-circle-outline" size={20} color="#f8c202" />
              <Text style={styles.newBtnText}>New Playlist</Text>
            </TouchableOpacity>
          )}

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color="#f8c202" />
            </View>
          ) : playlists.length === 0 && !creating ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>No playlists yet. Create one above.</Text>
            </View>
          ) : (
            <FlatList
              data={playlists}
              keyExtractor={(p) => p.id}
              style={styles.list}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isAdded = added.has(item.id);
                const isAdding = adding === item.id;
                return (
                  <TouchableOpacity
                    style={[styles.row, isAdded && styles.rowAdded]}
                    onPress={() => handleAdd(item.id)}
                    disabled={isAdded || !!adding}
                    activeOpacity={0.75}
                  >
                    <View style={styles.rowIcon}>
                      <Ionicons name="list" size={18} color={isAdded ? '#f8c202' : '#555'} />
                    </View>
                    <View style={styles.rowInfo}>
                      <Text style={[styles.rowName, isAdded && styles.rowNameAdded]}>{item.name}</Text>
                      <Text style={styles.rowCount}>{item._count.items} item{item._count.items !== 1 ? 's' : ''}</Text>
                    </View>
                    {isAdding ? (
                      <ActivityIndicator color="#f8c202" size="small" />
                    ) : isAdded ? (
                      <Ionicons name="checkmark-circle" size={22} color="#f8c202" />
                    ) : (
                      <Ionicons name="add" size={22} color="#444" />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: '#141414',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: '#222',
    paddingBottom: 40,
    maxHeight: 480,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#2a2a2a',
    alignSelf: 'center',
    marginTop: 12, marginBottom: 16,
  },
  title: {
    color: '#fff', fontSize: 17, fontWeight: '800',
    textAlign: 'center', marginBottom: 14,
    paddingHorizontal: 20,
  },

  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginBottom: 8,
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#1a1a1a', borderRadius: 14,
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  newBtnText: { color: '#f8c202', fontSize: 15, fontWeight: '700' },

  createRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 8,
  },
  createInput: {
    flex: 1, backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#2a2a2a',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: '#fff', fontSize: 14,
  },
  createConfirmBtn: {
    backgroundColor: '#f8c202', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    minWidth: 72, alignItems: 'center',
  },
  createConfirmText: { color: '#000', fontWeight: '800', fontSize: 14 },
  cancelCreateBtn: { padding: 8 },

  loadingWrap: { alignItems: 'center', paddingVertical: 24 },
  emptyWrap: { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 24 },
  emptyText: { color: '#555', fontSize: 14, textAlign: 'center' },

  list: { marginTop: 4 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#1a1a1a',
  },
  rowAdded: { opacity: 0.7 },
  rowIcon: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#222',
    alignItems: 'center', justifyContent: 'center',
  },
  rowInfo: { flex: 1 },
  rowName: { color: '#ddd', fontSize: 15, fontWeight: '600' },
  rowNameAdded: { color: '#f8c202' },
  rowCount: { color: '#555', fontSize: 12, marginTop: 2 },
});
