'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import api from '@/lib/api';

export default function CartPage() {
  const { user } = useAuth();
  const { items, removeItem, updateQty, clearCart, subtotal } = useCart();
  const router = useRouter();

  const [guestEmail, setGuestEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string; type: string; value: number; discountAmount: number;
  } | null>(null);

  async function handleApplyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true);
    setCouponError('');
    try {
      const { data } = await api.post('/shop/coupons/validate', { code, subtotal });
      if (data.valid) {
        setAppliedCoupon(data);
        setCouponInput('');
      } else {
        setCouponError(data.error || 'Invalid coupon');
      }
    } catch {
      setCouponError('Could not validate coupon. Try again.');
    } finally {
      setCouponLoading(false);
    }
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    setCouponError('');
  }

  async function handleCheckout() {
    const email = user?.email || guestEmail.trim();
    if (!email) { setError('Please enter your email to continue.'); return; }
    if (!user && !/\S+@\S+\.\S+/.test(email)) { setError('Please enter a valid email.'); return; }

    setLoading(true);
    setError('');
    try {
      const payload = {
        email,
        couponCode: appliedCoupon?.code ?? undefined,
        items: items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          options: i.options,
          quantity: i.quantity,
        })),
      };
      const { data } = await api.post('/shop/checkout', payload);
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Checkout failed. Please try again.');
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <p className="text-5xl mb-4">🛒</p>
        <h2 className="text-2xl font-bold text-white mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-8">Head to The Ark and grab something.</p>
        <Link
          href="/shop"
          className="inline-block bg-brand-500 hover:bg-brand-600 text-black font-bold px-8 py-3 rounded-xl transition-colors"
        >
          Browse The Ark
        </Link>
      </div>
    );
  }

  const estimatedTotal = subtotal - (appliedCoupon?.discountAmount ?? 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
        <Link href="/shop" className="hover:text-brand-400 transition-colors">The Ark</Link>
        <span>/</span>
        <span className="text-gray-300">Cart</span>
      </nav>

      <h1 className="text-3xl font-black text-white mb-8">Your Cart</h1>

      <div className="grid lg:grid-cols-5 gap-8">
        {/* Items */}
        <div className="lg:col-span-3 space-y-4">
          {items.map((item) => (
            <div
              key={`${item.productId}-${item.variantId ?? 'none'}`}
              className="flex gap-4 bg-surface-800 border border-surface-700 rounded-2xl p-4"
            >
              {/* Thumbnail */}
              <div className="w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-surface-700">
                {item.imageUrl ? (
                  item.imageUrl.startsWith('http')
                    ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    : <Image src={item.imageUrl} alt={item.name} width={80} height={80} className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl opacity-30">
                    {item.type === 'DIGITAL' ? '📦' : '👕'}
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm leading-snug mb-0.5 truncate">{item.name}</p>
                {item.variantName && (
                  <p className="text-gray-500 text-xs mb-2">{item.variantName}</p>
                )}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-surface-700 rounded-lg px-1 py-0.5">
                    <button
                      onClick={() => updateQty(item.productId, item.variantId, item.quantity - 1)}
                      className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                    >−</button>
                    <span className="w-5 text-center text-white text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.productId, item.variantId, item.quantity + 1)}
                      className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                    >+</button>
                  </div>
                  <button
                    onClick={() => removeItem(item.productId, item.variantId)}
                    className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="flex-shrink-0 text-right">
                <p className="text-brand-400 font-bold">${(item.price * item.quantity).toFixed(2)}</p>
                {item.quantity > 1 && (
                  <p className="text-gray-500 text-xs">${item.price.toFixed(2)} ea</p>
                )}
              </div>
            </div>
          ))}

          <button
            onClick={clearCart}
            className="text-xs text-gray-600 hover:text-red-400 transition-colors mt-2"
          >
            Clear cart
          </button>
        </div>

        {/* Summary */}
        <div className="lg:col-span-2">
          <div className="bg-surface-800 border border-surface-700 rounded-2xl p-6 sticky top-24">
            <h2 className="text-white font-bold text-lg mb-5">Order Summary</h2>

            <div className="space-y-3 text-sm mb-5">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between text-brand-400">
                  <span>
                    Coupon{' '}
                    <span className="font-mono font-bold">{appliedCoupon.code}</span>
                    {appliedCoupon.type === 'PERCENTAGE' && (
                      <span className="text-gray-500 ml-1">({appliedCoupon.value}% off)</span>
                    )}
                  </span>
                  <span>−${appliedCoupon.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-surface-600 pt-3 flex justify-between text-white font-bold text-base">
                <span>Estimated Total</span>
                <span>${Math.max(0, estimatedTotal).toFixed(2)}</span>
              </div>
              {user?.subscription?.plan && (
                <p className="text-xs text-gray-500">Member discounts applied to eligible items at checkout.</p>
              )}
            </div>

            {/* Coupon input */}
            {!appliedCoupon ? (
              <div className="mb-4">
                <label className="block text-xs text-gray-400 mb-1.5">Coupon code</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                    placeholder="ENTER CODE"
                    maxLength={32}
                    className="flex-1 bg-surface-700 border border-surface-600 text-white rounded-xl px-3 py-2 text-sm font-mono tracking-wider uppercase focus:outline-none focus:border-brand-400 transition-colors placeholder:font-sans placeholder:tracking-normal placeholder:normal-case"
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponInput.trim()}
                    className="px-4 py-2 bg-surface-700 hover:bg-surface-600 border border-surface-600 text-gray-300 hover:text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {couponLoading ? '…' : 'Apply'}
                  </button>
                </div>
                {couponError && (
                  <p className="text-red-400 text-xs mt-1.5">{couponError}</p>
                )}
              </div>
            ) : (
              <div className="mb-4 flex items-center justify-between bg-brand-500/10 border border-brand-500/30 rounded-xl px-4 py-2.5">
                <div>
                  <span className="text-brand-400 font-mono font-bold text-sm">{appliedCoupon.code}</span>
                  <span className="text-gray-400 text-xs ml-2">
                    {appliedCoupon.type === 'PERCENTAGE'
                      ? `${appliedCoupon.value}% off`
                      : `$${appliedCoupon.value.toFixed(2)} off`}
                  </span>
                </div>
                <button
                  onClick={handleRemoveCoupon}
                  className="text-gray-500 hover:text-red-400 text-xs transition-colors ml-3"
                >
                  Remove
                </button>
              </div>
            )}

            {!user && (
              <div className="mb-4">
                <label className="block text-xs text-gray-400 mb-1.5">Email for order confirmation</label>
                <input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-surface-700 border border-surface-600 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-400 transition-colors"
                />
              </div>
            )}

            {error && (
              <p className="text-red-400 text-xs mb-3">{error}</p>
            )}

            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-black font-bold py-3.5 rounded-xl transition-colors text-base"
            >
              {loading ? 'Redirecting to Stripe…' : 'Checkout with Stripe →'}
            </button>

            <p className="text-xs text-gray-600 text-center mt-3">Secure checkout powered by Stripe</p>

            {!user && (
              <div className="mt-4 pt-4 border-t border-surface-700 text-center">
                <p className="text-xs text-gray-500">
                  <Link href="/login" className="text-brand-400 hover:text-brand-300">Sign in</Link> to apply your member discount
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
