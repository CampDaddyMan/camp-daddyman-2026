-- CreateTable: PushSubscription (web push)
CREATE TABLE IF NOT EXISTS "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ExpoPushToken (mobile push)
CREATE TABLE IF NOT EXISTS "ExpoPushToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExpoPushToken_pkey" PRIMARY KEY ("id")
);

-- AddColumn: push prefs on User
ALTER TABLE "User"
    ADD COLUMN IF NOT EXISTS "pushNewFollower" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS "pushNewContent"  BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS "pushNewComment"  BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS "pushNewTip"      BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX IF NOT EXISTS "PushSubscription_userId_idx" ON "PushSubscription"("userId");

CREATE UNIQUE INDEX IF NOT EXISTS "ExpoPushToken_token_key" ON "ExpoPushToken"("token");
CREATE INDEX IF NOT EXISTS "ExpoPushToken_userId_idx" ON "ExpoPushToken"("userId");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'PushSubscription_userId_fkey'
  ) THEN
    ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'ExpoPushToken_userId_fkey'
  ) THEN
    ALTER TABLE "ExpoPushToken" ADD CONSTRAINT "ExpoPushToken_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
