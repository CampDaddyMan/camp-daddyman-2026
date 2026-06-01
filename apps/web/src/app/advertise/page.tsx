'use client';

import { useEffect, useState, useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import api from '@/lib/api';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface Placement {
  id: string;
  name: string;
  location: string;
  description?: string;
  pricePerDay: number;
  width?: number;
  height?: number;
}

const LOCATION_LABELS: Record<string, string> = {
  'watch-below-player': 'Watch Page — Below Player',
  'shop-banner':        'The Ark Shop — Banner',
  'home-mid-banner':    'Homepage — Mid Banner',
  'browse-banner':      'Browse Page — Banner',
};

const STRIPE_APPEARANCE = {
  theme: 'night' as const,
  variables: {
    colorPrimary: '#f8c202',
    colorBackground: '#1a1a1a',
    colorText: '#ffffff',
    colorDanger: '#f87171',
    borderRadius: '12px',
    fontFamily: 'inherit',
  },
};

// ── Step 2: embedded payment form ─────────────────────────────────────────────

function PaymentStep({
  total,
  onBack,
}: {
  total: number;
  onBack: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setPaying(true);
    setError('');

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/advertise/success`,
      },
    });

    if (stripeError) {
      setError(stripeError.message || 'Payment failed. Please try again.');
      setPaying(false);
    }
    // On success, Stripe redirects — no need to handle here
  }

  return (
    <form onSubmit={handlePay} className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <button
          type="button"
          onClick={onBack}
          className="text-gray-400 hover:text-white text-sm transition-colors"
        >
          ← Back
        </button>
        <h2 className="text-lg font-bold text-white">Payment</h2>
      </div>

      <PaymentElement options={{ layout: 'tabs' }} />

      {error && (
        <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">{error}</p>
      )}

      <button
        type="submit"
        disabled={!stripe || paying}
        className="w-full bg-brand-500 hover:bg-brand-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold py-4 rounded-xl text-base transition-colors"
      >
        {paying ? 'Processing…' : `Pay $${total.toFixed(2)}`}
      </button>

      <p className="text-xs text-gray-600 text-center leading-relaxed">
        Your ad goes live after a quick content review (typically within 1 business day).
        If rejected for any reason, you'll receive a full refund automatically.
      </p>
    </form>
  );
}

// ── Step 1: ad details form ───────────────────────────────────────────────────

export default function AdvertisePage() {
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [selectedPlacement, setSelectedPlacement] = useState('');
  const [form, setForm] = useState({
    companyName: '', contactName: '', email: '', website: '',
    startsAt: '', endsAt: '',
    adTitle: '', adBody: '', adLinkUrl: '', adImageUrl: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clientSecret, setClientSecret] = useState('');

  useEffect(() => {
    api.get('/partners/placements/public')
      .then((r) => {
        setPlacements(r.data.placements ?? []);
        if (r.data.placements?.length) setSelectedPlacement(r.data.placements[0].id);
      })
      .catch(() => {});
  }, []);

  const placement = placements.find((p) => p.id === selectedPlacement);
  const days = (() => {
    if (!form.startsAt || !form.endsAt) return 0;
    const d = Math.ceil((new Date(form.endsAt).getTime() - new Date(form.startsAt).getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, d);
  })();
  const total = placement ? days * placement.pricePerDay : 0;

  function set(key: keyof typeof form, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  const handleBack = useCallback(() => setClientSecret(''), []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlacement) return setError('Please select a placement.');
    if (days < 1) return setError('End date must be after start date.');
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/partners/apply', {
        ...form,
        placementId: selectedPlacement,
      });
      setClientSecret(data.clientSecret);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2: show payment element ──────────────────────────────────────────
  if (clientSecret) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white mb-1">Complete Your Booking</h1>
          <p className="text-gray-400 text-sm">
            {placement?.name} · {days} day{days !== 1 ? 's' : ''} ·{' '}
            <span className="text-brand-400 font-semibold">${total.toFixed(2)}</span>
          </p>
        </div>
        <Elements
          stripe={stripePromise}
          options={{ clientSecret, appearance: STRIPE_APPEARANCE }}
        >
          <PaymentStep total={total} onBack={handleBack} />
        </Elements>
      </div>
    );
  }

  // ── Step 1: ad details form ───────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-white mb-3">Advertise on Camp DaddyMan</h1>
        <p className="text-gray-400 text-base leading-relaxed">
          Reach a focused community of listeners, viewers, and fans of authentic Black culture and music.
          Choose a placement, set your dates, upload your creative, and pay — your ad goes live after a quick content review.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Company Info */}
        <section>
          <h2 className="text-lg font-bold text-white mb-4">Your Info</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Company / Brand Name *</label>
              <input
                required
                value={form.companyName}
                onChange={(e) => set('companyName', e.target.value)}
                className="w-full bg-surface-800 border border-surface-600 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-400 text-sm"
                placeholder="Acme Corp"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Contact Name *</label>
              <input
                required
                value={form.contactName}
                onChange={(e) => set('contactName', e.target.value)}
                className="w-full bg-surface-800 border border-surface-600 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-400 text-sm"
                placeholder="Jane Smith"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Email Address *</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                className="w-full bg-surface-800 border border-surface-600 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-400 text-sm"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Website</label>
              <input
                type="url"
                value={form.website}
                onChange={(e) => set('website', e.target.value)}
                className="w-full bg-surface-800 border border-surface-600 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-400 text-sm"
                placeholder="https://yourcompany.com"
              />
            </div>
          </div>
        </section>

        {/* Placement Picker */}
        <section>
          <h2 className="text-lg font-bold text-white mb-4">Choose a Placement</h2>
          <div className="space-y-3">
            {placements.map((p) => (
              <button
                type="button"
                key={p.id}
                onClick={() => setSelectedPlacement(p.id)}
                className={`w-full text-left flex items-center justify-between px-5 py-4 rounded-xl border transition-colors ${
                  selectedPlacement === p.id
                    ? 'border-brand-400 bg-brand-400/8'
                    : 'border-surface-600 bg-surface-800 hover:border-surface-500'
                }`}
              >
                <div>
                  <p className="text-white font-semibold text-sm">{p.name}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{LOCATION_LABELS[p.location] || p.location}{p.description ? ` — ${p.description}` : ''}</p>
                  {p.width && p.height && (
                    <p className="text-gray-600 text-xs mt-0.5">{p.width} × {p.height}px</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="text-brand-400 font-bold text-base">${p.pricePerDay.toFixed(0)}<span className="text-gray-500 font-normal text-xs">/day</span></p>
                  {selectedPlacement === p.id && (
                    <span className="text-brand-400 text-xs font-semibold">Selected</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Dates */}
        <section>
          <h2 className="text-lg font-bold text-white mb-4">Campaign Dates</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Start Date *</label>
              <input
                required
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={form.startsAt}
                onChange={(e) => set('startsAt', e.target.value)}
                className="w-full bg-surface-800 border border-surface-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-400 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">End Date *</label>
              <input
                required
                type="date"
                min={form.startsAt || new Date().toISOString().split('T')[0]}
                value={form.endsAt}
                onChange={(e) => set('endsAt', e.target.value)}
                className="w-full bg-surface-800 border border-surface-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-400 text-sm"
              />
            </div>
          </div>
          {days > 0 && placement && (
            <div className="mt-3 flex items-center justify-between bg-surface-800 border border-surface-600 rounded-xl px-4 py-3">
              <p className="text-gray-400 text-sm">{days} day{days !== 1 ? 's' : ''} × ${placement.pricePerDay.toFixed(0)}/day</p>
              <p className="text-brand-400 font-bold text-lg">${total.toFixed(2)}</p>
            </div>
          )}
        </section>

        {/* Creative */}
        <section>
          <h2 className="text-lg font-bold text-white mb-4">Ad Creative</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Headline *</label>
              <input
                required
                maxLength={80}
                value={form.adTitle}
                onChange={(e) => set('adTitle', e.target.value)}
                className="w-full bg-surface-800 border border-surface-600 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-400 text-sm"
                placeholder="Short, punchy headline (max 80 chars)"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Body Copy</label>
              <textarea
                rows={3}
                maxLength={200}
                value={form.adBody}
                onChange={(e) => set('adBody', e.target.value)}
                className="w-full bg-surface-800 border border-surface-600 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-400 text-sm resize-none"
                placeholder="Optional supporting text (max 200 chars)"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Destination URL *</label>
              <input
                required
                type="url"
                value={form.adLinkUrl}
                onChange={(e) => set('adLinkUrl', e.target.value)}
                className="w-full bg-surface-800 border border-surface-600 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-400 text-sm"
                placeholder="https://your-landing-page.com"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Image URL</label>
              <input
                type="url"
                value={form.adImageUrl}
                onChange={(e) => set('adImageUrl', e.target.value)}
                className="w-full bg-surface-800 border border-surface-600 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-400 text-sm"
                placeholder="https://your-cdn.com/ad-image.jpg (optional)"
              />
              {placement?.width && placement?.height && (
                <p className="text-xs text-gray-600 mt-1.5">Recommended: {placement.width} × {placement.height}px, JPG or PNG</p>
              )}
            </div>
          </div>
        </section>

        {error && (
          <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">{error}</p>
        )}

        {/* Summary + Submit */}
        <div className="border border-surface-600 rounded-xl p-5 bg-surface-800/50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white font-semibold">Total Due Today</p>
              <p className="text-gray-500 text-xs mt-0.5">You'll enter payment details on the next step</p>
            </div>
            <p className="text-brand-400 font-black text-2xl">${total > 0 ? total.toFixed(2) : '—'}</p>
          </div>
          <p className="text-xs text-gray-600 mb-4 leading-relaxed">
            Your ad will go live after a quick content review (typically within 1 business day).
            If rejected for any reason, you'll receive a full refund automatically.
          </p>
          <button
            type="submit"
            disabled={loading || days < 1 || !selectedPlacement}
            className="w-full bg-brand-500 hover:bg-brand-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold py-4 rounded-xl text-base transition-colors"
          >
            {loading ? 'Setting up payment…' : `Continue to Payment — $${total > 0 ? total.toFixed(2) : '0.00'}`}
          </button>
        </div>
      </form>
    </div>
  );
}
