import { CARD_SESSION_SIZE, REVIEW_SESSION_XP } from "./cards";

/**
 * The words of "Rappel du jour" and "Réviser ce module", the same on the site
 * (the dashboard's card, the ?rappel= window, the path page) and in the app
 * (the home tab's card, the Révisions screen, a module's review). None of
 * them counts what waits: a number that only grows while one is away is a
 * reason not to come back.
 */

/** Where the day's recall stands, as the dashboard and the home tab say it. */
export type RecallState = "todo" | "done" | "empty";

/** The day's recall, or a module's review. */
export type RecallMode = "daily" | "module";

export const RECALL_STATE_LABEL: Record<RecallState, string> = {
  todo: "à faire",
  done: "fait aujourd'hui",
  empty: "rien aujourd'hui",
};

export const RECALL_STATE_TEXT: Record<RecallState, string> = {
  todo: `Quelques questions de tes leçons, ${String(CARD_SESSION_SIZE)} au plus, corrigées une à une : deux minutes et ${String(REVIEW_SESSION_XP)} XP.`,
  done: "Fait pour aujourd'hui. Les questions ratées reviennent demain, les autres plus tard.",
  empty: "Rien à revoir aujourd'hui. Une question ratée dans une leçon revient ici le lendemain.",
};

/** The button that opens the day's recall, or null when there is nothing to open. */
export const RECALL_STATE_ACTION: Record<RecallState, string | null> = {
  todo: "Commencer",
  done: "Revoir mes réponses",
  empty: null,
};

/** Under the dashboard's card: why two minutes a day are worth it. */
export const RECALL_NOTE =
  "Une question revient d'autant plus tard que tu y réponds juste : deux minutes aujourd'hui valent vingt dans un mois.";

/** The way into a module's review, in the module's header of a path. */
export const MODULE_REVIEW_ACTION = "Réviser ce module · 2 min";

/** What a module's review is, said beside its button. */
export const MODULE_REVIEW_HINT =
  "Quelques questions des leçons faites de ce module, corrigées une à une, sans XP";

/** Under the title while questions are open. */
export const RECALL_META: Record<RecallMode, string> = {
  daily:
    "Quelques questions de tes leçons, deux minutes. Tes réponses sont gardées : tu peux reprendre plus tard.",
  module: "Six questions au plus sur les leçons faites de ce module, sans XP.",
};

/** Nothing to ask. */
export const RECALL_EMPTY: Record<RecallMode, string> = {
  daily:
    "Rien à revoir aujourd'hui. Une question ratée dans une leçon revient ici le lendemain, puis de plus en plus tard tant que tu y réponds juste.",
  module:
    "Rien à réviser dans ce module pour l'instant : ses questions arrivent ici quand tu as terminé une de ses leçons.",
};

/** Under the score, once every question is answered. */
export const RECALL_END_NOTE: Record<RecallMode, string> = {
  daily:
    "Les questions ratées reviennent demain, les autres de plus en plus tard. Le rappel compte pour ta série.",
  module: "Une révision libre, sans XP : c'est le rappel du jour qui en rapporte.",
};

/** Spaced repetition switched off in the settings. */
export const RECALL_OFF =
  "La répétition espacée est coupée dans tes réglages : aucune question ne revient.";

/** A module this reader may not open, or that is gone. */
export const RECALL_MISSING = "Ce module n'est pas disponible.";

/** The way back from a question to its passage in the lesson. */
export const RECALL_PASSAGE = "Revoir ce passage";

/** The verdict on one answer: right, or missed with the option that was right. */
export function recallVerdictTitle(correct: boolean, rightOption: string): string {
  return correct ? "Bonne réponse." : `Raté. La bonne réponse : ${rightOption}.`;
}
