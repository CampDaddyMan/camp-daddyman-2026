'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProfile } from '@/context/ProfileContext';
import { useAuth } from '@/context/AuthContext';
import { Profile } from '@/types';

const COLORS = ['#e8b800', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#f97316', '#ec4899'];

function ProfileAvatar({ name, color, size = 96 }: { name: string; color: string; size?: number }) {
  return (
    <div
      style={{ width: size, height: size, backgroundColor: color, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.42, fontWeight: 700, color: '#000', flexShrink: 0, userSelect: 'none' }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function ProfilesPage() {
  const { user } = useAuth();
  const { profiles, activeProfile, switchProfile, createProfile, updateProfile, deleteProfile } = useProfile();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(COLORS[0]);
  const [newIsKids, setNewIsKids] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editTarget, setEditTarget] = useState<Profile | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editIsKids, setEditIsKids] = useState(false);

  if (!user) {
    router.replace('/login');
    return null;
  }

  async function handleSelect(profile: Profile) {
    if (editing) {
      setEditTarget(profile);
      setEditName(profile.name);
      setEditColor(profile.avatar || COLORS[0]);
      setEditIsKids(profile.isKids);
      return;
    }
    switchProfile(profile);
    router.push('/');
  }

  async function handleAdd() {
    if (!newName.trim() || saving) return;
    setSaving(true);
    try {
      await createProfile(newName.trim(), newColor, newIsKids);
      setAdding(false);
      setNewName('');
      setNewColor(COLORS[0]);
      setNewIsKids(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleEditSave() {
    if (!editTarget) return;
    await updateProfile(editTarget.id, { name: editName.trim(), avatar: editColor, isKids: editIsKids });
    setEditTarget(null);
  }

  async function handleDelete(id: string) {
    await deleteProfile(id);
    setEditTarget(null);
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 py-16">
      <div className="mb-12 text-center">
        <h1 className="text-white text-3xl font-bold mb-2">
          {editing ? 'Manage Profiles' : "Who's watching?"}
        </h1>
        {editing && <p className="text-gray-400 text-sm">Select a profile to edit or delete</p>}
      </div>

      <div className="flex flex-wrap gap-8 justify-center mb-12 max-w-3xl">
        {profiles.map((profile) => (
          <button
            key={profile.id}
            className="flex flex-col items-center gap-3 cursor-pointer group outline-none"
            onClick={() => handleSelect(profile)}
          >
            <div className={`relative rounded-lg overflow-hidden ring-2 transition-all ${activeProfile?.id === profile.id && !editing ? 'ring-white' : 'ring-transparent group-hover:ring-white/60'}`}>
              <ProfileAvatar name={profile.name} color={profile.avatar || COLORS[0]} size={96} />
              {editing && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </div>
              )}
              {profile.isKids && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-brand-500 text-black text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">
                  KIDS
                </span>
              )}
            </div>
            <span className={`text-sm transition-colors ${activeProfile?.id === profile.id && !editing ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
              {profile.name}
            </span>
          </button>
        ))}

        {profiles.length < 5 && !editing && (
          <button
            className="flex flex-col items-center gap-3 cursor-pointer group outline-none"
            onClick={() => setAdding(true)}
          >
            <div className="w-24 h-24 rounded-lg bg-surface-800 border-2 border-dashed border-surface-600 group-hover:border-white/50 flex items-center justify-center transition-all">
              <span className="text-surface-400 group-hover:text-white text-4xl leading-none">+</span>
            </div>
            <span className="text-gray-500 text-sm group-hover:text-white transition-colors">Add Profile</span>
          </button>
        )}
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => setEditing(!editing)}
          className="px-8 py-2.5 border border-gray-500 text-gray-400 hover:text-white hover:border-white text-sm font-medium rounded transition-all tracking-wide"
        >
          {editing ? 'Done' : 'Manage Profiles'}
        </button>
        {!editing && activeProfile && (
          <button
            onClick={() => { switchProfile(null); router.push('/profiles'); }}
            className="px-8 py-2.5 border border-surface-700 text-gray-500 hover:text-gray-300 hover:border-surface-600 text-sm rounded transition-all"
          >
            Browse without a profile
          </button>
        )}
      </div>

      {/* Edit modal */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setEditTarget(null)}>
          <div className="bg-surface-800 border border-surface-600 rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-5">
              <ProfileAvatar name={editName || editTarget.name} color={editColor} size={56} />
              <div>
                <h3 className="text-white font-bold text-lg">Edit Profile</h3>
                <p className="text-gray-400 text-xs">{editTarget.name}</p>
              </div>
            </div>

            <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wide">Name</label>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:border-brand-400"
              placeholder="Profile name"
              maxLength={30}
            />

            <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wide">Color</label>
            <div className="flex gap-2 mb-4">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setEditColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${editColor === c ? 'border-white scale-110' : 'border-transparent hover:border-white/50'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            <label className="flex items-center gap-2 mb-5 cursor-pointer">
              <input type="checkbox" checked={editIsKids} onChange={(e) => setEditIsKids(e.target.checked)} className="accent-brand-500 w-4 h-4" />
              <span className="text-sm text-gray-300">Kids profile <span className="text-gray-500">(hides R/Explicit content)</span></span>
            </label>

            <div className="flex gap-3">
              <button
                onClick={handleEditSave}
                className="flex-1 bg-brand-500 text-black py-2.5 rounded-lg text-sm font-semibold hover:bg-brand-400 transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => handleDelete(editTarget.id)}
                className="flex-1 bg-red-600/20 text-red-400 py-2.5 rounded-lg text-sm font-semibold hover:bg-red-600/40 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setEditTarget(null)}
                className="px-4 py-2.5 text-gray-400 hover:text-white text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add modal */}
      {adding && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setAdding(false)}>
          <div className="bg-surface-800 border border-surface-600 rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-5">
              <ProfileAvatar name={newName || '?'} color={newColor} size={56} />
              <h3 className="text-white font-bold text-lg">New Profile</h3>
            </div>

            <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wide">Name</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:border-brand-400"
              placeholder="Enter a name"
              maxLength={30}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />

            <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wide">Color</label>
            <div className="flex gap-2 mb-4">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${newColor === c ? 'border-white scale-110' : 'border-transparent hover:border-white/50'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            <label className="flex items-center gap-2 mb-5 cursor-pointer">
              <input type="checkbox" checked={newIsKids} onChange={(e) => setNewIsKids(e.target.checked)} className="accent-brand-500 w-4 h-4" />
              <span className="text-sm text-gray-300">Kids profile</span>
            </label>

            <div className="flex gap-3">
              <button
                onClick={handleAdd}
                disabled={saving || !newName.trim()}
                className="flex-1 bg-brand-500 text-black py-2.5 rounded-lg text-sm font-semibold hover:bg-brand-400 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Creating...' : 'Create Profile'}
              </button>
              <button
                onClick={() => { setAdding(false); setNewName(''); }}
                className="px-4 py-2.5 text-gray-400 hover:text-white text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
