-- Fills every schema gap not covered by committed migrations.
-- All statements use IF NOT EXISTS / IF EXISTS so this is safe to
-- re-run against a database that already has some of these objects.

-- ── Missing columns on existing tables ──────────────────────────────────────

ALTER TABLE "Content"
  ADD COLUMN IF NOT EXISTS "publishAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "featured"  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "rating"    TEXT;

ALTER TABLE "Comment"
  ADD COLUMN IF NOT EXISTS "parentId" TEXT;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "emailNewFollower" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "emailNewContent"  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "emailNewComment"  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "emailNewTip"      BOOLEAN NOT NULL DEFAULT true;

-- Self-referential FK on Comment (parentId → id)
DO $$ BEGIN
  ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "Comment_parentId_idx" ON "Comment"("parentId");

-- ── ViewLog ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "ViewLog" (
  "id"        TEXT NOT NULL,
  "contentId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ViewLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ViewLog_contentId_createdAt_idx" ON "ViewLog"("contentId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "ViewLog" ADD CONSTRAINT "ViewLog_contentId_fkey"
    FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── SavedContent ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "SavedContent" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "contentId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SavedContent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SavedContent_userId_contentId_key" ON "SavedContent"("userId", "contentId");

DO $$ BEGIN
  ALTER TABLE "SavedContent" ADD CONSTRAINT "SavedContent_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "SavedContent" ADD CONSTRAINT "SavedContent_contentId_fkey"
    FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── CommentLike ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "CommentLike" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "commentId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommentLike_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CommentLike_userId_commentId_key" ON "CommentLike"("userId", "commentId");

DO $$ BEGIN
  ALTER TABLE "CommentLike" ADD CONSTRAINT "CommentLike_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "CommentLike" ADD CONSTRAINT "CommentLike_commentId_fkey"
    FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Tip ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Tip" (
  "id"              TEXT NOT NULL,
  "amountCents"     INTEGER NOT NULL,
  "message"         TEXT,
  "stripeSessionId" TEXT NOT NULL,
  "senderId"        TEXT NOT NULL,
  "recipientId"     TEXT NOT NULL,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Tip_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Tip_stripeSessionId_key" ON "Tip"("stripeSessionId");
CREATE INDEX IF NOT EXISTS "Tip_recipientId_idx" ON "Tip"("recipientId");
CREATE INDEX IF NOT EXISTS "Tip_senderId_idx"    ON "Tip"("senderId");

DO $$ BEGIN
  ALTER TABLE "Tip" ADD CONSTRAINT "Tip_senderId_fkey"
    FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Tip" ADD CONSTRAINT "Tip_recipientId_fkey"
    FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Album (enum + tables) ────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "AlbumReleaseType" AS ENUM ('ALBUM', 'EP', 'SINGLE', 'COMPILATION');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "Album" (
  "id"          TEXT NOT NULL,
  "title"       TEXT NOT NULL,
  "description" TEXT,
  "coverUrl"    TEXT,
  "releaseDate" TIMESTAMP(3),
  "genre"       TEXT,
  "releaseType" "AlbumReleaseType" NOT NULL DEFAULT 'ALBUM',
  "privacy"     "Privacy" NOT NULL DEFAULT 'PUBLIC',
  "creatorId"   TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Album_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Album_creatorId_idx"                    ON "Album"("creatorId");
CREATE INDEX IF NOT EXISTS "Album_privacy_releaseType_createdAt_idx" ON "Album"("privacy", "releaseType", "createdAt");

DO $$ BEGIN
  ALTER TABLE "Album" ADD CONSTRAINT "Album_creatorId_fkey"
    FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "AlbumTrack" (
  "albumId"     TEXT NOT NULL,
  "contentId"   TEXT NOT NULL,
  "trackNumber" INTEGER NOT NULL,
  "discNumber"  INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "AlbumTrack_pkey" PRIMARY KEY ("albumId", "contentId")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AlbumTrack_albumId_discNumber_trackNumber_key"
  ON "AlbumTrack"("albumId", "discNumber", "trackNumber");
CREATE INDEX IF NOT EXISTS "AlbumTrack_contentId_idx" ON "AlbumTrack"("contentId");

DO $$ BEGIN
  ALTER TABLE "AlbumTrack" ADD CONSTRAINT "AlbumTrack_albumId_fkey"
    FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "AlbumTrack" ADD CONSTRAINT "AlbumTrack_contentId_fkey"
    FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── ProductReview ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "ProductReview" (
  "id"        TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "rating"    INTEGER NOT NULL,
  "title"     TEXT,
  "body"      TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProductReview_productId_userId_key" ON "ProductReview"("productId", "userId");
CREATE INDEX IF NOT EXISTS "ProductReview_productId_idx" ON "ProductReview"("productId");

DO $$ BEGIN
  ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Playlist ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Playlist" (
  "id"          TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "coverUrl"    TEXT,
  "isPublic"    BOOLEAN NOT NULL DEFAULT false,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Playlist_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Playlist_userId_idx" ON "Playlist"("userId");

DO $$ BEGIN
  ALTER TABLE "Playlist" ADD CONSTRAINT "Playlist_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "PlaylistItem" (
  "id"         TEXT NOT NULL,
  "playlistId" TEXT NOT NULL,
  "contentId"  TEXT NOT NULL,
  "position"   INTEGER NOT NULL,
  "addedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlaylistItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PlaylistItem_playlistId_contentId_key" ON "PlaylistItem"("playlistId", "contentId");
CREATE INDEX IF NOT EXISTS "PlaylistItem_playlistId_position_idx" ON "PlaylistItem"("playlistId", "position");

DO $$ BEGIN
  ALTER TABLE "PlaylistItem" ADD CONSTRAINT "PlaylistItem_playlistId_fkey"
    FOREIGN KEY ("playlistId") REFERENCES "Playlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "PlaylistItem" ADD CONSTRAINT "PlaylistItem_contentId_fkey"
    FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── LiveStream ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "LiveStream" (
  "id"            TEXT NOT NULL,
  "title"         TEXT NOT NULL,
  "description"   TEXT,
  "status"        TEXT NOT NULL DEFAULT 'idle',
  "thumbnailUrl"  TEXT,
  "cfStreamId"    TEXT NOT NULL,
  "cfStreamKey"   TEXT NOT NULL,
  "cfPlaybackUrl" TEXT NOT NULL,
  "cfWebRtcUrl"   TEXT,
  "scheduledAt"   TIMESTAMP(3),
  "startedAt"     TIMESTAMP(3),
  "endedAt"       TIMESTAMP(3),
  "creatorId"     TEXT NOT NULL,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LiveStream_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LiveStream_cfStreamId_key" ON "LiveStream"("cfStreamId");
CREATE INDEX IF NOT EXISTS "LiveStream_status_idx"    ON "LiveStream"("status");
CREATE INDEX IF NOT EXISTS "LiveStream_creatorId_idx" ON "LiveStream"("creatorId");

DO $$ BEGIN
  ALTER TABLE "LiveStream" ADD CONSTRAINT "LiveStream_creatorId_fkey"
    FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── BannerSlide ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "BannerSlide" (
  "id"             TEXT NOT NULL,
  "page"           TEXT NOT NULL,
  "imageUrl"       TEXT NOT NULL,
  "linkUrl"        TEXT,
  "caption"        TEXT,
  "objectPosition" TEXT NOT NULL DEFAULT 'center',
  "objectFit"      TEXT NOT NULL DEFAULT 'cover',
  "sortOrder"      INTEGER NOT NULL DEFAULT 0,
  "active"         BOOLEAN NOT NULL DEFAULT true,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BannerSlide_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BannerSlide_page_sortOrder_idx" ON "BannerSlide"("page", "sortOrder");
