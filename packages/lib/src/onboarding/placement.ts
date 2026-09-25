/**
 * The placement test's words and small rules, the same on the site and in the
 * app: what each domain and difficulty is called, how a score reads, how long
 * the test takes. Scoring and the waivers it grants are the server's
 * (apps/web/lib/onboarding/placement.ts); nothing here decides them.
 */

import { PLACEMENT_MASTERY_THRESHOLD } from "@cyberlearn/types";

export type PlacementCategory = "DEV" | "CYBERSEC" | "NETWORK";

/** The domains in the order the test asks them, which is the database's. */
export const PLACEMENT_CATEGORIES: readonly PlacementCategory[] = ["DEV", "CYBERSEC", "NETWORK"];

export const PLACEMENT_CATEGORY_LABEL: Record<PlacementCategory, string> = {
  DEV: "Développement",
  CYBERSEC: "Cybersécurité",
  NETWORK: "Réseaux & Systèmes",
};

export const PLACEMENT_DIFFICULTY_LABEL: Record<string, string> = {
  BEGINNER: "Débutant",
  INTERMEDIATE: "Intermédiaire",
  ADVANCED: "Avancé",
};

export function isPlacementCategory(value: unknown): value is PlacementCategory {
  return value === "DEV" || value === "CYBERSEC" || value === "NETWORK";
}

/** How a domain's score reads on the result: 70 and up is advanced, 40 and up intermediate. */
export function placementLevelFor(score: number): string {
  if (score >= 70) return "Avancé";
  if (score >= 40) return "Intermédiaire";
  return "Débutant";
}

/** The estimate the intro gives: about forty-five seconds a question, rounded up. */
export function placementMinutesFor(questionCount: number): number {
  return Math.ceil(questionCount * 0.75);
}

export interface PlacementScores {
  devScore: number;
  cybersecScore: number;
  networkScore: number;
}

/** A domain's score out of the three. */
export function placementScoreOf(scores: PlacementScores, category: PlacementCategory): number {
  if (category === "DEV") return scores.devScore;
  if (category === "CYBERSEC") return scores.cybersecScore;
  return scores.networkScore;
}

/** The domain the result calls the strong point: the highest score, the first one on a tie. */
export function strongestPlacementDomain(scores: PlacementScores): PlacementCategory {
  let best: PlacementCategory = "DEV";
  for (const category of PLACEMENT_CATEGORIES) {
    if (placementScoreOf(scores, category) > placementScoreOf(scores, best)) best = category;
  }
  return best;
}

/** The domains the waivers were granted for: 70 and up, the server's threshold. */
export function masteredPlacementDomains(scores: PlacementScores): PlacementCategory[] {
  return PLACEMENT_CATEGORIES.filter(
    (category) => placementScoreOf(scores, category) >= PLACEMENT_MASTERY_THRESHOLD,
  );
}

/** The questions a set of choices has not answered yet: the test is sent whole. */
export function unansweredPlacementQuestions(
  questionIds: readonly string[],
  selected: Readonly<Record<string, string>>,
): string[] {
  return questionIds.filter((id) => selected[id] === undefined);
}

/** The choices as the server reads them. */
export function placementAnswersFrom(
  selected: Readonly<Record<string, string>>,
): { questionId: string; selectedOptionId: string }[] {
  return Object.entries(selected).map(([questionId, selectedOptionId]) => ({
    questionId,
    selectedOptionId,
  }));
}

export const PLACEMENT_COPY = {
  offer: "Faire le test de positionnement",
  offerNote:
    "Optionnel. Il repère ce que tu maîtrises déjà, pour que tu puisses sauter ces leçons.",
  title: "Où en es-tu vraiment ?",
  intro: (count: number): string =>
    `${String(count)} questions rapides pour calibrer ton point de départ. Aucun XP n'est attribué, c'est uniquement pour t'orienter.`,
  waiverNote:
    "Les niveaux débutant et intermédiaire des domaines maîtrisés seront débloqués automatiquement.",
  resultTitle: "Ton profil, cartographié.",
  waived: "Les niveaux débutant de tes domaines forts ont été débloqués automatiquement.",
  recommended:
    "D'après ton profil, ce parcours correspond à ton niveau et tes objectifs. Les prérequis débutant et intermédiaire de tes domaines maîtrisés sont déjà validés.",
  fromScratch:
    "Tu pars de zéro, c'est le meilleur moment. Explore nos parcours pour choisir ton point d'entrée.",
} as const;
