'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useCart } from '@/context/CartContext';

interface OrderItem {
  id: string;
  name: string;
  variantName?: string;
  quantity: number;
  price: number;
  downloadUrl?: string;
  downloadExpiry?: string;
}

interface Order {
  id: string;
  status: string;
  total: number;
  discount: number;
  items: OrderItem[];
  shippingName?: string;
  shippingLine1?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingZip?: string;
  shippingCountry?: string;
}

function SuccessContent() {
  const params = useSearchParams();
  const sessionId = params.get('session_id');
  const { clearCart } = useCart();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    if (!sessionId) { setLoading(false); return; }

    api.get(`/shop/orders/session/${sessionId}`)
      .then((r) => {
        setOrder(r.data.order);
        if (!cleared) { clearCart(); setCleared(true); }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sessionId, clearCart, cleared]);

  const hasDigital = order?.items.some((i) => i.downloadUrl);
  const hasPhysical = order?.items.some((i) => !i.downloadUrl);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-surface-700 animate-pulse mx-auto mb-6" />
        <div className="h-6 bg-surface-700 rounded w-48 mx-auto mb-3 animate-pulse" />
        <div className="h-4 bg-surface-700 rounded w-64 mx-auto animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      {/* Confirmation header */}
      <div className="text-center mb-10">
        <div className="w-20 h-20 rounded-full bg-camp-500/20 border border-camp-500/40 flex items-center justify-center text-4xl mx-auto mb-5">
          ✓
        </div>
        <h1 className="text-4xl font-black text-white mb-2">Order Confirmed!</h1>
        <p className="text-gray-400 text-base">
          {order ? `Order #${order.id.slice(-8).toUpperCase()}` : 'Your payment was received.'}
        </p>
      </div>

      {order && (
        <div className="space-y-4 mb-8">
          {/* Items */}
          <div className="bg-surface-800 border border-surface-700 rounded-2xl divide-y divide-surface-700">
            {order.items.map((item) => (
              <div key={item.id} className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm leading-snug">{item.name}</p>
                  {item.variantName && <p className="text-gray-500 text-xs">{item.variantName}</p>}
                  <p className="text-gray-500 text-xs">Qty: {item.quantity}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-brand-400 font-bold text-sm">${(item.price * item.quantity).toFixed(2)}</p>
                  {item.downloadUrl && (
                    <a
                      href={item.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-1 text-xs bg-camp-500/20 border border-camp-500/40 text-camp-400 hover:text-camp-300 px-2 py-0.5 rounded-lg transition-colors"
                    >
                      Download ↓
                    </a>
                  )}
                </div>
              </div>
            ))}
            <div className="px-5 py-3 flex justify-between text-sm">
              <span className="text-gray-400">Total paid</span>
              <span className="text-white font-bold">${order.total.toFixed(2)}</span>
            </div>
            {order.discount > 0 && (
              <div className="px-5 pb-3 flex justify-between text-xs text-brand-400">
                <span>Member discount applied</span>
                <span>−${order.discount.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Shipping address */}
          {hasPhysical && order.shippingLine1 && (
            <div className="bg-surface-800 border border-surface-700 rounded-2xl px-5 py-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Shipping to</p>
              <p className="text-white text-sm">{order.shippingName}</p>
              <p className="text-gray-400 text-sm">{order.shippingLine1}</p>
              <p className="text-gray-400 text-sm">
                {[order.shippingCity, order.shippingState, order.shippingZip, order.shippingCountry].filter(Boolean).join(', ')}
              </p>
            </div>
          )}

          {/* Digital note */}
          {hasDigital && (
            <div className="bg-surface-800 border border-surface-600 rounded-2xl px-5 py-4">
              <p className="text-sm text-gray-300">
                <span className="text-brand-400 font-semibold">Digital downloads</span> are available for 7 days from purchase.
                You can also find them in your{' '}
                <Link href="/shop/orders" className="text-brand-400 hover:text-brand-300">order history</Link>.
              </p>
            </div>
          )}
        </div>
      )}

      {!order && !loading && (
        <div className="bg-surface-800 border border-surface-700 rounded-2xl px-6 py-5 mb-8 text-center">
          <p className="text-gray-400 text-sm">
            Your payment was processed. If you have an account, check your{' '}
            <Link href="/shop/orders" className="text-brand-400 hover:text-brand-300">order history</Link> for details.
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/shop"
          className="text-center bg-brand-500 hover:bg-brand-600 text-black font-bold px-8 py-3 rounded-xl transition-colors"
        >
          Back to The Ark
        </Link>
        <Link
          href="/shop/orders"
          className="text-center border border-surface-600 hover:border-surface-400 text-gray-300 hover:text-white px-8 py-3 rounded-xl transition-colors"
        >
          My Orders
        </Link>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-500">Loading…</p>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
