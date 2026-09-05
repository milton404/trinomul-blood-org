# Trinomul Blood Bank — Rangpur

A blood bank and donor management platform for Rangpur, Bangladesh. Donor registration and search, blood requests, donor leaderboard, community feed, admin panel, and bilingual interface (English / Bangla).

## Tech Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS 4
- Supabase (PostgreSQL) with custom JWT auth
- Cloudinary (photo uploads), Resend (transactional email)
- PWA via Serwist, i18n via next-intl

## Run Locally

**Prerequisites:** Node.js 20+

1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env` and fill in the values (`DATABASE_URL`, `AUTH_SECRET`, etc. — see comments in the file)
3. Run the app:
   `npm run dev` → http://localhost:3000

## Deploy

Hosted on Vercel — every push to `main` auto-deploys to production. Deployment config lives in `vercel.json` (Singapore region, security headers, redirects, cron).

## Mobile App

`mobile-app/` contains the Expo (React Native) app.
