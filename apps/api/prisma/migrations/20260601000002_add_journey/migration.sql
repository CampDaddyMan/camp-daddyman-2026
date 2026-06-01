CREATE TABLE "JourneyDay" (
  "id"               TEXT NOT NULL,
  "dayNumber"        INTEGER NOT NULL,
  "phase"            TEXT NOT NULL DEFAULT 'EGG',
  "title"            TEXT NOT NULL,
  "lie"              TEXT NOT NULL,
  "truth"            TEXT NOT NULL,
  "body"             TEXT NOT NULL,
  "daddyManism"      TEXT NOT NULL,
  "reflectionPrompt" TEXT NOT NULL,
  "challengePrompt"  TEXT NOT NULL,
  "livityPrompt"     TEXT NOT NULL,
  "journalPrompt"    TEXT NOT NULL,
  "closingText"      TEXT NOT NULL,
  "published"        BOOLEAN NOT NULL DEFAULT false,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JourneyDay_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "JourneyDay_dayNumber_key" ON "JourneyDay"("dayNumber");
CREATE INDEX "JourneyDay_dayNumber_published_idx" ON "JourneyDay"("dayNumber", "published");

CREATE TABLE "UserJourney" (
  "id"         TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  "startedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "currentDay" INTEGER NOT NULL DEFAULT 1,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserJourney_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserJourney_userId_key" ON "UserJourney"("userId");

ALTER TABLE "UserJourney" ADD CONSTRAINT "UserJourney_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "JourneyEntry" (
  "id"             TEXT NOT NULL,
  "userId"         TEXT NOT NULL,
  "dayNumber"      INTEGER NOT NULL,
  "reflectionText" TEXT,
  "challengeText"  TEXT,
  "journalText"    TEXT,
  "completedAt"    TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JourneyEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "JourneyEntry_userId_dayNumber_key" ON "JourneyEntry"("userId", "dayNumber");
CREATE INDEX "JourneyEntry_userId_idx" ON "JourneyEntry"("userId");

ALTER TABLE "JourneyEntry" ADD CONSTRAINT "JourneyEntry_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JourneyEntry" ADD CONSTRAINT "JourneyEntry_dayNumber_fkey"
  FOREIGN KEY ("dayNumber") REFERENCES "JourneyDay"("dayNumber") ON DELETE CASCADE ON UPDATE CASCADE;
