CREATE TYPE "GoodDoneType" AS ENUM ('GOOD', 'CREATION', 'PRESERVATION', 'RECONCILIATION');
CREATE TYPE "GoodDoneStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "GoodDone" (
  "id"           TEXT NOT NULL,
  "userId"       TEXT NOT NULL,
  "type"         "GoodDoneType" NOT NULL,
  "description"  TEXT NOT NULL,
  "status"       "GoodDoneStatus" NOT NULL DEFAULT 'PENDING',
  "witnessNote"  TEXT,
  "verifiedById" TEXT,
  "verifiedAt"   TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GoodDone_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GoodDone_userId_status_idx"   ON "GoodDone"("userId", "status");
CREATE INDEX "GoodDone_status_createdAt_idx" ON "GoodDone"("status", "createdAt");

ALTER TABLE "GoodDone" ADD CONSTRAINT "GoodDone_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GoodDone" ADD CONSTRAINT "GoodDone_verifiedById_fkey"
  FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
