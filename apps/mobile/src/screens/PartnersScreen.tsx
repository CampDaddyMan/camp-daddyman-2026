import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import api from '../lib/api';

interface Partner {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  category?: string;
}

export default function PartnersScreen() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]       = useState('');

  function load(isRefresh = false) {
    if (!isRefresh) setLoading(true);
    setError('');
    api.get('/partners/public')
      .then((r) => setPartners(r.data.partners ?? r.data ?? []))
      .catch(() => setError('Could not load partners.'))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }

  useEffect(() => { load(); }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#f8c202" /></View>;

  return (
    <FlatList
      data={partners}
      keyExtractor={(p) => p.id.toString()}
      contentContainerStyle={styles.grid}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor="#f8c202" />}
      ListHeaderComponent={
        <View style={styles.headerWrap}>
          <Text style={styles.heading}>Partners</Text>
          <Text style={styles.sub}>Brands & collaborators in the Camp DaddyMan community</Text>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          {error ? (
            <>
              <Ionicons name="cloud-offline-outline" size={48} color="#2a2a2a" style={{ marginBottom: 14 }} />
              <Text style={styles.errorText}>{error}</Text>
            </>
          ) : (
            <>
              <Ionicons name="people-outline" size={48} color="#2a2a2a" style={{ marginBottom: 14 }} />
              <Text style={styles.emptyText}>No partners listed yet.</Text>
            </>
          )}
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() => { if (item.website) Linking.openURL(item.website); }}
          accessibilityLabel={`${item.name}${item.category ? `, ${item.category}` : ''}. Tap to visit website.`}
          accessibilityRole="button"
        >
          <View style={styles.logoWrap}>
            {item.logoUrl
              ? <Image source={{ uri: item.logoUrl }} style={styles.logo} contentFit="contain" />
              : <Text style={styles.logoPlaceholder}>{item.name.charAt(0).toUpperCase()}</Text>
            }
          </View>
          <Text style={styles.name} numberOfLines={2}>
            {item.name}
          </Text>
          {item.category && <Text style={styles.category}>{item.category}</Text>}
          {item.description && (
            <Text style={styles.desc} numberOfLines={3}>
              {item.description}
            </Text>
          )}
          {item.website && (
            <View style={styles.visitRow}>
              <Ionicons name="open-outline" size={13} color="#f8c202" />
              <Text style={styles.visitText}>Visit</Text>
            </View>
          )}
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center' },
  grid: { backgroundColor: '#0a0a0a', padding: 16, paddingBottom: 40 },
  headerWrap: { marginBottom: 20 },
  heading: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -0.5, marginBottom: 4 },
  sub: { color: '#555', fontSize: 13, fontWeight: '500' },
  card: {
    width: '100%',
    backgroundColor: '#111',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
  logoWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#1a1a2e',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12, overflow: 'hidden',
    borderWidth: 1.5, borderColor: '#2a2a3e',
  },
  logo: { width: 64, height: 64 },
  logoPlaceholder: { color: '#f8c202', fontSize: 32, fontWeight: '900' },
  name: { color: '#fff', fontSize: 14, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  category: { color: '#f8c202', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'center', marginBottom: 6 },
  desc: { color: '#888', fontSize: 12, textAlign: 'center', lineHeight: 17, marginBottom: 8 },
  visitRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  visitText: { color: '#f8c202', fontSize: 12, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#555', fontSize: 15 },
  errorText: { color: '#f87171', fontSize: 14 },
});
