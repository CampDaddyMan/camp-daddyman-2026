'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

interface OrderItem {
  id: string;
  name: string;
  variantName?: string;
  quantity: number;
  price: number;
  downloadUrl?: string;
  downloadExpiry?: string;
  product: { id: string; name: string; type: string };
}

interface Order {
  id: string;
  status: string;
  total: number;
  discount: number;
  subtotal: number;
  trackingNumber?: string;
  createdAt: string;
  items: OrderItem[];
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PAID:        { label: 'Paid',        color: 'text-camp-400 bg-camp-500/10 border-camp-500/30' },
  PROCESSING:  { label: 'Processing',  color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' },
  SHIPPED:     { label: 'Shipped',     color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  DELIVERED:   { label: 'Delivered',   color: 'text-brand-400 bg-brand-500/10 border-brand-500/30' },
  CANCELLED:   { label: 'Cancelled',   color: 'text-red-400 bg-red-500/10 border-red-500/30' },
  REFUNDED:    { label: 'Refunded',    color: 'text-gray-400 bg-surface-700 border-surface-600' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_LABELS[status] ?? { label: status, color: 'text-gray-400 bg-surface-700 border-surface-600' };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/shop/orders');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    api.get('/shop/orders')
      .then((r) => setOrders(r.data.orders))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-surface-800 rounded-2xl p-5 animate-pulse">
            <div className="flex justify-between mb-3">
              <div className="h-4 bg-surface-700 rounded w-32" />
              <div className="h-4 bg-surface-700 rounded w-16" />
            </div>
            <div className="h-3 bg-surface-700 rounded w-48" />
          </div>
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <p className="text-5xl mb-4">📦</p>
        <h2 className="text-2xl font-bold text-white mb-2">No orders yet</h2>
        <p className="text-gray-500 mb-8">When you make a purchase, it'll show up here.</p>
        <Link
          href="/shop"
          className="inline-block bg-brand-500 hover:bg-brand-600 text-black font-bold px-8 py-3 rounded-xl transition-colors"
        >
          Browse The Ark
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
        <Link href="/shop" className="hover:text-brand-400 transition-colors">The Ark</Link>
        <span>/</span>
        <span className="text-gray-300">My Orders</span>
      </nav>

      <h1 className="text-3xl font-black text-white mb-8">My Orders</h1>

      <div className="space-y-4">
        {orders.map((order) => {
          const date = new Date(order.createdAt).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
          });
          const isOpen = expanded === order.id;
          const hasDownloads = order.items.some((i) => i.downloadUrl);

          return (
            <div
              key={order.id}
              className="bg-surface-800 border border-surface-700 hover:border-surface-600 rounded-2xl overflow-hidden transition-colors"
            >
              {/* Header row */}
              <button
                onClick={() => setExpanded(isOpen ? null : order.id)}
                className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <StatusBadge status={order.status} />
                  <div className="min-w-0">
                    <p className="text-white font-semibold text-sm">
                      Order #{order.id.slice(-8).toUpperCase()}
                    </p>
                    <p className="text-gray-500 text-xs">{date} · {order.items.length} item{order.items.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {hasDownloads && (
                    <span className="text-xs text-camp-400 font-medium hidden sm:inline">Has downloads</span>
                  )}
                  <span className="text-brand-400 font-bold">${order.total.toFixed(2)}</span>
                  <span className="text-gray-500 text-sm">{isOpen ? '▲' : '▼'}</span>
                </div>
              </button>

              {/* Expanded details */}
              {isOpen && (
                <div className="border-t border-surface-700 px-5 py-4 space-y-4">
                  {/* Items */}
                  <div className="space-y-3">
                    {order.items.map((item) => {
                      const expiry = item.downloadExpiry
                        ? new Date(item.downloadExpiry).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : null;
                      const expired = item.downloadExpiry ? new Date(item.downloadExpiry) < new Date() : false;

                      return (
                        <div key={item.id} className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium">{item.name}</p>
                            {item.variantName && <p className="text-gray-500 text-xs">{item.variantName}</p>}
                            <p className="text-gray-500 text-xs">Qty {item.quantity} · ${item.price.toFixed(2)} ea</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-brand-400 font-semibold text-sm">${(item.price * item.quantity).toFixed(2)}</p>
                            {item.downloadUrl && !expired && (
                              <a
                                href={item.downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block mt-1 text-xs bg-camp-500/20 border border-camp-500/40 text-camp-400 hover:text-camp-300 px-2.5 py-0.5 rounded-lg transition-colors"
                              >
                                Download ↓
                              </a>
                            )}
                            {item.downloadUrl && expired && (
                              <span className="inline-block mt-1 text-xs text-gray-600 px-2 py-0.5">Link expired</span>
                            )}
                            {expiry && (
                              <p className="text-xs text-gray-600 mt-0.5">{expired ? 'Expired' : `Expires ${expiry}`}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Order totals */}
                  <div className="border-t border-surface-700 pt-3 space-y-1 text-sm">
                    <div className="flex justify-between text-gray-500">
                      <span>Subtotal</span>
                      <span>${order.subtotal.toFixed(2)}</span>
                    </div>
                    {order.discount > 0 && (
                      <div className="flex justify-between text-brand-400">
                        <span>Member discount</span>
                        <span>−${order.discount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-white font-bold">
                      <span>Total</span>
                      <span>${order.total.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Tracking */}
                  {order.trackingNumber && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl px-4 py-3">
                      <p className="text-xs text-gray-400 mb-0.5">Tracking number</p>
                      <p className="text-blue-400 font-mono text-sm">{order.trackingNumber}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
