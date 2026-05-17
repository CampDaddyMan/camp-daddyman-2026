'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/api';

interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  type: 'PHYSICAL' | 'DIGITAL';
  price: number;
  comparePrice?: number;
  imageUrl?: string;
  featured: boolean;
  tags: string[];
  variants: { id: string; name: string; inventory: number }[];
}

function ProductCard({ product }: { product: Product }) {
  const hasDiscount = product.comparePrice && product.comparePrice > product.price;
  const savePct = hasDiscount ? Math.round((1 - product.price / product.comparePrice!) * 100) : 0;

  return (
    <Link
      href={`/shop/${product.slug || product.id}`}
      className="group bg-surface-800 border border-surface-700 hover:border-brand-500/50 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_24px_rgba(248,194,2,0.1)] flex flex-col"
    >
      <div className="relative aspect-square bg-surface-700 overflow-hidden">
        {product.imageUrl ? (
          product.imageUrl.startsWith('http')
            ? <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            : <Image src={product.imageUrl} alt={product.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-5xl opacity-30">
            {product.type === 'DIGITAL' ? '📦' : '👕'}
          </div>
        )}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.featured && (
            <span className="bg-brand-500 text-black text-xs font-bold px-2.5 py-1 rounded-full">Featured</span>
          )}
          {product.type === 'DIGITAL' && (
            <span className="bg-camp-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full">Digital</span>
          )}
          {hasDiscount && (
            <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">−{savePct}%</span>
          )}
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-white font-semibold text-base mb-1 group-hover:text-brand-400 transition-colors leading-snug">
          {product.name}
        </h3>
        {product.description && (
          <p className="text-gray-500 text-sm line-clamp-2 mb-3 flex-1">{product.description}</p>
        )}
        <div className="flex items-center gap-2 mt-auto">
          <span className="text-brand-400 font-bold text-lg">${product.price.toFixed(2)}</span>
          {hasDiscount && (
            <span className="text-gray-500 text-sm line-through">${product.comparePrice!.toFixed(2)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PHYSICAL' | 'DIGITAL'>('ALL');

  useEffect(() => {
    api.get('/shop/products')
      .then((r) => setProducts(r.data.products))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'ALL' ? products : products.filter((p) => p.type === filter);

  return (
    <div>
      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-surface-900 border-b border-surface-700/50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(248,194,2,0.12),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_60%_at_0%_100%,rgba(2,65,25,0.2),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_60%_at_100%_0%,rgba(2,65,25,0.2),transparent_60%)]" />

        <div className="relative max-w-5xl mx-auto px-4 py-16 md:py-24 text-center">
          <p className="text-brand-400 text-sm font-bold uppercase tracking-[0.4em] mb-4">Camp DaddyMan</p>
          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight mb-3">
            The Ark
          </h1>
          <p className="text-gray-400 text-base md:text-lg max-w-xl mx-auto mb-8">
            Merch, music, and more — built for the Camp. Subscribers get up to 15% off every order.
          </p>
          <Link href="/shop/cart" className="inline-flex items-center gap-2 bg-surface-700 hover:bg-surface-600 border border-surface-600 text-gray-300 hover:text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
            🛒 View cart
          </Link>
        </div>
      </div>

      {/* ── Products ── */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Filter */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          {(['ALL', 'PHYSICAL', 'DIGITAL'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                filter === f
                  ? 'bg-brand-500 text-black border-brand-500'
                  : 'border-surface-600 text-gray-400 hover:text-white hover:border-surface-500 bg-surface-800'
              }`}
            >
              {f === 'ALL' ? 'All Products' : f === 'PHYSICAL' ? '👕 Physical' : '📦 Digital'}
            </button>
          ))}
          <span className="ml-auto text-gray-500 text-sm">{filtered.length} item{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-surface-800 rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-square bg-surface-700" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-surface-700 rounded w-3/4" />
                  <div className="h-3 bg-surface-700 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-5xl mb-4">📦</p>
            <p className="text-white font-semibold text-lg mb-2">Drops coming soon</p>
            <p className="text-gray-500 text-sm">The Ark is being stocked. Check back shortly.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}

        {/* Member discount callout */}
        <div className="mt-16 rounded-2xl border border-brand-500/30 bg-surface-800/60 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-brand-400 text-sm font-bold uppercase tracking-wider mb-1">Member Discount</p>
            <p className="text-white font-semibold">PRO members save 10% · PREMIUM members save 15%</p>
            <p className="text-gray-400 text-sm mt-1">Discount applied automatically at checkout when you're signed in.</p>
          </div>
          <Link href="/subscribe" className="flex-shrink-0 bg-brand-500 hover:bg-brand-600 text-black font-bold px-6 py-3 rounded-xl text-sm transition-colors whitespace-nowrap">
            Get a membership →
          </Link>
        </div>
      </div>
    </div>
  );
}
