import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { RootStackParamList } from '../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function MenuItem({
  icon, label, onPress, accent, value,
}: {
  icon: string; label: string; onPress: () => void; accent?: boolean; value?: string;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIconWrap, accent && styles.menuIconWrapAccent]}>
        <Ionicons name={icon as any} size={17} color={accent ? '#f8c202' : '#888'} />
      </View>
      <Text style={[styles.menuLabel, accent && styles.menuLabelAccent]}>{label}</Text>
      {value && <Text style={styles.menuValue}>{value}</Text>}
      <Ionicons name="chevron-forward" size={15} color="#2a2a2a" />
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

export default function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { user, logout } = useAuth();

  async function openAdminLink(url: string) {
    try {
      const { Linking } = await import('react-native');
      const { data } = await api.post('/auth/web-handoff');
      Linking.openURL(`${url}?code=${data.code}`);
    } catch {
      const { Linking } = await import('react-native');
      Linking.openURL(url);
    }
  }

  function handleLogout() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: logout },
    ]);
  }

  function openLink(url: string) {
    import('react-native').then(({ Linking }) => Linking.openURL(url));
  }

  if (!user) return (
    <View style={styles.guestContainer}>
      <View style={styles.guestIcon}>
        <Ionicons name="person-outline" size={40} color="#f8c202" />
      </View>
      <Text style={styles.guestTitle}>Sign in to your account</Text>
      <Text style={styles.guestSub}>Access your library, dashboard, and settings.</Text>
      <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('Login')}>
        <Text style={styles.primaryBtnText}>Sign in</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.outlineBtn} onPress={() => navigation.navigate('Register')}>
        <Text style={styles.outlineBtnText}>Create account</Text>
      </TouchableOpacity>
    </View>
  );

  const planLabel = (user as any).subscription?.plan ?? 'FREE';

  return (
    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

      {/* Profile header */}
      <View style={styles.header}>
        <View style={styles.avatarOuter}>
          {(user as any).avatar ? (
            <Image source={{ uri: (user as any).avatar }} style={styles.avatarImage} contentFit="cover" />
          ) : (
            <View style={styles.avatarInitialWrap}>
              <Text style={styles.avatarInitial}>
                {(user.displayName || user.username).charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.displayName}>{user.displayName || user.username}</Text>
        <Text style={styles.handle}>@{user.username}</Text>
        <View style={styles.badgeRow}>
          <View style={[styles.planBadge, planLabel !== 'FREE' && styles.planBadgePro]}>
            <Text style={styles.planBadgeText}>{planLabel}</Text>
          </View>
          {(user as any).isCreator && (
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>Creator</Text>
            </View>
          )}
          {user.isAdmin && (
            <View style={[styles.roleBadge, styles.roleBadgeAdmin]}>
              <Text style={styles.roleBadgeText}>Admin</Text>
            </View>
          )}
          {user.station === 'ARK_BUILDER' && (
            <View style={styles.stationBadge}>
              <Text style={styles.stationBadgeText}>🌱 Ark Builder</Text>
            </View>
          )}
        </View>
      </View>

      {/* Admin shortcut */}
      {user.isAdmin && (
        <TouchableOpacity
          style={styles.adminBar}
          onPress={() => openAdminLink('https://campdaddyman.com/admin')}
        >
          <Ionicons name="settings-outline" size={16} color="#0d0d0d" />
          <Text style={styles.adminBarText}>Admin Panel</Text>
          <Ionicons name="open-outline" size={14} color="#0d0d0d" style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
      )}

      {/* Discover */}
      <SectionHeader title="Discover" />
      <View style={styles.menu}>
        <MenuItem icon="radio-outline" label="Live" onPress={() => navigation.navigate('Tabs' as never)} />
        <MenuItem icon="film-outline" label="Series" onPress={() => navigation.navigate('Series')} />
        <MenuItem icon="disc-outline" label="Albums" onPress={() => navigation.navigate('Albums')} />
        <MenuItem icon="bar-chart-outline" label="Polls" onPress={() => navigation.navigate('Polls')} />
        <MenuItem icon="people-outline" label="Partners" onPress={() => navigation.navigate('Partners')} />
      </View>

      {/* My Library */}
      <SectionHeader title="My Library" />
      <View style={styles.menu}>
        <MenuItem icon="heart-outline" label="Liked Content" onPress={() => navigation.navigate('Library')} />
        <MenuItem icon="time-outline" label="Watch Later" onPress={() => navigation.navigate('Library')} />
        <MenuItem icon="list-outline" label="Watch History" onPress={() => navigation.navigate('Library')} />
      </View>

      {/* Store */}
      <SectionHeader title="Store" />
      <View style={styles.menu}>
        <MenuItem icon="cart-outline" label="My Cart" onPress={() => navigation.navigate('Cart')} />
        <MenuItem icon="shirt-outline" label="The Ark — Merch" onPress={() => navigation.navigate('Shop')} />
        <MenuItem icon="star-outline" label="Membership" onPress={() => navigation.navigate('Membership')} accent />
        <MenuItem icon="gift-outline" label="Gift a Membership" onPress={() => navigation.navigate('Gift')} />
        <MenuItem icon="cube-outline" label="My Orders" onPress={() => openLink('https://campdaddyman.com/shop/orders')} />
      </View>

      {/* Account */}
      <SectionHeader title="Account" />
      <View style={styles.menu}>
        <MenuItem icon="speedometer-outline" label="Dashboard" onPress={() => navigation.navigate('Dashboard')} />
        <MenuItem icon="person-outline" label="My Content" onPress={() => navigation.navigate('Creator', { username: user.username })} />
        <MenuItem icon="cloud-upload-outline" label="Upload Content" onPress={() => openLink('https://campdaddyman.com/upload')} />
        {user.isAdmin && (
          <MenuItem icon="settings-outline" label="Admin Panel" onPress={() => openAdminLink('https://campdaddyman.com/admin')} accent />
        )}
      </View>

      {/* Sign out */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={18} color="#ef4444" />
        <Text style={styles.logoutText}>Sign out</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#0a0a0a' },

  guestContainer: { flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center', padding: 32 },
  guestIcon: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#141414',
    borderWidth: 1.5, borderColor: '#f8c202', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  guestTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 10, textAlign: 'center' },
  guestSub: { color: '#666', fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: 32 },
  primaryBtn: {
    width: '100%', backgroundColor: '#f8c202', borderRadius: 14,
    paddingVertical: 17, alignItems: 'center', marginBottom: 12,
  },
  primaryBtnText: { color: '#000', fontSize: 16, fontWeight: '800' },
  outlineBtn: {
    width: '100%', borderRadius: 14, paddingVertical: 17,
    alignItems: 'center', borderWidth: 1, borderColor: '#2a2a2a',
  },
  outlineBtnText: { color: '#f8c202', fontSize: 16, fontWeight: '600' },

  header: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#141414',
  },
  avatarOuter: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 2.5, borderColor: '#f8c202',
    marginBottom: 16, overflow: 'hidden',
  },
  avatarImage: { width: 96, height: 96 },
  avatarInitialWrap: {
    flex: 1, backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { color: '#f8c202', fontSize: 36, fontWeight: '900' },
  displayName: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 4 },
  handle: { color: '#666', fontSize: 14, marginBottom: 14 },
  badgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  planBadge: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
    backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#2a2a2a',
  },
  planBadgePro: { backgroundColor: 'rgba(248,194,2,0.12)', borderColor: 'rgba(248,194,2,0.4)' },
  planBadgeText: { color: '#f8c202', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  roleBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#2a2a2a' },
  roleBadgeAdmin: { backgroundColor: 'rgba(248,194,2,0.12)', borderColor: 'rgba(248,194,2,0.4)' },
  roleBadgeText: { color: '#888', fontSize: 11, fontWeight: '700' },
  stationBadge: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
    backgroundColor: 'rgba(74,222,128,0.08)', borderWidth: 1, borderColor: 'rgba(74,222,128,0.3)',
  },
  stationBadgeText: { color: '#4ade80', fontSize: 11, fontWeight: '700' },

  adminBar: {
    backgroundColor: '#f8c202',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 15,
    gap: 10,
    marginTop: 2,
  },
  adminBarText: { flex: 1, color: '#0d0d0d', fontSize: 15, fontWeight: '800' },

  sectionHeader: {
    color: '#3a3a3a',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 6,
  },
  menu: { borderTopWidth: 1, borderTopColor: '#141414' },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 0,
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
    gap: 14,
  },
  menuIconWrap: {
    width: 34, height: 34, borderRadius: 9,
    backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center',
  },
  menuIconWrapAccent: { backgroundColor: 'rgba(248,194,2,0.1)' },
  menuLabel: { flex: 1, color: '#d5d5d5', fontSize: 15, fontWeight: '500' },
  menuLabelAccent: { color: '#f8c202' },
  menuValue: { color: '#555', fontSize: 13, marginRight: 4 },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    margin: 20,
    marginTop: 24,
    padding: 17,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
  logoutText: { color: '#ef4444', fontSize: 15, fontWeight: '700' },
});
