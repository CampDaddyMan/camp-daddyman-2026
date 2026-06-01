# Camp DaddyMan — Disaster Recovery Guide

Use this guide if hosting goes down, a provider loses data, or you need to redeploy from scratch.

---

## What is safe no matter what

| Asset | Where it lives | Safe? |
|-------|---------------|-------|
| All code | GitHub repo | ✅ Always |
| Videos, images, uploads | Cloudflare R2 | ✅ Always |
| Daily DB backups | Cloudflare R2 → `db-backups/` folder | ✅ After first backup runs |
| Web app | Vercel (auto-deploys from GitHub) | ✅ Always |
| These env vars | This file (local only) | ✅ You hold the keys |

---

## Step 1 — Fill in .env.production

Open `disaster-recovery/.env.production` and fill in every value.
Find each value here:

| Variable | Where to find it |
|----------|-----------------|
| `DATABASE_URL` | Railway → your project → PostgreSQL service → **Connect** tab |
| `JWT_SECRET` | Generate a new one: run `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `R2_ACCOUNT_ID` | Cloudflare dashboard → right sidebar |
| `R2_ACCESS_KEY_ID` | Cloudflare → R2 → Manage R2 API Tokens |
| `R2_SECRET_ACCESS_KEY` | Same as above (only shown once at creation) |
| `R2_PUBLIC_URL` | Cloudflare → R2 → your bucket → Settings → Public URL |
| `RESEND_API_KEY` | resend.com → API Keys |
| `STRIPE_SECRET_KEY` | Stripe dashboard → Developers → API Keys |
| `STRIPE_PUBLISHABLE_KEY` | Same as above |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → Webhooks → your endpoint → Signing secret |
| `REDIS_URL` | Railway → your project → Redis service → **Connect** tab |

---

## Step 2 — Create a new Railway project

1. Go to railway.app → **New Project** → **Empty Project**
2. Add **PostgreSQL**: New Service → Database → PostgreSQL
3. Add **Redis**: New Service → Database → Redis
4. Add **API**: New Service → GitHub Repo → select your repo → root directory: `apps/api`

---

## Step 3 — Add environment variables to Railway

Copy every variable from `.env.production` into:
Railway → API service → **Variables** tab

Note: `DATABASE_URL` and `REDIS_URL` are injected automatically by Railway — you do not need to add them manually.

---

## Step 4 — Set the start command

Railway → API service → Settings → **Start Command**:
```
npx prisma db push && npm start
```
Save. Let it deploy. After it succeeds, change it back to just `npm start`.

---

## Step 5 — Restore database from backup (if needed)

1. Go to Cloudflare R2 → `camp-daddyman-media` bucket → `db-backups/` folder
2. Download the most recent `.sql.gz` file
3. Decompress it: `gzip -d backup.sql.gz`
4. Restore to your new Railway PostgreSQL:
```
psql "YOUR_NEW_DATABASE_URL" < backup.sql
```

---

## Step 6 — Update Stripe webhook URL

Stripe → Developers → Webhooks → update the endpoint URL to your new Railway API URL:
```
https://your-new-api.railway.app/api/shop/webhook
https://your-new-api.railway.app/api/subscriptions/webhook
```

---

## Step 7 — Verify

- Visit campdaddyman.com — web should load (Vercel is unaffected)
- Log in — auth should work
- Play a video — R2 media is unaffected
- Place a test order — Stripe should work

---

## Keep this file updated

Every time you rotate an API key or change a service, update `.env.production` immediately.
This file is your single source of truth for rebuilding the platform.
