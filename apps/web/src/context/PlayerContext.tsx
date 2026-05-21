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
  playing: boolean;
  progress: number;
  duration: number;
  play: (track: PlayerTrack) => void;
  pause: () => void;
  resume: () => void;
  toggle: () => void;
  seek: (seconds: number) => void;
  dismiss: () => void;
}

const PlayerContext = createContext<PlayerContextValue>({
  track: null, playing: false, progress: 0, duration: 0,
  play: () => {}, pause: () => {}, resume: () => {},
  toggle: () => {}, seek: () => {}, dismiss: () => {},
});

export function usePlayer() { return useContext(PlayerContext); }

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [track, setTrack]       = useState<PlayerTrack | null>(null);
  const [playing, setPlaying]   = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const play = useCallback((newTrack: PlayerTrack) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (track?.id === newTrack.id) {
      audio.play().catch(() => {});
      return;
    }
    setTrack(newTrack);
    setProgress(0);
    setDuration(0);
    audio.src = newTrack.mediaUrl;
    audio.load();
    audio.play().catch(() => {});
  }, [track]);

  const pause   = useCallback(() => audioRef.current?.pause(), []);
  const resume  = useCallback(() => audioRef.current?.play().catch(() => {}), []);
  const toggle  = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.paused ? audio.play().catch(() => {}) : audio.pause();
  }, []);
  const seek    = useCallback((s: number) => { if (audioRef.current) audioRef.current.currentTime = s; }, []);
  const dismiss = useCallback(() => {
    const audio = audioRef.current;
    if (audio) { audio.pause(); audio.src = ''; }
    setTrack(null);
    setPlaying(false);
    setProgress(0);
    setDuration(0);
  }, []);

  return (
    <PlayerContext.Provider value={{ track, playing, progress, duration, play, pause, resume, toggle, seek, dismiss }}>
      {children}
      {/* Single persistent audio element — lives outside any page, survives navigation */}
      <audio
        ref={audioRef}
        controlsList="nodownload"
        onContextMenu={(e) => e.preventDefault()}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setProgress(0); }}
        onTimeUpdate={() => { const a = audioRef.current; if (a) setProgress(a.currentTime); }}
        onLoadedMetadata={() => { const a = audioRef.current; if (a) setDuration(isFinite(a.duration) ? a.duration : 0); }}
      />
    </PlayerContext.Provider>
  );
}
