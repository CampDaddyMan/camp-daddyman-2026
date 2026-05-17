'use client';

import { useEffect, useState, FormEvent } from 'react';
import Image from 'next/image';
import api from '@/lib/api';

interface Partner {
  id: string;
  name: string;
  website: string | null;
  logo: string | null;
  description: string | null;
  type: string;
  featured: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  ADVERTISER:   'Advertiser',
  SPONSOR:      'Sponsor',
  DONOR:        'Donor',
  COLLABORATOR: 'Collaborator',
};

const TYPE_COLORS: Record<string, string> = {
  ADVERTISER:   'bg-blue-500/20 text-blue-300 border-blue-500/30',
  SPONSOR:      'bg-brand-500/20 text-brand-300 border-brand-500/30',
  DONOR:        'bg-camp-500/20 text-camp-300 border-camp-500/30',
  COLLABORATOR: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
};

function PartnerCard({ partner }: { partner: Partner }) {
  return (
    <div className={`bg-surface-800 rounded-xl p-5 flex flex-col gap-4 border ${partner.featured ? 'border-brand-500/40' : 'border-surface-700'} hover:border-brand-500/60 transition-all`}>
      {partner.featured && (
        <span className="text-[10px] font-bold uppercase tracking-widest text-brand-400">Featured Partner</span>
      )}

      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-lg bg-surface-700 overflow-hidden flex-shrink-0 flex items-center justify-center">
          {partner.logo ? (
            <Image src={partner.logo} alt={partner.name} width={64} height={64} className="object-contain" />
          ) : (
            <span className="text-2xl">🤝</span>
          )}
        </div>
        <div className="min-w-0">
          <h3 className="font-bold text-white text-base leading-tight">{partner.name}</h3>
          <span className={`mt-1 inline-block text-xs font-semibold px-2 py-0.5 rounded-full border ${TYPE_COLORS[partner.type] ?? 'bg-surface-700 text-gray-400 border-surface-600'}`}>
            {TYPE_LABELS[partner.type] ?? partner.type}
          </span>
        </div>
      </div>

      {partner.description && (
        <p className="text-sm text-gray-400 line-clamp-3">{partner.description}</p>
      )}

      {partner.website && (
        <a
          href={partner.website}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-brand-400 hover:text-brand-300 hover:underline mt-auto self-start"
        >
          Visit Website →
        </a>
      )}
    </div>
  );
}

const INQUIRY_TYPES = [
  { value: 'ADVERTISER',   label: 'Advertiser — banner / video / podcast ads' },
  { value: 'SPONSOR',      label: 'Sponsor — branded content & partnerships' },
  { value: 'DONOR',        label: 'Donor — support the mission' },
  { value: 'COLLABORATOR', label: 'Collaborator — creative or business project' },
];

