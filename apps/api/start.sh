#!/bin/sh

echo "==> Running database migrations..."

# If a previous deployment left a migration recorded as failed, mark it rolled-back
# so prisma migrate deploy will re-attempt it with the fixed SQL.
npx prisma migrate resolve \
  --rolled-back 20260520000000_add_poll_starts_at_multi_select \
  --schema=apps/api/prisma/schema.prisma 2>/dev/null || true

npx prisma migrate resolve \
  --rolled-back 20260521000001_add_series_tables \
  --schema=apps/api/prisma/schema.prisma 2>/dev/null || true

npx prisma migrate resolve \
  --rolled-back 20260522000001_fill_schema_gaps \
  --schema=apps/api/prisma/schema.prisma 2>/dev/null || true

npx prisma migrate resolve \
  --rolled-back 20260522000002_add_content_scheduled_status \
  --schema=apps/api/prisma/schema.prisma 2>/dev/null || true

npx prisma migrate resolve \
  --rolled-back 20260601000001_rename_good_done_to_livity \
  --schema=apps/api/prisma/schema.prisma 2>/dev/null || true

npx prisma migrate resolve \
  --rolled-back 20260601000002_add_journey \
  --schema=apps/api/prisma/schema.prisma 2>/dev/null || true

npx prisma migrate resolve \
  --rolled-back 20260524000001_add_series_trailer_url \
  --schema=apps/api/prisma/schema.prisma 2>/dev/null || true

npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma || {
  echo "WARNING: prisma migrate deploy failed."
  echo "The API will start anyway — only features using new tables may be affected."
  echo "To fix: check Cloud Run logs, resolve any failed migrations with:"
  echo "  prisma migrate resolve --applied <migration_name>"
}

echo "==> Starting Camp DaddyMan API..."
exec node apps/api/dist/server.js
