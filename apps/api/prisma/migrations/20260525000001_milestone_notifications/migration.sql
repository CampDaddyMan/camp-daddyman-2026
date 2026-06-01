-- Add MILESTONE to NotificationType enum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'MILESTONE';

-- Add milestone columns to Notification
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "milestone" INTEGER;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "milestoneKind" TEXT;
