# FarmLabs

FarmLabs is a **degen community calls** marketplace for:
- Public calls (free / open)
- Private / VIP calls (paid, escrow checkout)

Supported platforms for listing links: Telegram, Discord, and X Community.

## Quick Start

1. Copy `.env.example` to `.env`.
2. Set required environment variables:
   - `AUTH_SECRET`
   - `AUTH_TWITTER_ID`
   - `AUTH_TWITTER_SECRET`
   - `DATABASE_URL` — PostgreSQL connection string (the Prisma schema targets PostgreSQL).
3. Install and run:
   - `npm install`
   - `npx prisma db push`
   - `npm run dev`

## Deploy Checklist

- **Production env (e.g. Vercel)**
  - Set all auth + database environment variables on your host.
  - Set `AUTH_URL` to your production domain (e.g. `https://www.farmlabs.space`).
  - **`DATABASE_URL`**: add the Postgres URL Vercel Postgres / Neon / Supabase gives you. If listings fail with 5xx, verify the string in Vercel **Settings → Environment Variables** and that `npx prisma db push` (or a migration) has been applied to that **same** database.
  - **Image uploads (community logo)**: on Vercel, filesystem is read-only. Set **`BLOB_READ_WRITE_TOKEN`** from a Vercel Blob store, or create/edit listings **without** uploading a new file (only URL fields).
- **X OAuth callback**
  - Add the production callback:
    - `https://your-domain.com/api/auth/callback/twitter`
  - Keep the localhost callback for development.
- **Database**
  - Production must use **PostgreSQL**; run `npx prisma db push` (or `migrate deploy`) against the production database.
- **Build checks**
  - Run `npm run lint`
  - Run `npm run build`
- **Wallet + escrow**
  - Test wallet connect.
  - Test buying a private/VIP call until the escrow order is recorded.

Use at your own risk. Not financial advice.
