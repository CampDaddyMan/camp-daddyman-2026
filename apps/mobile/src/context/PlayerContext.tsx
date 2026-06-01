import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';

export const AUDIO_TYPES = new Set(['MUSIC', 'PODCAST', 'SPOKEN_WORD', 'DADDYMAN_ISMS']);

export interface PlayerTrack {
  id: string;
  title: string;
  creatorName: string;
  mediaUrl: string;
  thumbnailUrl?: string;
  type: string;
  routeName: string;
  routeParams: Record<string, any>;
}

interface PlayerContextType {
  track: PlayerTrack | null;
  isPlaying: boolean;
  isLoading: boolean;
  position: number;
  duration: number;
  queue: PlayerTrack[];
  play: (track: PlayerTrack, startPosition?: number) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
  seekTo: (seconds: number) => Promise<void>;
  addToQueue: (track: PlayerTrack) => void;
  playNext: (track: PlayerTrack) => void;
  skipToNext: () => Promise<void>;
  clearQueue: () => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used inside PlayerProvider');
  return ctx;
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const soundRef  = useRef<Audio.Sound | null>(null);
  const playRef   = useRef<(track: PlayerTrack, startPosition?: number) => Promise<void>>(async () => {});
  const queueRef  = useRef<PlayerTrack[]>([]);

  const [track,     setTrack]     = useState<PlayerTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [position,  setPosition]  = useState(0);
  const [duration,  setDuration]  = useState(0);
  const [queue,     setQueue]     = useState<PlayerTrack[]>([]);

  useEffect(() => {
    Audio.setAudioModeAsync({
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
    });
  }, []);

  useEffect(() => {
    return () => { soundRef.current?.unloadAsync(); };
  }, []);

  function onPlaybackUpdate(status: AVPlaybackStatus) {
    if (!status.isLoaded) return;
    setPosition(status.positionMillis / 1000);
    setDuration((status.durationMillis ?? 0) / 1000);
    setIsPlaying(status.isPlaying);
    if (status.didJustFinish) {
      setIsPlaying(false);
      // Auto-advance: defer so state is settled before playing next
      setTimeout(() => {
        if (queueRef.current.length > 0) {
          const [next, ...rest] = queueRef.current;
          queueRef.current = rest;
          setQueue(rest);
          playRef.current(next);
        }
      }, 0);
    }
  }

  const stop = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    setTrack(null);
    setIsPlaying(false);
    setPosition(0);
    setDuration(0);
  }, []);

  const play = useCallback(async (newTrack: PlayerTrack, startPosition = 0) => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    setTrack(newTrack);
    setIsLoading(true);
    setIsPlaying(false);
    setPosition(startPosition);
    setDuration(0);

    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: newTrack.mediaUrl },
        { shouldPlay: true, positionMillis: startPosition * 1000 },
        onPlaybackUpdate,
      );
      soundRef.current = sound;
      setIsPlaying(true);
    } finally {
      setIsLoading(false);
    }
  }, []); // eslint-disable-line

  // Keep playRef current so the auto-advance closure always uses the latest play()
  useEffect(() => { playRef.current = play; }, [play]);

  const pause = useCallback(async () => {
    await soundRef.current?.pauseAsync();
    setIsPlaying(false);
  }, []);

  const resume = useCallback(async () => {
    await soundRef.current?.playAsync();
    setIsPlaying(true);
  }, []);

  const seekTo = useCallback(async (seconds: number) => {
    await soundRef.current?.setPositionAsync(seconds * 1000);
    setPosition(seconds);
  }, []);

  const addToQueue = useCallback((newTrack: PlayerTrack) => {
    setQueue((prev) => {
      const updated = [...prev, newTrack];
      queueRef.current = updated;
      return updated;
    });
  }, []);

  const playNext = useCallback((newTrack: PlayerTrack) => {
    setQueue((prev) => {
      const updated = [newTrack, ...prev];
      queueRef.current = updated;
      return updated;
    });
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
    queueRef.current = [];
  }, []);

  const skipToNext = useCallback(async () => {
    if (queueRef.current.length === 0) return;
    const [next, ...rest] = queueRef.current;
    queueRef.current = rest;
    setQueue(rest);
    await playRef.current(next);
  }, []);

  return (
    <PlayerContext.Provider value={{
      track, isPlaying, isLoading, position, duration, queue,
      play, pause, resume, stop, seekTo,
      addToQueue, playNext, skipToNext, clearQueue,
    }}>
      {children}
    </PlayerContext.Provider>
  );
}
