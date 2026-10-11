/**
 * The wait after a failed exam, in words: how long is left, and when it ends.
 * The result screen used to show a "Réessayer après le cooldown" button that
 * was disabled for good, even once the 48 hours had passed.
 */

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * What is left of the wait: "47 h 05 min" while it runs in hours, then
 * "12 min 09 s", then "45 s". Rounded up, so it never reads 0 before the end.
 */
export function waitLeftLabel(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  if (seconds >= 3600) {
    const minutes = Math.ceil(seconds / 60);
    return `${String(Math.floor(minutes / 60))} h ${pad2(minutes % 60)} min`;
  }
  if (seconds >= 60) return `${String(Math.floor(seconds / 60))} min ${pad2(seconds % 60)} s`;
  return `${String(seconds)} s`;
}

/**
 * When the next attempt opens: "mardi 13 octobre à 14:05", on the reader's
 * clock. `timeZone` is for the tests; the browser's own zone is the default.
 */
export function unlockDateLabel(untilMs: number, timeZone?: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(new Date(untilMs));
}
