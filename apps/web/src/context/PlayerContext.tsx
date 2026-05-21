'use client';
import { createContext, useCallback, useContext, useRef, useState } from 'react';

export interface PlayerTrack {
  id: string;
  title: string;
  creator: string;
  mediaUrl: string;
  thumbnailUrl: string | null;
  type: string;
}

interface PlayerContextValue {
  track: PlayerTrack | null;
  queue: PlayerTrack[];
  playing: boolean;
  progress: number;
  duration: number;
  play: (track: PlayerTrack) => void;
  pause: () => void;
  resume: () => void;
  toggle: () => void;
  seek: (seconds: number) => void;
  dismiss: () => void;
  addToQueue: (track: PlayerTrack) => void;
  playNext: (track: PlayerTrack) => void;
  skipNext: () => void;
  skipPrev: () => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
}

const PlayerContext = createContext<PlayerContextValue>({
  track: null, queue: [], playing: false, progress: 0, duration: 0,
  play: () => {}, pause: () => {}, resume: () => {}, toggle: () => {},
  seek: () => {}, dismiss: () => {}, addToQueue: () => {}, playNext: () => {},
  skipNext: () => {}, skipPrev: () => {}, removeFromQueue: () => {}, clearQueue: () => {},
});

export function usePlayer() { return useContext(PlayerContext); }

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef  = useRef<HTMLAudioElement>(null);
  const queueRef  = useRef<PlayerTrack[]>([]);

  const [track,    setTrack]    = useState<PlayerTrack | null>(null);
  const [queue,    setQueueState] = useState<PlayerTrack[]>([]);
  const [playing,  setPlaying]  = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  function setQueue(q: PlayerTrack[]) {
    queueRef.current = q;
    setQueueState(q);
  }

  function startTrack(t: PlayerTrack) {
    const audio = audioRef.current;
    if (!audio) return;
    setTrack(t);
    setProgress(0);
    setDuration(0);
    audio.src = t.mediaUrl;
    audio.load();
    audio.play().catch(() => {});
  }

  const play = useCallback((newTrack: PlayerTrack) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (track?.id === newTrack.id) { audio.play().catch(() => {}); return; }
    startTrack(newTrack);
  }, [track]); // eslint-disable-line react-hooks/exhaustive-deps

  const pause  = useCallback(() => audioRef.current?.pause(), []);
  const resume = useCallback(() => audioRef.current?.play().catch(() => {}), []);
  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.paused ? audio.play().catch(() => {}) : audio.pause();
  }, []);
  const seek = useCallback((s: number) => { if (audioRef.current) audioRef.current.currentTime = s; }, []);

  const dismiss = useCallback(() => {
    const audio = audioRef.current;
    if (audio) { audio.pause(); audio.src = ''; }
    setTrack(null);
    setPlaying(false);
    setProgress(0);
    setDuration(0);
    setQueue([]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Advance to the next track in queue (called by skipNext and onEnded)
  const advanceQueue = useCallback(() => {
    const q = queueRef.current;
    if (q.length === 0) { setPlaying(false); setProgress(0); return; }
    const [next, ...rest] = q;
    setQueue(rest);
    startTrack(next);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const skipNext = useCallback(() => advanceQueue(), [advanceQueue]);

  const skipPrev = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.currentTime > 3) { audio.currentTime = 0; }
  }, []);

  const addToQueue = useCallback((t: PlayerTrack) => {
    setQueue([...queueRef.current, t]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const playNext = useCallback((t: PlayerTrack) => {
    setQueue([t, ...queueRef.current]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const removeFromQueue = useCallback((index: number) => {
    setQueue(queueRef.current.filter((_, i) => i !== index));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const clearQueue = useCallback(() => setQueue([]), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <PlayerContext.Provider value={{
      track, queue, playing, progress, duration,
      play, pause, resume, toggle, seek, dismiss,
      addToQueue, playNext, skipNext, skipPrev, removeFromQueue, clearQueue,
    }}>
      {children}
      <audio
        ref={audioRef}
        controlsList="nodownload"
        onContextMenu={(e) => e.preventDefault()}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => advanceQueue()}
        onTimeUpdate={() => { const a = audioRef.current; if (a) setProgress(a.currentTime); }}
        onLoadedMetadata={() => { const a = audioRef.current; if (a) setDuration(isFinite(a.duration) ? a.duration : 0); }}
      />
    </PlayerContext.Provider>
  );
}
