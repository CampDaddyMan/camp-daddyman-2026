-- Series, Season, Episode, SeriesComment base tables
-- trailerUrl added in 20260524000001
-- Episode restructured (contentId removed, media fields added) in 20260524000002

CREATE TABLE "Series" (
  "id"          TEXT NOT NULL,
  "title"       TEXT NOT NULL,
  "description" TEXT,
  "coverUrl"    TEXT,
  "bannerUrl"   TEXT,
  "genre"       TEXT,
  "tags"        TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "status"      TEXT NOT NULL DEFAULT 'ACTIVE',
  "privacy"     "Privacy" NOT NULL DEFAULT 'PUBLIC',
  "creatorId"   TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Series_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Series_creatorId_idx" ON "Series"("creatorId");
CREATE INDEX "Series_privacy_status_idx" ON "Series"("privacy", "status");

ALTER TABLE "Series" ADD CONSTRAINT "Series_creatorId_fkey"
  FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SeriesComment" (
  "id"        TEXT NOT NULL,
  "text"      TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "seriesId"  TEXT NOT NULL,
  "parentId"  TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SeriesComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SeriesComment_seriesId_idx" ON "SeriesComment"("seriesId");
CREATE INDEX "SeriesComment_parentId_idx" ON "SeriesComment"("parentId");

ALTER TABLE "SeriesComment" ADD CONSTRAINT "SeriesComment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SeriesComment" ADD CONSTRAINT "SeriesComment_seriesId_fkey"
  FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SeriesComment" ADD CONSTRAINT "SeriesComment_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "SeriesComment"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE TABLE "Season" (
  "id"          TEXT NOT NULL,
  "seriesId"    TEXT NOT NULL,
  "number"      INTEGER NOT NULL,
  "title"       TEXT,
  "description" TEXT,
  "coverUrl"    TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Season_seriesId_number_key" ON "Season"("seriesId", "number");
CREATE INDEX "Season_seriesId_idx" ON "Season"("seriesId");

ALTER TABLE "Season" ADD CONSTRAINT "Season_seriesId_fkey"
  FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Episode starts with a Content FK; 20260524000002 drops it and adds own media fields
CREATE TABLE "Episode" (
  "id"            TEXT NOT NULL,
  "seasonId"      TEXT NOT NULL,
  "contentId"     TEXT,
  "episodeNumber" INTEGER NOT NULL,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Episode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Episode_contentId_key"              ON "Episode"("contentId");
CREATE UNIQUE INDEX "Episode_seasonId_episodeNumber_key" ON "Episode"("seasonId", "episodeNumber");
CREATE INDEX        "Episode_seasonId_idx"               ON "Episode"("seasonId");

ALTER TABLE "Episode" ADD CONSTRAINT "Episode_seasonId_fkey"
  FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Episode" ADD CONSTRAINT "Episode_contentId_fkey"
  FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE SET NULL ON UPDATE CASCADE;
