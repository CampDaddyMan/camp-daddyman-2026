'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

const AUDIO_TYPES = ['MUSIC', 'PODCAST', 'SPOKEN_WORD', 'DADDYMAN_ISMS'];

interface EmbedContent {
  id: string; title: string; type: string; thumbnailUrl: string | null;
  hlsUrl: string | null; mediaUrl: string | null; duration: number | null;
  creator: { username: string; displayName: string | null };
}

function fmt(s: number) {
  const m = Math.floor(s / 60); const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function EmbedPage() {
  const { id } = useParams<{ id: string }>();
  const [content, setContent] = useState<EmbedContent | null>(null);
  const [error, setError]     = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    api.get(`/content/${id}`)
      .then((r) => setContent(r.data.content))
      .catch(() => setError(true));
  }, [id]);

  useEffect(() => {
    if (!content?.hlsUrl) return;
    let hls: any;
    async function init() {
      const Hls = (await import('hls.js')).default;
      if (!videoRef.current) return;
      if (Hls.isSupported()) {
        hls = new Hls({ enableWorker: true });
        hls.loadSource(content!.hlsUrl!);
        hls.attachMedia(videoRef.current);
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        videoRef.current.src = content!.hlsUrl!;
      }
    }
    init();
    return () => hls?.destroy();
  }, [content?.hlsUrl]);

  if (error) return (
    <div className="flex h-full min-h-[200px] items-center justify-center bg-black text-gray-400 text-sm">
      Content unavailable
    </div>
  );

  if (!content) return (
    <div className="flex h-full min-h-[200px] items-center justify-center bg-black">
      <div className="w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const isAudio = AUDIO_TYPES.includes(content.type);
  const isVideo = content.type === 'FILM' || content.hlsUrl;
  const creatorName = content.creator.displayName || content.creator.username;

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden" style={{ minHeight: 0 }}>

      {/* Player area */}
      <div className="relative flex-1 bg-black overflow-hidden">

        {/* Video */}
        {isVideo && (
          content.hlsUrl ? (
            <video
              ref={videoRef}
              controls
              controlsList="nodownload noremoteplayback"
              disablePictureInPicture
              playsInline
              className="w-full h-full object-contain"
              onContextMenu={(e) => e.preventDefault()}
            />
          ) : content.mediaUrl ? (
            <video
              src={content.mediaUrl}
              controls
              controlsList="nodownload noremoteplayback"
              disablePictureInPicture
              playsInline
              className="w-full h-full object-contain"
              onContextMenu={(e) => e.preventDefault()}
            />
          ) : null
        )}

        {/* Audio */}
        {isAudio && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-surface-900 px-6">
            {content.thumbnailUrl ? (
              <img src={content.thumbnailUrl} alt={content.title} className="w-28 h-28 rounded-2xl object-cover shadow-2xl" />
            ) : (
              <div className="text-5xl">🎵</div>
            )}
            <div className="text-center">
              <p className="text-white font-semibold text-sm line-clamp-1">{content.title}</p>
              <p className="text-gray-400 text-xs mt-0.5">{creatorName}</p>
            </div>

            <button
              onClick={() => {
                if (!audioRef.current) return;
                if (playing) { audioRef.current.pause(); setPlaying(false); }
                else { audioRef.current.play(); setPlaying(true); }
              }}
              className="w-12 h-12 rounded-full bg-brand-500 hover:bg-brand-400 text-black flex items-center justify-center text-lg font-bold transition-colors"
            >
              {playing ? '❚❚' : '▶'}
            </button>

            {duration > 0 && (
              <div className="w-full max-w-xs flex items-center gap-2 text-xs text-gray-500">
                <span className="w-8 text-right tabular-nums">{fmt(progress)}</span>
                <input type="range" min={0} max={duration} step={1} value={progress}
                  onChange={(e) => { if (audioRef.current) audioRef.current.currentTime = Number(e.target.value); }}
                  className="flex-1 accent-brand-500 h-1 cursor-pointer" />
                <span className="w-8 tabular-nums">{fmt(duration)}</span>
              </div>
            )}

            {content.mediaUrl && (
              <audio
                ref={audioRef}
                src={content.mediaUrl}
                onTimeUpdate={() => setProgress(audioRef.current?.currentTime ?? 0)}
                onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
                onEnded={() => setPlaying(false)}
              />
            )}
          </div>
        )}

        {/* Book */}
        {content.type === 'BOOK' && content.mediaUrl && (
          <iframe src={content.mediaUrl} className="absolute inset-0 w-full h-full border-0" title={content.title} />
        )}
      </div>

      {/* Footer bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-surface-900 border-t border-surface-700 flex-shrink-0">
        <div className="min-w-0 flex-1">
          <p className="text-white text-xs font-semibold truncate">{content.title}</p>
          <p className="text-gray-500 text-[10px] truncate">{creatorName}</p>
        </div>
        <Link
          href={`/watch/${content.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 ml-3 flex items-center gap-1 text-[10px] text-brand-400 hover:text-brand-300 font-semibold transition-colors"
        >
          <span className="w-4 h-4 rounded overflow-hidden inline-block">
            <img src="/CAMPDADDYMAN_GOLD_MEMBERSHIP_LOGO-V4.png" alt="" className="w-full h-full object-cover" />
          </span>
          Camp DaddyMan ↗
        </Link>
      </div>
    </div>
  );
}
