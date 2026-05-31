export type ContentType = 'FILM' | 'MUSIC' | 'PODCAST' | 'SPOKEN_WORD' | 'DADDYMAN_ISMS' | 'BOOK';
export type ContentStatus = 'PROCESSING' | 'ACTIVE' | 'SCHEDULED' | 'ARCHIVED' | 'DELETED';
export type Privacy = 'PUBLIC' | 'PRIVATE' | 'SUBSCRIBERS_ONLY';
export type SubscriptionPlan = 'FREE' | 'PRO' | 'PREMIUM' | 'CREATOR';
export type SubscriptionStatus = 'ACTIVE' | 'CANCELLED' | 'PAST_DUE' | 'TRIALING';

export interface User {
  id: string;
  email: string;
  username: string;
  displayName?: string;
  avatar?: string;
  bio?: string;
  isAdmin: boolean;
  isCreator: boolean;
  isTester?: boolean;
  emailVerified?: boolean;
  xp?: number;
  subscription?: { plan: SubscriptionPlan; status: SubscriptionStatus; currentPeriodEnd?: string } | null;
}

export interface Content {
  id: string;
  title: string;
  description?: string;
  type: ContentType;
  status: ContentStatus;
  privacy: Privacy;
  mediaUrl?: string;
  hlsUrl?: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  chapters?: Array<{ time: number; label: string }> | null;
  duration?: number;
  tags: string[];
  views: number;
  cardWidth?: number;
  cardAspect?: string;

  createdAt: string;
  creator: { username: string; displayName?: string; avatar?: string };
  credits?: { id: string; role: string; user: { username: string; displayName?: string | null; avatar?: string | null } }[];
  _count?: { likes: number; comments: number };
}

export interface Profile {
  id: string;
  name: string;
  avatar: string | null;
  isKids: boolean;
  order: number;
  createdAt: string;
}

export interface Comment {
  id: string;
  text: string;
  createdAt: string;
  parentId?: string | null;
  isPinned?: boolean;
  isLiked: boolean;
  _count: { likes: number; replies: number };
  user: { id: string; username: string; displayName?: string; avatar?: string };
  replies?: Comment[];
}
