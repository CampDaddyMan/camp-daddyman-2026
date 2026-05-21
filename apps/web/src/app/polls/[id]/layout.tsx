import { Metadata } from 'next';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://campdaddyman.com';

async function fetchPoll(id: string) {
  try {
    const res = await fetch(`${API}/polls/${id}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return (await res.json()).poll ?? null;
  } catch { return null; }
}

export async function generateMetadata(
  { params }: { params: { id: string } },
): Promise<Metadata> {
  const poll = await fetchPoll(params.id);
  if (!poll) return { title: 'Camp DaddyMan' };

  const title = poll.title;
  const description = poll.description
    || `Cast your vote — ${poll._count?.votes ?? 0} votes so far on Camp DaddyMan`;
  const image = poll.imageUrl || `${SITE_URL}/CAMPDADDYMAN_GOLD_MEMBERSHIP_LOGO-V4.png`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
      type: 'website',
      url: `${SITE_URL}/polls/${params.id}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

export default function PollLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
