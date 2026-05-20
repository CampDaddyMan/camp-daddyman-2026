-- Add startsAt and allowMultiple to Poll
ALTER TABLE "Poll" ADD COLUMN "startsAt" TIMESTAMP(3);
ALTER TABLE "Poll" ADD COLUMN "allowMultiple" BOOLEAN NOT NULL DEFAULT false;

-- Change PollVote unique constraint from (pollId, userId) to (pollId, userId, optionId)
-- to support multi-select polls
ALTER TABLE "PollVote" DROP CONSTRAINT "PollVote_pollId_userId_key";
ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_pollId_userId_optionId_key" UNIQUE ("pollId", "userId", "optionId");
