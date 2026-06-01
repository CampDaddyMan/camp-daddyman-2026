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


interface Album {
  id: string;
  title: string;
  coverUrl?: string;
  genre?: string;
  releaseYear?: number;
  creator?: { username: string; displayName?: string };
  _count?: { tracks: number };
}

export default function AlbumsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [items, setItems]           = useState<Album[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState('');

  function load(isRefresh = false) {
    if (!isRefresh) setLoading(true);
    setError('');
    api.get('/albums')
      .then((r) => setItems(r.data.albums ?? r.data.items ?? r.data ?? []))
      .catch(() => setError('Could not load albums.'))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }

  useEffect(() => { load(); }, []);

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#f8c202" />
    </View>
  );

  return (
    <FlatList
      data={items}
      keyExtractor={(i) => i.id.toString()}
      contentContainerStyle={styles.grid}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor="#f8c202" />}
      ListHeaderComponent={
        <View style={styles.pageHeader}>
          <Text style={styles.heading}>Albums</Text>
          <Text style={styles.headingSub}>{items.length} release{items.length !== 1 ? 's' : ''}</Text>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <>
              <Ionicons name="disc-outline" size={48} color="#333" style={{ marginBottom: 14 }} />
              <Text style={styles.emptyTitle}>No albums yet</Text>
              <Text style={styles.emptySub}>Check back soon for new releases.</Text>
            </>
          )}
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.82}
          onPress={() => navigation.navigate('AlbumDetail', { id: item.id })}
        >
          <View style={styles.cover}>
            {item.coverUrl ? (
              <Image source={{ uri: item.coverUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <View style={styles.coverPlaceholder}>
                <Ionicons name="disc-outline" size={40} color="#f8c202" />
              </View>
            )}
            <View style={styles.coverOverlay} />
            {item.genre && (
              <View style={styles.genreBadge}>
                <Text style={styles.genreText}>{item.genre}</Text>
              </View>
            )}
            {item._count != null && (
              <View style={styles.trackCountBadge}>
                <Text style={styles.trackCountText}>{item._count.tracks}</Text>
                <Text style={styles.trackCountLabel}> tracks</Text>
              </View>
            )}
          </View>

          <View style={styles.cardMeta}>
            <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
            {item.creator && (
              <Text style={styles.creator} numberOfLines={1}>
                {item.creator.displayName || item.creator.username}
              </Text>
            )}
            {item.releaseYear && (
              <Text style={styles.year}>{item.releaseYear}</Text>
            )}
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center' },
  grid: { backgroundColor: '#0a0a0a', paddingHorizontal: 14, paddingBottom: 40 },
  row: { justifyContent: 'space-between' },

  pageHeader: { paddingTop: 20, paddingBottom: 18 },
  heading: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  headingSub: { color: '#555', fontSize: 13, fontWeight: '500', marginTop: 3 },

  card: { width: '100%', marginBottom: 22 },

  cover: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#141414',
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  coverPlaceholder: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#141414',
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  genreBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(248,194,2,0.18)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(248,194,2,0.35)',
  },
  genreText: { color: '#f8c202', fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  trackCountBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  trackCountText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  trackCountLabel: { color: '#aaa', fontSize: 10, fontWeight: '500' },

  cardMeta: { paddingHorizontal: 2 },
  title: { color: '#f0f0f0', fontSize: 15, fontWeight: '700', lineHeight: 20, marginBottom: 4 },
  creator: { color: '#999', fontSize: 12, fontWeight: '500', marginBottom: 3 },
  year: { color: '#f8c202', fontSize: 11, fontWeight: '600' },

  empty: { alignItems: 'center', paddingTop: 64 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySub: { color: '#666', fontSize: 14, textAlign: 'center' },
  errorText: { color: '#f87171', fontSize: 14 },
});
