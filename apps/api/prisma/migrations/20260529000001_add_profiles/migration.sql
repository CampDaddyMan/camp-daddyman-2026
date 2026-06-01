CREATE TABLE "Profile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "avatar" TEXT,
  "isKids" BOOLEAN NOT NULL DEFAULT false,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Profile_userId_idx" ON "Profile"("userId");
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ProfileWatchHistory" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "contentId" TEXT NOT NULL,
  "progress" INTEGER NOT NULL DEFAULT 0,
  "watchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProfileWatchHistory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProfileWatchHistory_profileId_contentId_key" ON "ProfileWatchHistory"("profileId", "contentId");
CREATE INDEX "ProfileWatchHistory_profileId_idx" ON "ProfileWatchHistory"("profileId");
ALTER TABLE "ProfileWatchHistory" ADD CONSTRAINT "ProfileWatchHistory_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfileWatchHistory" ADD CONSTRAINT "ProfileWatchHistory_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
