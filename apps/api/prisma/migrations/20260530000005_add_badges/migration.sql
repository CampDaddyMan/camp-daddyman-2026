CREATE TABLE "UserBadge" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "badge"     TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserBadge_userId_badge_key" ON "UserBadge"("userId", "badge");
CREATE INDEX "UserBadge_userId_idx" ON "UserBadge"("userId");

ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
