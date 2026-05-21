import { Metadata } from 'next';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://campdaddyman.com';

async function fetchCreator(username: string) {
  try {
    const res = await fetch(`${API}/creators/${username}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.creator;
  } catch { return null; }
}

export async function generateMetadata(
  { params }: { params: { username: string } },
): Promise<Metadata> {
  const creator = await fetchCreator(params.username);
  if (!creator) return { title: 'Camp DaddyMan' };

  const name = creator.displayName || creator.username;
  const title = `${name} (@${creator.username})`;
  const description = creator.bio
    || `${creator._count?.content ?? 0} pieces · ${creator._count?.followers ?? 0} followers on Camp DaddyMan`;
  const image = creator.avatar || `${SITE_URL}/CAMPDADDYMAN_GOLD_MEMBERSHIP_LOGO-V4.png`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: image, width: 400, height: 400, alt: name }],
      type: 'profile',
      url: `${SITE_URL}/creator/${params.username}`,
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: [image],
    },
  };
}

export default function CreatorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
