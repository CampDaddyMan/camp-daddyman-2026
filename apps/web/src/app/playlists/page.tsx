'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

interface Playlist {
  id: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
  isPublic: boolean;
  createdAt: string;
  _count: { items: number };
}

export default function PlaylistsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading]     = useState(true);
  const [creating, setCreating]   = useState(false);
  const [newName, setNewName]     = useState('');
  const [showForm, setShowForm]   = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    api.get('/playlists')
      .then((r) => setPlaylists(r.data.playlists))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post('/playlists', { name: newName.trim() });
      setPlaylists((prev) => [data.playlist, ...prev]);
      setNewName('');
      setShowForm(false);
    } catch {}
    finally { setCreating(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this playlist?')) return;
    await api.delete(`/playlists/${id}`);
    setPlaylists((prev) => prev.filter((p) => p.id !== id));
  }

  if (authLoading || !user) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">My Playlists</h1>
          {playlists.length > 0 && (
            <p className="text-gray-500 text-sm mt-0.5">{playlists.length} playlist{playlists.length !== 1 ? 's' : ''}</p>
          )}
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="px-4 py-2 bg-brand-500 hover:bg-brand-400 text-black font-bold rounded-xl text-sm transition-colors"
        >
          + New Playlist
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-surface-800 border border-surface-700 rounded-2xl p-5 mb-6 flex gap-3">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Playlist name"
            maxLength={80}
            className="flex-1 bg-surface-700 border border-surface-600 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-brand-500"
          />
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="px-5 py-2.5 bg-brand-500 hover:bg-brand-400 text-black font-bold rounded-xl text-sm disabled:opacity-50 transition-colors"
          >
            {creating ? '...' : 'Create'}
          </button>
          <button
            type="button"
            onClick={() => { setShowForm(false); setNewName(''); }}
            className="px-4 py-2.5 text-gray-400 hover:text-white text-sm transition-colors"
          >
            Cancel
          </button>
        </form>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-surface-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : playlists.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">🎵</p>
          <p className="text-white font-semibold text-lg mb-2">No playlists yet</p>
          <p className="text-gray-500 text-sm">Create one and start adding tracks.</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-block mt-6 bg-brand-500 hover:bg-brand-400 text-black font-bold px-6 py-3 rounded-xl text-sm transition-colors"
          >
            + Create Your First Playlist
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {playlists.map((p) => (
            <div key={p.id} className="flex items-center gap-4 bg-surface-800 border border-surface-700 hover:border-surface-500 rounded-2xl px-4 py-4 transition-colors group">
              <Link href={`/playlists/${p.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-14 h-14 rounded-xl bg-surface-700 flex-shrink-0 flex items-center justify-center text-2xl overflow-hidden">
                  {p.coverUrl
                    ? <img src={p.coverUrl} alt={p.name} className="w-full h-full object-cover" />
                    : '🎵'}
                </div>
                <div className="min-w-0">
                  <p className="text-white font-semibold text-sm truncate group-hover:text-brand-400 transition-colors">{p.name}</p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {p._count.items} track{p._count.items !== 1 ? 's' : ''}
                    {p.isPublic && <span className="ml-2 text-brand-400">· Public</span>}
                  </p>
                  {p.description && <p className="text-gray-600 text-xs mt-0.5 truncate">{p.description}</p>}
                </div>
              </Link>
              <button
                onClick={() => handleDelete(p.id)}
                className="flex-shrink-0 text-gray-600 hover:text-red-400 transition-colors text-sm opacity-0 group-hover:opacity-100 px-2"
                aria-label="Delete playlist"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
