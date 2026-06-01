CREATE TABLE "Post" (
  "id"        TEXT NOT NULL,
  "text"      TEXT NOT NULL,
  "imageUrl"  TEXT,
  "creatorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Post_creatorId_idx" ON "Post"("creatorId");
CREATE INDEX "Post_createdAt_idx" ON "Post"("createdAt" DESC);
ALTER TABLE "Post" ADD CONSTRAINT "Post_creatorId_fkey"
  FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
