# FarmLabs

FarmLabs adalah marketplace **degen community calls** untuk listing:
- Public call (gratis/open)
- Private/VIP call (berbayar, checkout escrow)

Platform yang didukung untuk listing link: Telegram, Discord, dan X Community.

## Quick Start

1. Salin `.env.example` menjadi `.env`.
2. Isi env wajib:
   - `AUTH_SECRET`
   - `AUTH_TWITTER_ID`
   - `AUTH_TWITTER_SECRET`
   - `DATABASE_URL` (local SQLite: `file:./dev.db`)
3. Install dan jalanin:
   - `npm install`
   - `npx prisma db push`
   - `npm run dev`

## Deploy Checklist

- **Env production**
  - Set semua env auth + database di provider hosting.
  - Gunakan `AUTH_URL` sesuai domain production.
- **X OAuth callback**
  - Tambahkan callback production:
    - `https://your-domain.com/api/auth/callback/twitter`
  - Pastikan callback localhost tetap ada untuk development.
- **Database**
  - Untuk production, pindahkan dari SQLite ke PostgreSQL.
  - Jalankan `prisma db push` di environment production.
- **Build verification**
  - Jalankan `npm run lint`
  - Jalankan `npm run build`
- **Wallet + escrow flow**
  - Test connect wallet.
  - Test flow beli private/VIP call sampai order escrow tercatat.

Gunakan dengan tanggung jawab masing-masing. Bukan saran finansial.
