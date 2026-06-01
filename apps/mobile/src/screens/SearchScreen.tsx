import React, { useState } from 'react';
import {
  View, Text, TextInput, FlatList, StyleSheet,
  TouchableOpacity, ActivityIndicator, Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import api from '../lib/api';
import ContentCard, { ContentItem } from '../components/ContentCard';
import { RootStackParamList } from '../navigation/RootNavigator';

const TYPES = ['ALL', 'MUSIC', 'FILM', 'PODCAST', 'SPOKEN_WORD'] as const;

const TYPE_ICONS: Record<string, string> = {
  ALL: 'apps-outline',
  MUSIC: 'musical-notes-outline',
  FILM: 'film-outline',
  PODCAST: 'mic-outline',
  SPOKEN_WORD: 'chatbubble-outline',
};

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
      <View style={styles.searchWrap}>
        <View style={styles.inputRow}>
          <Ionicons name="search-outline" size={18} color="#666" style={styles.searchIcon} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => doSearch(query, activeType)}
            placeholder="Search music, films, podcasts..."
            placeholderTextColor="#444"
            style={styles.input}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setSearched(false); setItems([]); }} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color="#555" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.goBtn, query.trim().length < 2 && styles.goBtnDisabled]}
          onPress={() => doSearch(query, activeType)}
          disabled={query.trim().length < 2}
        >
          <Text style={styles.goBtnText}>Search</Text>
        </TouchableOpacity>
      </View>

      {/* Type filters — only after first search */}
      {searched && (
        <FlatList
          data={TYPES as unknown as string[]}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(t) => t}
          contentContainerStyle={styles.filterRow}
          renderItem={({ item: t }) => (
            <TouchableOpacity
              onPress={() => handleTypeChange(t)}
              style={[styles.filterBtn, activeType === t && styles.filterBtnActive]}
            >
              <Ionicons
                name={(TYPE_ICONS[t] ?? 'apps-outline') as any}
                size={13}
                color={activeType === t ? '#000' : '#888'}
                style={{ marginRight: 5 }}
              />
              <Text style={[styles.filterText, activeType === t && styles.filterTextActive]}>
                {t === 'SPOKEN_WORD' ? 'Spoken Word' : t.charAt(0) + t.slice(1).toLowerCase()}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* States */}
      {loading ? (
        <View style={styles.stateBox}>
          <ActivityIndicator color="#f8c202" size="large" />
        </View>
      ) : searched && items.length === 0 ? (
        <View style={styles.stateBox}>
          <Ionicons name="search-outline" size={52} color="#2a2a2a" style={{ marginBottom: 16 }} />
          <Text style={styles.stateTitle}>No results for "{query}"</Text>
          <Text style={styles.stateSub}>Try different keywords or browse by type</Text>
        </View>
      ) : searched ? (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id.toString()}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.resultCount}>
              {total.toLocaleString()} result{total !== 1 ? 's' : ''}
              {activeType !== 'ALL' ? ` · ${activeType === 'SPOKEN_WORD' ? 'Spoken Word' : activeType.charAt(0) + activeType.slice(1).toLowerCase()}` : ''}
            </Text>
          }
          renderItem={({ item }) => (
            <ContentCard item={item} onPress={() => navigation.navigate('Watch', { id: item.id })} fullWidth />
          )}
        />
      ) : (
        <View style={styles.idleBox}>
          <Ionicons name="musical-notes-outline" size={52} color="#1e1e1e" style={{ marginBottom: 18 }} />
          <Text style={styles.idleTitle}>Discover Camp DaddyMan</Text>
          <Text style={styles.idleSub}>Search music, films, podcasts, and spoken word</Text>
          <View style={styles.suggestionsRow}>
            {['Music', 'Film', 'Podcast'].map((s) => (
              <TouchableOpacity
                key={s}
                style={styles.suggestion}
                onPress={() => { setQuery(s); doSearch(s, 'ALL'); }}
              >
                <Text style={styles.suggestionText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },

  searchWrap: { padding: 14, paddingBottom: 10, gap: 10 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#242424',
    borderRadius: 14,
    minHeight: 52,
    paddingHorizontal: 14,
    gap: 8,
  },
  searchIcon: {},
  input: { flex: 1, color: '#f0f0f0', fontSize: 15, paddingVertical: 0 },
  clearBtn: { padding: 4 },
  goBtn: {
    backgroundColor: '#f8c202',
    borderRadius: 14,
    minHeight: 52,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goBtnDisabled: { opacity: 0.35 },
  goBtnText: { color: '#000', fontWeight: '800', fontSize: 15 },

  filterRow: { paddingHorizontal: 14, paddingBottom: 12, gap: 8 },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 0,
    borderRadius: 22,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#232323',
    minHeight: 40,
  },
  filterBtnActive: { backgroundColor: '#f8c202', borderColor: '#f8c202' },
  filterText: { color: '#888', fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: '#000', fontWeight: '700' },

  grid: { paddingHorizontal: 14, paddingBottom: 24 },
  row: { justifyContent: 'space-between' },
  resultCount: {
    color: '#555',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  stateBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  stateTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  stateSub: { color: '#666', fontSize: 14, textAlign: 'center', lineHeight: 20 },

  idleBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  idleTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  idleSub: { color: '#666', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  suggestionsRow: { flexDirection: 'row', gap: 10 },
  suggestion: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: 'rgba(248,194,2,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(248,194,2,0.3)',
  },
  suggestionText: { color: '#f8c202', fontSize: 13, fontWeight: '700' },
});
