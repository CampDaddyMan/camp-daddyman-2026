-- Add startsAt and allowMultiple to Poll
ALTER TABLE "Poll" ADD COLUMN IF NOT EXISTS "startsAt" TIMESTAMP(3);
ALTER TABLE "Poll" ADD COLUMN IF NOT EXISTS "allowMultiple" BOOLEAN NOT NULL DEFAULT false;

-- Drop old unique index (Prisma created this with CREATE UNIQUE INDEX, not as a named constraint)
DROP INDEX IF EXISTS "PollVote_pollId_userId_key";

-- New unique index including optionId to support multi-select polls
CREATE UNIQUE INDEX IF NOT EXISTS "PollVote_pollId_userId_optionId_key" ON "PollVote"("pollId", "userId", "optionId");
