#!/bin/sh

echo "==> Running database migrations..."
npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma || {
  echo "WARNING: prisma migrate deploy failed."
  echo "The API will start anyway — only features using new tables may be affected."
  echo "To fix: check Railway logs, resolve any failed migrations with:"
  echo "  prisma migrate resolve --applied <migration_name>"
}

echo "==> Starting Camp DaddyMan API..."
exec node apps/api/dist/server.js
