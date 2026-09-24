/** The words beside a star rating, the same as on the site. */
const LABELS: Record<number, string> = {
  1: "Difficile à suivre",
  2: "Peut mieux faire",
  3: "Correct",
  4: "Bien",
  5: "Excellent",
};

export function ratingLabel(score: number): string {
  return LABELS[score] ?? "";
}

/** "4,3 · 12 avis", or null while nobody has rated. */
export function averageLine(avg: number | null, count: number): string | null {
  if (avg === null || count === 0) return null;
  return `${avg.toFixed(1).replace(".", ",")} · ${String(count)} avis`;
}
