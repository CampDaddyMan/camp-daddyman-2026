import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity, TouchableWithoutFeedback,
  StyleSheet, Animated, ScrollView, Dimensions, Linking, Image, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useDrawer } from '../context/DrawerContext';
import { navigationRef } from '../lib/navigationRef';
import type { RootStackParamList } from '../navigation/RootNavigator';
import api from '../lib/api';

const { width: SW } = Dimensions.get('window');
const DRAWER_W = Math.min(SW * 0.82, 320);

function Item({ icon, label, onPress, accent }: { icon: string; label: string; onPress: () => void; accent?: boolean }) {
  return (
    <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon as any} size={18} color={accent ? '#f8c202' : '#999'} style={styles.itemIcon} />
      <Text style={[styles.itemLabel, accent && styles.itemAccent]}>{label}</Text>
      <Ionicons name="chevron-forward" size={14} color="#333" />
    </TouchableOpacity>
  );
}

function Section({ title }: { title: string }) {
  return <Text style={styles.section}>{title}</Text>;
}

export default function MenuDrawer() {
  const { isOpen, closeDrawer } = useDrawer();
  const { user, logout } = useAuth();
  const { totalItems } = useCart();
  const [visible, setVisible] = useState(false);
  const slideX = useRef(new Animated.Value(DRAWER_W)).current;
  const bgOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      Animated.parallel([
        Animated.timing(slideX, { toValue: 0, duration: 260, useNativeDriver: true }),
        Animated.timing(bgOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideX, { toValue: DRAWER_W, duration: 220, useNativeDriver: true }),
        Animated.timing(bgOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start(() => setVisible(false));
    }
  }, [isOpen]);

  function go(screen: keyof RootStackParamList, params?: any) {
    closeDrawer();
    setTimeout(() => {
      if (navigationRef.isReady()) navigationRef.navigate(screen as any, params);
    }, 60);
  }

  function openLink(url: string) {
    closeDrawer();
    setTimeout(() => Linking.openURL(url), 60);
  }

  async function openAdminLink(url: string) {
    closeDrawer();
    let finalUrl = url;
    try {
      const { data } = await api.post('/auth/web-handoff');
      finalUrl = `${url}${url.includes('?') ? '&' : '?'}code=${data.code}`;
    } catch {
      // fallback: open without code, user will re-auth on web
    }
    setTimeout(() => Linking.openURL(finalUrl), 60);
  }

  function handleLogout() {
    closeDrawer();
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: logout },
    ]);
  }

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} statusBarTranslucent animationType="none" onRequestClose={closeDrawer}>
      <View style={styles.root}>
        <TouchableWithoutFeedback onPress={closeDrawer}>
          <Animated.View style={[styles.backdrop, { opacity: bgOpacity }]} />
        </TouchableWithoutFeedback>

        <Animated.View style={[styles.drawer, { transform: [{ translateX: slideX }] }]}>
          {/* Brand header */}
          <View style={styles.drawerHeader}>
            <Image source={require('../../assets/logo.png')} style={styles.brandLogo} resizeMode="contain" />
            <TouchableOpacity onPress={closeDrawer} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#555" />
            </TouchableOpacity>
          </View>

          {user && (
            <View style={styles.userRow}>
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>
                  {(user.displayName || user.username).charAt(0).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={styles.userName}>{user.displayName || user.username}</Text>
                <Text style={styles.userHandle}>@{user.username}</Text>
              </View>
            </View>
          )}

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Admin shortcut — pinned to top for admins */}
            {user?.isAdmin && (
              <TouchableOpacity style={styles.adminBar} onPress={() => openAdminLink('https://campdaddyman.com/admin')}>
                <Ionicons name="settings-outline" size={16} color="#0d0d0d" />
                <Text style={styles.adminBarText}>Admin Panel</Text>
                <Ionicons name="open-outline" size={14} color="#0d0d0d" style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
            )}

            {/* Journey — top of drawer */}
            <Section title="The Journey" />
            <Item icon="egg-outline" label="🦋 My Journey" onPress={() => go('Journey')} accent />

            {/* Discover */}
            <Section title="Discover" />
            <Item icon="home-outline" label="Home" onPress={() => go('Tabs')} />
            <Item icon="radio-outline" label="Live" onPress={() => go('Tabs')} />
            <Item icon="film-outline" label="Series" onPress={() => go('Series')} />
            <Item icon="musical-notes-outline" label="Albums" onPress={() => go('Albums')} />
            <Item icon="bar-chart-outline" label="Polls" onPress={() => go('Polls')} />
            <Item icon="people-outline" label="Partners" onPress={() => go('Partners')} />

            {user ? (
              <>
                {/* Library */}
                <Section title="My Library" />
                <Item icon="heart-outline" label="Liked Content" onPress={() => go('Library')} />
                <Item icon="time-outline" label="Watch Later" onPress={() => go('Library')} />
                <Item icon="list-outline" label="Watch History" onPress={() => go('Library')} />

                {/* Store */}
                <Section title="Store" />
                <Item
                  icon="cart-outline"
                  label={`My Cart${totalItems > 0 ? ` (${totalItems})` : ''}`}
                  onPress={() => go('Cart')}
                />
                <Item icon="shirt-outline" label="The Ark — Merch" onPress={() => go('Shop')} />
                <Item icon="star-outline" label="Membership" onPress={() => go('Membership')} accent />
                <Item icon="gift-outline" label="Gift a Membership" onPress={() => go('Gift')} accent />
                <Item icon="cube-outline" label="My Orders" onPress={() => openLink('https://campdaddyman.com/shop/orders')} />

                {/* Account */}
                <Section title="Account" />
                <Item icon="speedometer-outline" label="Dashboard" onPress={() => go('Dashboard')} />
                <Item icon="person-outline" label="My Content" onPress={() => go('Creator', { username: user.username })} />
                <Item icon="cloud-upload-outline" label="Upload Content" onPress={() => openLink('https://campdaddyman.com/upload')} />
                {user.isAdmin && (
                  <Item icon="settings-outline" label="Admin Panel" onPress={() => openAdminLink('https://campdaddyman.com/admin')} accent />
                )}
              </>
            ) : (
              <>
                <Section title="Account" />
                <Item icon="log-in-outline" label="Sign in" onPress={() => go('Login')} accent />
                <Item icon="person-add-outline" label="Create account" onPress={() => go('Register')} />
              </>
            )}

            <View style={{ height: 12 }} />
          </ScrollView>

          {/* Footer */}
          {user && (
            <View style={styles.footer}>
              <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={18} color="#ef4444" />
                <Text style={styles.signOutText}>Sign out</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: DRAWER_W,
    backgroundColor: '#0d0d0d',
    borderLeftWidth: 1,
    borderLeftColor: '#1a1a1a',
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    backgroundColor: '#090909',
  },
  brandLogo: { height: 36, width: 160 },
  closeBtn: { padding: 6 },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    borderWidth: 1.5,
    borderColor: '#f8c202',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: { color: '#f8c202', fontSize: 18, fontWeight: '800' },
  userName: { color: '#fff', fontSize: 14, fontWeight: '700' },
  userHandle: { color: '#888', fontSize: 12, marginTop: 2 },
  scroll: { flex: 1 },
  section: {
    color: '#444',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
  },
  itemIcon: { marginRight: 14 },
  itemLabel: { flex: 1, color: '#ddd', fontSize: 15 },
  itemAccent: { color: '#f8c202' },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    padding: 14,
    paddingBottom: 36,
    backgroundColor: '#090909',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#282828',
  },
  signOutText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
  adminBar: {
    backgroundColor: '#f8c202',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 13,
    gap: 10,
  },
  adminBarText: {
    flex: 1,
    color: '#0d0d0d',
    fontSize: 15,
    fontWeight: '700',
  },
});
