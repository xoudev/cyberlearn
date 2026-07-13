# CyberLearn Mobile (`@cyberlearn/mobile`)

Native mobile app (Expo / React Native + Expo Router). Dedicated mobile UI built
from the mobile mockup; it reuses only the backend (Supabase + shared TS
packages), never the web UI.

## Scope

The full app flow, gamified:

- **Tabs**: Accueil (level/XP, streak, weekly quests, resume, classement mini,
  suggested paths), Parcours, Leçons (filters + search), Profil (avatar, tier,
  stats, Badges/Certificats/Stats/Collection sub-tabs, Explorer hub).
- **Path detail**: hero, progress, resume CTA, vertical missions timeline
  (done / current / locked).
- **Lesson reader**: contentMdx parsed to native blocks (headings, paragraphs,
  lists, code, callouts; web-only interactives become placeholders), section
  pager, native quiz (extracted from the MDX `<Quiz>` components), result
  screen with real +XP / badges / level-up through the guarded server flow.
- **Classement**: league pod ladder (promotion/relegation zones, season
  countdown) + global top, served by `/api/mobile/classement`.
- **Notifications** inbox (mark all read), **Réglages** (account, notification
  prefs, RGPD links, sign out), **Certificat** detail (verification code +
  share + verify link).
- **States**: skeletons, empty states, network-error retry everywhere.
- **Animations** (reanimated): staggered rise-ins, animated XP bars, count-ups,
  streak flame pulse, press scaling, badge pop-ins, XP spark burst, level-up
  overlay.

Auth: Supabase email OTP (code in our Resend email) + GitHub OAuth.

Guarded writes go through `apps/web/app/api/mobile/*` (Bearer JWT):
- `POST /progress` - lesson completion via the same `completeLessonForUser`
  flow as the web (XP ledger, streak, badges, quests, certificates).
- `GET /classement` - leaderboard + pod ladder (RLS keeps pods server-side).

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
