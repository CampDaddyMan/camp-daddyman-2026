import React, { useState } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Linking, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../lib/api';

const PLANS = [
  { key: 'PRO', label: 'Pro Monthly', price: '$19.99/mo', color: '#60a5fa' },
  { key: 'PREMIUM', label: 'Pro Annual', price: '$99.99/yr', color: '#f8c202' },
  { key: 'CREATOR', label: 'Creator', price: '$29.99/mo', color: '#009B3A' },
] as const;

type PlanKey = typeof PLANS[number]['key'];

export default function GiftScreen() {
  const [email, setEmail] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>('PREMIUM');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleGift() {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Invalid email', 'Please enter a valid recipient email address.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/subscriptions/gift', {
        recipientEmail: email.trim(),
        plan: selectedPlan,
        message: message.trim() || undefined,
      });
      if (data.url) {
        Linking.openURL(data.url);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || 'Could not start the gift checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Hero */}
        <View style={styles.hero}>
          <Ionicons name="gift" size={48} color="#f8c202" style={{ marginBottom: 14 }} />
          <Text style={styles.heroTitle}>Gift a Membership</Text>
          <Text style={styles.heroSub}>
            Give someone you care about unlimited access to Camp DaddyMan — music, films, podcasts, and more.
          </Text>
        </View>

        {/* Recipient */}
        <View style={styles.section}>
          <Text style={styles.label}>Recipient's Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="their@email.com"
            placeholderTextColor="#444"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Plan selector */}
        <View style={styles.section}>
          <Text style={styles.label}>Choose a Plan</Text>
          {PLANS.map((plan) => (
            <TouchableOpacity
              key={plan.key}
              style={[styles.planOption, selectedPlan === plan.key && { borderColor: plan.color, borderWidth: 2 }]}
              onPress={() => setSelectedPlan(plan.key)}
              activeOpacity={0.8}
            >
              <View style={styles.planOptionLeft}>
                <View style={[styles.radio, selectedPlan === plan.key && { borderColor: plan.color }]}>
                  {selectedPlan === plan.key && <View style={[styles.radioDot, { backgroundColor: plan.color }]} />}
                </View>
                <View>
                  <Text style={[styles.planOptionName, selectedPlan === plan.key && { color: plan.color }]}>
                    {plan.label}
                  </Text>
                  <Text style={styles.planOptionPrice}>{plan.price}</Text>
                </View>
              </View>
              {selectedPlan === plan.key && (
                <Ionicons name="checkmark-circle" size={20} color={plan.color} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Optional message */}
        <View style={styles.section}>
          <Text style={styles.label}>Personal Message <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput
            style={[styles.input, styles.messageInput]}
            value={message}
            onChangeText={setMessage}
            placeholder="Add a personal note..."
            placeholderTextColor="#444"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.giftBtn, (loading || !email.trim()) && styles.giftBtnDisabled]}
          onPress={handleGift}
          disabled={loading || !email.trim()}
          activeOpacity={0.8}
        >
          {loading
            ? <ActivityIndicator color="#000" />
            : (
              <>
                <Ionicons name="gift-outline" size={20} color="#000" />
                <Text style={styles.giftBtnText}>Continue to Payment</Text>
              </>
            )
          }
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          You'll be taken to a secure Stripe checkout to complete the gift purchase. The recipient will receive an email with access instructions.
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0d0d0d' },
  scroll: { flex: 1 },
  hero: {
    padding: 28,
    paddingBottom: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#161616',
    backgroundColor: '#090909',
  },
  heroTitle: { color: '#fff', fontSize: 24, fontWeight: '900', marginBottom: 10, textAlign: 'center' },
  heroSub: { color: '#888', fontSize: 14, textAlign: 'center', lineHeight: 21 },
  section: { padding: 18, paddingBottom: 4 },
  label: { color: '#aaa', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  optional: { color: '#555', fontWeight: '400', textTransform: 'none', letterSpacing: 0 },
  input: {
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#282828',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 15,
  },
  messageInput: { height: 90, paddingTop: 12 },
  planOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    padding: 16,
    marginBottom: 10,
  },
  planOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  planOptionName: { color: '#ddd', fontSize: 15, fontWeight: '700', marginBottom: 2 },
  planOptionPrice: { color: '#666', fontSize: 13 },
  giftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#f8c202',
    borderRadius: 14,
    padding: 18,
    margin: 18,
    marginTop: 22,
  },
  giftBtnDisabled: { opacity: 0.5 },
  giftBtnText: { color: '#000', fontSize: 16, fontWeight: '800' },
  disclaimer: {
    color: '#555',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 24,
  },
});
