-- AlterTable
ALTER TABLE "Content" ADD COLUMN     "cardAspect" TEXT DEFAULT 'video',
ADD COLUMN     "cardWidth" INTEGER DEFAULT 224;
