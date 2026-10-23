/**
 * What somebody is told when a limit stops them, in the site's voice.
 *
 * The learner site says "tu", and a refusal is the worst place to switch to
 * "vous": the person is already blocked. The messages sat in four files, two of
 * them in the formal register, and a ticket's delay read "dans 900 secondes".
 * They live here so the register and the unit are written once.
 */

/** The message posting limit (forum, lesson questions, write-ups): a minute. */
export const TOO_MANY_MESSAGES = "Trop de messages. Réessaie dans une minute.";

/**
 * How long to wait, in a unit a person reads: whole minutes, rounded up, and
 * never less than one. "dans 900 secondes" is a number to divide; "dans 15
 * minutes" is an answer, and rounding up is the side that does not make them
 * come back too early.
 */
export function waitLabel(retryAfterSeconds: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return `${String(minutes)} minute${minutes > 1 ? "s" : ""}`;
}

/** The limit on opening help requests, with how long is left. */
export function tooManyRequests(retryAfterSeconds: number): string {
  return `Trop de demandes. Réessaie dans ${waitLabel(retryAfterSeconds)}.`;
}
