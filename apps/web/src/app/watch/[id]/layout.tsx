import { Metadata } from 'next';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://campdaddyman.com';

async function fetchContentPreview(id: string) {
  try {
    const res = await fetch(`${API}/content/${id}`, { next: { revalidate: 60 } });
    const data = await res.json();
    // Success: return content; 403 subscriber-gate: return preview
    if (res.ok) return data.content;
    if (data.requiresSubscription && data.preview) return data.preview;
    return null;
  } catch { return null; }
}

export async function generateMetadata(
  { params }: { params: { id: string } },
): Promise<Metadata> {
  const content = await fetchContentPreview(params.id);
  if (!content) return { title: 'Camp DaddyMan' };

  const creator = content.creator?.displayName || content.creator?.username || 'Camp DaddyMan';
  const typeLabel = content.type?.replace('_', ' ') ?? '';
  const title = content.title;
  const description = content.description
    || `${typeLabel} by ${creator} on Camp DaddyMan`;
  const image = content.thumbnailUrl || `${SITE_URL}/og-default.png`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: image, width: 1280, height: 720, alt: title }],
      type: 'video.other',
      url: `${SITE_URL}/watch/${params.id}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

export default function WatchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
