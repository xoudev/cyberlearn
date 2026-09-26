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
  countdown) + global top, served by `/api/mobile/leaderboard`.
- **Notifications** inbox (mark all read), **Réglages** (account, notification
  prefs, RGPD links, sign out), **Certificat** detail (verification code +
  share + verify link).
- **Bloc-notes** (list, editor, folders), **Casier** (equipping a cosmetic),
  **Ma classe** side of a learner (the work set for them and its deadlines),
  **Sécurité** (password, TOTP enrolment).
- **States**: skeletons, empty states, network-error retry everywhere.
- **Motion** (reanimated): short eased feedback for progress and rewards, with
  static content screens and no bounce/spring transitions.

Auth: Supabase email/password with verified addresses. Users can enable TOTP
MFA from the native security screen; once enabled, the challenge is enforced
before application data is mounted.

Everything server-side goes through `apps/web/app/api/mobile/*` (Bearer JWT):
- `POST /progress` - lesson completion via the same `completeLessonForUser`
  flow as the web (XP ledger, streak, badges, quests, certificates).
- `GET /leaderboard` - leaderboard + pod ladder (RLS keeps pods server-side).
- `GET /my-class` - the work a learner has been given.
- `GET /loadout` - the cosmetics they have equipped.
- `POST /password` - changing the password from the native security screen.
- `POST /send-otp` - the sign-in code, sent through the platform's own template
  rather than Supabase's default.

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
   `expo-dev-client` is installed, so this serves a **development build**. To
   use Expo Go instead, run `pnpm --filter @cyberlearn/mobile start:go`, or press
   `s` in the running server.
4. Open it:
   - **Android emulator** (Windows-friendly): press `a`.
   - **Your phone**: install the development build once
     (`pnpm dlx eas-cli@latest build --platform android --profile development`,
     an APK), then scan the QR with it. It is the production app's native code
     with a dev menu, so secure session storage behaves as in the store build.
     Expo Go still works through `start:go`.
   - **iOS** needs a Mac or an EAS cloud build.

The app talks to the **real production Supabase** (same URL/anon key as web).
Sign in with a real, already-onboarded account. New sign-ups get routed to finish
onboarding on cyberlearn.fr (Phase 1 does not include mobile onboarding).

## Distribution

`eas.json` defines three profiles:

- `development`: an APK with the dev client, to run `expo start` against.
- `preview`: a signed Android APK for direct installation and testing.
- `production`: an Android App Bundle (AAB) for Google Play. Store build numbers
  are incremented remotely by EAS.

The public app version lives in `apps/mobile/app.config.ts` (`version`) and is
mirrored in `apps/mobile/package.json`. The Android version code lives on EAS
alone (`appVersionSource: "remote"`); `app.config.ts` no longer carries one. Publish through the `fr.cyberlearn.mobile` Google
Play application, separate from the former Flutter listing and its incompatible
package identity.

From `apps/mobile`:

1. Sign in with `pnpm dlx eas-cli@latest login`.
2. Link or create the EAS project with `pnpm dlx eas-cli@latest init`.
3. Configure `EXPO_PUBLIC_SUPABASE_URL` and
   `EXPO_PUBLIC_SUPABASE_ANON_KEY` for the EAS preview and production
   environments. These are public client values, but they must still be
   supplied at build time.
4. The remote Android version code is already initialised (10 after the first
   production build). `pnpm dlx eas-cli@latest build:version:get` reads it;
   `build:version:set` only if Play ever holds a higher one.
5. Build a direct APK with
   `pnpm dlx eas-cli@latest build --platform android --profile preview`.
6. Build the Play Store AAB with
   `pnpm dlx eas-cli@latest build --platform android --profile production`.

Releases are signed with the keystore EAS holds for this project (upload key
SHA-1 `5D:33:C9:D1:14:88:22:AF:A6:27:FD:B6:0D:40:CA:61:2E:FB:29:76`). Version 8
(2.3.0) was uploaded from a local build whose key was lost; replacing it with
the EAS key was requested from Google Play support on 26 September 2026. Until
Google confirms, Play refuses bundles signed with the EAS key.

Uploads to Google Play go through `eas submit` with a Google service account key
stored on EAS (Play Console, Users and permissions: release permissions on this
app only). From `apps/mobile`:
`pnpm dlx eas-cli@latest submit --platform android --profile production --latest`
sends the latest build to the internal testing track.

After publishing an artifact, configure the web deployment variables used by
`/download`:

```text
NEXT_PUBLIC_ANDROID_PLAY_URL=https://play.google.com/...
NEXT_PUBLIC_ANDROID_APK_URL=https://.../cyberlearn-<version>.apk
NEXT_PUBLIC_IOS_APP_STORE_URL=
```

Prefer Google Play for general Android distribution. A direct APK and a Play
Store install may use different final signing keys, so users should stay on the
same update channel instead of switching between them.

Native public iOS distribution requires Apple Developer Program membership.
Until that is funded, the download page explains how to install the web app
from Safari. A free Apple account is suitable only for personal on-device tests,
not public IPA distribution.

## What the app does not have yet

The register is `docs/MOBILE_PARITY.md`, at the repo root of the docs. The rule
it states: anything shipped on the site reaches this app, unless that file says
otherwise and gives a reason. A PR touching a shared surface either changes both
apps or updates that register.

## Architecture

- **Reads**: directly from Supabase (PostgREST) with the user JWT; RLS authorizes.
  Tables are snake_case, columns camelCase (see `lib/queries.ts`).
- **Writes** (progress/XP/badges): through thin `apps/web/app/api/mobile/*`
  Route Handlers that reuse `packages/lib` - never reimplemented on the client.
- **Shared code**: `@cyberlearn/tokens` (design tokens), `@cyberlearn/lib/xp` +
  `/gamification/tier` (pure logic). Never import `@cyberlearn/db` (Prisma) or
  `@cyberlearn/ui` (web/DOM) here.
- **Metro + pnpm**: `metro.config.js` watches the workspace root and keeps
  hierarchical lookup on so Metro resolves pnpm's nested deps.
