import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Linking, TextInput, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

const { width } = Dimensions.get('window');

export default function CartScreen() {
  const { items, totalPrice, removeItem, updateQuantity, clearCart } = useCart();
  const { user } = useAuth();
  const [loading, setLoading]     = useState(false);
  const [coupon, setCoupon]       = useState('');
  const [discount, setDiscount]   = useState(0);
  const [couponMsg, setCouponMsg] = useState('');

  async function validateCoupon() {
    if (!coupon.trim()) return;
    try {
      const { data } = await api.post('/shop/coupons/validate', {
        code: coupon.trim().toUpperCase(),
        subtotal: totalPrice,
      });
      if (data.valid) {
        setDiscount(data.discountAmount);
        setCouponMsg(`Coupon applied: −$${data.discountAmount.toFixed(2)}`);
      } else {
        setDiscount(0);
        setCouponMsg(data.error || 'Invalid coupon');
      }
    } catch {
      setCouponMsg('Could not validate coupon');
    }
  }

  async function handleCheckout() {
    if (!items.length) return;
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to checkout.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/shop/checkout', {
        items: items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          options: i.options,
          quantity: i.quantity,
        })),
        couponCode: coupon.trim() || undefined,
      });
      if (data.url) {
        await Linking.openURL(data.url);
        clearCart();
      }
    } catch (err: any) {
      Alert.alert('Checkout failed', err?.response?.data?.error || 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="cart-outline" size={64} color="#2a2a2a" style={{ marginBottom: 18 }} />
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Text style={styles.emptySub}>Add items from The Ark to get started.</Text>
      </View>
    );
  }

  const finalTotal = Math.max(0, totalPrice - discount);

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        style={styles.list}
        keyExtractor={(i) => `${i.productId}::${i.variantId ?? ''}`}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Text style={styles.heading}>
            Your Cart ({items.reduce((s, i) => s + i.quantity, 0)} item{items.reduce((s, i) => s + i.quantity, 0) !== 1 ? 's' : ''})
          </Text>
        }
        ListFooterComponent={
          <View style={styles.footer}>

            {/* ── Coupon ── */}
            <View style={styles.couponRow}>
              <TextInput
                style={styles.couponInput}
                value={coupon}
                onChangeText={setCoupon}
                placeholder="Coupon code"
                placeholderTextColor="#555"
                autoCapitalize="characters"
                returnKeyType="done"
                onSubmitEditing={validateCoupon}
              />
              <TouchableOpacity style={styles.couponBtn} onPress={validateCoupon}>
                <Text style={styles.couponBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>
            {couponMsg ? (
              <Text style={[styles.couponMsg, discount > 0 ? styles.couponMsgGood : styles.couponMsgBad]}>
                {couponMsg}
              </Text>
            ) : null}

            {/* ── Order summary ── */}
            <View style={styles.summaryBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>${totalPrice.toFixed(2)}</Text>
              </View>
              {discount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Discount</Text>
                  <Text style={styles.summaryDiscount}>−${discount.toFixed(2)}</Text>
                </View>
              )}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Taxes & shipping</Text>
                <Text style={styles.summaryNote}>calculated at checkout</Text>
              </View>
              <View style={[styles.summaryRow, styles.summaryTotal]}>
                <Text style={styles.totalLabel}>Order Total</Text>
                <Text style={styles.totalValue}>${finalTotal.toFixed(2)}</Text>
              </View>
            </View>

            {/* ── Checkout CTA ── */}
            <TouchableOpacity
              style={[styles.checkoutBtn, loading && styles.checkoutBtnLoading]}
              onPress={handleCheckout}
              disabled={loading}
              accessibilityLabel={`Checkout, total $${finalTotal.toFixed(2)}`}
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Ionicons name="lock-closed" size={16} color="#000" style={{ marginRight: 8 }} />
                  <Text style={styles.checkoutBtnText}>Checkout — ${finalTotal.toFixed(2)}</Text>
                </>
              )}
            </TouchableOpacity>
            <Text style={styles.checkoutNote}>Secure checkout powered by Stripe</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.item}>
            {/* Thumbnail */}
            <View style={styles.thumbWrap}>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <View style={styles.thumbPlaceholder}>
                  <Ionicons name="bag-outline" size={24} color="#444" />
                </View>
              )}
            </View>

            {/* Name + variant + price — flex: 1, minWidth: 0 keeps it from overflowing */}
            <View style={styles.itemMeta}>
              <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
              {item.variantName ? (
                <Text style={styles.itemVariant} numberOfLines={1}>{item.variantName}</Text>
              ) : null}
              {item.options ? (
                <Text style={styles.itemVariant} numberOfLines={1}>{item.options}</Text>
              ) : null}
              <Text style={styles.itemPrice}>${(item.price * item.quantity).toFixed(2)}</Text>
            </View>

            {/* Qty controls + remove — fixed width, never overflows */}
            <View style={styles.controls}>
              <View style={styles.qtyRow}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)}
                  accessibilityLabel="Decrease quantity"
                >
                  <Text style={styles.qtyBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.qty}>{item.quantity}</Text>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)}
                  accessibilityLabel="Increase quantity"
                >
                  <Text style={styles.qtyBtnText}>+</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => removeItem(item.productId, item.variantId)}
                accessibilityLabel={`Remove ${item.name}`}
              >
                <Ionicons name="trash-outline" size={14} color="#555" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },

  empty: {
    flex: 1, backgroundColor: '#0a0a0a',
    alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptySub: { color: '#555', fontSize: 14, textAlign: 'center' },

  list: { flex: 1, width },
  listContent: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 32 },
  heading: { color: '#fff', fontSize: 22, fontWeight: '900', marginBottom: 16, marginTop: 8 },

  // ── Cart item ────────────────────────────────────────────────────────────────
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    width: '100%',          // explicit full-width
  },
  thumbWrap: {
    width: 72, height: 72,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    flexShrink: 0,          // never shrink the image
  },
  thumbPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  itemMeta: {
    flex: 1,
    flexShrink: 1,          // ← key: allows this column to shrink when siblings need space
    minWidth: 0,            // ← key: without this, Text nodes can force overflow
    marginHorizontal: 12,
  },
  itemName: { color: '#f0f0f0', fontSize: 14, fontWeight: '700', marginBottom: 3, lineHeight: 19 },
  itemVariant: { color: '#888', fontSize: 12, marginBottom: 3 },
  itemPrice: { color: '#f8c202', fontSize: 15, fontWeight: '800', marginTop: 2 },

  controls: {
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,          // controls block never shrinks
    width: 82,              // fixed width: 28+10+16+10+28 = 92, little room
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  qtyBtn: {
    width: 28, height: 28,
    borderRadius: 8,
    backgroundColor: '#1e1e1e',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  qtyBtnText: { color: '#fff', fontSize: 18, fontWeight: '700', lineHeight: 20 },
  qty: { color: '#fff', fontSize: 14, fontWeight: '700', width: 18, textAlign: 'center' },
  removeBtn: { padding: 4 },

  // ── Footer ───────────────────────────────────────────────────────────────────
  footer: { marginTop: 8, width: '100%' },

  couponRow: { flexDirection: 'row', gap: 10, marginBottom: 6 },
  couponInput: {
    flex: 1, flexShrink: 1,
    backgroundColor: '#111', borderWidth: 1, borderColor: '#282828',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: '#fff', fontSize: 14,
  },
  couponBtn: {
    backgroundColor: '#1e1e1e', borderRadius: 12,
    paddingHorizontal: 18, justifyContent: 'center',
    borderWidth: 1, borderColor: '#2a2a2a', minHeight: 48,
  },
  couponBtnText: { color: '#f8c202', fontSize: 14, fontWeight: '700' },
  couponMsg: { fontSize: 13, marginBottom: 10 },
  couponMsgGood: { color: '#4ade80' },
  couponMsgBad: { color: '#f87171' },

  summaryBox: {
    backgroundColor: '#111', borderRadius: 16,
    borderWidth: 1, borderColor: '#1e1e1e',
    padding: 16, marginBottom: 16, width: '100%',
  },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  summaryLabel: { color: '#888', fontSize: 14 },
  summaryValue: { color: '#fff', fontSize: 14, fontWeight: '600' },
  summaryDiscount: { color: '#4ade80', fontSize: 14, fontWeight: '700' },
  summaryNote: { color: '#555', fontSize: 12, fontStyle: 'italic' },
  summaryTotal: {
    borderTopWidth: 1, borderTopColor: '#1e1e1e',
    paddingTop: 12, marginTop: 4, marginBottom: 0,
  },
  totalLabel: { color: '#fff', fontSize: 17, fontWeight: '800' },
  totalValue: { color: '#f8c202', fontSize: 20, fontWeight: '900' },

  checkoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f8c202', borderRadius: 16,
    paddingVertical: 17, marginBottom: 10, width: '100%',
  },
  checkoutBtnLoading: { opacity: 0.7 },
  checkoutBtnText: { color: '#000', fontSize: 16, fontWeight: '900' },
  checkoutNote: { color: '#555', fontSize: 11, textAlign: 'center', marginBottom: 8 },
});
