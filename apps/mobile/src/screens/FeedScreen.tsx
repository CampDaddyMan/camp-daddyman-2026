import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import ContentCard, { ContentItem } from '../components/ContentCard';
import { RootStackParamList } from '../navigation/RootNavigator';

export default function FeedScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const [items, setItems]         = useState<ContentItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    api.get('/creators/feed')
      .then((r) => setItems(r.data.items ?? []))
      .catch(() => {})
      .finally(() => { setLoading(false); setRefreshing(false); });
  }

  useEffect(() => { if (user) load(); else setLoading(false); }, [user]); // eslint-disable-line

  if (!user) return (
    <View style={styles.center}>
      <Ionicons name="musical-notes-outline" size={48} color="#555" style={{ marginBottom: 14 }} />
      <Text style={styles.title}>Your Following Feed</Text>
      <Text style={styles.sub}>Sign in to see new content from creators you follow.</Text>
    </View>
  );

  if (loading) return (
    <View style={styles.center}><ActivityIndicator color="#f8c202" size="large" /></View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id.toString()}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#f8c202" />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="musical-notes-outline" size={44} color="#555" style={{ marginBottom: 14 }} />
            <Text style={styles.title}>Nothing here yet</Text>
            <Text style={styles.sub}>Follow creators to see their content here.</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  grid: { padding: 12, flexGrow: 1 },
  row: { justifyContent: 'space-between' },
  center: { flex: 1, backgroundColor: '#0d0d0d', alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  title: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  sub: { color: '#888', fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
