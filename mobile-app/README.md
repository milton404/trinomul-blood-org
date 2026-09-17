# Trinomul Blood Bank — Mobile App

React Native (Expo SDK 57) + TypeScript client for the existing Trinomul Blood Bank system.

**One backend. One database. One source of truth.** The mobile app is an additional client of the same backend used by the web app (Next.js on Vercel + PostgreSQL on Supabase). It does NOT create or duplicate any backend, database, or auth system.

## Architecture

```
Mobile App (Expo)
    |  HTTPS + JWT Bearer token
    v
Web API (Next.js route handlers on Vercel)
    |
    v
PostgreSQL (Supabase)  — same data as the web app
```

- **Auth**: the existing custom JWT auth (email/phone + password). The token is returned by `POST /api/auth/login` and stored in `expo-secure-store`; every request sends `Authorization: Bearer <token>`.
- **No secrets in the app**: no service keys, no database passwords. Only the JWT after the user signs in.
- **Offline**: read data is cached in `expo-sqlite`; mock/sample data is used in development builds only (`__DEV__`), never in production.

## Requirements

- Node.js 20+
- npm 10+
- Expo Go app on your phone (development), or EAS Build for production

## Install

```bash
cd mobile-app
npm install
```

## Run in development

```bash
npm start          # Expo Dev Server
npm run android    # Android device/emulator
npm run ios        # iOS simulator
```

The dev API URL resolves automatically:
- Android emulator → `http://10.0.2.2:3000`
- iOS simulator → `http://localhost:3000`
- Physical device → set `extra.apiUrl` in `app.json` to your machine's LAN IP, or run against the production API.

Production always uses `https://trinomul-blood-bank-rangpur.vercel.app` (see `src/constants/config.ts`).

## Environment variables

No required env vars. Optional override for dev builds via `app.json`:

```json
"extra": { "apiUrl": "http://192.168.x.x:3000" }
```

Never add service_role keys, database passwords, or AI/email secret keys to this app.

## Features

- Donor search (blood group / district / distance)
- Blood request feed + guest request creation with tracking code
- Blood map (donors + requests near you)
- Emergency SOS
- QR scanner (request/donor codes)
- Community feed (posts, likes, comments, image upload via Cloudinary)
- Auth: login, signup, forgot password (email token flow)
- Profile: donor availability toggle, donation history, notifications
- Leaderboard

## Backend endpoints used

Existing web route handlers: `/api/auth/*`, `/api/donors`, `/api/requests`, `/api/feed/*`, `/api/leaderboard`, `/api/cloudinary/sign`.
Added for mobile: `/api/profile` (GET/PATCH own profile), `/api/donations` (own history), `/api/notifications` (list/mark read), `/api/auth/password-reset` (request/complete).

## Deep linking

Scheme: `trinomul://` (configured in `app.json`). Planned routes: `trinomul://request/<id>`, `trinomul://notifications`.

## EAS Build (production)

```bash
npm install -g eas-cli
eas login
eas build:configure

# Android AAB for Google Play
eas build -p android --profile production

# iOS for TestFlight / App Store
eas build -p ios --profile production
```

Profiles are defined in `eas.json` (`development`, `preview`, `production`). App identifiers: `org.trinomul.bloodbank` (Android package and iOS bundle).

## App Store / Google Play notes

- The app is a blood donation coordination/search platform, not a medical diagnosis system.
- Location permission: requested only for "near me" features (foreground only).
- Camera permission: QR scanning only.

## Troubleshooting

- **API errors on a physical device**: the app cannot reach `localhost` — set `extra.apiUrl` to your LAN IP or test against the production URL.
- **Login fails**: the web API enforces rate limits (5 attempts / 15 min).
- **Stale data**: cached data is refreshed on each successful API load; pull-to-refresh on Notifications.

## Security notes

- JWT stored in `expo-secure-store`, sent as `Authorization: Bearer`.
- Token remains valid until 24h expiry (stateless JWT); logout clears it locally.
- RLS on the database stays enabled with no policies (the web app connects as the owner); the mobile app never talks to Supabase directly — only through the web API.
