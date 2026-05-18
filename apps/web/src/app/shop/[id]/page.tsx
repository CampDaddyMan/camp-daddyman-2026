'use client';
import { useEffect, useState, useMemo, type MouseEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';

interface Variant {
  id: string;
  name: string;
  sku?: string;
  price?: number;
  inventory: number;
  options?: Record<string, string>;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  type: 'PHYSICAL' | 'DIGITAL';
  price: number;
  comparePrice?: number;
  imageUrl?: string;
  images: string[];
  featured: boolean;
  tags: string[];
  variants: Variant[];
  optionGroups?: { name: string; values: string[] }[];
}

const DISCOUNT_RATES: Record<string, number> = { PRO: 10, PREMIUM: 15, CREATOR: 15 };

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { addItem } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [flatVariant, setFlatVariant] = useState<Variant | null>(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [zoomPos, setZoomPos] = useState<{ x: number; y: number } | null>(null);

  function handleImageMouseMove(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    setZoomPos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }

  useEffect(() => {
    api.get(`/shop/products/${id}`)
      .then((r) => {
        const p: Product = r.data.product;
        setProduct(p);
        if (p.variants.length === 1) setFlatVariant(p.variants[0]);
      })
      .catch(() => router.push('/shop'))
      .finally(() => setLoading(false));
  }, [id, router]);

  // Option groups from product (set in admin) drive independent selectors
  const optionGroups = product?.optionGroups ?? [];
  const isMultiOption = optionGroups.length > 0;

  // Build the selected options string: "M / Black / Standard"
  const optionsString = useMemo(() => {
    if (!isMultiOption) return undefined;
    const vals = optionGroups.map((g) => selections[g.name]).filter(Boolean);
    return vals.length === optionGroups.length ? vals.join(' / ') : undefined;
  }, [isMultiOption, optionGroups, selections]);

  const activeVariant = isMultiOption ? null : flatVariant;

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 animate-pulse">
        <div className="grid md:grid-cols-2 gap-10">
          <div className="aspect-square bg-surface-700 rounded-2xl" />
          <div className="space-y-4 pt-4">
            <div className="h-8 bg-surface-700 rounded w-3/4" />
            <div className="h-4 bg-surface-700 rounded w-1/2" />
            <div className="h-4 bg-surface-700 rounded w-full" />
            <div className="h-4 bg-surface-700 rounded w-5/6" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const plan = user?.subscription?.plan as string | undefined;
  const discountRate = plan ? (DISCOUNT_RATES[plan] ?? 0) : 0;
  const effectivePrice = activeVariant?.price ?? product.price;
  const discountedPrice = discountRate > 0 ? effectivePrice * (1 - discountRate / 100) : effectivePrice;
  const hasDiscount = product.comparePrice && product.comparePrice > product.price;
  const savePct = hasDiscount ? Math.round((1 - product.price / product.comparePrice!) * 100) : 0;

  const allImages = [product.imageUrl, ...product.images].filter(Boolean) as string[];

  const needsVariant = isMultiOption
    ? !optionsString
    : product.variants.length > 1 && !flatVariant;
  const outOfStock = !isMultiOption && activeVariant
    ? activeVariant.inventory <= 0
    : !isMultiOption && product.variants.length > 0 && product.variants.every((v) => v.inventory <= 0);

  function handleAddToCart() {
    if (!product) return;
    addItem({
      productId: product.id,
      variantId: activeVariant?.id,
      options: optionsString,
      name: product.name,
      variantName: optionsString ?? activeVariant?.name,
      price: discountedPrice,
      imageUrl: product.imageUrl,
      type: product.type,
      quantity: qty,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
        <Link href="/shop" className="hover:text-brand-400 transition-colors">The Ark</Link>
        <span>/</span>
        <span className="text-gray-300">{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-10">
        {/* Images */}
        <div className="space-y-3">
          <div
            className="relative aspect-square bg-surface-800 rounded-2xl overflow-hidden border border-surface-700 cursor-crosshair"
            onMouseMove={handleImageMouseMove}
            onMouseLeave={() => setZoomPos(null)}
          >
            {allImages[activeImg] ? (
              <div
                className="w-full h-full"
                style={zoomPos ? {
                  transform: 'scale(2.5)',
                  transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                } : undefined}
              >
                {allImages[activeImg].startsWith('http')
                  ? <img src={allImages[activeImg]} alt={product.name} className="w-full h-full object-cover" />
                  : <Image src={allImages[activeImg]} alt={product.name} fill className="object-cover" />
                }
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-7xl opacity-20">
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
          {allImages.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {allImages.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                    activeImg === i ? 'border-brand-500' : 'border-surface-600 hover:border-surface-400'
                  }`}
                >
                  {img.startsWith('http')
                    ? <img src={img} alt="" className="w-full h-full object-cover" />
                    : <Image src={img} alt="" width={64} height={64} className="object-cover" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-5">
          <div>
            {product.tags.length > 0 && (
              <div className="flex gap-1.5 flex-wrap mb-3">
                {product.tags.map((tag) => (
                  <span key={tag} className="text-xs bg-surface-700 text-gray-400 px-2.5 py-0.5 rounded-full">{tag}</span>
                ))}
              </div>
            )}
            <h1 className="text-3xl font-black text-white mb-3">{product.name}</h1>
            <div className="flex items-baseline gap-3">
              <span className="text-brand-400 font-bold text-3xl">${discountedPrice.toFixed(2)}</span>
              {discountRate > 0 && (
                <span className="text-gray-500 text-lg line-through">${effectivePrice.toFixed(2)}</span>
              )}
              {!discountRate && hasDiscount && (
                <span className="text-gray-500 text-lg line-through">${product.comparePrice!.toFixed(2)}</span>
              )}
            </div>
          </div>

          {/* Member discount badge */}
          {discountRate > 0 ? (
            <div className="flex items-center gap-2 bg-brand-500/10 border border-brand-500/30 rounded-xl px-4 py-2.5 text-sm">
              <span className="text-brand-400 font-bold">{discountRate}% member discount applied</span>
            </div>
          ) : !user ? (
            <div className="flex items-center gap-3 bg-surface-800 border border-surface-600 rounded-xl px-4 py-3 text-sm">
              <span className="text-gray-400">Members save up to 15%.</span>
              <Link href="/subscribe" className="text-brand-400 font-semibold hover:text-brand-300">Join →</Link>
            </div>
          ) : null}

          {product.description && (
            <p className="text-gray-400 text-base leading-relaxed">{product.description}</p>
          )}

          {/* Option group selectors */}
          {isMultiOption && (
            <div className="space-y-4">
              {optionGroups.map((group) => (
                <div key={group.name}>
                  <p className="text-sm text-gray-400 font-medium mb-2">
                    {group.name}{selections[group.name] && <span className="text-white ml-2">{selections[group.name]}</span>}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {group.values.map((val) => {
                      const selected = selections[group.name] === val;
                      return (
                        <button
                          key={val}
                          onClick={() => setSelections((s) => ({ ...s, [group.name]: val }))}
                          className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                            selected
                              ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                              : 'border-surface-600 text-gray-300 hover:border-surface-400 bg-surface-800'
                          }`}
                        >
                          {val}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
{optionsString && (
                <p className="text-xs text-gray-500">Selected: {optionsString}</p>
              )}
            </div>
          )}

          {/* Flat variant selector (for products without option groups) */}
          {!isMultiOption && product.variants.length > 1 && (
            <div>
              <p className="text-sm text-gray-400 font-medium mb-2">
                {flatVariant ? `Selected: ${flatVariant.name}` : 'Select an option'}
              </p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    disabled={v.inventory <= 0}
                    onClick={() => setFlatVariant(v)}
                    className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                      v.inventory <= 0
                        ? 'border-surface-600 text-gray-600 cursor-not-allowed line-through'
                        : flatVariant?.id === v.id
                        ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                        : 'border-surface-600 text-gray-300 hover:border-surface-400 bg-surface-800'
                    }`}
                  >
                    {v.name}
                    {v.price != null && v.price !== product.price && (
                      <span className="ml-1 text-xs opacity-60">(+${(v.price - product.price).toFixed(0)})</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400 w-20">Quantity</span>
            <select
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              className="bg-surface-800 border border-surface-600 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-400 transition-colors"
            >
              {Array.from({ length: 100 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          {/* CTA */}
          <div className="flex gap-3">
            <button
              onClick={handleAddToCart}
              disabled={needsVariant || outOfStock}
              className={`flex-1 py-3.5 rounded-xl font-bold text-base transition-colors ${
                outOfStock
                  ? 'bg-surface-700 text-gray-500 cursor-not-allowed'
                  : needsVariant
                  ? 'bg-surface-700 text-gray-400 cursor-not-allowed'
                  : added
                  ? 'bg-camp-500 text-white'
                  : 'bg-brand-500 hover:bg-brand-600 text-black'
              }`}
            >
              {outOfStock ? 'Out of Stock' : needsVariant ? 'Select an option' : added ? '✓ Added to Cart' : 'Add to Cart'}
            </button>
            <Link
              href="/shop/cart"
              className="px-5 py-3.5 rounded-xl border border-surface-600 hover:border-surface-400 text-gray-300 hover:text-white font-medium transition-colors text-sm flex items-center"
            >
              View Cart
            </Link>
          </div>

          {outOfStock && (
            <p className="text-red-400 text-sm">This item is currently out of stock.</p>
          )}

          {product.type === 'DIGITAL' && (
            <div className="flex items-start gap-2 text-sm text-gray-400 bg-surface-800/60 border border-surface-700 rounded-xl px-4 py-3">
              <span className="text-lg leading-none mt-0.5">📦</span>
              <span>Digital product — download link delivered after purchase. Available for 7 days.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
