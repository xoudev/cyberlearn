# Cyber Learn — Plateforme d'apprentissage interactif (Dev, Cybersec, Réseau)

## Stack

- Monorepo: Turborepo + pnpm 9.x workspaces
- Apps: Next.js 15 (App Router, RSC) + TypeScript 5.x strict
- Styling: Tailwind CSS v4 (CSS-first, no tailwind.config.js) + shadcn/ui
- DB: Supabase Postgres + Prisma 6.x ORM
- Auth: Supabase Auth (Magic Link + GitHub OAuth)
- Storage: Supabase Storage
- Realtime: Supabase Realtime (notifications in-app)
- Email: Resend + React Email
- Validation: Zod everywhere (client + server)
- State: TanStack Query v5
- Testing: Vitest (unit) + Playwright (e2e) + MSW (API mocks)
- CI: GitHub Actions (lint, typecheck, test, build, Semgrep, gitleaks)

## Architecture

```
apps/web      → cyberlearn.app (public + authenticated)
apps/admin    → admin.cyberlearn.app (ADMIN role only)
packages/db   → Prisma schema, migrations, repositories
packages/ui   → Design tokens CSS + brand components (XPBar, LevelBadge, etc.)
packages/types → Zod schemas, shared TS types
packages/lib  → Business logic (XP calc, SM-2, badge evaluator, auth guards)
packages/email → React Email templates
packages/config → Shared ESLint, TSConfig, Biome configs
```

## Commands

- `pnpm dev` — Start all apps (web :3000, admin :3001)
- `pnpm build` — Production build all
- `pnpm lint` — ESLint + typescript-eslint (all packages)
- `pnpm format:check` — Biome format check
- `pnpm typecheck` — TypeScript strict (all packages)
- `pnpm test` — Vitest (all packages)
- `pnpm test:e2e` — Playwright e2e
- `pnpm db:migrate` — Prisma migrate dev
- `pnpm db:generate` — Prisma generate
- `pnpm db:seed` — Seed dev data
- `pnpm db:studio` — Prisma Studio

## Critical Rules

1. **ALL code in English** — variables, functions, types, comments, commits, tests, logs. French ONLY in UI strings (via next-intl `messages/fr.json`), MDX lesson content, and email templates.
2. **Zero `any`** — use `unknown` + type narrowing if needed. `as` casts require a comment justifying them.
3. **No secrets in code** — ever. Use env vars validated by `@t3-oss/env-nextjs` + Zod. Check `.env.example`.
4. **Zod on ALL inputs** — every Server Action, every Route Handler, every form. `safeParse` always, never raw `parse`.
5. **Server-first** — everything that CAN be a Server Component MUST be. `"use client"` requires justification.
6. **No console.log in prod** — use Pino logger. Errors: never leak stack traces to client.
7. **RLS enforced** — every Supabase table has Row Level Security. No exceptions.
8. **Repository pattern** — no direct Prisma calls from components. Services → Repositories → Prisma.
9. **Conventional Commits** — `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `security:` (English).
10. **Ask before adding unlisted deps** — if a dependency is not in the brief or pnpm catalog, stop and ask.

## Compact Instructions

When compacting, preserve: current phase number, list of completed phases, active file paths being edited, any unresolved bugs or blockers, and the architecture decisions made so far. The full brief is in `docs/PROJECT_BRIEF.md` — re-read it after compaction if context about a specific phase is lost.

## Reference Documents

- `docs/PROJECT_BRIEF.md` — Full 1674-line project brief with all specs
- `docs/PATCH_IMPORT_LESSONS.md` — Import MDX feature spec (Phase 9)
- `docs/adr/` — Architecture Decision Records

## Hardening en cours
Le plan de hardening v1 est dans `docs/hardening/v1-plan.md`. Il liste 6 PRs
séquentielles à exécuter avant toute nouvelle feature. Référence-le
systématiquement avant de proposer du travail.

## Conventions Storage

- Tout bucket Supabase Storage est PRIVÉ par défaut. Aucun bucket public.
- L'accès aux fichiers se fait via service_role côté serveur + URLs signées
  à TTL court (60s pour les téléchargements ponctuels, max 1h).
- Toute exception au "privé par défaut" doit faire l'objet d'une ADR
  explicite dans docs/adr/ avec justification sécu et plan de mitigation.
- MIME types restreints au strict nécessaire par bucket (jamais "any").

@.claude/rules/security.md
@.claude/rules/code-conventions.md
@.claude/rules/architecture.md
