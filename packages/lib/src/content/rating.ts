import { formatNumberFr } from "../format.js";

/**
 * The words around a star rating, for a lesson and for a path, on the site
 * and in the app.
 *
 * The site and the app each kept their own copy: the same five labels twice,
 * and two ways of writing the average. The site printed "5.0" over "1 note",
 * the app "5,0 · 1 avis". This is the one version, the app's.
 */
const LABELS: Readonly<Record<number, string>> = {
  1: "Difficile à suivre",
  2: "Peut mieux faire",
  3: "Correct",
  4: "Bien",
  5: "Excellent",
};

/** What a score of 1 to 5 means, or "" for anything else. */
export function ratingLabel(score: number): string {
  return LABELS[score] ?? "";
}

/** "4,3": one decimal, with the French comma. */
export function formatAverage(avg: number): string {
  return avg.toFixed(1).replace(".", ",");
}

/** "4,3 · 12 avis", or null while nobody has rated. */
export function averageLine(avg: number | null, count: number): string | null {
  if (avg === null || count <= 0) return null;
  return `${formatAverage(avg)} · ${formatNumberFr(count)} avis`;
}
