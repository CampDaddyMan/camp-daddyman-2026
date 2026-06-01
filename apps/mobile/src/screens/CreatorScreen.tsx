import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Dimensions,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import ContentCard, { ContentItem } from '../components/ContentCard';
import { RootStackParamList } from '../navigation/RootNavigator';

type CreatorRoute = RouteProp<RootStackParamList, 'Creator'>;
const { width: SW } = Dimensions.get('window');

interface Creator {
  username: string;
  displayName?: string;
  avatar?: string;
  bio?: string;
  isFollowing: boolean;
  _count: { content: number; followers: number };
}

export default function CreatorScreen() {
  const { params }   = useRoute<CreatorRoute>();
  const navigation   = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user }     = useAuth();

  const [creator, setCreator]           = useState<Creator | null>(null);
  const [content, setContent]           = useState<ContentItem[]>([]);
  const [following, setFollowing]       = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  const [notFound, setNotFound]         = useState(false);

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
    <View style={styles.center}>
      <Ionicons name="person-remove-outline" size={48} color="#2a2a2a" style={{ marginBottom: 14 }} />
      <Text style={styles.notFoundText}>Creator not found</Text>
    </View>
  );
  if (!creator) return (
    <View style={styles.center}><ActivityIndicator color="#f8c202" size="large" /></View>
  );

  const isOwn = user?.username === creator.username;
  const initials = (creator.displayName || creator.username).charAt(0).toUpperCase();

  return (
    <FlatList
      style={styles.container}
      data={content}
      keyExtractor={(i) => i.id.toString()}
      contentContainerStyle={styles.grid}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View>
          {/* Cinematic header */}
          <View style={styles.hero}>
            <View style={styles.heroBg} />
            <View style={styles.heroOverlay} />
            <View style={styles.heroContent}>
              <View style={styles.avatarOuter}>
                {creator.avatar ? (
                  <Image source={{ uri: creator.avatar }} style={styles.avatarImg} contentFit="cover" />
                ) : (
                  <View style={styles.avatarInitialWrap}>
                    <Text style={styles.avatarInitial}>{initials}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.displayName}>{creator.displayName || creator.username}</Text>
              <Text style={styles.handle}>@{creator.username}</Text>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{creator._count.content.toLocaleString()}</Text>
                  <Text style={styles.statLabel}>pieces</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{followerCount.toLocaleString()}</Text>
                  <Text style={styles.statLabel}>followers</Text>
                </View>
              </View>

              {creator.bio ? (
                <Text style={styles.bio}>{creator.bio}</Text>
              ) : null}

              {user && !isOwn && (
                <TouchableOpacity
                  style={[styles.followBtn, following && styles.followBtnFollowing]}
                  onPress={handleFollow}
                  disabled={followLoading}
                >
                  {followLoading ? (
                    <ActivityIndicator size="small" color={following ? '#f8c202' : '#000'} />
                  ) : (
                    <>
                      <Ionicons
                        name={following ? 'checkmark-circle' : 'add-circle-outline'}
                        size={16}
                        color={following ? '#f8c202' : '#000'}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={[styles.followBtnText, following && styles.followBtnTextFollowing]}>
                        {following ? 'Following' : 'Follow'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Content heading */}
          <View style={styles.contentSectionHeader}>
            <Text style={styles.contentSectionTitle}>Content</Text>
            <Text style={styles.contentSectionCount}>{content.length}</Text>
          </View>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="videocam-outline" size={40} color="#2a2a2a" style={{ marginBottom: 12 }} />
          <Text style={styles.emptyText}>No public content yet.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <ContentCard item={item} onPress={() => navigation.navigate('Watch', { id: item.id })} fullWidth />
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  center: { flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center' },
  notFoundText: { color: '#666', fontSize: 16, fontWeight: '600' },

  hero: {
    width: SW,
    minHeight: 300,
    position: 'relative',
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 24,
  },
  heroBg: { ...StyleSheet.absoluteFillObject, backgroundColor: '#0d0d0d' },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  heroContent: { alignItems: 'center', paddingHorizontal: 24, width: '100%' },

  avatarOuter: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 2.5, borderColor: '#f8c202',
    marginBottom: 16, overflow: 'hidden',
  },
  avatarImg: { width: 96, height: 96 },
  avatarInitialWrap: {
    flex: 1, backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { color: '#f8c202', fontSize: 38, fontWeight: '900' },

  displayName: { color: '#fff', fontSize: 24, fontWeight: '900', marginBottom: 4, textAlign: 'center' },
  handle: { color: '#666', fontSize: 14, marginBottom: 18, textAlign: 'center' },

  statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  statItem: { alignItems: 'center', paddingHorizontal: 24 },
  statValue: { color: '#fff', fontSize: 22, fontWeight: '900' },
  statLabel: { color: '#555', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: '#222' },

  bio: {
    color: '#aaa',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 18,
    maxWidth: 280,
  },

  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8c202',
    borderRadius: 26,
    paddingHorizontal: 28,
    paddingVertical: 12,
    minWidth: 140,
    minHeight: 44,
  },
  followBtnFollowing: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#f8c202',
  },
  followBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },
  followBtnTextFollowing: { color: '#f8c202' },

  contentSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 20,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: '#141414',
  },
  contentSectionTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  contentSectionCount: { color: '#555', fontSize: 13, fontWeight: '600' },

  grid: { paddingHorizontal: 14, paddingBottom: 32 },
  row: { justifyContent: 'space-between' },

  empty: { alignItems: 'center', paddingTop: 40, paddingBottom: 20 },
  emptyText: { color: '#555', fontSize: 14, fontWeight: '500' },
});
