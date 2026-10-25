# Local stack

Runs the site and the console against a disposable Supabase stack on Docker,
the same one CI's `integration` job uses, so every signed-in page can be
walked through by hand.

## Start

```bash
npx -y supabase@2.64.0 start -x studio,imgproxy,vector,logflare
```

The CLI is pinned like in CI: later releases run an "Updating vector buckets"
step that fails on `start`. `npx supabase@2.64.0 status` prints the URLs and
the anon and service_role keys. Those keys are fixed public dev keys, never
production secrets.

## Environment

Create `apps/web/.env.local`, `apps/admin/.env.local` and `packages/db/.env`
(all gitignored) from `.env.example`, with:

| Variable | Value |
|---|---|
| `DATABASE_URL`, `DIRECT_URL` | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| `NEXT_PUBLIC_SUPABASE_URL` | `http://localhost:54321` (the CSP allows `http://localhost:*`, not `127.0.0.1`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | from `supabase status` |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` (not `127.0.0.1`: the Next dev server blocks its dev resources for another host name) |
| `NEXT_PUBLIC_ADMIN_URL` | `http://localhost:3001` |
| `RESEND_API_KEY` | any `re_` value: mails sent through Resend fail and are logged |
| `IP_SALT`, `CRON_SECRET`, `CHALLENGE_FLAG_SECRET` | any 32+ characters |
| `SUPABASE_HOOK_SECRET` | any 16+ characters (the hook is not served locally) |

## Provision

```bash
pnpm --filter @cyberlearn/db db:generate
pnpm --filter @cyberlearn/db exec prisma migrate deploy
pnpm --filter @cyberlearn/db db:seed
pnpm --filter @cyberlearn/db db:seed-local-accounts
```

Create the storage buckets once, as CI does (`.github/workflows/ci.yml`, step
"Provision storage buckets"), with `docker exec -i supabase_db_cyberlearn psql -U postgres`.

Then fill the catalogue from the console (`pnpm dev`, then
`http://localhost:3001/lessons/sync`, signed in as `admin@cyberlearn.test`).
Every button asks for a confirmation, in this order:

1. "Tout importer": about 350 lessons, one every few seconds, so keep the tab
   open for a quarter of an hour.
2. "Synchroniser les parcours", "Synchroniser les examens", "Synchroniser les défis".
3. "Tout mettre à jour" (the lessons `db:seed` created).
4. "Publier le catalogue du dépôt".

Last, `pnpm --filter @cyberlearn/db db:seed-paths` attaches the lessons to the
paths that only exist in the seed.

## Component showcase

To add the repository's component showcase to the local lesson catalogue:

```bash
cd apps/admin
node --env-file=.env.local scripts/seed-local-showcase.mjs
```

This validates the source with the admin import pipeline, then upserts only
`CL-LSN-99001-V01` at `/lessons/vitrine-des-composants`, published locally with
zero lesson XP. It reuses the installed Vitest/Vite loader to run the ESM MDX
validator and workspace TypeScript; no extra dependency is needed. Both the
database and Supabase URLs must be loopback addresses, and `NODE_ENV=production`
is refused. The source MDX and all other lessons stay intact. The local copy
has a notice explaining why the source introduction calls it a draft. Quiz
answers and exercise gates work like other lessons; this is a catalogue copy,
not a completed learner record.

## Test accounts

`db:seed-local-accounts` creates the accounts below, all with the password
written at the top of `packages/db/prisma/seed-local-accounts.ts`. It refuses
to run when the database or Supabase is not on a loopback address.

| E-mail | Role | Notes |
|---|---|---|
| `eleve@cyberlearn.test` | STUDENT | |
| `eleve-mfa@cyberlearn.test` | STUDENT | verified TOTP factor |
| `prof@cyberlearn.test` | TEACHER | |
| `admin@cyberlearn.test`, `admin2@cyberlearn.test` | ADMIN | verified TOTP factor (the console requires one) |
| `ami-a@cyberlearn.test`, `ami-b@cyberlearn.test` | STUDENT | friends with each other |
| `banni@cyberlearn.test` | STUDENT | active ban |

The current code of a TOTP account (the e-mail defaults to `eleve-mfa@cyberlearn.test`):

```bash
pnpm --filter @cyberlearn/db db:seed-local-accounts --code admin@cyberlearn.test
```

## Known gaps

- The `custom-access-token` hook is not served, so the access token carries no
  `user_role` claim. The site and the console read the role from the database,
  so pages work; RLS policies that read `current_user_role()` see no role.
- Auth mails (confirmation, recovery) use GoTrue's default templates and land
  in Inbucket, `http://127.0.0.1:54324`. Mails sent through Resend do not.
- GitHub sign-in cannot be tested locally.
