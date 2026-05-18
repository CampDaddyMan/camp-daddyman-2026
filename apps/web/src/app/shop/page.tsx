'use client';
import { useEffect, useRef, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
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
  memberDiscountEnabled?: boolean;
  variants: { id: string; name: string; inventory: number }[];
}

const MEMBER_RATES: Record<string, number> = { PRO: 10, PREMIUM: 15, CREATOR: 15 };

// ── Product Card ──────────────────────────────────────────────────────────────

function ProductCard({ product }: { product: Product }) {
  const hasDiscount = !!(product.comparePrice && product.comparePrice > product.price);
  const savePct = hasDiscount ? Math.round((1 - product.price / product.comparePrice!) * 100) : 0;
  const outOfStock = product.variants.length > 0 && product.variants.every((v) => v.inventory <= 0);

  return (
    <Link href={`/shop/${product.slug || product.id}`} className="group block">
      <div className="relative aspect-[4/5] bg-surface-800 rounded-2xl overflow-hidden border border-surface-700/60 transition-all duration-500 group-hover:border-brand-500/50 group-hover:shadow-[0_8px_48px_rgba(248,194,2,0.12)]">
        {product.imageUrl ? (
          product.imageUrl.startsWith('http')
            ? <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110" />
            : <Image src={product.imageUrl} alt={product.name} fill className="object-cover transition-transform duration-700 ease-out group-hover:scale-110" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-surface-800">
            <span className="text-7xl opacity-15">{product.type === 'DIGITAL' ? '📦' : '👕'}</span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="absolute bottom-4 inset-x-4 translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 delay-75">
            <div className="bg-brand-500 text-black font-black text-center py-3 rounded-xl text-sm tracking-wide uppercase">
              View Product →
            </div>
          </div>
        </div>

        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.featured && (
            <span className="bg-brand-500 text-black text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">Drop</span>
          )}
          {product.type === 'DIGITAL' && (
            <span className="bg-black/70 backdrop-blur-md text-camp-400 text-[10px] font-bold px-2.5 py-1 rounded-full border border-camp-500/30">Digital</span>
          )}
          {hasDiscount && (
            <span className="bg-red-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">−{savePct}%</span>
          )}
          {outOfStock && (
            <span className="bg-black/70 backdrop-blur-md text-gray-400 text-[10px] font-medium px-2.5 py-1 rounded-full border border-surface-600">Sold Out</span>
          )}
        </div>

        {product.memberDiscountEnabled && (
          <div className="absolute top-3 right-3">
            <span className="bg-black/70 backdrop-blur-md text-brand-400 text-[10px] font-black px-2.5 py-1 rounded-full border border-brand-500/40 uppercase tracking-wide">
              ✦ Members
            </span>
          </div>
        )}
      </div>

      <div className="mt-3 px-0.5">
        {product.tags.length > 0 && (
          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em] mb-1 truncate">
            {product.tags.slice(0, 2).join(' · ')}
          </p>
        )}
        <h3 className="text-white font-bold text-sm leading-snug group-hover:text-brand-400 transition-colors line-clamp-1">
          {product.name}
        </h3>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-brand-400 font-black text-lg">${product.price.toFixed(2)}</span>
          {hasDiscount && (
            <span className="text-gray-600 text-sm line-through">${product.comparePrice!.toFixed(2)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ShopPage() {
  const { user } = useAuth();
  const collectionRef = useRef<HTMLDivElement>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'PHYSICAL' | 'DIGITAL'>('ALL');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<'featured' | 'newest' | 'price_asc' | 'price_desc'>('featured');
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    api.get('/shop/products')
      .then((r) => setProducts(r.data.products))
      .catch(() => {})
      .finally(() => setLoading(false));
    api.get('/site-settings/public')
      .then((r) => setSiteSettings(r.data.settings ?? {}))
      .catch(() => {});
  }, []);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [products]);

  const featuredProducts = useMemo(() => products.filter((p) => p.featured), [products]);

  const filtered = useMemo(() => {
    let list = products.filter((p) => {
      if (typeFilter !== 'ALL' && p.type !== typeFilter) return false;
      if (tagFilter && !p.tags.includes(tagFilter)) return false;
      return true;
    });
    if (sort === 'price_asc') list = [...list].sort((a, b) => a.price - b.price);
    else if (sort === 'price_desc') list = [...list].sort((a, b) => b.price - a.price);
    else if (sort === 'featured') list = [...list].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    return list;
  }, [products, typeFilter, tagFilter, sort]);

  const plan = user?.subscription?.plan as string | undefined;
  const memberRate = plan ? (MEMBER_RATES[plan] ?? 0) : 0;

  function scrollToCollection() {
    collectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="min-h-screen bg-black">

      {/* Per-element typography CSS injected from admin settings */}
      {(() => {
        const rules = [
          siteSettings.shop_eyebrow_css    && `.shop-intro .shop-eyebrow{${siteSettings.shop_eyebrow_css}}`,
          siteSettings.shop_heading_css    && `.shop-intro .shop-title{${siteSettings.shop_heading_css}}`,
          siteSettings.shop_stat_value_css && `.shop-intro .shop-stat-value{${siteSettings.shop_stat_value_css}}`,
          siteSettings.shop_stat_label_css && `.shop-intro .shop-stat-label{${siteSettings.shop_stat_label_css}}`,
          siteSettings.shop_subheading_css && `.shop-intro .shop-subheading{${siteSettings.shop_subheading_css}}`,
          siteSettings.shop_member_line_css && `.shop-intro .shop-member-line{${siteSettings.shop_member_line_css}}`,
          // Font-size inputs — after CSS textarea so they take precedence
          siteSettings.shop_eyebrow_font_size    && `.shop-intro .shop-eyebrow{font-size:${siteSettings.shop_eyebrow_font_size}}`,
          siteSettings.shop_heading_font_size    && `.shop-intro .shop-title{font-size:${siteSettings.shop_heading_font_size}}`,
          siteSettings.shop_stat_value_font_size && `.shop-intro .shop-stat-value{font-size:${siteSettings.shop_stat_value_font_size}}`,
          siteSettings.shop_stat_label_font_size && `.shop-intro .shop-stat-label{font-size:${siteSettings.shop_stat_label_font_size}}`,
          siteSettings.shop_subheading_font_size  && `.shop-intro .shop-subheading{font-size:${siteSettings.shop_subheading_font_size}}`,
          siteSettings.shop_member_line_font_size && `.shop-intro .shop-member-line{font-size:${siteSettings.shop_member_line_font_size}}`,
          // Line-height inputs
          siteSettings.shop_eyebrow_line_height    && `.shop-intro .shop-eyebrow{line-height:${siteSettings.shop_eyebrow_line_height}}`,
          siteSettings.shop_heading_line_height    && `.shop-intro .shop-title{line-height:${siteSettings.shop_heading_line_height}}`,
          siteSettings.shop_stat_value_line_height && `.shop-intro .shop-stat-value{line-height:${siteSettings.shop_stat_value_line_height}}`,
          siteSettings.shop_stat_label_line_height && `.shop-intro .shop-stat-label{line-height:${siteSettings.shop_stat_label_line_height}}`,
          siteSettings.shop_subheading_line_height && `.shop-intro .shop-subheading{line-height:${siteSettings.shop_subheading_line_height}}`,
          siteSettings.shop_member_line_line_height && `.shop-intro .shop-member-line{line-height:${siteSettings.shop_member_line_line_height}}`,
        ].filter(Boolean).join('');
        return rules ? <style dangerouslySetInnerHTML={{ __html: rules }} /> : null;
      })()}

      {/* ── Hero: Ark poster — full width, natural height, no cropping ──────── */}
      <section className="w-full bg-black">
        <img
          src="https://daddymanpublishing.com/images/2026/05/campdaddyman_the_ark_streaming_platform-v3.jpg"
          alt="The Ark — Camp DaddyMan"
          className="w-full h-auto block"
        />
      </section>

      {/* ── Shop intro — stacked editorial block ────────────────────────────── */}
      {(() => {
        const align = siteSettings.shop_intro_align || 'center';
        const isCenter = align === 'center';
        return (
          <section className="shop-intro bg-[#050505] border-b border-brand-500/10 px-[5%] pt-16 pb-12">
            <div className={`w-full max-w-[90%] mx-auto flex flex-col ${isCenter ? 'items-center text-center' : 'items-start text-left'}`}>

              {/* Row 1: eyebrow */}
              <p className="shop-eyebrow text-brand-400 text-[11px] font-bold uppercase tracking-[0.28em] mb-4">
                {siteSettings.shop_eyebrow || 'Camp DaddyMan Official Store'}
              </p>

              {/* Row 2: main heading */}
              <h1 className="shop-title font-black text-[#f5f1e8] leading-[0.95] tracking-tight mb-7 [font-family:Georgia,serif] text-[clamp(38px,5vw,72px)] w-full">
                {siteSettings.shop_heading || 'Merch, Music & Limited Drops'}
              </h1>

              {/* Row 3: stats */}
              {!loading && products.length > 0 && (
                <div className="flex flex-col sm:flex-row mb-5 rounded-[14px] overflow-hidden border border-white/[0.08] bg-white/[0.035] w-full sm:w-auto">
                  {[
                    { value: String(products.length), label: siteSettings.shop_stat_products_label || 'Products' },
                    { value: siteSettings.shop_stat_max_discount || '15%', label: siteSettings.shop_stat_discount_label || 'Max Discount', gold: true },
                    { value: featuredProducts.length > 0 ? String(featuredProducts.length) : '∞', label: siteSettings.shop_stat_featured_label || 'Featured Drop' },
                  ].map(({ value, label, gold }, i, arr) => (
                    <div
                      key={label}
                      className={`flex-1 sm:flex-none px-6 py-4 text-center
                        ${i < arr.length - 1 ? 'border-b sm:border-b-0 sm:border-r border-white/[0.08]' : ''}`}
                    >
                      <strong className={`shop-stat-value block text-3xl sm:text-[34px] leading-none mb-2 [font-family:Georgia,serif] ${gold ? 'text-[#ffd21a]' : 'text-[#f5f1e8]'}`}>
                        {value}
                      </strong>
                      <span className="shop-stat-label block text-[10px] font-bold uppercase tracking-[0.22em] text-[#c9b889]">{label}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Row 4: subheading */}
              <p className="shop-subheading text-[#cfc7b7] text-base mb-2">
                {siteSettings.shop_subheading || 'Straight from the Camp.'}
              </p>

              {/* Row 5: member line */}
              {!user && (
                <p className="shop-member-line text-brand-400 font-semibold text-sm mb-7">
                  {siteSettings.shop_nonmember_line || 'Members save up to 15%.'}{' '}
                  <Link href="/subscribe" className="underline hover:text-brand-300">Join →</Link>
                </p>
              )}
              {memberRate > 0 && (
                <p className="shop-member-line text-[#00c878] font-bold text-[15px] mb-7">
                  {(siteSettings.shop_member_saving_line || "You're saving {rate}% today.").replace('{rate}', String(memberRate))}
                </p>
              )}
              {!user && memberRate === 0 && <div className="mb-7" />}

              {/* Buttons */}
              <div className={`flex flex-col sm:flex-row gap-4 w-full sm:w-auto ${isCenter ? 'sm:justify-center' : ''}`}>
                <button
                  onClick={scrollToCollection}
                  className="w-full sm:w-auto px-8 py-4 rounded-xl bg-brand-500 hover:bg-brand-400 text-black font-black text-sm uppercase tracking-[0.06em] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_32px_rgba(248,194,2,0.22)] text-center"
                >
                  Shop the Collection
                </button>
                <Link
                  href="/shop/cart"
                  className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#0ba691] hover:bg-[#09907d] text-white font-black text-sm uppercase tracking-[0.06em] transition-all flex items-center justify-center gap-2"
                >
                  <span>🛒</span> Cart
                </Link>
              </div>

            </div>
          </section>
        );
      })()}

      {/* ── Collection + Featured Sidebar ──────────────────────────────────── */}
      <div ref={collectionRef} className="pb-28">

        {/* Sticky filter / sort bar */}
        <div className="sticky top-0 z-20 bg-black/90 backdrop-blur-2xl border-b border-surface-800/80">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {(['ALL', 'PHYSICAL', 'DIGITAL'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setTypeFilter(f)}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all duration-200 ${
                    typeFilter === f
                      ? 'bg-brand-500 text-black border-brand-500 shadow-[0_0_16px_rgba(248,194,2,0.2)]'
                      : 'border-surface-700 text-gray-500 hover:text-white hover:border-surface-500 bg-surface-900/60'
                  }`}
                >
                  {f === 'ALL' ? 'All' : f === 'PHYSICAL' ? '👕 Physical' : '📦 Digital'}
                </button>
              ))}
              {allTags.length > 0 && <div className="flex-shrink-0 w-px h-5 bg-surface-700 mx-1" />}
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                  className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 capitalize ${
                    tagFilter === tag
                      ? 'bg-camp-600 text-white border-camp-600'
                      : 'border-surface-700 text-gray-500 hover:text-gray-300 hover:border-surface-600 bg-surface-900/60'
                  }`}
                >
                  {tag}
                </button>
              ))}
              <div className="flex-1 min-w-[16px]" />
              <span className="flex-shrink-0 text-gray-700 text-xs tabular-nums">{filtered.length} item{filtered.length !== 1 ? 's' : ''}</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                className="flex-shrink-0 bg-surface-900/60 border border-surface-700 text-gray-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-500 cursor-pointer"
              >
                <option value="featured">Featured First</option>
                <option value="newest">Newest</option>
                <option value="price_asc">Price: Low → High</option>
                <option value="price_desc">Price: High → Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Two-column: grid left, featured sidebar right */}
        <div className="max-w-7xl mx-auto px-4 pt-10">
          <div className="flex gap-8 items-start">

            {/* Main grid */}
            <div className="flex-1 min-w-0">
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="aspect-[4/5] bg-surface-800 rounded-2xl mb-3" />
                      <div className="h-3 bg-surface-800 rounded w-1/3 mb-2" />
                      <div className="h-4 bg-surface-800 rounded w-2/3 mb-2" />
                      <div className="h-5 bg-surface-800 rounded w-1/4" />
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-32">
                  <p className="text-6xl mb-6">📦</p>
                  <p className="text-white font-black text-2xl mb-3">Drops Coming Soon</p>
                  <p className="text-gray-500 text-sm mb-6">The Ark is being stocked. Check back shortly.</p>
                  {(typeFilter !== 'ALL' || tagFilter) && (
                    <button
                      onClick={() => { setTypeFilter('ALL'); setTagFilter(null); }}
                      className="text-brand-400 hover:text-brand-300 text-sm font-bold border border-brand-500/30 px-5 py-2.5 rounded-xl transition-colors"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-10">
                  {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
                </div>
              )}
            </div>

            {/* Featured sidebar — sticky right column */}
            {!loading && featuredProducts.length > 0 && (
              <div className="hidden lg:flex flex-col gap-5 w-64 xl:w-72 flex-shrink-0 sticky top-16">
                <div>
                  <p className="text-brand-400 text-[10px] font-black uppercase tracking-[0.4em] mb-1">New Drops</p>
                  <h2 className="text-xl font-black text-white tracking-tight">Featured</h2>
                </div>
                {featuredProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── Member Banner ───────────────────────────────────────────────────── */}
      {!loading && (
        <section className="border-t border-surface-800/80 bg-surface-900/30 px-4 py-16 md:py-24">
          <div className="max-w-7xl mx-auto">
            <div className="relative rounded-3xl border border-brand-500/20 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-surface-800 via-surface-800/95 to-surface-900" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_0%_50%,rgba(248,194,2,0.07),transparent_65%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_80%_at_100%_50%,rgba(2,65,25,0.1),transparent_65%)]" />

              <div className="relative px-8 md:px-14 py-12 md:py-16 flex flex-col lg:flex-row items-center justify-between gap-10">
                <div className="max-w-lg text-center lg:text-left">
                  <div className="inline-flex items-center gap-2 bg-brand-500/12 border border-brand-500/25 rounded-full px-4 py-1.5 mb-6">
                    <span className="text-brand-400 text-[10px] font-black uppercase tracking-[0.35em]">Membership Perks</span>
                  </div>
                  <h2 className="text-3xl md:text-5xl font-black text-white leading-tight mb-5">
                    Camp Members<br />
                    <span className="text-brand-400">Save Up To 15%</span><br />
                    on Every Order.
                  </h2>
                  <div className="space-y-3 mb-8">
                    {[
                      { plan: 'PRO', pct: 10, desc: 'Unlock discounts + exclusive content' },
                      { plan: 'PREMIUM', pct: 15, desc: 'Maximum savings, all access' },
                      { plan: 'CREATOR', pct: 15, desc: 'Creator tier — full benefits' },
                    ].map(({ plan, pct, desc }) => (
                      <div key={plan} className="flex items-center gap-3">
                        <span className="w-9 h-9 bg-brand-500/12 border border-brand-500/25 rounded-xl flex items-center justify-center text-brand-400 text-xs font-black flex-shrink-0">
                          {pct}%
                        </span>
                        <div className="text-left">
                          <span className="text-white text-sm font-black">{plan}</span>
                          <span className="text-gray-500 text-xs ml-2">{desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {memberRate > 0 ? (
                    <div className="inline-flex items-center gap-2 bg-camp-500/10 border border-camp-500/30 rounded-2xl px-5 py-3 text-camp-400 font-bold text-sm">
                      <span>✓</span> You&apos;re saving {memberRate}% on eligible items
                    </div>
                  ) : (
                    <Link
                      href="/subscribe"
                      className="inline-block bg-brand-500 hover:bg-brand-400 text-black font-black px-9 py-4 rounded-2xl text-base transition-all hover:scale-[1.03] active:scale-[0.97] shadow-[0_0_32px_rgba(248,194,2,0.22)]"
                    >
                      Join the Camp →
                    </Link>
                  )}
                </div>

                {filtered.length > 0 && (
                  <div className="hidden lg:flex flex-col gap-3 w-72 flex-shrink-0">
                    <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold mb-1">With your membership</p>
                    {filtered.filter((p) => p.memberDiscountEnabled).slice(0, 4).map((p) => (
                      <div key={p.id} className="flex items-center gap-3 bg-surface-800/70 border border-surface-700/60 rounded-2xl px-4 py-3">
                        <div className="w-11 h-11 bg-surface-700 rounded-xl overflow-hidden flex-shrink-0">
                          {p.imageUrl && <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-bold truncate">{p.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-gray-500 text-xs line-through">${p.price.toFixed(2)}</span>
                            <span className="text-brand-400 text-xs font-bold">→ ${(p.price * (1 - 15 / 100)).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {filtered.filter((p) => p.memberDiscountEnabled).length === 0 && (
                      <p className="text-gray-600 text-xs">Member discounts apply to eligible products.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
