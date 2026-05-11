import React, { useState } from 'react';
import {
  View, Text, TextInput, FlatList, StyleSheet,
  TouchableOpacity, ActivityIndicator, Keyboard,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import api from '../lib/api';
import ContentCard, { ContentItem } from '../components/ContentCard';
import { RootStackParamList } from '../navigation/RootNavigator';

const TYPES = ['ALL', 'MUSIC', 'FILM', 'PODCAST', 'SPOKEN_WORD'] as const;

export default function SearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [query, setQuery]           = useState('');
  const [activeType, setActiveType] = useState('ALL');
  const [items, setItems]           = useState<ContentItem[]>([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(false);
  const [searched, setSearched]     = useState(false);

  function doSearch(q: string, type: string) {
    if (q.trim().length < 2) return;
    Keyboard.dismiss();
    setLoading(true);
    setSearched(true);
    const params: Record<string, string> = { q: q.trim() };
    if (type !== 'ALL') params.type = type;
    api.get('/content/search', { params })
      .then((r) => { setItems(r.data.items); setTotal(r.data.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  function handleTypeChange(t: string) {
    setActiveType(t);
    if (searched) doSearch(query, t);
  }

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => doSearch(query, activeType)}
          placeholder="Search music, films, creators..."
          placeholderTextColor="#555"
          style={styles.input}
          returnKeyType="search"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[styles.searchBtn, query.trim().length < 2 && styles.searchBtnDisabled]}
          onPress={() => doSearch(query, activeType)}
          disabled={query.trim().length < 2}
        >
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>

      {/* Type filters */}
      {searched && (
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
      )}

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#a78bfa" /></View>
      ) : searched && items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={styles.emptyTitle}>No results for "{query}"</Text>
          <Text style={styles.emptySub}>Try different keywords or browse by type</Text>
        </View>
      ) : searched ? (
        <FlatList
          data={items}
          numColumns={2}
          keyExtractor={(i) => i.id}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.resultCount}>{total} result{total !== 1 ? 's' : ''} for "{query}"</Text>
          }
          renderItem={({ item }) => (
            <ContentCard item={item} onPress={() => navigation.navigate('Watch', { id: item.id })} />
          )}
        />
      ) : (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🎵</Text>
          <Text style={styles.emptySub}>Search for music, films, podcasts, or creators</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f17' },
  searchRow: { flexDirection: 'row', gap: 10, padding: 12 },
  input: {
    flex: 1, backgroundColor: '#1e1e2e', borderWidth: 1, borderColor: '#2e2e3e',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, color: '#fff', fontSize: 14,
  },
  searchBtn: { backgroundColor: '#a78bfa', borderRadius: 12, paddingHorizontal: 18, justifyContent: 'center' },
  searchBtnDisabled: { opacity: 0.4 },
  searchBtnText: { color: '#000', fontWeight: '700', fontSize: 14 },
  filterRow: { paddingHorizontal: 12, paddingBottom: 10, gap: 8 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#1e1e2e', borderWidth: 1, borderColor: '#2e2e3e' },
  filterBtnActive: { backgroundColor: '#a78bfa', borderColor: '#a78bfa' },
  filterText: { color: '#a0a0b0', fontSize: 13, fontWeight: '500' },
  filterTextActive: { color: '#000' },
  grid: { paddingHorizontal: 12, paddingBottom: 20 },
  row: { justifyContent: 'space-between' },
  resultCount: { color: '#6b6b80', fontSize: 12, marginBottom: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 6 },
  emptySub: { color: '#666', fontSize: 13, textAlign: 'center' },
});
