/**
 * The duels' words that are the site's own, shared by the list and a duel's
 * page, on the server and in the browser alike: the dates as a French reader
 * reads them, a question's number, a plural. Where a duel stands for the
 * reader (its outcome, the record, the small print, the scoreboard's squares,
 * the review of their answers) is written in @cyberlearn/lib/social/duel,
 * which the app shares; the outcome is also the tone each surface is drawn
 * in (duels.css).
 */

/** "vendredi 9 octobre à 12:00", on the site's clock whoever reads it. */
const WHEN = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Paris",
});

/** "8 octobre". */
const DAY = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  timeZone: "Europe/Paris",
});

export function whenOf(iso: string): string {
  return WHEN.format(new Date(iso));
}

export function dayOf(iso: string): string {
  return DAY.format(new Date(iso));
}

/** "02": a question's number, as the final exam writes it. */
export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** French plural: an s past one ("0 victoire", "2 victoires"). */
export function plural(n: number, word: string): string {
  return n > 1 ? `${word}s` : word;
}
