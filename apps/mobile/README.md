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
- **Motion** (reanimated): short eased feedback for progress and rewards, with
  static content screens and no bounce/spring transitions.

Auth: Supabase email/password with verified addresses. Users can enable TOTP
MFA from the native security screen; once enabled, the challenge is enforced
before application data is mounted.

Guarded writes go through `apps/web/app/api/mobile/*` (Bearer JWT):
- `POST /progress` - lesson completion via the same `completeLessonForUser`
  flow as the web (XP ledger, streak, badges, quests, certificates).
- `GET /classement` - leaderboard + pod ladder (RLS keeps pods server-side).

## Run it

1. `apps/mobile/.env.local` needs the public Supabase config (same project as web):
   ```
   EXPO_PUBLIC_SUPABASE_URL=...
   EXPO_PUBLIC_SUPABASE_ANON_KEY=...
   EXPO_PUBLIC_SITE_URL=https://cyberlearn.fr
   ```
   (See `.env.example`. Values are public / RLS-protected.)
2. From the repo root: `pnpm install`.
3. `pnpm --filter @cyberlearn/mobile dev` (or `cd apps/mobile && npx expo start`).
4. Open it:
   - **Android emulator** (Windows-friendly): press `a`.
   - **Your phone**: scan the QR with Expo Go, or build a **dev client**
     (`npx expo run:android` / EAS) - recommended for production-like secure
     session storage.
   - **iOS** needs a Mac or an EAS cloud build.

The app talks to the **real production Supabase** (same URL/anon key as web).
Sign in with a real, already-onboarded account. New sign-ups get routed to finish
onboarding on cyberlearn.fr (Phase 1 does not include mobile onboarding).

## Distribution

`eas.json` defines two release artifacts:

- `preview`: a signed Android APK for direct installation and testing.
- `production`: an Android App Bundle (AAB) for Google Play. Store build numbers
  are incremented remotely by EAS.

The public app version is `2.2.0`. Publish it as a new Google Play application,
separate from the former Flutter listing. Keep the old listing available until
the new application has passed review and is installable from Google Play.

From `apps/mobile`:

1. Sign in with `pnpm dlx eas-cli@latest login`.
2. Link or create the EAS project with `pnpm dlx eas-cli@latest init`.
3. Configure `EXPO_PUBLIC_SUPABASE_URL` and
   `EXPO_PUBLIC_SUPABASE_ANON_KEY` for the EAS preview and production
   environments. These are public client values, but they must still be
   supplied at build time.
4. Run `pnpm dlx eas-cli@latest build:version:set`, select Android, and initialize
   the remote version from the Android version code in `app.config.ts`.
5. Build a direct APK with
   `pnpm dlx eas-cli@latest build --platform android --profile preview`.
6. Build the Play Store AAB with
   `pnpm dlx eas-cli@latest build --platform android --profile production`.

Let EAS generate a new upload key for the new Google Play application, then keep
that credential backed up. It is independent from the former Flutter listing.

After publishing an artifact, configure the web deployment variables used by
`/telecharger`:

```text
NEXT_PUBLIC_ANDROID_PLAY_URL=https://play.google.com/...
NEXT_PUBLIC_ANDROID_APK_URL=https://.../cyberlearn-2.2.0.apk
NEXT_PUBLIC_IOS_APP_STORE_URL=
```

Prefer Google Play for general Android distribution. A direct APK and a Play
Store install may use different final signing keys, so users should stay on the
same update channel instead of switching between them.

Native public iOS distribution requires Apple Developer Program membership.
Until that is funded, the download page explains how to install the web app
from Safari. A free Apple account is suitable only for personal on-device tests,
not public IPA distribution.

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
