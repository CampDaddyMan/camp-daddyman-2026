CREATE TABLE "ContentCredit" (
  "id"        TEXT NOT NULL,
  "contentId" TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "role"      TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContentCredit_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ContentCredit" ADD CONSTRAINT "ContentCredit_contentId_fkey"
  FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContentCredit" ADD CONSTRAINT "ContentCredit_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "ContentCredit_contentId_userId_key" ON "ContentCredit"("contentId", "userId");
CREATE INDEX "ContentCredit_contentId_idx" ON "ContentCredit"("contentId");
CREATE INDEX "ContentCredit_userId_idx"    ON "ContentCredit"("userId");
