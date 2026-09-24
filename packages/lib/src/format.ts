/**
 * A whole number in French, the same on every engine.
 *
 * `toLocaleString("fr-FR")` looks deterministic and is not: the thousands
 * separator comes from the engine's copy of ICU. Current Node and current
 * browsers print a narrow no-break space (U+202F); older ICU builds, some
 * embedded WebViews and some headless crawlers print a plain no-break space
 * (U+00A0). The page is rendered on the server and then hydrated in the
 * browser, so the two disagree on "1 950 XP", React reports a hydration error
 * and throws the server's HTML away to render the whole tree again on the
 * client. Sentry caught it once on the landing page (JAVASCRIPT-NEXTJS-16).
 *
 * The separator is written here instead, as U+202F - what the French
 * typographic convention and current CLDR both use, so a modern browser shows
 * exactly what it showed before.
 *
 * For counts and XP. It rounds, because every caller wants a whole number and
 * a stray float should display as one rather than as 1950.0000000002.
 */

const NARROW_NO_BREAK_SPACE = " ";

export function formatNumberFr(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  const rounded = Math.round(value);
  const digits = String(Math.abs(rounded));
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/gu, NARROW_NO_BREAK_SPACE);
  return rounded < 0 ? `-${grouped}` : grouped;
}
