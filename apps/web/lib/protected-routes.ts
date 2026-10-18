/**
 * The addresses that need a session: the middleware sends a visitor from any
 * of them to the login, and robots.txt keeps crawlers off all of them.
 *
 * One list for both. robots.ts kept its own copy, which missed /forum,
 * /support, /my-class, /duels and /tournaments as they were added here, so
 * crawlers followed them and indexed the login page under five more names.
 *
 * Plain data, no import: the middleware runs on the Edge runtime.
 */
export const PROTECTED_ROUTE_PREFIXES = [
  "/dashboard",
  "/lessons",
  "/paths",
  "/challenges",
  "/review",
  "/revisions",
  "/notes",
  "/badges",
  "/certificates",
  "/forum",
  "/leaderboard",
  "/locker",
  "/my-class",
  "/profile",
  "/support",
  "/wrapped",
  "/duels",
  "/tournaments",
  "/notifications",
  "/onboarding",
] as const;
