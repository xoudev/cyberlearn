# CyberLearn Mobile (`@cyberlearn/mobile`)

Native mobile app (Expo / React Native + Expo Router). Dedicated mobile UI built
from the mobile mockup; it reuses only the backend (Supabase + shared TS
packages), never the web UI.

## Phase 1 scope

The mobile shell (bottom tab bar + per-screen headers + safe-area) and the 4
core tab screens, read-mostly:

- **Accueil** - greeting, level + XP, streak, resume card, classement mini, suggested paths
- **Parcours** - path catalog + search
- **Leçons** - lesson catalog + domain/difficulty filters + search
- **Profil** - hexagon avatar, tier, XP, stat cells, sub-tabs (Badges/Certificats/Stats/Collection), hub to the other sections

Auth: Supabase email OTP (6-digit code) + GitHub OAuth. Detail screens
(lesson/quiz, path detail) and all guarded writes (progress, XP) come in Phase 2.

## Run it

1. `apps/mobile/.env.local` needs the public Supabase config (same project as web):
   ```
   EXPO_PUBLIC_SUPABASE_URL=...
   EXPO_PUBLIC_SUPABASE_ANON_KEY=...
   ```
   (See `.env.example`. Values are public / RLS-protected.)
2. From the repo root: `pnpm install`.
3. `pnpm --filter @cyberlearn/mobile dev` (or `cd apps/mobile && npx expo start`).
4. Open it:
   - **Android emulator** (Windows-friendly): press `a`.
   - **Your phone**: scan the QR with Expo Go, or build a **dev client**
     (`npx expo run:android` / EAS) - recommended, since `expo-secure-store` and
     the OAuth flow are more reliable than in Expo Go.
   - **iOS** needs a Mac or an EAS cloud build.

The app talks to the **real production Supabase** (same URL/anon key as web).
Sign in with a real, already-onboarded account. New sign-ups get routed to finish
onboarding on cyberlearn.fr (Phase 1 does not include mobile onboarding).

## Architecture

- **Reads**: directly from Supabase (PostgREST) with the user JWT; RLS authorizes.
  Tables are snake_case, columns camelCase (see `lib/queries.ts`).
- **Writes** (progress/XP/badges): Phase 2, via thin `apps/web/app/api/mobile/*`
  Route Handlers that reuse `packages/lib` - never reimplemented on the client.
- **Shared code**: `@cyberlearn/tokens` (design tokens), `@cyberlearn/lib/xp` +
  `/gamification/tier` (pure logic). Never import `@cyberlearn/db` (Prisma) or
  `@cyberlearn/ui` (web/DOM) here.
- **Metro + pnpm**: `metro.config.js` watches the workspace root and keeps
  hierarchical lookup on so Metro resolves pnpm's nested deps.
