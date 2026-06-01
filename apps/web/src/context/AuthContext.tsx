'use client';
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import api from '@/lib/api';
import { User } from '@/types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  setAuth: (token: string, user: User) => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        localStorage.removeItem('token');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      const clean = new URL(window.location.href);
      clean.searchParams.delete('code');
      window.history.replaceState({}, '', clean.toString());
      api.post('/auth/exchange-handoff', { code })
        .then(({ data }) => {
          localStorage.setItem('token', data.token);
          setUser(data.user);
        })
        .catch(() => {})
        .finally(() => { setLoading(false); });
      return;
    }
    refresh();
  }, [refresh]);

  const setAuth = useCallback((token: string, newUser: User) => {
    localStorage.setItem('token', token);
    setUser(newUser);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    localStorage.removeItem('token');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, setAuth, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
