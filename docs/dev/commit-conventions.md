# Commit Conventions

Follows [Conventional Commits](https://www.conventionalcommits.org/) with project-specific extensions.

## Format

```
<type>(<scope>): <subject>

[optional body]
```

## Types

| Type | Use for |
|------|---------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no logic change |
| `refactor` | Refactor with no feature/fix |
| `test` | Adding or updating tests |
| `chore` | Build, deps, tooling |
| `perf` | Performance improvement |
| `ci` | CI/CD changes |
| `revert` | Revert a previous commit |
| `security` | Security fix or hardening |

The rules below are not a style guide: they are what
`.husky/commit-msg` enforces, from the `commitlint` block in the root
`package.json`. A commit that breaks one of them is refused locally.

## Subject rules

- **Length**: the whole header - `type(scope): subject` - is capped at **100
  characters** (`header-max-length`, from `@commitlint/config-conventional`). A
  squash merge appends ` (#123)` *after* the hook has run, so aim lower.
- **Language**: French or English. In practice the subject is written in French,
  because it describes a change to a French-language product; the type and the
  scope stay in English. This is the one place where `AGENTS.md`'s "all code in
  English" does not apply - and the repository history is the evidence.
- **Case**: sentence-case allowed - `fix: Corriger le rate limit` ✅ or lower-case `fix: fix rate limit` ✅.
- **Banned**: start-case `Fix The Rate Limit`, pascal-case `FixRateLimit`, all-caps `FIX RATE LIMIT`.
- **No period** at the end.
- **Acronyms**: uppercase acronyms in subject are fine - `UI`, `API`, `RGPD`, `RLS`, `CSP`, `JWT`, `OAuth`.

## Scope

Lowercase. Examples: `auth`, `sentry`, `rgpd`, `db`, `cron`, `middleware`.
Uppercase scopes like `(UI)`, `(API)` are fine - they appear in the scope position, not the subject.

## Examples

```
feat(auth): Ajouter la connexion OAuth GitHub
fix(csp): Corriger connect-src pour la région EU Sentry
docs(rgpd): Mettre à jour la procédure Art. 17
security(middleware): Renforcer les headers CSP
test(sentry): add dev-only endpoint to validate server-side error capture
chore(deps): upgrade @sentry/nextjs to v9.47
```
