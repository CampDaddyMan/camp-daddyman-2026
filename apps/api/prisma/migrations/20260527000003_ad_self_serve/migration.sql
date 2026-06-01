-- Add PENDING_REVIEW to AdStatus enum
ALTER TYPE "AdStatus" ADD VALUE IF NOT EXISTS 'PENDING_REVIEW';

-- Add Stripe + advertiser fields to Ad table
ALTER TABLE "Ad"
    ADD COLUMN IF NOT EXISTS "stripeSessionId"       TEXT,
    ADD COLUMN IF NOT EXISTS "stripePaymentIntentId" TEXT,
    ADD COLUMN IF NOT EXISTS "refundId"              TEXT,
    ADD COLUMN IF NOT EXISTS "advertiserEmail"       TEXT;

-- Unique index on stripeSessionId
CREATE UNIQUE INDEX IF NOT EXISTS "Ad_stripeSessionId_key" ON "Ad"("stripeSessionId");
