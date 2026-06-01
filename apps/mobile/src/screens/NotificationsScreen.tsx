import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../navigation/RootNavigator';

interface NotificationItem {
  id: string;
  type: 'NEW_CONTENT' | 'NEW_LIKE' | 'NEW_COMMENT' | 'NEW_FOLLOWER' | 'NEW_TIP' | 'MILESTONE';
  read: boolean;
  createdAt: string;
  actor?: { username: string; displayName?: string } | null;
  content?: { id: string; title: string; type: string } | null;
  milestone?: number | null;
  milestoneKind?: 'FOLLOWERS' | 'VIEWS' | null;
}

const TYPE_ICON: Record<NotificationItem['type'], string> = {
  NEW_CONTENT:  'musical-note',
  NEW_LIKE:     'thumbs-up',
  NEW_COMMENT:  'chatbubble',
  NEW_FOLLOWER: 'person-add',
  NEW_TIP:      'heart-circle',
  MILESTONE:    'trophy',
};

function formatMilestone(n: number) {
  if (n >= 1_000_000) return `${n / 1_000_000}M`;
  if (n >= 1_000)     return `${n / 1_000}K`;
  return String(n);
}

function notificationText(n: NotificationItem): string {
  const name = n.actor?.displayName || n.actor?.username || 'Someone';
  switch (n.type) {
    case 'NEW_CONTENT':  return `${name} posted: "${n.content?.title}"`;
    case 'NEW_LIKE':     return `${name} liked "${n.content?.title}"`;
    case 'NEW_COMMENT':  return `${name} commented on "${n.content?.title}"`;
    case 'NEW_FOLLOWER': return `${name} started following you`;
    case 'NEW_TIP':      return `${name} sent you a Strength 💛`;
    case 'MILESTONE':
      return n.milestoneKind === 'VIEWS'
        ? `You hit ${formatMilestone(n.milestone ?? 0)} total views — the people love it! 🔥`
        : `You reached ${formatMilestone(n.milestone ?? 0)} followers — the family keeps growing! 🎉`;
    default: return 'New notification';
  }
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function NotificationsScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [refreshing, setRefreshing]       = useState(false);

  function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    api.get('/notifications?limit=30')
      .then((r) => setNotifications(r.data.notifications ?? []))
      .catch(() => {})
      .finally(() => setRefreshing(false));
  }

  useEffect(() => { if (user) load(); }, [user]); // eslint-disable-line

  async function handleTap(n: NotificationItem) {
    if (!n.read) {
      api.post(`/notifications/${n.id}/read`).catch(() => {});
      setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x));
    }
    if (n.type === 'MILESTONE') return; // no destination — celebrate in place
    if (n.content) navigation.navigate('Watch', { id: n.content.id });
    else if (n.actor) navigation.navigate('Creator', { username: n.actor.username });
  }

  async function handleMarkAll() {
    await api.post('/notifications/read-all').catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  if (!user) return (
    <View style={styles.center}>
      <Ionicons name="notifications-off-outline" size={48} color="#555" style={{ marginBottom: 12 }} />
      <Text style={styles.emptyText}>Sign in to see your notifications.</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id.toString()}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#f8c202" />}
        ListHeaderComponent={
          notifications.some((n) => !n.read) ? (
            <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAll}>
              <Text style={styles.markAllText}>Mark all as read</Text>
            </TouchableOpacity>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="notifications-outline" size={48} color="#555" style={{ marginBottom: 12 }} />
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        }
        renderItem={({ item: n }) => (
          <TouchableOpacity
            style={[styles.item, !n.read && styles.itemUnread]}
            onPress={() => handleTap(n)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={TYPE_ICON[n.type] as any}
              size={20}
              color={n.read ? '#555' : '#f8c202'}
              style={styles.icon}
            />
            <View style={styles.itemBody}>
              <Text style={styles.itemText}>{notificationText(n)}</Text>
              <Text style={styles.itemTime}>{timeAgo(n.createdAt)}</Text>
            </View>
            {!n.read && <View style={styles.dot} />}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  center: { flex: 1, backgroundColor: '#0d0d0d', alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { color: '#888', fontSize: 14, textAlign: 'center' },
  markAllBtn: { alignSelf: 'flex-end', margin: 16 },
  markAllText: { color: '#f8c202', fontSize: 13 },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#161616',
  },
  itemUnread: { backgroundColor: '#13131f' },
  icon: { width: 28, textAlign: 'center' },
  itemBody: { flex: 1 },
  itemText: { color: '#ddd', fontSize: 13, lineHeight: 18 },
  itemTime: { color: '#555', fontSize: 11, marginTop: 3 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#f8c202' },
});
