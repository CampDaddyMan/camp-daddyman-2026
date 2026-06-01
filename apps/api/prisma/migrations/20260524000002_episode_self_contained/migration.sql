-- Episode becomes self-contained: drop Content FK, add own media fields

DROP INDEX IF EXISTS "Episode_contentId_key";
ALTER TABLE "Episode" DROP CONSTRAINT IF EXISTS "Episode_contentId_fkey";
ALTER TABLE "Episode" DROP COLUMN IF EXISTS "contentId";

ALTER TABLE "Episode" ADD COLUMN "title"        TEXT NOT NULL DEFAULT '';
ALTER TABLE "Episode" ADD COLUMN "description"  TEXT;
ALTER TABLE "Episode" ADD COLUMN "thumbnailUrl" TEXT;
ALTER TABLE "Episode" ADD COLUMN "mediaUrl"     TEXT;
ALTER TABLE "Episode" ADD COLUMN "hlsUrl"       TEXT;
ALTER TABLE "Episode" ADD COLUMN "duration"     INTEGER;
ALTER TABLE "Episode" ADD COLUMN "views"        INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Episode" ADD COLUMN "rating"       TEXT;

ALTER TABLE "Episode" ALTER COLUMN "title" DROP DEFAULT;
