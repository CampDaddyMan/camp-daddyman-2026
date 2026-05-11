import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../navigation/RootNavigator';

export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, logout } = useAuth();

  function handleLogout() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: logout },
    ]);
  }

  if (!user) return (
    <View style={styles.container}>
      <Text style={styles.guestEmoji}>👤</Text>
      <Text style={styles.guestTitle}>You're not signed in</Text>
      <Text style={styles.guestSub}>Sign in to access your profile, uploads, and settings.</Text>
      <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('Login')}>
        <Text style={styles.btnText}>Sign in</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btnOutline} onPress={() => navigation.navigate('Register')}>
        <Text style={styles.btnOutlineText}>Create account</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={styles.scroll}>
      <View style={styles.header}>
        <View style={styles.avatarWrap}>
          <Text style={styles.avatarEmoji}>👤</Text>
        </View>
        <Text style={styles.displayName}>{user.displayName || user.username}</Text>
        <Text style={styles.handle}>@{user.username}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <View style={styles.badges}>
          {user.isCreator && <View style={styles.badge}><Text style={styles.badgeText}>Creator</Text></View>}
          {user.isAdmin && <View style={[styles.badge, styles.badgeAdmin]}><Text style={styles.badgeText}>Admin</Text></View>}
        </View>
      </View>

      <View style={styles.menu}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Creator', { username: user.username })}
        >
          <Text style={styles.menuIcon}>🎵</Text>
          <Text style={styles.menuLabel}>My Content</Text>
          <Text style={styles.menuChevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Feed' as never)}>
          <Text style={styles.menuIcon}>📡</Text>
          <Text style={styles.menuLabel}>Following Feed</Text>
          <Text style={styles.menuChevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Notifications' as never)}>
          <Text style={styles.menuIcon}>🔔</Text>
          <Text style={styles.menuLabel}>Notifications</Text>
          <Text style={styles.menuChevron}>›</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f17', alignItems: 'center', justifyContent: 'center', padding: 32 },
  scroll: { flex: 1, backgroundColor: '#0f0f17' },
  guestEmoji: { fontSize: 48, marginBottom: 16 },
  guestTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  guestSub: { color: '#666', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  btn: { width: '100%', backgroundColor: '#a78bfa', borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginBottom: 12 },
  btnText: { color: '#000', fontSize: 16, fontWeight: '700' },
  btnOutline: { width: '100%', borderRadius: 12, paddingVertical: 15, alignItems: 'center', borderWidth: 1, borderColor: '#2e2e3e' },
  btnOutlineText: { color: '#a78bfa', fontSize: 16, fontWeight: '600' },
  header: { alignItems: 'center', padding: 28, borderBottomWidth: 1, borderBottomColor: '#1e1e2e' },
  avatarWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#1e1e2e', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  avatarEmoji: { fontSize: 36 },
  displayName: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 4 },
  handle: { color: '#6b6b80', fontSize: 14, marginBottom: 4 },
  email: { color: '#555', fontSize: 13, marginBottom: 10 },
  badges: { flexDirection: 'row', gap: 8 },
  badge: { backgroundColor: '#a78bfa', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  badgeAdmin: { backgroundColor: '#f59e0b' },
  badgeText: { color: '#000', fontSize: 11, fontWeight: '700' },
  menu: { marginTop: 8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#1a1a28' },
  menuIcon: { fontSize: 20, width: 32 },
  menuLabel: { flex: 1, color: '#ddd', fontSize: 15, marginLeft: 4 },
  menuChevron: { color: '#444', fontSize: 22, fontWeight: '300' },
  logoutBtn: { margin: 24, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#2e2e3e', alignItems: 'center' },
  logoutText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
});
