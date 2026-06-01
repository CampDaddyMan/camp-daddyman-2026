import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, FlatList, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, Dimensions, Linking, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import CinematicBanner, { BannerSlide } from '../components/CinematicBanner';
import AdBanner from '../components/AdBanner';
import { RootStackParamList } from '../navigation/RootNavigator';

const { width } = Dimensions.get('window');

export interface Product {
  id: string;
  name: string;
  slug?: string;
  description?: string | null;
  type: 'PHYSICAL' | 'DIGITAL';
  price: number;
  comparePrice?: number;
  imageUrl?: string;
  images?: string[];
  featured: boolean;
  releaseDate?: string | null;
  tags: string[];
  category?: string | null;
  inStock?: boolean;
  memberDiscount?: boolean;
  memberDiscountEnabled?: boolean;
  variants?: { id: string; name: string; inventory: number }[];
}

interface PerkItem {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  comingSoon?: boolean;
}

const MEMBER_RATES: Record<string, number> = { PRO: 10, PREMIUM: 15, CREATOR: 15 };
const TYPE_FILTERS = ['ALL', 'PHYSICAL', 'DIGITAL'] as const;

export default function ShopScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();

  const [products,  setProducts]  = useState<Product[]>([]);
  const [perkItems, setPerkItems] = useState<PerkItem[]>([]);
  const [banners,   setBanners]   = useState<BannerSlide[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'PHYSICAL' | 'DIGITAL'>('ALL');
  const [email, setEmail] = useState('');
  const [subLoading, setSubLoading] = useState(false);
  const flatListRef = useRef<any>(null);

  function load(isRefresh = false) {
    if (!isRefresh) setLoading(true);
    Promise.all([
      api.get('/shop/products', { params: { limit: '40' } }),
      api.get('/shop/perk-items').catch(() => ({ data: { items: [] } })),
      api.get('/banners', { params: { page: 'ARK' } }).catch(() => ({ data: { slides: [] } })),
    ])
      .then(([pr, pk, bn]) => {
        setProducts(pr.data.products ?? []);
        setPerkItems(pk.data.items ?? []);
        setBanners(bn.data.slides ?? []);
      })
      .catch(() => {})
      .finally(() => { setLoading(false); setRefreshing(false); });
  }

  useEffect(() => { load(); }, []);

  async function handleSubscribe() {
    if (!email.trim()) return;
    setSubLoading(true);
    try {
      await api.post('/newsletter/subscribe', { email: email.trim().toLowerCase() });
      Alert.alert('You\'re in!', 'Thanks for joining the Camp DaddyMan list.', [{ text: 'OK' }]);
      setEmail('');
    } catch {
      Alert.alert('Hmm', 'Something went wrong. Try again in a moment.', [{ text: 'OK' }]);
    } finally {
      setSubLoading(false);
    }
  }

  const filtered = useMemo(() => {
    if (typeFilter === 'ALL') return products;
    return products.filter((p) => p.type === typeFilter);
  }, [products, typeFilter]);

  if (loading) return (
    <View style={styles.centered}><ActivityIndicator color="#f8c202" size="large" /></View>
  );

  const plan    = (user as any)?.subscription?.plan as string | undefined;
  const memberRate = plan ? (MEMBER_RATES[plan] ?? 0) : 0;

  // ── Membership perks carousel items ──────────────────────────────────────────
  const PERK_PLACEHOLDERS: PerkItem[] = [
    { id: 'ph1', name: 'DaddyMan Classic Tee',  price: 34.99, comingSoon: true },
    { id: 'ph2', name: 'The Ark Hoodie',         price: 59.99, comingSoon: true },
    { id: 'ph3', name: 'Camp Cap',               price: 24.99, comingSoon: true },
    { id: 'ph4', name: 'DaddyMan Crewneck',      price: 49.99, comingSoon: true },
  ];
  const carouselItems = perkItems.length > 0
    ? perkItems
    : PERK_PLACEHOLDERS;

  // ── Header (all non-grid sections above the product cards) ───────────────────
  const ListHeader = (
    <>
      {/* Cinematic banner */}
      {banners.length > 0 && <CinematicBanner slides={banners} />}

      {/* ── Hero intro ───────────────────────────────────────────── */}
      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>Camp DaddyMan Official Store</Text>
        <Text style={styles.heroTitle}>Merch, Music{'\n'}& Limited Drops</Text>

        {/* Stats row */}
        {products.length > 0 && (
          <View style={styles.statsRow}>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{products.length}</Text>
              <Text style={styles.statLabel}>Products</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <Text style={[styles.statValue, { color: '#f8c202' }]}>15%</Text>
              <Text style={styles.statLabel}>Max Discount</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{products.filter((p) => p.featured).length || '∞'}</Text>
              <Text style={styles.statLabel}>Featured Drops</Text>
            </View>
          </View>
        )}

        <Text style={styles.heroSub}>Straight from the Camp.</Text>
        {memberRate > 0 ? (
          <Text style={styles.heroMemberLine}>You're saving {memberRate}% today ✓</Text>
        ) : !user ? (
          <Text style={styles.heroMemberLine}>Members save up to 15% —{' '}
            <Text style={styles.heroJoinLink} onPress={() => navigation.navigate('Membership' as never)}>
              Join →
            </Text>
          </Text>
        ) : null}

        <View style={styles.heroCtas}>
          <TouchableOpacity style={styles.shopBtn} onPress={() => flatListRef.current?.scrollToIndex({ index: 0, viewPosition: 0, animated: true })} activeOpacity={0.88}>
            <Text style={styles.shopBtnText}>Shop the Collection</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cartBtn}
            onPress={() => navigation.navigate('Cart' as never)}
            activeOpacity={0.88}
          >
            <Ionicons name="cart-outline" size={18} color="#fff" />
            <Text style={styles.cartBtnText}>Cart</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Ad banner */}
      <AdBanner location="shop-banner" />

      {/* ── Type filter + collection heading ─────────────────────── */}
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {TYPE_FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, typeFilter === f && styles.filterBtnActive]}
              onPress={() => setTypeFilter(f)}
            >
              <Text style={[styles.filterText, typeFilter === f && styles.filterTextActive]}>
                {f === 'ALL' ? 'All' : f === 'PHYSICAL' ? 'Physical' : 'Digital'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.collectionHeader}>
          <Text style={styles.collectionTitle}>The Collection</Text>
          <Text style={styles.collectionCount}>{filtered.length} item{filtered.length !== 1 ? 's' : ''}</Text>
        </View>
      </View>
    </>
  );

  // ── Footer (membership perks + CTAs) ─────────────────────────────────────────
  const ListFooter = (
    <>
      {/* ── Membership perks carousel ────────────────────────────── */}
      <View style={styles.perksSection}>
        <View style={styles.perksSectionHeader}>
          <View style={styles.perksEyebrowPill}>
            <Text style={styles.perksEyebrowText}>Membership Perks</Text>
          </View>
        </View>
        <Text style={styles.perksTitle}>
          Camp Members{'\n'}
          <Text style={{ color: '#f8c202' }}>Save Up To 15%</Text>{'\n'}
          on Every Order.
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.perksCarousel}
        >
          {carouselItems.map((item) => {
            const displayRate = memberRate > 0 ? memberRate : 15;
            return (
              <View key={item.id} style={[styles.perkCard, item.comingSoon && styles.perkCardDim]}>
                <View style={styles.perkImageWrap}>
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  ) : (
                    <View style={styles.perkImagePlaceholder}>
                      <Text style={styles.perkPlaceholderIcon}>✦</Text>
                    </View>
                  )}
                  <View style={styles.perkBadge}>
                    <Text style={styles.perkBadgeText}>
                      {item.comingSoon ? 'Coming Soon' : '✦ Members'}
                    </Text>
                  </View>
                </View>
                <View style={styles.perkMeta}>
                  <Text style={styles.perkName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.perkOrigPrice}>${item.price.toFixed(2)}</Text>
                  <Text style={styles.perkMemberPrice}>
                    ${(item.price * (1 - displayRate / 100)).toFixed(2)}
                  </Text>
                </View>
              </View>
            );
          })}

          {/* Promo card */}
          <View style={styles.perkPromoCard}>
            <Text style={styles.perkPromoEyebrow}>Camp DaddyMan</Text>
            <Text style={styles.perkPromoTitle}>Stream Music.{'\n'}Watch Films.{'\n'}Live the Philosophy.</Text>
            <TouchableOpacity
              style={styles.perkPromoBtn}
              onPress={() => navigation.navigate('Membership' as never)}
            >
              <Text style={styles.perkPromoBtnText}>Explore Membership →</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {memberRate > 0 ? (
          <View style={styles.memberSavingRow}>
            <Ionicons name="checkmark-circle" size={16} color="#4ade80" />
            <Text style={styles.memberSavingText}> You're saving {memberRate}% on eligible items</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.joinCta}
            onPress={() => navigation.navigate('Membership' as never)}
            activeOpacity={0.88}
          >
            <Text style={styles.joinCtaText}>Join the Camp →</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Stay in the loop newsletter ───────────────────────────── */}
      <View style={styles.newsletterSection}>
        <Ionicons name="mail-outline" size={32} color="#f8c202" style={{ marginBottom: 12 }} />
        <Text style={styles.newsletterTitle}>Stay in the Loop</Text>
        <Text style={styles.newsletterSub}>
          New drops, exclusive releases, and Camp updates — straight to your inbox.
        </Text>
        <View style={styles.newsletterRow}>
          <TextInput
            style={styles.newsletterInput}
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            placeholderTextColor="#444"
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={handleSubscribe}
          />
          <TouchableOpacity
            style={[styles.newsletterBtn, subLoading && styles.newsletterBtnLoading]}
            onPress={handleSubscribe}
            disabled={subLoading}
            activeOpacity={0.85}
          >
            {subLoading
              ? <ActivityIndicator size="small" color="#000" />
              : <Text style={styles.newsletterBtnText}>Subscribe</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={filtered}
        keyExtractor={(p) => p.id.toString()}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor="#f8c202" />}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        onScrollToIndexFailed={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="bag-outline" size={52} color="#2a2a2a" style={{ marginBottom: 14 }} />
            <Text style={styles.emptyTitle}>The Ark is stocking up</Text>
            <Text style={styles.emptySub}>Check back soon for exclusive merch and drops.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const imgSrc = item.imageUrl ?? item.images?.[0];
          const hasDiscount = !!(item.comparePrice && item.comparePrice > item.price);
          const savePct = hasDiscount ? Math.round((1 - item.price / item.comparePrice!) * 100) : 0;
          const soldOut = item.inStock === false ||
            (item.variants && item.variants.length > 0 && item.variants.every((v) => v.inventory <= 0));

          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.82}
              onPress={() => navigation.navigate('Product', { id: item.slug || item.id })}
              accessibilityLabel={`${item.name}, $${item.price.toFixed(2)}${soldOut ? ', sold out' : ''}. Tap to view.`}
              accessibilityRole="button"
            >
              <View style={styles.imageWrap}>
                {imgSrc ? (
                  <Image source={{ uri: imgSrc }} style={StyleSheet.absoluteFill} contentFit="cover" />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name={item.type === 'DIGITAL' ? 'cube-outline' : 'bag-outline'} size={filtered.length === 1 ? 52 : 34} color="#333" />
                  </View>
                )}

                <View style={styles.topBadges}>
                  {item.featured && <View style={styles.dropBadge}><Text style={styles.dropText}>Drop</Text></View>}
                  {item.type === 'DIGITAL' && <View style={styles.digitalBadge}><Text style={styles.digitalText}>Digital</Text></View>}
                  {hasDiscount && <View style={styles.saveBadge}><Text style={styles.saveText}>−{savePct}%</Text></View>}
                </View>

                {soldOut && (
                  <View style={styles.soldOutOverlay}>
                    <Text style={styles.soldOutOverlayText}>Sold Out</Text>
                  </View>
                )}

                {(item.memberDiscountEnabled || item.memberDiscount) && (
                  <View style={styles.memberBadge}><Text style={styles.memberBadgeText}>✦ Members</Text></View>
                )}
              </View>

              <View style={styles.cardBody}>
                {item.tags?.length > 0 && (
                  <Text style={styles.tagLine} numberOfLines={1}>
                    {item.tags.slice(0, 2).join(' · ')}
                  </Text>
                )}
                <Text style={[styles.cardName, filtered.length === 1 && styles.cardNameLarge]} numberOfLines={2}>
                  {item.name}
                </Text>
                <View style={styles.priceRow}>
                  <Text style={[styles.cardPrice, filtered.length === 1 && styles.cardPriceLarge]}>
                    ${item.price.toFixed(2)}
                  </Text>
                  {hasDiscount && (
                    <Text style={styles.comparePrice}>${item.comparePrice!.toFixed(2)}</Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  centered: { flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center' },

  // Hero
  hero: {
    backgroundColor: '#050505',
    borderBottomWidth: 1, borderBottomColor: 'rgba(248,194,2,0.08)',
    paddingHorizontal: '5%' as any,
    paddingTop: 24, paddingBottom: 28,
  },
  heroEyebrow: { color: '#f8c202', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10 },
  heroTitle: { color: '#f5f1e8', fontSize: 36, fontWeight: '900', lineHeight: 40, letterSpacing: -0.5, marginBottom: 18 },
  statsRow: {
    flexDirection: 'row', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14, overflow: 'hidden', marginBottom: 14, backgroundColor: 'rgba(255,255,255,0.035)',
  },
  statCell: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  statValue: { color: '#f5f1e8', fontSize: 26, fontWeight: '900', lineHeight: 30 },
  statLabel: { color: '#c9b889', fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 3 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  heroSub: { color: '#cfc7b7', fontSize: 14, marginBottom: 6 },
  heroMemberLine: { color: '#f8c202', fontSize: 13, fontWeight: '600', marginBottom: 18 },
  heroJoinLink: { textDecorationLine: 'underline' },
  heroCtas: { flexDirection: 'row', gap: 12, marginTop: 4 },
  shopBtn: {
    flex: 1, backgroundColor: '#f8c202', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
  },
  shopBtnText: { color: '#000', fontWeight: '900', fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  cartBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#0ba691', borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 14, gap: 6,
  },
  cartBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  // Filter
  filterSection: { paddingTop: 8 },
  filterRow: { paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  filterBtn: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 22,
    backgroundColor: '#161616', borderWidth: 1, borderColor: '#232323', minHeight: 40, justifyContent: 'center',
  },
  filterBtnActive: { backgroundColor: '#f8c202', borderColor: '#f8c202' },
  filterText: { color: '#999', fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: '#000', fontWeight: '700' },
  collectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingBottom: 12,
  },
  collectionTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  collectionCount: { color: '#555', fontSize: 13, fontWeight: '600' },

  // Product grid
  grid: { paddingHorizontal: 12, paddingBottom: 0, backgroundColor: '#0a0a0a' },
  row: { justifyContent: 'space-between', marginBottom: 12 },
  card: { backgroundColor: '#111', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#1e1e1e', marginBottom: 12 },
  imageWrap: { width: '100%', aspectRatio: 4 / 5, backgroundColor: '#161616', position: 'relative' },
  imagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBadges: { position: 'absolute', top: 8, left: 8, gap: 4 },
  dropBadge: { backgroundColor: '#f8c202', borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 },
  dropText: { color: '#000', fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8 },
  digitalBadge: { backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(126,184,255,0.4)' },
  digitalText: { color: '#7eb8ff', fontSize: 9, fontWeight: '700' },
  saveBadge: { backgroundColor: '#ef4444', borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 },
  saveText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  soldOutOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  soldOutOverlayText: { color: '#888', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  memberBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(248,194,2,0.4)' },
  memberBadgeText: { color: '#f8c202', fontSize: 9, fontWeight: '800' },
  cardBody: { padding: 10 },
  tagLine: { color: '#555', fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  cardName: { color: '#f0f0f0', fontSize: 13, fontWeight: '700', lineHeight: 18, marginBottom: 5 },
  cardNameLarge: { fontSize: 18, lineHeight: 24 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  cardPrice: { color: '#f8c202', fontSize: 15, fontWeight: '800' },
  cardPriceLarge: { fontSize: 22 },
  comparePrice: { color: '#555', fontSize: 12, textDecorationLine: 'line-through' },

  // Empty
  emptyBox: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptySub: { color: '#555', fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // Perks section
  perksSection: {
    backgroundColor: 'rgba(248,194,2,0.03)',
    borderTopWidth: 1, borderTopColor: '#1a1a1a',
    paddingTop: 28, paddingBottom: 24,
  },
  perksSectionHeader: { paddingHorizontal: 16, marginBottom: 10 },
  perksEyebrowPill: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(248,194,2,0.1)',
    borderWidth: 1, borderColor: 'rgba(248,194,2,0.25)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
  },
  perksEyebrowText: { color: '#f8c202', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2 },
  perksTitle: { color: '#fff', fontSize: 28, fontWeight: '900', lineHeight: 36, paddingHorizontal: 16, marginBottom: 20 },
  perksCarousel: { paddingHorizontal: 16, gap: 12 },
  perkCard: { width: 160, backgroundColor: '#111', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#1e1e1e' },
  perkCardDim: { opacity: 0.7 },
  perkImageWrap: { width: '100%', aspectRatio: 3 / 4, backgroundColor: '#1a1a2e', position: 'relative' },
  perkImagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(248,194,2,0.06)' },
  perkPlaceholderIcon: { color: 'rgba(248,194,2,0.3)', fontSize: 32, fontWeight: '900' },
  perkBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  perkBadgeText: { color: '#f8c202', fontSize: 9, fontWeight: '800' },
  perkMeta: { padding: 10 },
  perkName: { color: '#f0f0f0', fontSize: 12, fontWeight: '700', lineHeight: 17, marginBottom: 5 },
  perkOrigPrice: { color: '#555', fontSize: 11, textDecorationLine: 'line-through', marginBottom: 2 },
  perkMemberPrice: { color: '#f8c202', fontSize: 14, fontWeight: '900' },
  perkPromoCard: {
    width: 210, backgroundColor: '#111', borderRadius: 16,
    borderWidth: 1, borderColor: '#1e1e1e',
    padding: 18, justifyContent: 'space-between',
  },
  perkPromoEyebrow: { color: 'rgba(248,194,2,0.5)', fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 },
  perkPromoTitle: { color: '#fff', fontWeight: '900', fontSize: 16, lineHeight: 22, marginBottom: 20 },
  perkPromoBtn: { backgroundColor: '#f8c202', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  perkPromoBtnText: { color: '#000', fontSize: 12, fontWeight: '800' },
  memberSavingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 16 },
  memberSavingText: { color: '#4ade80', fontSize: 13, fontWeight: '700' },
  joinCta: {
    marginHorizontal: 16, marginTop: 20,
    backgroundColor: '#f8c202', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  joinCtaText: { color: '#000', fontSize: 16, fontWeight: '900' },

  // Newsletter
  newsletterSection: {
    marginHorizontal: 16, marginTop: 8, marginBottom: 40,
    backgroundColor: '#111', borderRadius: 20,
    borderWidth: 1, borderColor: '#1e1e1e',
    padding: 24, alignItems: 'center',
  },
  newsletterTitle: { color: '#fff', fontSize: 22, fontWeight: '900', marginBottom: 8, textAlign: 'center' },
  newsletterSub: { color: '#666', fontSize: 13, lineHeight: 19, textAlign: 'center', marginBottom: 20, maxWidth: 280 },
  newsletterRow: { flexDirection: 'row', gap: 10, width: '100%' },
  newsletterInput: {
    flex: 1, backgroundColor: '#1a1a1a',
    borderWidth: 1, borderColor: '#2a2a2a',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    color: '#fff', fontSize: 14,
  },
  newsletterBtn: {
    backgroundColor: '#f8c202', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 13, justifyContent: 'center',
    minWidth: 100, alignItems: 'center',
  },
  newsletterBtnLoading: { opacity: 0.7 },
  newsletterBtnText: { color: '#000', fontSize: 14, fontWeight: '900' },
});
