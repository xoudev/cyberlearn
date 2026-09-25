/**
 * Somebody's own moderation record, in words: what they get to see about
 * themselves (when, what was flagged, how it ended) and nothing else. Not the
 * score and not the rules that fired: the first means nothing outside the
 * analyser and the second turns the filter into a puzzle people retry until
 * they beat it.
 *
 * Shared by the site's /settings/moderation and the app's screen, so the same
 * decision reads the same way on both.
 */

export interface OutcomeLabel {
  label: string;
  color: string;
}

const WAITING: OutcomeLabel = { label: "En attente d'un modérateur", color: "#FFB547" };

const OUTCOME: Record<string, OutcomeLabel> = {
  PENDING: WAITING,
  OVERTURNED: { label: "Fausse alerte · rétabli", color: "#0AFFD4" },
  UPHELD: { label: "Confirmé · supprimé", color: "#FF6B7A" },
};

/** How a recorded decision ended; anything not yet decided reads as waiting. */
export function moderationOutcome(outcome: string): OutcomeLabel {
  return OUTCOME[outcome] ?? WAITING;
}

/** What the page says before the list. */
export const MODERATION_RECORD_INTRO =
  "La modération automatique relit chaque message publié. Quand elle signale quelque chose, le message est retiré de la vue des autres et un modérateur le relit. Tu trouveras ici ce qu'elle a signalé et ce qu'il en est advenu.";

/** What the page says when there is nothing to list. */
export const MODERATION_RECORD_EMPTY = "rien à signaler : aucun de tes messages n'a été retenu";
