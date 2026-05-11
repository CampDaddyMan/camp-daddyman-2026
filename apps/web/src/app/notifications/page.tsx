'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface NotificationItem {
  id: string;
  type: 'NEW_CONTENT' | 'NEW_LIKE' | 'NEW_COMMENT' | 'NEW_FOLLOWER';
  read: boolean;
  createdAt: string;
  actor?: { username: string; displayName?: string } | null;
  content?: { id: string; title: string; type: string } | null;
}

const TYPE_ICON: Record<NotificationItem['type'], string> = {
  NEW_CONTENT:  '🎵',
  NEW_LIKE:     '👍',
  NEW_COMMENT:  '💬',
  NEW_FOLLOWER: '👤',
};

function timeAgo(iso: string) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)} min ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)} hr ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function notificationText(n: NotificationItem) {
  const name = n.actor?.displayName || n.actor?.username || 'Someone';
  switch (n.type) {
    case 'NEW_CONTENT':  return <><strong className="text-white">{name}</strong> posted new {n.content?.type?.toLowerCase().replace('_', ' ')}: <em className="text-gray-200">"{n.content?.title}"</em></>;
    case 'NEW_LIKE':     return <><strong className="text-white">{name}</strong> liked <em className="text-gray-200">"{n.content?.title}"</em></>;
    case 'NEW_COMMENT':  return <><strong className="text-white">{name}</strong> commented on <em className="text-gray-200">"{n.content?.title}"</em></>;
    case 'NEW_FOLLOWER': return <><strong className="text-white">{name}</strong> started following you</>;
  }
}

function notificationHref(n: NotificationItem) {
  if (n.type === 'NEW_FOLLOWER' && n.actor) return `/creator/${n.actor.username}`;
  if (n.content) return `/watch/${n.content.id}`;
  return '#';
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadPage(1);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  function loadPage(p: number) {
    setLoading(true);
    api.get(`/notifications?page=${p}&limit=20`)
      .then((r) => {
        setNotifications((prev) => p === 1 ? r.data.notifications : [...prev, ...r.data.notifications]);
        setUnread(r.data.unreadCount);
        setHasMore(r.data.notifications.length === 20);
        setPage(p);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  async function handleClick(n: NotificationItem) {
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

  if (!user) return (
    <div className="text-center py-20 text-gray-400">Sign in to see your notifications.</div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          {unread > 0 && <p className="text-sm text-gray-400 mt-0.5">{unread} unread</p>}
        </div>
        {unread > 0 && (
          <button onClick={handleMarkAll} className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            Mark all as read
          </button>
        )}
      </div>

      {loading && notifications.length === 0 ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 bg-surface-700 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-4">🔔</p>
          <p className="text-gray-400">No notifications yet</p>
          <p className="text-gray-500 text-sm mt-1">When people like, comment, or follow you — it'll show up here</p>
        </div>
      ) : (
        <>
          <div className="space-y-1">
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`w-full text-left flex items-start gap-4 px-4 py-4 rounded-xl transition-colors hover:bg-surface-700 ${
                  !n.read ? 'bg-surface-800 border border-surface-600' : 'bg-surface-900'
                }`}
              >
                <span className="text-2xl flex-shrink-0 mt-0.5">{TYPE_ICON[n.type]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-300 leading-relaxed">{notificationText(n)}</p>
                  <p className="text-xs text-gray-500 mt-1">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.read && <span className="w-2 h-2 rounded-full bg-brand-400 flex-shrink-0 mt-2" />}
              </button>
            ))}
          </div>

          {hasMore && (
            <button
              onClick={() => loadPage(page + 1)}
              disabled={loading}
              className="w-full mt-6 py-3 text-sm text-gray-400 hover:text-white border border-surface-600 rounded-xl transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Load more'}
            </button>
          )}
        </>
      )}
    </div>
  );
}
