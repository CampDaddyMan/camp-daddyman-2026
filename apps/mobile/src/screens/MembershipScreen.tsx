import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Linking, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../lib/api';

interface Plan {
  name: string;
  price: number;
  priceId: string | null;
  features: string[];
}

interface Plans {
  FREE: Plan;
  PRO: Plan;
  PREMIUM: Plan;
  CREATOR: Plan;
}

interface MySubscription {
  plan?: string;
  status?: string;
  currentPeriodEnd?: string;
}

const PLAN_ORDER: (keyof Plans)[] = ['FREE', 'PRO', 'PREMIUM', 'CREATOR'];

const PLAN_ACCENTS: Record<string, string> = {
  FREE: '#555',
  PRO: '#60a5fa',
  PREMIUM: '#f8c202',
  CREATOR: '#009B3A',
};

export default function MembershipScreen() {
  const [plans, setPlans] = useState<Plans | null>(null);
  const [mySub, setMySub] = useState<MySubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [managingPortal, setManagingPortal] = useState(false);

  function load(isRefresh = false) {
    if (!isRefresh) setLoading(true);
    Promise.all([
      api.get('/subscriptions/plans'),
      api.get('/subscriptions/me').catch(() => ({ data: { subscription: null } })),
    ])
      .then(([plansRes, meRes]) => {
        setPlans(plansRes.data.plans);
        setMySub(meRes.data.subscription);
      })
      .finally(() => { setLoading(false); setRefreshing(false); });
  }

  useEffect(() => { load(); }, []);

  async function subscribe(planKey: string) {
    setCheckingOut(planKey);
    try {
      const { data } = await api.post('/subscriptions/checkout', { plan: planKey });
      if (data.url) Linking.openURL(data.url);
    } catch {
      // silently ignore
    } finally {
      setCheckingOut(null);
    }
  }

  async function manageSubscription() {
    setManagingPortal(true);
    try {
      const { data } = await api.post('/subscriptions/portal');
      if (data.url) Linking.openURL(data.url);
    } catch {
      // silently ignore
    } finally {
      setManagingPortal(false);
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#f8c202" /></View>;
  }

  const currentPlan = mySub?.plan ?? 'FREE';

  return (
    <ScrollView
      style={styles.scroll}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor="#f8c202" />}
    >
      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Camp DaddyMan{'\n'}Membership</Text>
        <Text style={styles.heroSub}>Unlock exclusive content, creator tools, and more</Text>
        {mySub && (
          <View style={styles.currentBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#4ade80" />
            <Text style={styles.currentBadgeText}>
              Active: {mySub.plan} plan
              {mySub.currentPeriodEnd ? ` · renews ${new Date(mySub.currentPeriodEnd).toLocaleDateString()}` : ''}
            </Text>
          </View>
        )}
      </View>

      {/* Plan cards */}
      {plans && PLAN_ORDER.map((key) => {
        const plan = plans[key];
        const accent = PLAN_ACCENTS[key];
        const isActive = currentPlan === key;
        const isFree = key === 'FREE';

        return (
          <View key={key} style={[styles.card, isActive && styles.cardActive]}>
            {isActive && (
              <View style={styles.activePill}>
                <Text style={styles.activePillText}>Current Plan</Text>
              </View>
            )}
            <View style={styles.cardTop}>
              <View>
                <Text style={[styles.planName, { color: accent }]}>{plan.name}</Text>
                <Text style={styles.planPrice}>
                  {plan.price === 0 ? 'Free' : `$${plan.price}/mo`}
                </Text>
              </View>
              {!isFree && !isActive && (
                <TouchableOpacity
                  style={[styles.subscribeBtn, { borderColor: accent }]}
                  onPress={() => subscribe(key)}
                  disabled={checkingOut === key}
                >
                  {checkingOut === key
                    ? <ActivityIndicator size="small" color={accent} />
                    : <Text style={[styles.subscribeBtnText, { color: accent }]}>Subscribe</Text>
                  }
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.featureList}>
              {plan.features.map((f, i) => (
                <View key={i} style={styles.feature}>
                  <Ionicons name="checkmark" size={14} color={accent} style={styles.featureIcon} />
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </View>
          </View>
        );
      })}

      {/* Manage existing subscription */}
      {mySub && mySub.plan !== 'FREE' && (
        <TouchableOpacity style={styles.manageBtn} onPress={manageSubscription} disabled={managingPortal}>
          {managingPortal
            ? <ActivityIndicator size="small" color="#888" />
            : (
              <>
                <Ionicons name="settings-outline" size={16} color="#888" />
                <Text style={styles.manageBtnText}>Manage Billing & Subscription</Text>
              </>
            )
          }
        </TouchableOpacity>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#0d0d0d' },
  center: { flex: 1, backgroundColor: '#0d0d0d', alignItems: 'center', justifyContent: 'center' },
  hero: {
    padding: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#161616',
    backgroundColor: '#090909',
  },
  heroTitle: { color: '#fff', fontSize: 26, fontWeight: '900', lineHeight: 32, marginBottom: 8 },
  heroSub: { color: '#888', fontSize: 14, lineHeight: 20 },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    backgroundColor: '#0d2d1a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  currentBadgeText: { color: '#4ade80', fontSize: 13, fontWeight: '600' },
  card: {
    margin: 14,
    marginBottom: 0,
    backgroundColor: '#111111',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    padding: 18,
    overflow: 'hidden',
  },
  cardActive: { borderColor: '#f8c202', borderWidth: 1.5 },
  activePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#f8c202',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  activePillText: { color: '#000', fontSize: 11, fontWeight: '800' },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 },
  planName: { fontSize: 17, fontWeight: '800', marginBottom: 4 },
  planPrice: { color: '#fff', fontSize: 22, fontWeight: '900' },
  subscribeBtn: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
    minWidth: 110,
    alignItems: 'center',
  },
  subscribeBtnText: { fontSize: 14, fontWeight: '700' },
  featureList: { gap: 8 },
  feature: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  featureIcon: { marginTop: 1 },
  featureText: { color: '#bbb', fontSize: 13, flex: 1, lineHeight: 18 },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    margin: 14,
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#282828',
  },
  manageBtnText: { color: '#888', fontSize: 14 },
});
