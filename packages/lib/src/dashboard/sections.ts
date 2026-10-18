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

export type DashboardSectionKey = "paths" | "play" | "resume" | "recall" | "friends" | "progress";

export interface DashboardSection {
  key: DashboardSectionKey;
  /** Zero-padded, as the eyebrows print it: 01, 02, 03. */
  number: string;
}

export interface DashboardSectionInput {
  /** A lesson left half-finished, worth offering to resume. */
  hasResume: boolean;
  /**
   * The day's recall is offered: spaced repetition is on. The section says
   * to do, done or nothing today, and keeps its place from one day to the
   * next; it never counts what waits, so it takes no number.
   */
  hasRecall: boolean;
  /**
   * A duel invitation waiting on the reader, or a tournament under way
   * (your-move.ts): what will not wait long, right under the parcours.
   */
  hasPlay?: boolean;
  /**
   * Whether the reader has a friend. "Tes amis" is their recent activity,
   * and with nobody to follow it would be an empty box; with friends who
   * have been quiet it still offers a duel. Absent reads as no friend.
   */
  hasFriends?: boolean;
}

/**
 * The order, once and for all. Parcours first is the whole point. What will
 * not wait comes right under them. The friends come after what is the
 * reader's to do and before their own record, where the site's dashboard
 * draws them.
 */
const ORDER: DashboardSectionKey[] = ["paths", "play", "resume", "recall", "friends", "progress"];

export function planSections(input: DashboardSectionInput): DashboardSection[] {
  const shown = ORDER.filter((key) => {
    if (key === "play") return input.hasPlay === true;
    if (key === "resume") return input.hasResume;
    if (key === "recall") return input.hasRecall;
    if (key === "friends") return input.hasFriends === true;
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
