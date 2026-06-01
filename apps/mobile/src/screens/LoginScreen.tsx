import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../navigation/RootNavigator';
import api from '../lib/api';
import { getDeviceId, getDeviceLabel } from '../lib/device';

type Step = 'credentials' | 'verify';

export default function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { setAuth } = useAuth();

  const [step, setStep]               = useState<Step>('credentials');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode]               = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  async function handleLogin() {
    if (!email.trim() || !password) return;
    setLoading(true);
    setError('');
    try {
      const deviceId = await getDeviceId();
      const { data } = await api.post('/auth/login', {
        email: email.trim().toLowerCase(),
        password,
        deviceId,
        deviceLabel: getDeviceLabel(),
      });
      if (data.requiresTwoFactor) {
        setChallengeId(data.challengeId);
        setStep('verify');
      } else {
        await setAuth(data.token, data.user);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (code.length !== 6) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/verify-2fa', { challengeId, code });
      if (data.requiresForce) {
        const { data: forced } = await api.post('/auth/force-login', { forceId: data.forceId });
        await setAuth(forced.token, forced.user);
      } else {
        await setAuth(data.token, data.user);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Invalid code. Check your email.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">

        {step === 'credentials' ? (
          <>
            <Text style={styles.logo}>Camp DaddyMan</Text>
            <Text style={styles.tagline}>Sign in to your account</Text>

            {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

            <TextInput
              style={styles.input} placeholder="Email" placeholderTextColor="#555"
              value={email} onChangeText={setEmail}
              keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
            />

            <View style={styles.passwordWrap}>
              <TextInput
                style={styles.passwordInput} placeholder="Password" placeholderTextColor="#555"
                value={password} onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(v => !v)}>
                <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.btn, (!email || !password || loading) && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={!email || !password || loading}
            >
              {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.btnText}>Sign in</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('Register')}>
              <Text style={styles.linkText}>Don't have an account? <Text style={styles.linkBold}>Join free</Text></Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.logo}>📧</Text>
            <Text style={styles.tagline2}>Check your email</Text>
            <Text style={styles.taglineSub}>We sent a 6-digit code to {email}</Text>

            {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

            <TextInput
              style={[styles.input, styles.codeInput]}
              placeholder="000000" placeholderTextColor="#555"
              value={code} onChangeText={(v) => setCode(v.replace(/\D/g, ''))}
              keyboardType="number-pad" maxLength={6} autoFocus
            />

            <TouchableOpacity
              style={[styles.btn, (code.length !== 6 || loading) && styles.btnDisabled]}
              onPress={handleVerify}
              disabled={code.length !== 6 || loading}
            >
              {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.btnText}>Verify & sign in</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.link} onPress={() => { setStep('credentials'); setCode(''); setError(''); }}>
              <Text style={styles.linkText}>← Back</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#0d0d0d', padding: 24, justifyContent: 'center' },
  logo: { color: '#f8c202', fontSize: 28, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  tagline: { color: '#666', fontSize: 15, textAlign: 'center', marginBottom: 32 },
  tagline2: { color: '#fff', fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  taglineSub: { color: '#666', fontSize: 13, textAlign: 'center', marginBottom: 32 },
  errorBox: { backgroundColor: '#2a1215', borderRadius: 10, padding: 12, marginBottom: 16 },
  errorText: { color: '#f87171', fontSize: 13 },
  input: {
    backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#282828', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, color: '#fff', fontSize: 15, marginBottom: 12,
  },
  passwordWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#282828', borderRadius: 12,
    marginBottom: 12,
  },
  passwordInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, color: '#fff', fontSize: 15 },
  eyeBtn: { paddingHorizontal: 14, paddingVertical: 14 },
  eyeText: { fontSize: 18 },
  codeInput: { textAlign: 'center', fontSize: 28, fontWeight: '700', letterSpacing: 8 },
  btn: { backgroundColor: '#f8c202', borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#000', fontSize: 16, fontWeight: '700' },
  link: { marginTop: 20, alignItems: 'center' },
  linkText: { color: '#666', fontSize: 14 },
  linkBold: { color: '#f8c202', fontWeight: '700' },
});
