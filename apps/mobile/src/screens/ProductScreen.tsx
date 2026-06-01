import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Linking, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import api from '../lib/api';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Product } from './ShopScreen';

const { width } = Dimensions.get('window');

export default function ProductScreen() {
  const route      = useRoute<RouteProp<RootStackParamList, 'Product'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgIndex, setImgIndex] = useState(0);

  useEffect(() => {
    api.get(`/shop/products/${route.params.id}`)
      .then((r) => setProduct(r.data.product ?? r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [route.params.id]);

  if (loading) return (
    <View style={styles.centered}><ActivityIndicator color="#f8c202" size="large" /></View>
  );
  if (!product) return (
    <View style={styles.centered}>
      <Ionicons name="bag-outline" size={52} color="#2a2a2a" style={{ marginBottom: 14 }} />
      <Text style={styles.errorText}>Product not found.</Text>
    </View>
  );

  // Build image list: prefer images[] array, fall back to imageUrl
  const allImages = (product.images && product.images.length > 0)
    ? product.images.filter(Boolean) as string[]
    : product.imageUrl ? [product.imageUrl] : [];

  const soldOut = product.inStock === false ||
    (product.variants && product.variants.length > 0 && product.variants.every((v) => v.inventory <= 0));
  const hasDiscount = !!(product.comparePrice && product.comparePrice > product.price);
  const savePct = hasDiscount ? Math.round((1 - product.price / product.comparePrice!) * 100) : 0;
  const isMember = product.memberDiscountEnabled || product.memberDiscount;
  const tags = product.tags ?? [];

  function handleBuy() {
    Linking.openURL(`https://campdaddyman.com/shop/${product!.slug || product!.id}`).catch(() => {});
  }

  return (
    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

      {/* ── Image carousel ───────────────────────────────────────── */}
      {allImages.length > 0 ? (
        <View>
          <Image
            source={{ uri: allImages[imgIndex] }}
            style={styles.heroImage}
            contentFit="cover"
          />
          {allImages.length > 1 && (
            <View style={styles.dots}>
              {allImages.map((_, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => setImgIndex(i)}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                >
                  <View style={[styles.dot, i === imgIndex && styles.dotActive]} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      ) : (
        <View style={styles.imagePlaceholder}>
          <Ionicons name="bag-outline" size={72} color="#333" />
        </View>
      )}

      <View style={styles.body}>

        {/* Tags row */}
        {tags.length > 0 && (
          <Text style={styles.tagLine}>{tags.slice(0, 3).join(' · ').toUpperCase()}</Text>
        )}

        {/* Type badge */}
        {product.type === 'DIGITAL' && (
          <View style={styles.digitalBadge}>
            <Text style={styles.digitalBadgeText}>Digital Product</Text>
          </View>
        )}

        {/* Name */}
        <Text style={styles.name}>{product.name}</Text>

        {/* Price row */}
        <View style={styles.priceRow}>
          <Text style={styles.price}>${product.price.toFixed(2)}</Text>
          {hasDiscount && (
            <Text style={styles.comparePrice}>${product.comparePrice!.toFixed(2)}</Text>
          )}
          {hasDiscount && (
            <View style={styles.saveBadge}>
              <Text style={styles.saveBadgeText}>−{savePct}%</Text>
            </View>
          )}
          {soldOut && (
            <View style={styles.soldOutBadge}>
              <Text style={styles.soldOutText}>SOLD OUT</Text>
            </View>
          )}
        </View>

        {/* Member discount callout */}
        {isMember && (
          <View style={styles.memberRow}>
            <Ionicons name="star" size={14} color="#f8c202" />
            <Text style={styles.memberText}> Camp Members save at checkout</Text>
          </View>
        )}

        {/* Description */}
        {product.description ? (
          <Text style={styles.description}>{product.description}</Text>
        ) : null}

        {/* Variants */}
        {product.variants && product.variants.length > 0 && (
          <View style={styles.variantsSection}>
            <Text style={styles.variantsLabel}>Options</Text>
            <View style={styles.variantsRow}>
              {product.variants.map((v) => (
                <View
                  key={v.id}
                  style={[styles.variantChip, v.inventory <= 0 && styles.variantChipOos]}
                >
                  <Text style={[styles.variantText, v.inventory <= 0 && styles.variantTextOos]}>
                    {v.name}
                  </Text>
                  {v.inventory <= 0 && <Text style={styles.variantOosNote}> – sold out</Text>}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* CTA */}
        <TouchableOpacity
          style={[styles.buyBtn, soldOut && styles.buyBtnDisabled]}
          activeOpacity={0.85}
          onPress={handleBuy}
          disabled={soldOut}
          accessibilityLabel={soldOut ? 'Out of stock' : `Buy ${product.name} in The Ark`}
          accessibilityRole="button"
        >
          <Ionicons
            name={soldOut ? 'ban-outline' : 'bag-handle-outline'}
            size={20}
            color={soldOut ? '#555' : '#000'}
            style={{ marginRight: 8 }}
          />
          <Text style={[styles.buyBtnText, soldOut && styles.buyBtnTextDisabled]}>
            {soldOut ? 'Out of stock' : 'Buy in The Ark →'}
          </Text>
        </TouchableOpacity>

        {isMember && !soldOut && (
          <Text style={styles.memberNote}>
            Members get a discount at checkout — sign in to apply it automatically.
          </Text>
        )}

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: '#666', fontSize: 15, fontWeight: '600' },
  scroll: { flex: 1, backgroundColor: '#0a0a0a' },

  heroImage: { width, height: width, backgroundColor: '#111' },
  imagePlaceholder: { width, height: width * 0.8, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#2a2a2a' },
  dotActive: { backgroundColor: '#f8c202', width: 20, borderRadius: 3 },

  body: { padding: 20, paddingBottom: 48 },
  tagLine: { color: '#555', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  digitalBadge: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(126,184,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(126,184,255,0.35)',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10,
  },
  digitalBadgeText: { color: '#7eb8ff', fontSize: 11, fontWeight: '700' },

  name: { color: '#fff', fontSize: 24, fontWeight: '900', lineHeight: 30, marginBottom: 14, letterSpacing: -0.3 },

  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' },
  price: { color: '#f8c202', fontSize: 28, fontWeight: '900' },
  comparePrice: { color: '#555', fontSize: 16, textDecorationLine: 'line-through', marginTop: 4 },
  saveBadge: { backgroundColor: '#ef4444', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  saveBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  soldOutBadge: { backgroundColor: '#1e1e1e', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#333' },
  soldOutText: { color: '#666', fontSize: 11, fontWeight: '700', letterSpacing: 1 },

  memberRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  memberText: { color: '#f8c202', fontSize: 13, fontWeight: '600' },

  description: { color: '#aaa', fontSize: 14, lineHeight: 22, marginBottom: 24 },

  variantsSection: { marginBottom: 24 },
  variantsLabel: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 10 },
  variantsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  variantChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#161616', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 9,
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  variantChipOos: { borderColor: '#1a1a1a', opacity: 0.5 },
  variantText: { color: '#f0f0f0', fontSize: 13, fontWeight: '600' },
  variantTextOos: { color: '#555' },
  variantOosNote: { color: '#555', fontSize: 11 },

  buyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f8c202', borderRadius: 16,
    paddingVertical: 17, marginBottom: 12,
  },
  buyBtnDisabled: { backgroundColor: '#1e1e1e' },
  buyBtnText: { color: '#000', fontSize: 16, fontWeight: '900' },
  buyBtnTextDisabled: { color: '#555' },
  memberNote: { color: '#4ade80', fontSize: 12, textAlign: 'center', lineHeight: 18 },
});
