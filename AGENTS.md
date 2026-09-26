# Cyber Learn : plateforme d'apprentissage interactif (Dev, Cybersec, Réseau)

## Stack

- Monorepo: Turborepo + pnpm 9.x workspaces
- Apps: Next.js 15 (App Router, RSC) + TypeScript 5.x strict
- Styling: Tailwind CSS v4 (CSS-first, no tailwind.config.js) + shadcn/ui
- DB: Supabase Postgres + Prisma 6.x ORM
- Auth: Supabase Auth (e-mail + password, GitHub OAuth, optional TOTP;
  mandatory TOTP on the admin console). One-time codes remain in two places:
  the legacy mobile sign-in route, `/api/mobile/send-otp`, and the
  password-recovery code the app verifies. See `docs/authentication.md`.
- Storage: Supabase Storage
- Realtime: Supabase Realtime (notifications in-app)
- Email: Resend + React Email
- Validation: Zod everywhere (client + server)
- State: TanStack Query v5 in the mobile app; the site and the console read on the server (RSC)
- Testing: Vitest (unit) + RLS/IDOR integration suite (ephemeral Supabase stack in CI)
- CI: GitHub Actions, thirteen jobs (format, lint, typecheck, test, build, runtime
  integrity, lesson diagrams, lesson markers, typography, auth hook signature,
  integration RLS/IDOR, gitleaks, Semgrep)

## Architecture

```
apps/web      → cyberlearn.fr (public + authenticated)
apps/admin    → admin.cyberlearn.fr (ADMIN role only)
apps/mobile   → Expo / React Native app, writes through /api/mobile/*
apps/marketing → Remotion renders for the Play Store listing
packages/db   → Prisma schema, migrations, repositories
packages/ui   → Design tokens CSS + brand components (XPBar, LevelBadge, etc.)
packages/types → Zod schemas, shared TS types
packages/lib  → Business logic (XP calc, SM-2, badge evaluator, auth guards)
packages/email → React Email templates
packages/config → Shared ESLint, TSConfig, Biome configs
content/      → MDX lessons and quizzes, versioned
```

## Commands

- `pnpm dev` : Start all apps (web :3000, admin :3001)
- `pnpm build` : Production build all
- `pnpm lint` : ESLint + typescript-eslint (all packages)
- `pnpm format:check` : Biome format check
- `pnpm typecheck` : TypeScript strict (all packages)
- `pnpm test` : Vitest (all packages)
- `pnpm --filter @cyberlearn/db db:migrate` : Prisma migrate dev
- `pnpm --filter @cyberlearn/db db:generate` : Prisma generate
- `pnpm --filter @cyberlearn/db db:seed` : Seed dev data
- `pnpm --filter @cyberlearn/db db:studio` : Prisma Studio

## Critical Rules

