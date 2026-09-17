/**
 * Which sections the dashboard shows, in which order, and what number each one
 * wears.
 *
 * Two complaints shaped this. The first: the parcours were section 07, at the
 * bottom of seven, under the trophies and the raw figures - and a parcours is
 * the thing this site is for. They now lead.
 *
 * The second: the page felt cluttered, and most of the clutter was sections
 * that had nothing to say. "Rien à réviser pour l'instant" was a heading, a
 * numbered label, a bordered box sixty pixels tall and a button, all to
 * announce an absence. A section with nothing in it is not rendered, and the
 * numbering closes up behind it - so a new reader sees three headings rather
 * than seven, and none of them is an empty box.
 *
 * It lives here, away from the JSX, because "what is on this page" is a
 * decision worth testing on its own.
 */

export type DashboardSectionKey = "paths" | "resume" | "reviews" | "progress";

export interface DashboardSection {
  key: DashboardSectionKey;
  /** Zero-padded, as the eyebrows print it: 01, 02, 03. */
  number: string;
}

export interface DashboardSectionInput {
  /** A lesson left half-finished, worth offering to resume. */
  hasResume: boolean;
  /** How many revisions are due right now. */
  dueReviews: number;
}

/** The order, once and for all. Parcours first is the whole point. */
const ORDER: DashboardSectionKey[] = ["paths", "resume", "reviews", "progress"];

export function planSections(input: DashboardSectionInput): DashboardSection[] {
  const shown = ORDER.filter((key) => {
    if (key === "resume") return input.hasResume;
    if (key === "reviews") return input.dueReviews > 0;
    // The parcours and the progress band always have something to say: one
    // offers what to do next, the other is the reader's own record.
    return true;
  });

  return shown.map((key, index) => ({
    key,
    number: String(index + 1).padStart(2, "0"),
  }));
}

/** The number a section wears, or null when it is not on the page at all. */
export function sectionNumber(
  sections: DashboardSection[],
  key: DashboardSectionKey,
): string | null {
  return sections.find((section) => section.key === key)?.number ?? null;
}
