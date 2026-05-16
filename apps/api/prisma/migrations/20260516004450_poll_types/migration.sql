-- CreateEnum
CREATE TYPE "PollType" AS ENUM ('CONTENT_VOTE', 'ARTIST_VOTE', 'CUSTOM');

-- DropForeignKey
ALTER TABLE "PollOption" DROP CONSTRAINT "PollOption_contentId_fkey";

-- AlterTable
ALTER TABLE "Poll" ADD COLUMN     "pollType" "PollType" NOT NULL DEFAULT 'CONTENT_VOTE';

-- AlterTable
ALTER TABLE "PollOption" ADD COLUMN     "artistId" TEXT,
ADD COLUMN     "body" TEXT,
ADD COLUMN     "imageUrl" TEXT,
ALTER COLUMN "contentId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "PollOption" ADD CONSTRAINT "PollOption_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollOption" ADD CONSTRAINT "PollOption_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
