'use client';
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import api from '@/lib/api';
import { Profile } from '@/types';

interface ProfileContextType {
  profiles: Profile[];
  activeProfile: Profile | null;
  loading: boolean;
  switchProfile: (profile: Profile | null) => void;
  createProfile: (name: string, avatar?: string, isKids?: boolean) => Promise<Profile>;
  updateProfile: (id: string, data: Partial<Pick<Profile, 'name' | 'avatar' | 'isKids'>>) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | null>(null);
const STORAGE_KEY = 'cdm_active_profile_id';

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) { setProfiles([]); setActiveProfile(null); return; }
    setLoading(true);
    try {
      const { data } = await api.get('/profiles');
      setProfiles(data.profiles);
      const savedId = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      const found = savedId ? data.profiles.find((p: Profile) => p.id === savedId) ?? null : null;
      setActiveProfile(found);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  function switchProfile(profile: Profile | null) {
    setActiveProfile(profile);
    if (typeof window !== 'undefined') {
      if (profile) localStorage.setItem(STORAGE_KEY, profile.id);
      else localStorage.removeItem(STORAGE_KEY);
    }
  }

  async function createProfile(name: string, avatar?: string, isKids?: boolean): Promise<Profile> {
    const { data } = await api.post('/profiles', { name, avatar, isKids });
    await refresh();
    return data.profile;
  }

  async function updateProfile(id: string, profileData: Partial<Pick<Profile, 'name' | 'avatar' | 'isKids'>>) {
    await api.patch(`/profiles/${id}`, profileData);
    await refresh();
  }

  async function deleteProfile(id: string) {
    await api.delete(`/profiles/${id}`);
    if (activeProfile?.id === id) switchProfile(null);
    await refresh();
  }

  return (
    <ProfileContext.Provider value={{ profiles, activeProfile, loading, switchProfile, createProfile, updateProfile, deleteProfile, refresh }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
