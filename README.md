# Cyber Learn

Gamified interactive learning platform for cybersecurity, software development, and network/systems — built for the French-speaking community.

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | **22.x LTS** | Use [fnm](https://github.com/Schniz/fnm) or [nvm](https://github.com/nvm-sh/nvm) |
| pnpm | **9.x** | `npm install -g pnpm@9` |
| Git | any recent | Required for Husky hooks |

> **Why pnpm 9?** The monorepo uses `catalog:` entries in `pnpm-workspace.yaml` to pin shared dependency versions — a feature available since pnpm 8.9. pnpm 9 is the current stable series.

## Repository structure

```
cyberlearn/
├── apps/
│   ├── web/          # Public app — cyberlearn.app (Next.js 15, port 3000)
│   └── admin/        # Admin dashboard — admin.cyberlearn.app (Next.js 15, port 3001)
├── packages/
│   ├── config/       # Shared TypeScript, ESLint, and Biome configs
│   ├── db/           # Prisma schema, migrations, Supabase client
│   ├── ui/           # Shared UI components (shadcn/ui + brand components)
│   ├── types/        # Shared Zod schemas and TypeScript types
│   ├── lib/          # Shared business logic (XP, SM-2, auth guards, etc.)
│   └── email/        # React Email templates (Resend)
├── .github/workflows/ # CI: format-check, lint, typecheck, test, build
├── docs/adr/          # Architecture Decision Records
├── biome.json         # Biome formatter config (linting is handled by ESLint)
├── turbo.json         # Turborepo pipeline
└── pnpm-workspace.yaml # Workspace + shared dependency catalog
```

## First-time setup

```bash
# 1. Clone the repository
git clone <repo-url> cyberlearn
cd cyberlearn

# 2. Install dependencies (all workspaces in one command)
pnpm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local — see comments in .env.example for where to find each value

# 4. (Phase 1+) Generate Prisma client
pnpm --filter @cyberlearn/db db:generate

# 5. (Phase 1+) Run database migrations
pnpm --filter @cyberlearn/db db:migrate
```

## Development

```bash
# Start all apps in parallel (web on :3000, admin on :3001)
pnpm dev

# Start only the web app
pnpm --filter @cyberlearn/web dev

# Start only the admin app
pnpm --filter @cyberlearn/admin dev
```

## Available commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in watch mode |
| `pnpm build` | Build all apps and packages |
| `pnpm lint` | Run ESLint across all packages |
| `pnpm lint:fix` | Auto-fix ESLint issues |
| `pnpm format` | Format all files with Biome |
| `pnpm format:check` | Check formatting without writing |
| `pnpm typecheck` | Run `tsc --noEmit` across all packages |
| `pnpm test` | Run Vitest unit tests across all packages |
| `pnpm test:coverage` | Run tests with coverage reports |
| `pnpm clean` | Remove all build artifacts and `node_modules` |

## Code conventions

- **Language**: All code (variables, functions, comments, tests) must be in **English**. French is only used in UI text via `next-intl` (`messages/fr.json`).
- **TypeScript**: Strict mode everywhere. No `any`, no `// @ts-ignore`.
- **Commits**: [Conventional Commits](https://www.conventionalcommits.org) (`feat:`, `fix:`, `chore:`, `security:`, etc.) — enforced by Commitlint.
- **Formatting**: Biome (formatter only — run `pnpm format:check`).
- **Linting**: ESLint + typescript-eslint strict (run `pnpm lint`).

See [docs/adr/](docs/adr/) for architecture decisions.

## CI

Every PR runs these checks on GitHub Actions:
1. **Format check** — `pnpm format:check` (Biome)
2. **Lint** — `pnpm lint` (ESLint)
3. **Typecheck** — `pnpm typecheck` (tsc)
4. **Tests** — `pnpm test` (Vitest)
5. **Build** — `pnpm build` (Next.js) — runs only if all above pass
