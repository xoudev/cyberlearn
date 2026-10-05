# ADR-002 - Custom security headers middleware instead of `next-safe-middleware`

**Date**: 2026-04-14
**Status**: Accepted

## Context

The original brief listed `next-safe-middleware` as the solution for HTTP security headers (CSP, HSTS, etc.).

Upon review:
- The package has not received a meaningful update since 2022
- It is not compatible with Next.js 15's App Router (no `app/` directory support)
- The maintainer has not addressed open issues or PRs for several years
- The project appears effectively abandoned

## Decision

**Security headers are implemented directly in `apps/web/middleware.ts`** using Next.js's native `NextResponse` API.

The brief already provides the exact header values needed (section 6.6), making the `next-safe-middleware` abstraction unnecessary. The implementation is ~20 lines of straightforward code with no external dependency.

Benefits:
- No abandoned dependency in the supply chain
- Full control over the CSP and each header value
- Compatible with Next.js 15 App Router and middleware conventions
- Easier to audit (all security configuration in one file)

## Consequences

- Security headers live in `apps/web/middleware.ts` and `apps/admin/middleware.ts`
- CSP must be updated manually when new external origins are added (Pyodide CDN, etc.) - this is intentional (allowlist discipline)
- One route of the site is framable, `/preview/<token>` (the lesson editor's preview, rendered by the site for the console's editor): it gets `frame-ancestors 'self' <NEXT_PUBLIC_ADMIN_URL>` and no `X-Frame-Options`, decided per request on the pathname. Every other response keeps `frame-ancestors 'none'` and `DENY`. On the console, `frame-src` names the site and nothing else
- The `next-safe-middleware` package is not listed in any `package.json`
