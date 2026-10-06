/**
 * The routes that can render a PDF, for next.config.ts: their functions must
 * carry pdfkit's standard fonts, which file tracing misses (pdfkit reaches
 * them through its package's `#standard-fonts/*` subpath imports).
 *
 * Route globs, matched against the route path: a dynamic segment is written
 * `*`, since `[slug]` would read as a character class.
 *
 * - the revision sheet of a module (`/api/paths/[slug]/sheet`);
 * - a certificate, issued when the last lesson of a path is done (a lesson's
 *   page, the dashboard's catch-up, the app's progress route), when the exam
 *   is passed (the exam page and the path page's actions, the app's exam
 *   routes) or when it is claimed (the path page, the app's claim route).
 */
export const PDF_ROUTES = [
  "/api/paths/*/sheet",
  "/paths/*",
  "/paths/*/exam",
  "/lessons/*",
  "/dashboard",
  "/api/mobile/**",
] as const;

/** pdfkit's standard fonts, from the Next.js project root (apps/web). */
export const PDFKIT_STANDARD_FONTS =
  "../../node_modules/.pnpm/pdfkit@*/node_modules/pdfkit/js/standard-fonts/*.{cjs,mjs}";
