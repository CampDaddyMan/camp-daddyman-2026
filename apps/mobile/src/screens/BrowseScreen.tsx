import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, TextInput, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import api from '../lib/api';
import ContentCard, { ContentItem } from '../components/ContentCard';
import { RootStackParamList } from '../navigation/RootNavigator';

const TYPES = ['ALL', 'MUSIC', 'FILM', 'PODCAST', 'SPOKEN_WORD'] as const;

export default function BrowseScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [items, setItems]           = useState<ContentItem[]>([]);
  const [activeType, setActiveType] = useState<string>('ALL');
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]       = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback((type: string, p: number, append = false) => {
    if (loading) return;
    setLoading(true);
    const params: Record<string, string> = { page: String(p), limit: '12' };
    if (type !== 'ALL') params.type = type;
    api.get('/content', { params })
      .then((r) => {
        setItems((prev) => append ? [...prev, ...r.data.items] : r.data.items);
        setTotalPages(r.data.pages);
        setPage(p);
      })
      .catch(() => {})
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, [loading]);

  useEffect(() => { load('ALL', 1); }, []); // eslint-disable-line

  function handleTypeChange(t: string) {
    setActiveType(t);
    load(t, 1);
  }

  function handleRefresh() {
    setRefreshing(true);
    load(activeType, 1);
  }

  function handleEndReached() {
    if (page < totalPages && !loading) load(activeType, page + 1, true);
  }

  return (
    <View style={styles.container}>
      {/* Type filter */}
      <FlatList
        data={TYPES}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(t) => t}
        contentContainerStyle={styles.filterRow}
        renderItem={({ item: t }) => (
          <TouchableOpacity
            onPress={() => handleTypeChange(t)}
            style={[styles.filterBtn, activeType === t && styles.filterBtnActive]}
          >
            <Text style={[styles.filterText, activeType === t && styles.filterTextActive]}>
              {t === 'SPOKEN_WORD' ? 'Spoken Word' : t.charAt(0) + t.slice(1).toLowerCase()}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Content grid */}
      <FlatList
        data={items}
        numColumns={2}
        keyExtractor={(i) => i.id}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#a78bfa" />}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        ListFooterComponent={loading && page > 1 ? <ActivityIndicator color="#a78bfa" style={{ marginVertical: 16 }} /> : null}
        renderItem={({ item }) => (
          <ContentCard item={item} onPress={() => navigation.navigate('Watch', { id: item.id })} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f17' },
  filterRow: { paddingHorizontal: 12, paddingVertical: 12, gap: 8 },
  filterBtn: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#1e1e2e', borderWidth: 1, borderColor: '#2e2e3e',
  },
  filterBtnActive: { backgroundColor: '#a78bfa', borderColor: '#a78bfa' },
  filterText: { color: '#a0a0b0', fontSize: 13, fontWeight: '500' },
  filterTextActive: { color: '#000' },
  grid: { paddingHorizontal: 12, paddingBottom: 20 },
  row: { justifyContent: 'space-between' },
});
