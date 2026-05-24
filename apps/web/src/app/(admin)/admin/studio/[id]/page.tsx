'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface LiveStream {
  id: string;
  title: string;
  description: string | null;
  status: string;
  cfWebRtcUrl: string | null;
  cfStreamKey: string | null;
  cfStreamId: string;
}

type StudioState = 'setup' | 'connecting' | 'live' | 'error' | 'ended';

function fmt(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function StudioPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [stream, setStream]           = useState<LiveStream | null>(null);
  const [loadErr, setLoadErr]         = useState('');
  const [state, setState]             = useState<StudioState>('setup');
  const [errMsg, setErrMsg]           = useState('');
  const [elapsed, setElapsed]         = useState(0);
  const [useScreen, setUseScreen]     = useState(false);
  const [cameras, setCameras]         = useState<MediaDeviceInfo[]>([]);
  const [mics, setMics]               = useState<MediaDeviceInfo[]>([]);
  const [camId, setCamId]             = useState('');
  const [micId, setMicId]             = useState('');
  const [permDenied, setPermDenied]   = useState(false);
  const [cameraOn, setCameraOn]       = useState(true);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [connState, setConnState]     = useState('');
  const [videoKbps, setVideoKbps]     = useState(0);
  const [audioKbps, setAudioKbps]     = useState(0);
  const [videoCodec, setVideoCodec]   = useState('');

  const videoRef     = useRef<HTMLVideoElement>(null);
  const pcRef        = useRef<RTCPeerConnection | null>(null);
  const streamRef    = useRef<MediaStream | null>(null);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef     = useRef(0);
  const statsRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevBytesRef = useRef<Record<string, number>>({});
  const stateRef     = useRef<StudioState>('setup');
  stateRef.current = state;

  // Load stream details
  useEffect(() => {
    api.get(`/live/${id}`)
      .then(r => setStream(r.data.stream))
      .catch(() => setLoadErr('Stream not found'));
  }, [id]);

  // Enumerate devices — separate effect, never touches the camera stream
  useEffect(() => {
    function enumerate() {
      navigator.mediaDevices.enumerateDevices().then(devices => {
        setCameras(devices.filter(d => d.kind === 'videoinput'));
        setMics(devices.filter(d => d.kind === 'audioinput'));
      }).catch(() => {});
    }
    enumerate();
    navigator.mediaDevices.addEventListener('devicechange', enumerate);
    return () => navigator.mediaDevices.removeEventListener('devicechange', enumerate);
  }, []);

  // Acquire camera for preview — only runs when cameraOn/device changes, NOT when state changes.
  // Excluding state from deps is intentional: prevents cleanup from firing when goLive() sets
  // state to 'connecting', which would kill the camera track before WHIP can reuse it.
  useEffect(() => {
    if (!cameraOn || stateRef.current !== 'setup') return;
    let stopped = false;
    let localStream: MediaStream | null = null;

    navigator.mediaDevices.getUserMedia({
      video: camId ? { deviceId: { exact: camId } } : { width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: micId ? { deviceId: { exact: micId } } : true,
    }).then(ms => {
      if (stopped) { ms.getTracks().forEach(t => t.stop()); return; }
      localStream = ms;
      streamRef.current = ms;
      setPreviewStream(ms);
    }).catch(() => {
      if (!stopped) setPermDenied(true);
    });

    return () => {
      stopped = true;
      localStream?.getTracks().forEach(t => t.stop());
      if (streamRef.current === localStream) streamRef.current = null;
      localStream = null;
      setPreviewStream(null);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camId, micId, cameraOn]);

  // Attach preview stream to video element — runs after render so videoRef is guaranteed populated
  useEffect(() => {
    if (!videoRef.current) return;
    if (!previewStream) {
      videoRef.current.srcObject = null;
      return;
    }
    videoRef.current.srcObject = previewStream;
    videoRef.current.play().catch(() => {});
  }, [previewStream, stream]); // 'stream' dep: re-runs when API data loads and video element appears

  function startStatsPolling(pc: RTCPeerConnection) {
    prevBytesRef.current = {};
    statsRef.current = setInterval(async () => {
      if (!pc || pc.connectionState === 'closed') return;
      const stats = await pc.getStats();
      stats.forEach((s: any) => {
        if (s.type !== 'outbound-rtp') return;
        const prev = prevBytesRef.current[s.id] ?? s.bytesSent;
        const delta = s.bytesSent - prev;
        const kbps = Math.round((delta * 8) / 2000); // 2s interval → kbps
        if (s.kind === 'video') {
          setVideoKbps(kbps);
          // Resolve codec name from stats
          const codecStat = stats.get(s.codecId);
          if (codecStat?.mimeType) setVideoCodec(codecStat.mimeType.replace('video/', ''));
        }
        if (s.kind === 'audio') setAudioKbps(kbps);
        prevBytesRef.current[s.id] = s.bytesSent;
      });
    }, 2000);
  }

  function cleanup() {
    timerRef.current && clearInterval(timerRef.current);
    timerRef.current = null;
    statsRef.current && clearInterval(statsRef.current);
    statsRef.current = null;
    prevBytesRef.current = {};
    pcRef.current?.close();
    pcRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setPreviewStream(null);
    setConnState('');
    setVideoKbps(0);
    setAudioKbps(0);
    setVideoCodec('');
  }

  // Stop all tracks if the tab is closed or refreshed directly (not via navigation)
  useEffect(() => {
    function handleUnload() {
      streamRef.current?.getTracks().forEach(t => t.stop());
      pcRef.current?.close();
    }
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  useEffect(() => () => cleanup(), []);

  async function goLive() {
    if (!stream?.cfWebRtcUrl) {
      setErrMsg('No WHIP URL — click "Refresh credentials" on the admin panel first.');
      return;
    }
    setErrMsg('');
    setState('connecting');

    try {
      let mediaStream: MediaStream;

      if (useScreen) {
        const screen = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: { ideal: 30 } },
          audio: true,
        });
        // Overlay mic audio if available
        const mic = await navigator.mediaDevices.getUserMedia({ audio: micId ? { deviceId: { exact: micId } } : true, video: false }).catch(() => null);
        mediaStream = new MediaStream([
          ...screen.getVideoTracks(),
          ...(mic ? mic.getAudioTracks() : screen.getAudioTracks()),
        ]);
      } else if (streamRef.current && streamRef.current.getVideoTracks()[0]?.readyState === 'live') {
        // Reuse the preview stream — camera is already live, no need to re-acquire.
        // Re-acquiring would release and re-lock the camera, causing a visible light-off flash.
        mediaStream = streamRef.current;
      } else {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: camId
            ? { deviceId: { exact: camId }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }
            : { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
          audio: micId ? { deviceId: { exact: micId } } : true,
        });
      }

      // Verify camera is actually live before committing to a WHIP session
      const vTrack = mediaStream.getVideoTracks()[0];
      if (!useScreen && (!vTrack || vTrack.readyState !== 'live')) {
        mediaStream.getTracks().forEach(t => t.stop());
        throw new Error('Camera not ready — close any other app using the camera, wait a few seconds, then try again.');
      }

      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
      }

      // Build PeerConnection — multiple STUN servers for better candidate gathering
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.cloudflare.com:3478' },
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
        bundlePolicy: 'max-bundle',
        iceTransportPolicy: 'all',
      });
      pcRef.current = pc;

      pc.addEventListener('iceconnectionstatechange', () => setConnState(pc.iceConnectionState));
      pc.addEventListener('connectionstatechange', () => setConnState(pc.connectionState));

      // Add tracks — force H.264 Constrained Baseline (profile 42) for Cloudflare HLS compatibility
      for (const track of mediaStream.getTracks()) {
        const transceiver = pc.addTransceiver(track, { direction: 'sendonly' });
        if (track.kind === 'video') {
          const caps = RTCRtpSender.getCapabilities('video');
          if (caps) {
            console.log('[Studio] Available video codecs:', caps.codecs.map(c => `${c.mimeType} ${c.sdpFmtpLine || ''}`));
            // Prefer H.264 Constrained Baseline (profile-level-id=42xxxx) — most compatible with CF
            const h264cb = caps.codecs.filter(c =>
              c.mimeType.toLowerCase() === 'video/h264' &&
              /profile-level-id=42/i.test(c.sdpFmtpLine || '')
            );
            // Fallback: any H.264
            const h264any = caps.codecs.filter(c => c.mimeType.toLowerCase() === 'video/h264');
            // Last resort: VP8 (CF supports it)
            const vp8 = caps.codecs.filter(c => c.mimeType.toLowerCase() === 'video/vp8');
            const preferred = h264cb.length ? h264cb : h264any.length ? h264any : vp8;
            console.log('[Studio] Using video codec:', preferred[0]?.mimeType, preferred[0]?.sdpFmtpLine);
            if (preferred.length) transceiver.setCodecPreferences(preferred);
          }
        }
      }

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Wait for ICE gathering (max 15s) — longer window so SRFLX candidates via STUN are ready
      setConnState('gathering');
      await new Promise<void>(resolve => {
        if (pc.iceGatheringState === 'complete') { resolve(); return; }
        const t = setTimeout(resolve, 15000);
        pc.addEventListener('icegatheringstatechange', () => {
          if (pc.iceGatheringState === 'complete') { clearTimeout(t); resolve(); }
        });
      });

      // WHIP handshake — POST full SDP offer (all candidates gathered) to Cloudflare
      setConnState('whip-handshake');
      const whipHeaders: Record<string, string> = { 'Content-Type': 'application/sdp' };
      // CF gives RTMPS and WebRTC different auth tokens for the same live input.
      // cfWebRtcUrl from the CF API already has the WebRTC token embedded in the path.
      // Only fall back to Bearer (RTMPS stream key) when the URL is a plain UID-only fallback.
      const whipUrlIsUidOnly = stream.cfStreamId && stream.cfWebRtcUrl.endsWith(`/${stream.cfStreamId}/webRTC/publish`);
      if (whipUrlIsUidOnly && stream.cfStreamKey) {
        whipHeaders['Authorization'] = `Bearer ${stream.cfStreamKey}`;
      }

      console.log('[Studio] WHIP POST →', stream.cfWebRtcUrl);
      console.log('[Studio] Bearer header sent:', !!whipHeaders['Authorization']);
      console.log('[Studio] SDP offer (first 300 chars):', pc.localDescription?.sdp?.slice(0, 300));

      const resp = await fetch(stream.cfWebRtcUrl, {
        method: 'POST',
        headers: whipHeaders,
        body: pc.localDescription?.sdp,
      });

      console.log('[Studio] WHIP response status:', resp.status);
      console.log('[Studio] WHIP response headers:', Object.fromEntries(resp.headers.entries()));

      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error(`WHIP handshake failed (${resp.status})${text ? ': ' + text.slice(0, 120) : ''}`);
      }

      const sdpAnswer = await resp.text();
      console.log('[Studio] CF WHIP SDP answer:\n', sdpAnswer);
      await pc.setRemoteDescription({ type: 'answer', sdp: sdpAnswer });

      // Hard-cap video bitrate — Firefox ignores Cloudflare's REMB signals and sends 4+ Mbps
      // unconstrained, which overwhelms CF's WebRTC→HLS transcoder. Force 2 Mbps via setParameters.
      const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');
      if (videoSender) {
        try {
          const params = videoSender.getParameters();
          if (!params.encodings.length) params.encodings = [{}];
          params.encodings[0].maxBitrate = 2_000_000;
          await videoSender.setParameters(params);
          console.log('[Studio] Video bitrate hard-capped at 2 Mbps');
        } catch (e) {
          console.warn('[Studio] setParameters failed:', e);
        }
      }


      // Wait for ICE to actually connect — this is what causes media to flow to Cloudflare
      setConnState('ice-checking');
      await new Promise<void>((resolve, reject) => {
        if (pc.connectionState === 'connected') { resolve(); return; }
        const timeout = setTimeout(() => {
          reject(new Error(
            'Connection timed out — Cloudflare didn\'t receive video. ' +
            'If you\'re on VPN or a corporate network, try your phone\'s hotspot.'
          ));
        }, 25000);
        pc.addEventListener('connectionstatechange', () => {
          if (pc.connectionState === 'connected') { clearTimeout(timeout); resolve(); }
          if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
            clearTimeout(timeout);
            reject(new Error(
              'ICE connection failed. Try: disable VPN, switch to phone hotspot, or use Chrome.'
            ));
          }
        });
      });

      // Mark stream as live in DB — only after ICE confirms media is flowing
      await api.patch(`/live/${id}`, { status: 'live' }).catch((err: any) => {
        if (err?.response?.status === 401) {
          setErrMsg('Session expired — open Admin in a new tab, log back in, then return here. Stream is still live on Cloudflare.');
        }
      });

      setState('live');
      startRef.current = Date.now();
      timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
      startStatsPolling(pc);

    } catch (err: any) {
      cleanup();
      setErrMsg(err.message || 'Failed to start stream');
      setState('error');
    }
  }

  async function endStream() {
    cleanup();
    setCameraOn(false);
    await api.patch(`/live/${id}`, { status: 'ended' }).catch(() => {});
    setState('ended');
    setElapsed(0);
  }

  if (loadErr) return (
    <div className="min-h-screen bg-[#0d0d14] flex items-center justify-center">
      <div className="text-center">
        <p className="text-red-400 mb-4">{loadErr}</p>
        <button onClick={() => router.push('/admin')} className="text-brand-400 hover:underline text-sm">← Back to Admin</button>
      </div>
    </div>
  );

  const isLive = state === 'live';

  return (
    <div className="min-h-screen bg-[#0d0d14] flex flex-col">

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-surface-700 bg-surface-800">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin')}
            className="text-gray-500 hover:text-white text-sm transition-colors"
          >
            ← Admin
          </button>
          <div>
            <h1 className="text-white font-bold text-sm leading-tight">{stream?.title ?? 'Loading…'}</h1>
            <p className="text-gray-600 text-xs">Browser Studio</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isLive && (
            <div className="flex items-center gap-2 mr-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-400 text-sm font-bold tracking-wide">LIVE</span>
              <span className="text-gray-400 text-sm font-mono">{fmt(elapsed)}</span>
            </div>
          )}

          {(state === 'setup' || state === 'error') && (
            <button
              onClick={goLive}
              disabled={!stream?.cfWebRtcUrl}
              className="bg-brand-500 hover:bg-brand-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-sm px-5 py-2 rounded-lg transition-colors"
            >
              Go Live
            </button>
          )}

          {state === 'connecting' && (
            <button disabled className="bg-surface-600 text-gray-400 font-bold text-sm px-5 py-2 rounded-lg flex items-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              Connecting…
            </button>
          )}

          {isLive && (
            <button
              onClick={endStream}
              className="bg-red-700 hover:bg-red-600 text-white font-bold text-sm px-5 py-2 rounded-lg transition-colors"
            >
              End Stream
            </button>
          )}

          {state === 'ended' && (
            <span className="text-gray-500 text-sm">Stream ended</span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 gap-5 p-6 overflow-auto">

        {/* Video */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="relative bg-black rounded-2xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            {permDenied && state === 'setup' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-3">
                <p className="text-gray-400 text-sm text-center px-6">Camera access denied.<br/>Allow camera in your browser settings and reload.</p>
              </div>
            )}
            {state === 'setup' && !permDenied && !cameraOn && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <p className="text-gray-600 text-sm">Camera off</p>
                <button
                  onClick={() => setCameraOn(true)}
                  className="px-5 py-2 bg-surface-700 hover:bg-surface-600 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  Start Preview
                </button>
              </div>
            )}
            {state === 'setup' && !permDenied && cameraOn && !previewStream && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-gray-700 text-sm">Starting preview…</p>
              </div>
            )}
            {isLive && (
              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-600/90 backdrop-blur-sm px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                <span className="text-white text-xs font-bold tracking-widest">LIVE</span>
              </div>
            )}
          </div>

          {state === 'ended' && (
            <div className="mt-6 text-center">
              <p className="text-gray-400 text-sm mb-4">Stream has ended.</p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => { setElapsed(0); setState('setup'); }}
                  className="px-4 py-2 bg-surface-700 hover:bg-surface-600 text-white text-sm rounded-lg transition-colors"
                >
                  New Stream
                </button>
                {stream && <a href={`/live/${stream.id}`} target="_blank" rel="noopener" className="px-4 py-2 bg-brand-500 hover:bg-brand-400 text-black text-sm font-semibold rounded-lg transition-colors">View Page ↗</a>}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-64 flex-shrink-0 flex flex-col gap-4">

          {/* Error */}
          {errMsg && (
            <div className="bg-red-950/60 border border-red-800 rounded-xl p-3">
              <p className="text-red-400 text-xs leading-relaxed">{errMsg}</p>
            </div>
          )}

          {/* No WHIP URL warning */}
          {stream && !stream.cfWebRtcUrl && (
            <div className="bg-yellow-950/40 border border-yellow-800/50 rounded-xl p-3">
              <p className="text-yellow-400 text-xs leading-relaxed">
                No WHIP URL found. Go to the admin panel → find this stream → click <strong>Refresh credentials</strong>, then reload this page.
              </p>
            </div>
          )}

          {/* Source */}
          <div className="bg-surface-800 border border-surface-700 rounded-xl p-4">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">Source</p>
            <div className="flex gap-2">
              <button
                onClick={() => setUseScreen(false)}
                disabled={isLive}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 ${!useScreen ? 'bg-brand-500 text-black' : 'bg-surface-700 text-gray-400 hover:text-white'}`}
              >
                Camera
              </button>
              <button
                onClick={() => setUseScreen(true)}
                disabled={isLive}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 ${useScreen ? 'bg-brand-500 text-black' : 'bg-surface-700 text-gray-400 hover:text-white'}`}
              >
                Screen
              </button>
            </div>
          </div>

          {/* Devices — only camera mode */}
          {!useScreen && (
            <div className="bg-surface-800 border border-surface-700 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Devices</p>
                {!isLive && (
                  <button
                    onClick={() => setCameraOn(v => !v)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-colors ${cameraOn ? 'bg-green-800/60 text-green-300 hover:bg-red-800/60 hover:text-red-300' : 'bg-surface-700 text-gray-400 hover:text-white'}`}
                  >
                    {cameraOn ? 'Camera On' : 'Camera Off'}
                  </button>
                )}
              </div>

              {cameras.length > 0 && (
                <div>
                  <label className="text-gray-600 text-xs mb-1 block">Camera</label>
                  <select
                    value={camId}
                    onChange={e => setCamId(e.target.value)}
                    disabled={isLive}
                    className="w-full bg-surface-700 text-white text-xs rounded-lg px-2 py-2 border border-surface-600 focus:outline-none disabled:opacity-50"
                  >
                    <option value="">Default</option>
                    {cameras.map(c => (
                      <option key={c.deviceId} value={c.deviceId}>
                        {c.label || `Camera ${c.deviceId.slice(0, 8)}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {mics.length > 0 && (
                <div>
                  <label className="text-gray-600 text-xs mb-1 block">Microphone</label>
                  <select
                    value={micId}
                    onChange={e => setMicId(e.target.value)}
                    disabled={isLive}
                    className="w-full bg-surface-700 text-white text-xs rounded-lg px-2 py-2 border border-surface-600 focus:outline-none disabled:opacity-50"
                  >
                    <option value="">Default</option>
                    {mics.map(m => (
                      <option key={m.deviceId} value={m.deviceId}>
                        {m.label || `Mic ${m.deviceId.slice(0, 8)}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {cameras.length === 0 && mics.length === 0 && !permDenied && (
                <p className="text-gray-600 text-xs">Allow camera access to select devices.</p>
              )}
            </div>
          )}

          {/* Stream info */}
          <div className="bg-surface-800 border border-surface-700 rounded-xl p-4 flex flex-col gap-2">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Connection</p>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                isLive       ? 'bg-green-400 animate-pulse' :
                state === 'connecting' ? 'bg-yellow-400 animate-pulse' :
                state === 'error'      ? 'bg-red-500' :
                state === 'ended'      ? 'bg-gray-600' :
                'bg-gray-600'
              }`} />
              <span className="text-gray-400 text-xs capitalize">
                {isLive ? 'Connected' : state === 'connecting' ? 'Connecting…' : state === 'error' ? 'Failed' : state === 'ended' ? 'Ended' : 'Ready'}
              </span>
            </div>
            {state === 'connecting' && connState && (
              <p className="text-gray-600 text-xs font-mono">{connState}</p>
            )}
            {isLive && (
              <>
                <p className="text-gray-600 text-xs">Duration: <span className="text-gray-400 font-mono">{fmt(elapsed)}</span></p>
                <p className="text-gray-600 text-xs">
                  Video: <span className={`font-mono ${videoKbps > 0 ? 'text-green-400' : 'text-red-400'}`}>{videoKbps} kbps</span>
                  {videoCodec && <span className="text-gray-600 ml-1">({videoCodec})</span>}
                </p>
                <p className="text-gray-600 text-xs">
                  Audio: <span className={`font-mono ${audioKbps > 0 ? 'text-green-400' : 'text-yellow-400'}`}>{audioKbps} kbps</span>
                </p>
              </>
            )}
            {stream && <a href={`/live/${stream.id}`} target="_blank" rel="noopener" className="text-brand-400 text-xs hover:underline mt-1">View public stream page ↗</a>}
          </div>

          {/* Screen share tip */}
          {useScreen && state === 'setup' && (
            <div className="bg-surface-800 border border-surface-700 rounded-xl p-4">
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Screen Sharing</p>
              <p className="text-gray-600 text-xs leading-relaxed">
                When you click <strong className="text-gray-400">Go Live</strong>, your browser will ask what to share — a tab, a window, or your full screen. Your mic audio will be mixed in automatically.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
