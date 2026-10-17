/**
 * The parameter that opens the review window over the page (registered in
 * components/query-dialogs.ts): `?rappel=1` for the day's recall, from the
 * dashboard, the sidebar's "Révisions" and the daily reminder;
 * `?rappel=module-<n>-<path>` for "Réviser ce module", from the module's
 * header on the path page. One parameter for both, so one window at a time.
 */
export const RAPPEL_QUERY = "rappel";

/** The value that opens the day's recall. */
export const DAILY_RAPPEL = "1";

/** What the window was asked to show. */
export type RappelRequest = { kind: "daily" } | { kind: "module"; path: string; module: number };

/** The value that opens a module's review: module 2 of `linux-fondamentaux` is `module-2-linux-fondamentaux`. */
export function moduleRappelValue(path: string, module: number): string {
  return `module-${String(module)}-${path}`;
}

const MODULE_VALUE = /^module-(\d{1,2})-([a-z0-9][a-z0-9-]{0,119})$/u;

/** The window's value read back; anything that names no module opens the day's recall. */
export function parseRappelValue(value: string): RappelRequest {
  const match = MODULE_VALUE.exec(value);
  const moduleNumber = Number(match?.[1]);
  const path = match?.[2];
  if (path === undefined || !Number.isInteger(moduleNumber) || moduleNumber < 1) {
    return { kind: "daily" };
  }
  return { kind: "module", path, module: moduleNumber };
}
