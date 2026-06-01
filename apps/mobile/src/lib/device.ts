import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export async function getDeviceId(): Promise<string> {
  const stored = await AsyncStorage.getItem('deviceId');
  if (stored) return stored;
  const id = `mobile-${Platform.OS}-${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem('deviceId', id);
  return id;
}

export function getDeviceLabel(): string {
  return `${Platform.OS === 'ios' ? 'iPhone' : 'Android'} (Expo Go)`;
}
