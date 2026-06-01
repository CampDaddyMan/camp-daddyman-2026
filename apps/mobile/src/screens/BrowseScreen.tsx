import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import api from '../lib/api';
import ContentCard, { ContentItem } from '../components/ContentCard';
import CinematicBanner, { BannerSlide } from '../components/CinematicBanner';
import AdBanner from '../components/AdBanner';
import { RootStackParamList } from '../navigation/RootNavigator';

const TYPES = ['ALL', 'MUSIC', 'FILM', 'PODCAST', 'SPOKEN_WORD'] as const;

export default function BrowseScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [banners, setBanners]        = useState<BannerSlide[]>([]);
  const [items, setItems]            = useState<ContentItem[]>([]);
  const [activeType, setActiveType]  = useState<string>('ALL');
  const [page, setPage]              = useState(1);
  const [totalPages, setTotalPages]  = useState(1);
  const [loading, setLoading]        = useState(false);
  const [refreshing, setRefreshing]  = useState(false);
  const [error, setError]            = useState('');
  const loadingRef = useRef(false);

  // Fetch banners once on mount
  useEffect(() => {
    api.get('/banners', { params: { page: 'HOME' } })
      .then((r) => setBanners(r.data.slides ?? []))
      .catch(() => {});
  }, []);

  const load = useCallback((type: string, p: number, append = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError('');
    const params: Record<string, string> = { page: String(p), limit: '12' };
    if (type !== 'ALL') params.type = type;
    api.get('/content', { params })
      .then((r) => {
        setItems((prev) => append ? [...prev, ...r.data.items] : r.data.items);
        setTotalPages(r.data.pages ?? 1);
        setPage(p);
      })
      .catch(() => { setError('Could not load content. Pull down to retry.'); })
      .finally(() => {
        loadingRef.current = false;
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  useEffect(() => { load('ALL', 1); }, []); // eslint-disable-line

  function handleTypeChange(t: string) {
    setActiveType(t);
    load(t, 1);
  }

  function handleRefresh() {
    setRefreshing(true);
    api.get('/banners', { params: { page: 'HOME' } })
      .then((r) => setBanners(r.data.slides ?? []))
      .catch(() => {});
    load(activeType, 1);
  }

  function handleEndReached() {
    if (page < totalPages && !loadingRef.current) load(activeType, page + 1, true);
  }

  const ListHeader = (
    <>
      {/* Cinematic banner carousel */}
      {banners.length > 0 && <CinematicBanner slides={banners} />}

      {/* Section quick links */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sectionRow}>
        {[
          { label: 'Live', screen: 'Live' },
          { label: 'Series', screen: 'Series' },
          { label: 'Albums', screen: 'Albums' },
          { label: 'Polls', screen: 'Polls' },
          { label: 'Partners', screen: 'Partners' },
          { label: 'The Ark', screen: 'Shop' },
        ].map((s) => (
          <TouchableOpacity key={s.label} style={styles.sectionBtn} onPress={() => navigation.navigate(s.screen as never)}>
            <Text style={styles.sectionBtnText}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Ad banner */}
      <AdBanner location="browse-top" />

      {/* Content type filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {TYPES.map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => handleTypeChange(t)}
            style={[styles.filterBtn, activeType === t && styles.filterBtnActive]}
          >
            <Text style={[styles.filterText, activeType === t && styles.filterTextActive]}>
              {t === 'SPOKEN_WORD' ? 'Spoken Word' : t.charAt(0) + t.slice(1).toLowerCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </>
  );

  if (loading && items.length === 0 && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f8c202" />
        <Text style={styles.loadingText}>Loading content…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id.toString()}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#f8c202" />}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No content yet. Pull down to refresh.</Text>
            </View>
          ) : null
        }
        ListFooterComponent={loading && page > 1 ? <ActivityIndicator color="#f8c202" style={{ marginVertical: 16 }} /> : null}
        renderItem={({ item }) => (
          <ContentCard
            item={item}
            onPress={() => navigation.navigate('Watch', { id: item.id })}
            fullWidth
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  loadingContainer: { flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingText: { color: '#aaa', fontSize: 15 },
  sectionRow: { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 6, gap: 10 },
  sectionBtn: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 22,
    backgroundColor: 'rgba(248,194,2,0.08)', borderWidth: 1, borderColor: 'rgba(248,194,2,0.4)',
    minHeight: 40, justifyContent: 'center',
  },
  sectionBtnText: { color: '#f8c202', fontSize: 14, fontWeight: '700' },
  filterRow: { paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  filterBtn: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 22,
    backgroundColor: '#161616', borderWidth: 1, borderColor: '#232323',
    minHeight: 40, justifyContent: 'center',
  },
  filterBtnActive: { backgroundColor: '#f8c202', borderColor: '#f8c202' },
  filterText: { color: '#999', fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: '#000', fontWeight: '700' },
  grid: { paddingHorizontal: 14, paddingBottom: 24 },
  row: { justifyContent: 'space-between' },
  errorBox: { backgroundColor: '#1a0a0a', borderRadius: 12, padding: 14, marginBottom: 10, marginHorizontal: 14 },
  errorText: { color: '#f87171', fontSize: 14 },
  emptyBox: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { color: '#666', fontSize: 15 },
});
