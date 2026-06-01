CREATE TABLE "LoyaltyReward" (
  "id"          TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "xpCost"      INTEGER NOT NULL,
  "type"        TEXT NOT NULL,
  "value"       TEXT,
  "stock"       INTEGER,
  "active"      BOOLEAN NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "LoyaltyRedemption" (
  "id"        TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"    TEXT NOT NULL,
  "rewardId"  TEXT NOT NULL,
  "xpSpent"   INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoyaltyRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "LoyaltyRedemption_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "LoyaltyReward"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "LoyaltyRedemption_userId_rewardId_key" ON "LoyaltyRedemption"("userId", "rewardId");
CREATE INDEX "LoyaltyRedemption_userId_idx" ON "LoyaltyRedemption"("userId");
