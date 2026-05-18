CREATE TABLE IF NOT EXISTS "SiteSetting" (
  "key"       TEXT NOT NULL,
  "value"     TEXT NOT NULL DEFAULT '',
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
);

INSERT INTO "SiteSetting" ("key", "value")
VALUES ('custom_css', '')
ON CONFLICT ("key") DO NOTHING;
