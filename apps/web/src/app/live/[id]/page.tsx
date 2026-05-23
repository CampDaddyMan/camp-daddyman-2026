'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

interface LiveStreamDetail {
  id: string;
  title: string;
  description: string | null;
  status: string;
  thumbnailUrl: string | null;
  cfPlaybackUrl: string;
  cfStreamId: string;
  scheduledAt: string | null;
  startedAt: string | null;
  creator: { username: string; displayName: string | null; avatar: string | null };
}

export default function LiveWatchPage() {
  const { id } = useParams<{ id: string }>();
  const [stream, setStream] = useState<LiveStreamDetail | null>(null);
  const [error, setError] = useState('');
  const [playerState, setPlayerState] = useState<'idle' | 'buffering' | 'playing' | 'error'>('idle');
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStream = useCallback(() => {
    return api.get(`/live/${id}`)
      .then((r) => setStream(r.data.stream))
      .catch(() => setError('Stream not found'));
  }, [id]);

  useEffect(() => {
    fetchStream();
  }, [fetchStream]);

  // Poll every 5s while stream hasn't ended — picks up status changes without refreshing
  useEffect(() => {
    if (!stream || stream.status === 'ended') return;
    pollRef.current = setInterval(fetchStream, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [stream?.status, fetchStream]);

  // HLS player — re-runs when stream goes live
  useEffect(() => {
    if (!stream?.cfPlaybackUrl || stream.status !== 'live') return;

    const playbackUrl = stream.cfPlaybackUrl;
    let cancelled = false;

    setPlayerState('buffering');

    async function init() {
      const Hls = (await import('hls.js')).default;
      if (cancelled || !videoRef.current) return;

      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          manifestLoadingMaxRetry: 6,
          manifestLoadingRetryDelay: 2000,
          manifestLoadingMaxRetryTimeout: 8000,
          levelLoadingMaxRetry: 6,
          levelLoadingRetryDelay: 2000,
        });
        hlsRef.current = hls;

        hls.loadSource(playbackUrl);
        hls.attachMedia(videoRef.current);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (cancelled) return;
          setPlayerState('playing');
          videoRef.current?.play().catch(() => {});
        });

        hls.on(Hls.Events.ERROR, (_: any, data: any) => {
          if (cancelled || !data.fatal) return;
          // Fatal error — destroy and fully reinit after 4s (startLoad won't recover a dead instance)
          setPlayerState('error');
          hls.destroy();
          hlsRef.current = null;
          setTimeout(() => {
            if (!cancelled) {
              setPlayerState('buffering');
              init();
            }
          }, 4000);
        });
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS (Safari / iOS)
        videoRef.current.src = playbackUrl;
        videoRef.current.play().catch(() => {});
        setPlayerState('playing');
      }
    }

    init();

    return () => {
      cancelled = true;
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
      setPlayerState('idle');
    };
  }, [stream?.cfStreamId, stream?.status]);

  if (error) return (
    <div className="text-center py-20 text-gray-400">
      <p className="text-5xl mb-4">📡</p>
      <p>{error}</p>
      <Link href="/live" className="text-brand-400 hover:underline text-sm mt-4 inline-block">← Back to Live</Link>
    </div>
  );

  if (!stream) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="w-8 h-8 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const creator = stream.creator.displayName || stream.creator.username;
  const isLive = stream.status === 'live';

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {/* Player */}
          <div className="relative bg-black rounded-2xl overflow-hidden aspect-video mb-5">
            {isLive ? (
              <>
                <video
                  ref={videoRef}
                  controls
                  controlsList="nodownload noremoteplayback"
                  disablePictureInPicture
                  playsInline
                  className="w-full h-full object-contain"
                  onContextMenu={(e) => e.preventDefault()}
                />
                {playerState === 'buffering' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-3 pointer-events-none">
                    <div className="w-8 h-8 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-400 text-sm">Connecting to stream...</p>
                  </div>
                )}
                {playerState === 'error' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-3 pointer-events-none">
                    <span className="text-4xl">📡</span>
                    <p className="text-gray-400 text-sm text-center px-6">
                      Stream is starting up — retrying automatically
                    </p>
                    <div className="w-5 h-5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </>
            ) : stream.thumbnailUrl ? (
              <img src={stream.thumbnailUrl} alt={stream.title} className="w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 gap-3">
                <span className="text-5xl">📡</span>
                <p className="text-sm">
                  {stream.status === 'idle' && stream.scheduledAt
                    ? `Starts ${new Date(stream.scheduledAt).toLocaleString()}`
                    : stream.status === 'ended'
                    ? 'Stream has ended'
                    : 'Stream not yet started'}
                </p>
                {stream.status !== 'ended' && (
                  <p className="text-xs text-gray-600">This page updates automatically</p>
                )}
              </div>
            )}
            {isLive && (
              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                LIVE
              </div>
            )}
          </div>

          {/* Meta */}
          <h1 className="text-xl font-bold text-white mb-1">{stream.title}</h1>
          <Link href={`/creator/${stream.creator.username}`} className="text-brand-400 hover:underline text-sm">
            {creator}
          </Link>
          {stream.description && (
            <p className="text-gray-400 text-sm mt-3 leading-relaxed">{stream.description}</p>
          )}
          {!isLive && stream.scheduledAt && stream.status === 'idle' && (
            <div className="mt-4 p-4 bg-surface-800 border border-surface-700 rounded-xl text-sm text-gray-300">
              <p className="font-semibold text-white mb-1">Stream scheduled for:</p>
              <p>{new Date(stream.scheduledAt).toLocaleString()}</p>
            </div>
          )}
        </div>

        <div>
          <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5">
            <p className="text-sm font-semibold text-white mb-3">About the stream</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-surface-700 overflow-hidden flex-shrink-0">
                {stream.creator.avatar
                  ? <img src={stream.creator.avatar} alt={creator} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-lg">👤</div>
                }
              </div>
              <div>
                <Link href={`/creator/${stream.creator.username}`} className="text-white text-sm font-medium hover:text-brand-400 transition-colors">{creator}</Link>
                <p className="text-gray-500 text-xs">@{stream.creator.username}</p>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <Link href="/live" className="text-sm text-gray-500 hover:text-brand-400 transition-colors">← All streams</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
