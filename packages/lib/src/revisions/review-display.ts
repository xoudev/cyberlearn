/**
 * What a due review says about itself, on the site and in the app.
 *
 * Spaced repetition (SM-2) is graded on the server; these only describe a
 * review: when it is due, roughly how long it takes, what a good recall earns,
 * and what each grade means. Kept here so both apps word it the same way.
 */

export type ReviewQuality = 1 | 3 | 5;
export type ReviewOutcome = "forgot" | "hard" | "easy";

/** The three grades, in the order they are offered. */
export const REVIEW_GRADES: readonly {
  quality: ReviewQuality;
  outcome: ReviewOutcome;
  label: string;
}[] = [
  { quality: 1, outcome: "forgot", label: "Oublié" },
  { quality: 3, outcome: "hard", label: "Difficile" },
  { quality: 5, outcome: "easy", label: "Facile" },
];

export function outcomeOf(quality: ReviewQuality): ReviewOutcome {
  return quality === 1 ? "forgot" : quality === 3 ? "hard" : "easy";
}

/** Minutes a review of a lesson of this difficulty takes, roughly. */
export function reviewMinutes(difficulty: string): number {
  switch (difficulty) {
    case "BEGINNER":
      return 2;
    case "INTERMEDIATE":
      return 3;
    case "ADVANCED":
      return 5;
    case "EXPERT":
      return 8;
    default:
      return 3;
  }
}

/** A successful recall earns a tenth of the lesson's XP (see the grading service). */
export function reviewXpFor(lessonXp: number): number {
  return Math.floor(lessonXp * 0.1);
}

export interface ReviewDue {
  text: string;
  kind: "today" | "tomorrow" | "soon";
}

/** "Dû aujourd'hui", "Dû demain", "Dans 4 jours". Anything overdue is due today. */
export function reviewDueLabel(nextReviewAt: Date, now: Date): ReviewDue {
  const diffDays = Math.ceil((nextReviewAt.getTime() - now.getTime()) / 86_400_000);
  if (diffDays <= 0) return { text: "Dû aujourd'hui", kind: "today" };
  if (diffDays === 1) return { text: "Dû demain", kind: "tomorrow" };
  return { text: `Dans ${String(diffDays)} jours`, kind: "soon" };
}

/** What a grade did, once the server accepted it. */
export function reviewOutcomeText(outcome: ReviewOutcome, xp: number): string {
  if (outcome === "easy") return `Bien mémorisé · +${String(xp)} XP`;
  if (outcome === "hard") return `Encore fragile · +${String(xp)} XP · à revoir demain`;
  return "Oublié · retour en révision demain";
}
