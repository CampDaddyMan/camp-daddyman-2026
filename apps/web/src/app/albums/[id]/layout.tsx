import { Metadata } from 'next';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://campdaddyman.com';

async function fetchAlbum(id: string) {
  try {
    const res = await fetch(`${API}/albums/${id}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return (await res.json()).album ?? null;
  } catch { return null; }
}

export async function generateMetadata(
  { params }: { params: { id: string } },
): Promise<Metadata> {
  const album = await fetchAlbum(params.id);
  if (!album) return { title: 'Camp DaddyMan' };

  const creator = album.creator?.displayName || album.creator?.username || 'Camp DaddyMan';
  const typeLabel = album.releaseType?.charAt(0) + album.releaseType?.slice(1).toLowerCase();
  const title = album.title;
  const description = album.description
    || `${typeLabel} by ${creator} — ${album._count?.tracks ?? 0} tracks on Camp DaddyMan`;
  const image = album.coverUrl || `${SITE_URL}/CAMPDADDYMAN_GOLD_MEMBERSHIP_LOGO-V4.png`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: image, width: 1200, height: 1200, alt: title }],
      type: 'music.album',
      url: `${SITE_URL}/albums/${params.id}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

export default function AlbumLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