function InquiryForm() {
  const [form, setForm] = useState({ name: '', email: '', company: '', type: 'ADVERTISER', message: '' });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/partners/inquiry', form);
      setSent(true);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Something went wrong — please try again.');
    } finally {
      setLoading(false);
    }
  }

  const inputCls = 'w-full bg-surface-700 border border-surface-600 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 transition-colors placeholder:text-gray-600';

  if (sent) {
    return (
      <div className="text-center py-12">
        <p className="text-4xl mb-4">✅</p>
        <h3 className="text-xl font-bold text-white mb-2">Inquiry received!</h3>
        <p className="text-gray-400 text-sm">Check your inbox — a confirmation is on its way. Our team is on it.</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <p className="text-brand-400 text-xs font-bold uppercase tracking-widest mb-2">Get In Touch</p>
        <h2 className="text-2xl font-black text-white mb-2">Start the Conversation</h2>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 px-4 py-3 rounded-xl">{error}</p>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1.5">Name *</label>
          <input required value={form.name} onChange={set('name')} placeholder="Your name" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1.5">Email *</label>
          <input required type="email" value={form.email} onChange={set('email')} placeholder="you@company.com" className={inputCls} />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1.5">Company / Organization</label>
          <input value={form.company} onChange={set('company')} placeholder="Optional" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1.5">I'm interested in</label>
          <select value={form.type} onChange={set('type')} className={inputCls}>
            {INQUIRY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1.5">Message *</label>
        <textarea
          required
          rows={5}
          value={form.message}
          onChange={set('message')}
          placeholder="Tell us about your goals, budget, timeline — anything that helps us understand what you're looking for."
          className={`${inputCls} resize-none`}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-brand-500 hover:bg-brand-400 text-black font-bold py-3.5 rounded-xl text-sm transition-colors disabled:opacity-50 shadow-[0_0_24px_rgba(232,184,0,0.2)]"
      >
        {loading ? 'Sending...' : 'Send Inquiry →'}
      </button>
    </form>
    </>
  );
}

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    api.get('/partners/public')
      .then(({ data }) => setPartners(data.partners ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const featured = partners.filter((p) => p.featured);
  const rest     = partners.filter((p) => !p.featured);

  return (
    <main className="min-h-screen bg-surface-900 pt-20 pb-16">
      {/* Hero */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-surface-900 to-black" />
        <div className="absolute top-0 left-0 right-0 flex h-1">
          <div className="flex-1 bg-black" />
          <div className="flex-1 bg-brand-500" />
          <div className="flex-1 bg-camp-500" />
          <div className="flex-1 bg-brand-500" />
          <div className="flex-1 bg-black" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 text-center">
          <p className="text-brand-400 text-xs font-bold uppercase tracking-widest mb-3">Community & Commerce</p>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">Our Partners</h1>
          <p className="text-gray-400 text-base md:text-lg max-w-2xl mx-auto">
            The brands, sponsors, and collaborators who believe in the Camp DaddyMan mission — building culture, identity, and legacy.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#inquiry"
              className="px-6 py-3 bg-brand-500 text-black font-bold rounded-xl hover:bg-brand-400 transition-colors"
            >
              Advertise With Us
            </a>
            <a
              href="#inquiry"
              className="px-6 py-3 bg-surface-700 text-white font-semibold rounded-xl hover:bg-surface-600 transition-colors border border-surface-600"
            >
              Become a Sponsor
            </a>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4">
        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && partners.length === 0 && (
          <div className="py-8" />
        )}

        {!loading && featured.length > 0 && (
          <section className="mb-12">
            <h2 className="text-lg font-bold text-white mb-5">Featured Partners</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {featured.map((p) => <PartnerCard key={p.id} partner={p} />)}
            </div>
          </section>
        )}

        {!loading && rest.length > 0 && (
          <section className="mb-12">
            <h2 className="text-lg font-bold text-white mb-5">Community Partners</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {rest.map((p) => <PartnerCard key={p.id} partner={p} />)}
            </div>
          </section>
        )}

        {/* Why advertise */}
        <section className="mt-4 rounded-2xl border border-brand-500/20 bg-gradient-to-br from-brand-500/5 to-camp-500/5 p-8 mb-12">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="flex-1">
              <h2 className="text-2xl font-black text-white mb-3">Why Advertise on Camp DaddyMan?</h2>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex gap-2 items-start"><span className="text-brand-400 mt-0.5">✦</span> Reach a highly engaged audience of culture-forward fathers, artists & creators</li>
                <li className="flex gap-2 items-start"><span className="text-brand-400 mt-0.5">✦</span> Banner placements, video pre-rolls, podcast sponsorships & newsletter features</li>
                <li className="flex gap-2 items-start"><span className="text-brand-400 mt-0.5">✦</span> Real-time impression & click tracking — no guesswork</li>
                <li className="flex gap-2 items-start"><span className="text-brand-400 mt-0.5">✦</span> Flexible pricing — daily, weekly, or campaign-based</li>
                <li className="flex gap-2 items-start"><span className="text-camp-400 mt-0.5">✦</span> Support an independent Black-owned media platform</li>
              </ul>
            </div>
            <div className="flex-shrink-0">
              <a
                href="#inquiry"
                className="block px-8 py-4 bg-brand-500 text-black font-bold rounded-xl hover:bg-brand-400 transition-colors text-center"
              >
                Request Media Kit
              </a>
            </div>
          </div>
        </section>

        {/* Partner With Us — permanent section, no CTA button since the form handles it */}
        <section className="mb-10 text-center">
          <p className="text-4xl mb-4">🤝</p>
          <h2 className="text-2xl font-black text-white mb-3">Partner With Us</h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            We're building something special. Align your brand with culture, community, and impact — fill out the form below and our team will reach out directly.
          </p>
        </section>

        {/* Inquiry form */}
        <section id="inquiry" className="rounded-2xl border border-surface-700 bg-surface-800 p-8">
          <InquiryForm />
        </section>
      </div>
    </main>
  );
}
