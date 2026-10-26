/**
 * "Revoir ce passage": where in its lesson a review question comes from, as
 * a link the lesson page opens on.
 *
 * The lesson page shows one section at a time. `?section=N` opens the N-th
 * (from 1, as the plan of the lesson numbers them), and `#quiz-<id>` brings
 * the question into view: the quiz carries that id
 * (apps/web/app/(app)/lessons/[slug]/_components/quiz.tsx). The page opens
 * the section only where the reader may already open it, on a lesson they
 * finished; a card or a module's review only ever asks about one. With the
 * lesson already on screen, its stepper opens the section and takes the
 * parameter off the address (lesson-stepper.tsx).
 *
 * Pure: the site writes the link, the app will read the same section number.
 */

/** The parameter of the lesson's address that asks for a section. */
export const SECTION_PARAM = "section";

/** The id a quiz carries on the lesson page, for a link to land on it. */
export function quizAnchor(quizId: string): string {
  return `quiz-${quizId}`;
}

/**
 * The link to a question in its lesson: the lesson, the section the question
 * is in when it is known (`section` from 0), the question itself.
 */
export function passageHref(slug: string, section: number | null, quizId: string): string {
  const query = section === null ? "" : `?${SECTION_PARAM}=${String(section + 1)}`;
  return `/lessons/${encodeURIComponent(slug)}${query}#${encodeURIComponent(quizAnchor(quizId))}`;
}

/**
 * The section `?section=` asks for, from 0, among the lesson's `total`; the
 * first when it asks for none, or for one the lesson does not have.
 */
export function sectionFromQuery(raw: string | string[] | undefined, total: number): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === undefined || !/^\d{1,3}$/u.test(value)) return 0;
  const n = Number(value);
  return n >= 1 && n <= total ? n - 1 : 0;
}
