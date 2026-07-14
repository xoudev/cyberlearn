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

## Distribution

`eas.json` defines two release artifacts:

- `preview`: a signed Android APK for direct installation and testing.
- `production`: an Android App Bundle (AAB) for Google Play. Store build numbers
  are incremented remotely by EAS.

The public app version is `2.2.0`. The existing Google Play listing was created
for the former Flutter app and already contains Android version code `6`
(`2.1.0`). Flutter and React Native builds can use the same listing as long as
the Android package remains `fr.cyberlearn.app` and the existing Play upload
key is imported into EAS. Initialize the EAS remote version at `6` before the
first production build; the resulting build will use version code `7`.

From `apps/mobile`:

1. Sign in with `pnpm dlx eas-cli@latest login`.
2. Link or create the EAS project with `pnpm dlx eas-cli@latest init`.
3. Configure `EXPO_PUBLIC_SUPABASE_URL` and
   `EXPO_PUBLIC_SUPABASE_ANON_KEY` for the EAS preview and production
   environments. These are public client values, but they must still be
   supplied at build time.
4. Run `pnpm dlx eas-cli@latest build:version:set`, select Android, choose the
   remote version source, and enter `6` as the last Google Play version code.
5. Build a direct APK with
   `pnpm dlx eas-cli@latest build --platform android --profile preview`.
6. Build the Play Store AAB with
   `pnpm dlx eas-cli@latest build --platform android --profile production`.

Keep the existing Google Play upload key when EAS asks for Android credentials.
A newly generated upload key will not match the Play Console configuration
unless the Play Console key is reset first.

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
