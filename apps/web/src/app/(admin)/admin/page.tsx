'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

interface Stats {
  totalUsers: number;
  totalContent: number;
  activeSubscriptions: number;
  totalViews: number;
}

interface AdminUser {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  isAdmin: boolean;
  isCreator: boolean;
  subscription?: { plan: string; status: string } | null;
  _count: { content: number };
}

interface AdminContent {
  id: string;
  title: string;
  type: string;
  status: string;
  privacy: string;
  views: number;
  createdAt: string;
  creator: { username: string; email: string };
  _count: { likes: number; comments: number };
}

type Tab = 'stats' | 'users' | 'content';

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('stats');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [content, setContent] = useState<AdminContent[]>([]);

  useEffect(() => {
    if (!loading && (!user || !user.isAdmin)) router.push('/');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user?.isAdmin) return;
    if (tab === 'stats') api.get('/admin/stats').then((r) => setStats(r.data.stats)).catch(() => {});
    if (tab === 'users') api.get('/admin/users').then((r) => setUsers(r.data.users)).catch(() => {});
    if (tab === 'content') api.get('/admin/content').then((r) => setContent(r.data.content)).catch(() => {});
  }, [tab, user]);

  async function toggleAdmin(id: string) {
    await api.post(`/admin/users/${id}/toggle-admin`);
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, isAdmin: !u.isAdmin } : u));
  }

  async function setContentStatus(id: string, status: string) {
    await api.post(`/admin/content/${id}/status`, { status });
    setContent((prev) => prev.map((c) => c.id === id ? { ...c, status } : c));
  }

  if (loading || !user?.isAdmin) return null;

  const TABS: { key: Tab; label: string }[] = [
    { key: 'stats', label: 'Overview' },
    { key: 'users', label: 'Users' },
    { key: 'content', label: 'Content' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-white mb-8">Admin Dashboard</h1>

      <div className="flex gap-2 mb-8">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-brand-500 text-black' : 'bg-surface-700 text-gray-300 hover:bg-surface-600'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      {tab === 'stats' && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Users', value: stats.totalUsers },
            { label: 'Total Content', value: stats.totalContent },
            { label: 'Paid Subscriptions', value: stats.activeSubscriptions },
            { label: 'Total Views', value: stats.totalViews.toLocaleString() },
          ].map((s) => (
            <div key={s.label} className="bg-surface-800 rounded-xl p-5">
              <p className="text-gray-400 text-xs mb-1">{s.label}</p>
              <p className="text-3xl font-bold text-white">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Users */}
      {tab === 'users' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-surface-700">
                <th className="pb-3 pr-4">Username</th>
                <th className="pb-3 pr-4">Email</th>
                <th className="pb-3 pr-4">Plan</th>
                <th className="pb-3 pr-4">Content</th>
                <th className="pb-3">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="py-3 pr-4 text-white">{u.displayName || u.username}</td>
                  <td className="py-3 pr-4 text-gray-400">{u.email}</td>
                  <td className="py-3 pr-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${u.subscription?.plan === 'PREMIUM' ? 'bg-brand-500/20 text-brand-400' : u.subscription?.plan === 'PRO' ? 'bg-blue-500/20 text-blue-400' : 'bg-surface-700 text-gray-400'}`}>
                      {u.subscription?.plan || 'FREE'}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-gray-400">{u._count.content}</td>
                  <td className="py-3">
                    <button onClick={() => toggleAdmin(u.id)}
                      className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${u.isAdmin ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-surface-700 text-gray-400 hover:bg-surface-600'}`}>
                      {u.isAdmin ? 'Remove Admin' : 'Make Admin'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Content */}
      {tab === 'content' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-surface-700">
                <th className="pb-3 pr-4">Title</th>
                <th className="pb-3 pr-4">Creator</th>
                <th className="pb-3 pr-4">Type</th>
                <th className="pb-3 pr-4">Views</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700">
              {content.map((c) => (
                <tr key={c.id}>
                  <td className="py-3 pr-4 text-white max-w-xs truncate">{c.title}</td>
                  <td className="py-3 pr-4 text-gray-400">{c.creator.username}</td>
                  <td className="py-3 pr-4 text-gray-400">{c.type}</td>
                  <td className="py-3 pr-4 text-gray-400">{c.views.toLocaleString()}</td>
                  <td className="py-3 pr-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3">
                    {c.status === 'ACTIVE' ? (
                      <button onClick={() => setContentStatus(c.id, 'DELETED')}
                        className="text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 px-2.5 py-1 rounded-lg transition-colors">
                        Remove
                      </button>
                    ) : (
                      <button onClick={() => setContentStatus(c.id, 'ACTIVE')}
                        className="text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 px-2.5 py-1 rounded-lg transition-colors">
                        Restore
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
