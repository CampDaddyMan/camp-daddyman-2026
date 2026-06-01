'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import api from '@/lib/api';

interface WishlistProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  comparePrice?: number;
  imageUrl?: string;
  type: string;
  variants: { id: string; name: string; inventory: number }[];
}

export default function WishlistPage() {
  const { user, loading: authLoading } = useAuth();
  const { addItem } = useCart();
  const router = useRouter();

  const [products, setProducts] = useState<WishlistProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login?redirect=/shop/wishlist');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    api.get('/shop/wishlist')
      .then((r) => setProducts(r.data.products))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  async function handleRemove(productId: string) {
    setRemoving(productId);
    await api.post(`/shop/wishlist/${productId}`).catch(() => {});
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    setRemoving(null);
  }

  function handleAddToCart(p: WishlistProduct) {
    const variant = p.variants.length === 1 ? p.variants[0] : undefined;
    addItem({
      productId: p.id,
      variantId: variant?.id,
      name: p.name,
      variantName: variant?.name,
      price: p.price,
      imageUrl: p.imageUrl,
      type: p.type as 'PHYSICAL' | 'DIGITAL',
      quantity: 1,
    });
  }

  if (authLoading || loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[4/5] bg-surface-800 rounded-xl mb-3" />
              <div className="h-4 bg-surface-800 rounded w-3/4 mb-2" />
              <div className="h-4 bg-surface-800 rounded w-1/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
        <Link href="/shop" className="hover:text-brand-400 transition-colors">The Ark</Link>
        <span>/</span>
        <span className="text-gray-300">Wishlist</span>
      </nav>

      <div className="flex items-baseline justify-between mb-8">
        <h1 className="text-3xl font-black text-white">Wishlist</h1>
        {products.length > 0 && (
          <span className="text-gray-500 text-sm">{products.length} item{products.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {products.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-5xl mb-4">♡</p>
          <h2 className="text-xl font-bold text-white mb-2">Your wishlist is empty</h2>
          <p className="text-gray-500 text-sm mb-8">Heart products in The Ark to save them here.</p>
          <Link
            href="/shop"
            className="inline-block bg-brand-500 hover:bg-brand-600 text-black font-bold px-8 py-3 rounded-xl transition-colors"
          >
            Browse The Ark
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {products.map((p) => {
            const outOfStock = p.variants.length > 0 && p.variants.every((v) => v.inventory <= 0);
            const hasDiscount = !!(p.comparePrice && p.comparePrice > p.price);
            const savePct = hasDiscount ? Math.round((1 - p.price / p.comparePrice!) * 100) : 0;
            const singleVariant = p.variants.length === 1;

            return (
              <div key={p.id} className="group relative">
                <Link href={`/shop/${p.slug || p.id}`} className="block">
                  <div className="relative aspect-[4/5] bg-surface-800 rounded-xl overflow-hidden border border-surface-700 group-hover:border-brand-500/40 transition-colors">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl opacity-20">
                        {p.type === 'DIGITAL' ? '📦' : '👕'}
                      </div>
                    )}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {hasDiscount && <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">−{savePct}%</span>}
                      {outOfStock && <span className="bg-black/70 text-gray-400 text-[10px] px-2 py-0.5 rounded-full border border-surface-600">Sold Out</span>}
                    </div>
                  </div>
                  <div className="mt-2.5">
                    <p className="text-white text-sm font-semibold truncate group-hover:text-brand-400 transition-colors">{p.name}</p>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-brand-400 font-bold">${p.price.toFixed(2)}</span>
                      {hasDiscount && <span className="text-gray-600 text-xs line-through">${p.comparePrice!.toFixed(2)}</span>}
                    </div>
                  </div>
                </Link>

                <div className="flex gap-2 mt-2.5">
                  {!outOfStock && singleVariant && (
                    <button
                      onClick={() => handleAddToCart(p)}
                      className="flex-1 py-2 bg-brand-500 hover:bg-brand-400 text-black text-xs font-bold rounded-lg transition-colors"
                    >
                      Add to Cart
                    </button>
                  )}
                  {(!outOfStock && !singleVariant) && (
                    <Link
                      href={`/shop/${p.slug || p.id}`}
                      className="flex-1 py-2 bg-brand-500 hover:bg-brand-400 text-black text-xs font-bold rounded-lg transition-colors text-center"
                    >
                      Select Options
                    </Link>
                  )}
                  <button
                    onClick={() => handleRemove(p.id)}
                    disabled={removing === p.id}
                    className="px-3 py-2 rounded-lg border border-surface-600 hover:border-red-500/50 text-gray-500 hover:text-red-400 transition-colors text-sm disabled:opacity-40"
                    title="Remove from wishlist"
                  >
                    {removing === p.id ? '…' : '♥'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
