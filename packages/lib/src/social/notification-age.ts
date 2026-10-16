/**
 * How long ago a notification arrived, as the bell's panel and the app's
 * notifications screen both say it: "à l'instant", "il y a 5 min", "il y a
 * 3 h", "hier", "il y a 4 j", "il y a 2 sem.", "il y a 3 mois", "il y a 1 an".
 *
 * The unit follows the gap. The site's panel used to count everything in
 * minutes, which made last week "il y a 10 080 minutes".
 *
 * `createdAt` is a Date from a server action, or a string from a row pushed by
 * Realtime or read from the app's API. A date in the future (a clock slightly
 * ahead) reads as now.
 */
export function notificationAge(createdAt: Date | string, now: number): string {
  const then = new Date(createdAt).getTime();
  const s = Math.max(0, Math.round((now - then) / 1000));
  if (s < 60) return "à l'instant";
  const m = Math.round(s / 60);
  if (m < 60) return `il y a ${String(m)} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${String(h)} h`;
  const d = Math.round(h / 24);
  if (d < 2) return "hier";
  if (d < 7) return `il y a ${String(d)} j`;
  if (d < 30) return `il y a ${String(Math.round(d / 7))} sem.`;
  if (d < 365) return `il y a ${String(Math.max(1, Math.round(d / 30)))} mois`;
  const y = Math.round(d / 365);
  return `il y a ${String(y)} an${y > 1 ? "s" : ""}`;
}
