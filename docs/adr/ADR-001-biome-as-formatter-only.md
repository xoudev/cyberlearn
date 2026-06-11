# ADR-001 - Biome as formatter only (ESLint for linting)

**Date**: 2026-04-14
**Status**: Accepted

## Context

The project brief specifies both ESLint and Biome as tooling. Biome is an all-in-one tool that can act as both a **linter** and a **formatter**, which overlaps with ESLint's linting role.

Running both Biome linting and ESLint simultaneously creates:
- Duplicate or conflicting rule violations (same issue flagged twice, possibly with different severity)
- Maintenance burden: rules must be kept in sync across two config files
- Developer confusion on which tool is authoritative for a given error

## Decision

**Biome is used exclusively as a formatter** (replacing Prettier), with its linter disabled via `"linter": { "enabled": false }` in `biome.json`.

**ESLint** (with `typescript-eslint` strict mode) remains the sole linter.

This is the standard split adopted by the broader ecosystem:
- Biome for fast, opinionated formatting (indent, quotes, trailing commas, line width)
- ESLint for semantic code quality rules (no `any`, exhaustive switches, no floating promises, etc.)

## Consequences

- `pnpm format` / `pnpm format:check` - Biome only (formatting)
- `pnpm lint` - ESLint only (code quality)
- No rule conflicts between the two tools
- Biome's linting capabilities are not used; if they become notably superior to ESLint in a specific area, this decision should be revisited
