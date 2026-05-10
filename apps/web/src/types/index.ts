export type ContentType = 'FILM' | 'MUSIC' | 'PODCAST' | 'SPOKEN_WORD';
export type ContentStatus = 'PROCESSING' | 'ACTIVE' | 'ARCHIVED' | 'DELETED';
export type Privacy = 'PUBLIC' | 'PRIVATE' | 'SUBSCRIBERS_ONLY';
export type SubscriptionPlan = 'FREE' | 'PRO' | 'PREMIUM';
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
  thumbnailUrl?: string;
  duration?: number;
  tags: string[];
  views: number;
  createdAt: string;
  creator: { username: string; displayName?: string; avatar?: string };
  _count?: { likes: number; comments: number };
}

export interface Comment {
  id: string;
  text: string;
  createdAt: string;
  user: { username: string; displayName?: string; avatar?: string };
}
