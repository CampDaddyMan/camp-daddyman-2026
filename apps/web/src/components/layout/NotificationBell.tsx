'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface NotificationItem {
  id: string;
  type: 'NEW_CONTENT' | 'NEW_LIKE' | 'NEW_COMMENT' | 'NEW_FOLLOWER';
  read: boolean;
  createdAt: string;
  actor?: { username: string; displayName?: string; avatar?: string } | null;
  content?: { id: string; title: string; type: string } | null;
}

function timeAgo(iso: string) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function notificationText(n: NotificationItem) {
  const name = n.actor?.displayName || n.actor?.username || 'Someone';
  switch (n.type) {
    case 'NEW_CONTENT':  return `${name} posted new ${n.content?.type?.toLowerCase().replace('_', ' ') ?? 'content'}: "${n.content?.title}"`;
    case 'NEW_LIKE':     return `${name} liked "${n.content?.title}"`;
    case 'NEW_COMMENT':  return `${name} commented on "${n.content?.title}"`;
    case 'NEW_FOLLOWER': return `${name} started following you`;
  }
}

function notificationHref(n: NotificationItem) {
  if (n.type === 'NEW_FOLLOWER' && n.actor) return `/creator/${n.actor.username}`;
  if (n.content) return `/watch/${n.content.id}`;
  return '/notifications';
}

const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  useEffect(() => {
    if (!VAPID_KEY || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
    setPushSupported(true);
    navigator.serviceWorker.ready.then((reg) =>
      reg.pushManager.getSubscription().then((sub) => setPushEnabled(!!sub))
    ).catch(() => {});
  }, []);

  async function togglePush() {
    if (!VAPID_KEY || pushLoading) return;
    setPushLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      if (pushEnabled) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await api.post('/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {});
          await sub.unsubscribe();
        }
        setPushEnabled(false);
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
        });
        await api.post('/push/subscribe', sub.toJSON());
        setPushEnabled(true);
      }
    } catch {
      // permission denied or subscription error — silent fail
    } finally {
      setPushLoading(false);
    }
  }

  const fetchUnread = useCallback(() => {
    api.get('/notifications/unread-count')
      .then((r) => setUnread(r.data.count))
      .catch(() => {});
  }, []);

  // Poll unread count every 30 seconds
  useEffect(() => {
    fetchUnread();
    const id = setInterval(fetchUnread, 30_000);
    return () => clearInterval(id);
  }, [fetchUnread]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleOpen() {
    if (open) { setOpen(false); return; }
    setOpen(true);
    setLoading(true);
    api.get('/notifications?limit=10')
      .then((r) => {
        setNotifications(r.data.notifications);
        setUnread(r.data.unreadCount);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  async function handleClick(n: NotificationItem) {
    setOpen(false);
    if (!n.read) {
      api.post(`/notifications/${n.id}/read`).catch(() => {});
      setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x));
      setUnread((c) => Math.max(0, c - 1));
    }
    router.push(notificationHref(n));
  }

  async function handleMarkAll() {
    await api.post('/notifications/read-all').catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleOpen}
        className="relative p-1.5 text-gray-400 hover:text-white transition-colors"
        aria-label="Notifications"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-brand-500 text-black text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 leading-none">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-9 w-80 bg-surface-800 border border-surface-600 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-700">
            <span className="text-sm font-semibold text-white">Notifications</span>
            {unread > 0 && (
              <button onClick={handleMarkAll} className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-surface-700 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-10 text-gray-500 text-sm">No notifications yet</div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left px-4 py-3 hover:bg-surface-700 transition-colors border-b border-surface-700/50 last:border-0 ${
                    !n.read ? 'bg-surface-750' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0" />}
                    <div className={!n.read ? '' : 'pl-3.5'}>
                      <p className="text-xs text-gray-200 leading-relaxed">{notificationText(n)}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {pushSupported && (
            <div className="border-t border-surface-700 px-4 py-2.5 flex items-center justify-between">
              <span className="text-xs text-gray-500">Push notifications</span>
              <button
                onClick={togglePush}
                disabled={pushLoading}
                className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
                  pushEnabled ? 'bg-brand-500' : 'bg-surface-600'
                } ${pushLoading ? 'opacity-50' : ''}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${pushEnabled ? 'translate-x-4' : ''}`} />
              </button>
            </div>
          )}

          <div className="border-t border-surface-700 px-4 py-2.5">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              View all notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