1. **ALL code in English** : variables, functions, types, comments, tests, logs. French ONLY in user-facing strings, MDX lesson content, and email templates. Those strings are written inline in the components: there is no i18n library (`next-intl` was removed, never imported) and no `messages/fr.json`.
2. **Zero `any`** : use `unknown` + type narrowing if needed. `as` casts require a comment justifying them.
3. **No secrets in code**, ever. Use env vars validated by `@t3-oss/env-nextjs` + Zod. Check `.env.example`.
4. **Zod on ALL inputs** : every Server Action, every Route Handler, every form. `safeParse` always, never raw `parse`.
5. **Server-first** : everything that CAN be a Server Component MUST be. `"use client"` requires justification.
6. **No console.log in prod** : use Pino logger. Errors: never leak stack traces to client.
7. **RLS enforced** : every Supabase table has Row Level Security. No exceptions.
8. **Repository pattern** : no direct Prisma calls from components. Services → Repositories → Prisma.
9. **Conventional Commits** : `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `security:`. Type and scope in English, subject in French — it describes a change to a French-language product. Enforced by `commitlint` on `commit-msg`, header capped at 100 characters. See `docs/dev/commit-conventions.md`.
10. **Ask before adding unlisted deps** : if a dependency is not in the brief or pnpm catalog, stop and ask.
11. **Mobile parity** : anything shipped on the site must reach the mobile app, unless it is written down as web-only in `docs/MOBILE_PARITY.md` with its reason. A PR touching a shared surface either changes both apps or updates that register — web-only is a decision on record, never an omission.
12. **Packages never emit JS next to their sources** : every package is consumed
    as TS source (`main` and `exports` point at `src/index.ts`), so every
    tsconfig sets `noEmit`. Vite resolves `.js` before `.ts`, so an emitted file
    sits in front of the source it was built from and the tests read the last
    build instead of the code. This happened: 348 stale files across email, lib,
    types and ui. The `.gitignore` guards all five packages — do not relax it.
13. **A turbo task's `inputs` must cover where the code actually lives** : the
    `test` task once listed `src/**` and `test/**`, and neither `apps/web` nor
    `apps/admin` has either directory. Their test hash therefore ignored every
    source change, and CI — which restores `.turbo` across commits — could
    replay an old run's logs as a pass. It is `$TURBO_DEFAULT$` now.
14. **One e-mail, one subject** : a mail client groups by sender and subject, so
    a repeated subject collapses several mails into one row where only the
    newest is visible. A template either names the thing it is about (a lesson
    title, a ticket subject) or stamps the moment via `stampedSubject`. The
    exception is a reply on a ticket, which really is one conversation. Never
    put a one-time code in a subject: it shows on a locked phone.
15. **Mail styling lives in `packages/email/src/theme.ts`** : nine templates each
    carried their own copy, which is how they drifted from the site. A template
    imports the shared vocabulary and adds only what is its own. No
    `border-radius` — the site is square.
16. **A terminal state is terminal for everyone** : a RESOLVED or CLOSED ticket
    takes no new message, from the requester or the console. The gate lives in
    the repository, in the same statement that bumps the row, because a check
    followed by an insert leaves a gap the status can change in.

## Compact Instructions

When compacting, preserve: current phase number, list of completed phases, active file paths being edited, any unresolved bugs or blockers, and the architecture decisions made so far. The full brief is in `CyberLearn.md` (repo root). Re-read it after compaction if context about a specific phase is lost.

## Reference Documents

- `CyberLearn.md` : full project brief with all specs (repo root)
- `CyberLearn_Patch_ImportLessons.md` : Import MDX feature spec (Phase 9, repo root)
- `docs/adr/` : Architecture Decision Records
- `docs/MOBILE_PARITY.md` : what the mobile app has, what it is still owed, and what is deliberately web-only

## Hardening

Les notes de hardening vivent dans `docs/hardening/` (`incidents.md`,
`known-issues.md`).

## RLS : versionnée dans les migrations

Les policies RLS font partie de la chaîne de migrations Prisma (baseline :
`20260610200000_rls_baseline`, 56 policies + helper `current_user_role()`).
Toute migration qui crée une table DOIT activer la RLS et poser ses policies
dans le MÊME fichier de migration (`DROP POLICY IF EXISTS` + `CREATE POLICY`).
Les évolutions de policies existantes : leur propre migration, même pattern.
Aucune application manuelle de RLS hors migration. La CI (job Integration,
step « Assert RLS coverage ») échoue si une table public n'a pas la RLS ou si
le compte de policies régresse sous 56.

## Conventions Storage

- Tout bucket Supabase Storage est PRIVÉ par défaut. Aucun bucket public. Seule exception :
  `Badge` (icônes de badges), public en lecture par son URL publique, voir
  ADR-004. Aucun client (anon, authenticated) n'accède à Storage, dans aucun
  bucket : politiques RESTRICTIVE de
  `supabase/migrations/20260926_storage_client_access_blocked.sql`.
- L'accès aux fichiers se fait via service_role côté serveur + URLs signées
  à TTL court (60s pour les téléchargements ponctuels, max 1h).
- Toute exception au "privé par défaut" doit faire l'objet d'une ADR
  explicite dans docs/adr/ avec justification sécu et plan de mitigation.
- MIME types restreints au strict nécessaire par bucket (jamais "any").
