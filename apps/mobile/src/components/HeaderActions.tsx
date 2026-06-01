import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCart } from '../context/CartContext';
import { useDrawer } from '../context/DrawerContext';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function HeaderActions() {
  const navigation = useNavigation<Nav>();
  const { totalItems } = useCart();
  const { openDrawer } = useDrawer();

  return (
    <View style={styles.row}>
      <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('Cart')}>
        <Ionicons name="cart-outline" size={24} color="#fff" />
        {totalItems > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{totalItems > 99 ? '99+' : String(totalItems)}</Text>
          </View>
        )}
      </TouchableOpacity>
      <TouchableOpacity style={styles.btn} onPress={openDrawer}>
        <Ionicons name="menu" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginRight: 4 },
  btn: { padding: 8 },
  badge: {
    position: 'absolute',
    top: 4,
    right: 2,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
});
