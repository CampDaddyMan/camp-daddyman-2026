import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Change this to your machine's local IP when testing on a physical device
// e.g. 'http://192.168.1.x:4000/api'
// Android emulator uses 10.0.2.2 to reach localhost
export const API_BASE = __DEV__
  ? 'http://10.0.2.2:4000/api'
  : 'https://api.campdaddyman.com/api';

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
