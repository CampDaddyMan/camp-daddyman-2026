import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import ContentCard, { ContentItem } from '../components/ContentCard';
import { RootStackParamList } from '../navigation/RootNavigator';

type CreatorRoute = RouteProp<RootStackParamList, 'Creator'>;

interface Creator {
  username: string; displayName?: string; avatar?: string; bio?: string;
  isFollowing: boolean;
  _count: { content: number; followers: number };
}

export default function CreatorScreen() {
  const { params } = useRoute<CreatorRoute>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();

  const [creator, setCreator]         = useState<Creator | null>(null);
  const [content, setContent]         = useState<ContentItem[]>([]);
  const [following, setFollowing]     = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  const [notFound, setNotFound]       = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/creators/${params.username}`),
      api.get(`/creators/${params.username}/content`),
    ])
      .then(([c, con]) => {
        setCreator(c.data.creator);
        setFollowing(c.data.creator.isFollowing);
        setFollowerCount(c.data.creator._count.followers);
        setContent(con.data.items);
      })
      .catch(() => setNotFound(true));
  }, [params.username]);

  async function handleFollow() {
    if (!user || followLoading) return;
    setFollowLoading(true);
    try {
      const { data } = await api.post(`/creators/${params.username}/follow`);
      setFollowing(data.following);
      setFollowerCount(data.followerCount);
    } finally {
      setFollowLoading(false);
    }
  }

  if (notFound) return (
    <View style={styles.center}><Text style={styles.errorText}>Creator not found.</Text></View>
  );
  if (!creator) return (
    <View style={styles.center}><ActivityIndicator color="#a78bfa" /></View>
  );

  const isOwn = user?.username === creator.username;

  return (
    <FlatList
      style={styles.container}
      data={content}
      numColumns={2}
      keyExtractor={(i) => i.id}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.grid}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.avatarWrap}>
            {creator.avatar
              ? <Image source={{ uri: creator.avatar }} style={styles.avatar} contentFit="cover" />
              : <Text style={styles.avatarEmoji}>👤</Text>
            }
          </View>
          <Text style={styles.displayName}>{creator.displayName || creator.username}</Text>
          <Text style={styles.handle}>@{creator.username}</Text>
          <Text style={styles.stats}>
            {creator._count.content} pieces · {followerCount.toLocaleString()} followers
          </Text>
          {creator.bio ? <Text style={styles.bio}>{creator.bio}</Text> : null}

          {user && !isOwn && (
            <TouchableOpacity
              style={[styles.followBtn, following && styles.followBtnActive]}
              onPress={handleFollow}
              disabled={followLoading}
            >
              <Text style={[styles.followBtnText, following && styles.followBtnTextActive]}>
                {followLoading ? '...' : following ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.emptyText}>No public content yet.</Text>
      }
      renderItem={({ item }) => (
        <ContentCard item={item} onPress={() => navigation.navigate('Watch', { id: item.id })} />
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f17' },
  center: { flex: 1, backgroundColor: '#0f0f17', alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#666', fontSize: 16 },
  header: { alignItems: 'center', paddingTop: 24, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#1e1e2e', marginBottom: 16 },
  avatarWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#1e1e2e', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  avatarEmoji: { fontSize: 36 },
  displayName: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 4 },
  handle: { color: '#6b6b80', fontSize: 13, marginBottom: 6 },
  stats: { color: '#a0a0b0', fontSize: 13, marginBottom: 8 },
  bio: { color: '#ccc', fontSize: 13, lineHeight: 18, textAlign: 'center', paddingHorizontal: 24, marginBottom: 14 },
  followBtn: { paddingHorizontal: 32, paddingVertical: 10, borderRadius: 24, backgroundColor: '#a78bfa', marginTop: 4 },
  followBtnActive: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#a78bfa' },
  followBtnText: { color: '#000', fontWeight: '700', fontSize: 14 },
  followBtnTextActive: { color: '#a78bfa' },
  grid: { paddingHorizontal: 12, paddingBottom: 20 },
  row: { justifyContent: 'space-between' },
  emptyText: { color: '#555', textAlign: 'center', marginTop: 40, fontSize: 14 },
});
