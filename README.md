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
   - `DATABASE_URL` (local SQLite: `file:./dev.db`)
3. Install and run:
   - `npm install`
   - `npx prisma db push`
   - `npm run dev`

## Deploy Checklist

- **Production env**
  - Set all auth + database environment variables on your host.
  - Set `AUTH_URL` to your production domain.
- **X OAuth callback**
  - Add the production callback:
    - `https://your-domain.com/api/auth/callback/twitter`
  - Keep the localhost callback for development.
- **Database**
  - For production, move from SQLite to PostgreSQL.
  - Run `prisma db push` in the production environment.
- **Build checks**
  - Run `npm run lint`
  - Run `npm run build`
- **Wallet + escrow**
  - Test wallet connect.
  - Test buying a private/VIP call until the escrow order is recorded.

Use at your own risk. Not financial advice.
