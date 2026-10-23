/**
 * The clock the console shows: Paris, whatever the server's own is.
 *
 * The console's pages are rendered on the server, which runs in UTC on Vercel
 * and in the developer's own zone on a laptop. A formatter built without a
 * `timeZone` reads that one, so the same ban was "08:12" on its ticket and
 * "10:12" on the account's page, and the gap did not show anywhere but in
 * production. Every date and time the console prints goes through here, or
 * names its zone itself (__tests__/console-time.test.ts keeps it so).
 */
export const CONSOLE_TIME_ZONE = "Europe/Paris";

/** A French formatter on the console's clock. */
export function consoleDateFormat(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("fr-FR", { ...options, timeZone: CONSOLE_TIME_ZONE });
}
