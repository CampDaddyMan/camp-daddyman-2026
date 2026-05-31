ALTER TABLE "User" ADD COLUMN "xp" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "UserXpEvent" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "type"      TEXT NOT NULL,
  "refId"     TEXT NOT NULL,
  "xp"        INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserXpEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserXpEvent_userId_type_refId_key" ON "UserXpEvent"("userId", "type", "refId");
CREATE INDEX "UserXpEvent_userId_idx" ON "UserXpEvent"("userId");

ALTER TABLE "UserXpEvent" ADD CONSTRAINT "UserXpEvent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
