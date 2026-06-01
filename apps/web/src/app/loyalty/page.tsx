'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { getLevel } from '@/lib/xp';
import Link from 'next/link';

interface Reward {
  id: string; name: string; description: string | null;
  xpCost: number; type: string; value: string | null;
  stock: number | null; redeemed: boolean; soldOut: boolean;
}

const TYPE_LABEL: Record<string, string> = {
  DISCOUNT:         '🏷️ Discount Code',
  EARLY_ACCESS:     '⚡ Early Access',
  EXCLUSIVE_CONTENT:'🔒 Exclusive Content',
  CUSTOM:           '🎁 Special Reward',
};

const TYPE_COLOR: Record<string, string> = {
  DISCOUNT:         'border-brand-500/40 bg-brand-500/5',
  EARLY_ACCESS:     'border-violet-500/40 bg-violet-500/5',
  EXCLUSIVE_CONTENT:'border-green-500/40 bg-green-500/5',
  CUSTOM:           'border-surface-500/40 bg-surface-800',
};

export default function LoyaltyPage() {
  const { user } = useAuth();
  const [rewards, setRewards]   = useState<Reward[]>([]);
  const [xpData, setXpData]     = useState<{ xp: number } | null>(null);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [error, setError]       = useState<Record<string, string>>({});

  useEffect(() => {
    api.get('/loyalty/rewards').then((r) => setRewards(r.data.rewards)).catch(() => {});
    if (user) api.get('/xp').then((r) => setXpData({ xp: r.data.xp ?? 0 })).catch(() => {});
  }, [user]);

  async function handleRedeem(reward: Reward) {
    if (!user) return;
    setRedeeming(reward.id);
    setError((p) => ({ ...p, [reward.id]: '' }));
    try {
      const { data } = await api.post(`/loyalty/rewards/${reward.id}/redeem`);
      setRewards((prev) => prev.map((r) => r.id === reward.id ? { ...r, redeemed: true } : r));
      setXpData((p) => p ? { xp: p.xp - reward.xpCost } : p);
      if (data.value) setRevealed((p) => ({ ...p, [reward.id]: data.value }));
    } catch (e: any) {
      setError((p) => ({ ...p, [reward.id]: e?.response?.data?.error || 'Failed to redeem' }));
    } finally {
      setRedeeming(null);
    }
  }

  const userXp = xpData?.xp ?? 0;
  const { name: levelName, index: levelIndex } = getLevel(userXp);
  const LEVEL_EMOJI = ['🥚', '🐛', '🫘', '🦋'];

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">

      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-black text-white mb-2">Loyalty Shop</h1>
        <p className="text-gray-400">Spend your XP on exclusive rewards. Every action on the platform earns you XP.</p>
      </div>

      {/* XP balance */}
      {user ? (
        <div className="flex items-center gap-4 bg-surface-800 border border-surface-700 rounded-xl px-6 py-4 mb-8">
          <span className="text-3xl">{LEVEL_EMOJI[levelIndex - 1]}</span>
          <div>
            <p className="text-white font-bold">{levelName}</p>
            <p className="text-brand-400 font-black text-xl">{userXp.toLocaleString()} XP available</p>
          </div>
          <Link href="/dashboard" className="ml-auto text-xs text-gray-500 hover:text-brand-400 transition-colors">
            How to earn more →
          </Link>
        </div>
      ) : (
        <div className="bg-surface-800 border border-surface-700 rounded-xl px-6 py-4 mb-8 flex items-center justify-between">
          <p className="text-gray-400 text-sm">Sign in to see your XP balance and redeem rewards.</p>
          <Link href="/login" className="text-sm bg-brand-500 hover:bg-brand-400 text-black font-semibold px-4 py-2 rounded-lg transition-colors">Sign in</Link>
        </div>
      )}

      {/* Rewards grid */}
      {rewards.length === 0 ? (
        <div className="text-center py-20 text-gray-500">No rewards available yet — check back soon.</div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {rewards.map((reward) => (
            <div
              key={reward.id}
              className={`border rounded-2xl p-5 flex flex-col gap-3 transition-opacity ${TYPE_COLOR[reward.type] || TYPE_COLOR.CUSTOM} ${reward.soldOut || reward.redeemed ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs text-gray-500 font-medium">{TYPE_LABEL[reward.type] || '🎁 Reward'}</span>
                  <h3 className="text-white font-bold text-base mt-0.5">{reward.name}</h3>
                  {reward.description && <p className="text-gray-400 text-sm mt-1">{reward.description}</p>}
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-brand-400 font-black text-lg">{reward.xpCost.toLocaleString()}</p>
                  <p className="text-gray-500 text-xs">XP</p>
                </div>
              </div>

              {reward.stock !== null && (
                <p className="text-xs text-gray-500">{reward.stock} remaining</p>
              )}

              {revealed[reward.id] && (
                <div className="bg-black/40 border border-brand-500/30 rounded-lg px-3 py-2 text-brand-300 font-mono text-sm break-all">
                  {revealed[reward.id]}
                </div>
              )}

              {error[reward.id] && (
                <p className="text-red-400 text-xs">{error[reward.id]}</p>
              )}

              {reward.redeemed ? (
                <div className="flex items-center gap-2 text-sm text-green-400 font-semibold">
                  <span>✓</span> Redeemed
                </div>
              ) : reward.soldOut ? (
                <p className="text-sm text-gray-500 font-medium">Sold out</p>
              ) : !user ? (
                <Link href="/login" className="text-sm text-brand-400 hover:text-brand-300 font-semibold transition-colors">
                  Sign in to redeem →
                </Link>
              ) : (
                <button
                  onClick={() => handleRedeem(reward)}
                  disabled={!!redeeming || userXp < reward.xpCost}
                  className="mt-auto self-start bg-brand-500 hover:bg-brand-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-sm px-4 py-2 rounded-lg transition-colors"
                >
                  {redeeming === reward.id
                    ? 'Redeeming…'
                    : userXp < reward.xpCost
                    ? `Need ${(reward.xpCost - userXp).toLocaleString()} more XP`
                    : 'Redeem'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
