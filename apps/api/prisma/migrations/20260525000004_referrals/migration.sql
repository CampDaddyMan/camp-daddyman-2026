ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referredById" TEXT;

ALTER TABLE "User" ADD CONSTRAINT "User_referredById_fkey"
  FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "User_referredById_idx" ON "User"("referredById");
