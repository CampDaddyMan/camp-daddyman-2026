ALTER TABLE "Comment" ADD COLUMN "isPinned" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "Comment_contentId_isPinned_idx" ON "Comment"("contentId", "isPinned");
