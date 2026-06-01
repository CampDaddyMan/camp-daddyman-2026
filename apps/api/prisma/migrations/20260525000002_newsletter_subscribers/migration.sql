CREATE TABLE "EmailSubscriber" (
  "id"               TEXT NOT NULL,
  "email"            TEXT NOT NULL,
  "name"             TEXT,
  "source"           TEXT NOT NULL DEFAULT 'website',
  "unsubscribeToken" TEXT NOT NULL,
  "unsubscribed"     BOOLEAN NOT NULL DEFAULT false,
  "unsubscribedAt"   TIMESTAMP(3),
  "subscribedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailSubscriber_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailSubscriber_email_key"          ON "EmailSubscriber"("email");
CREATE UNIQUE INDEX "EmailSubscriber_unsubscribeToken_key" ON "EmailSubscriber"("unsubscribeToken");
CREATE INDEX        "EmailSubscriber_unsubscribed_idx"   ON "EmailSubscriber"("unsubscribed");
