/**
 * Which lessons the assign form offers, given what the teacher has narrowed to.
 *
 * A pure function on purpose. This logic used to be an inline expression in the
 * form that ended in `.slice(0, 30)` - no cap was mentioned anywhere on screen,
 * so a teacher whose catalogue was larger than that scrolled a six-row select
 * to its end and concluded the rest of the platform's lessons did not exist.
 * Out here it can be held to "every match, and only the matches" by a test.
 */

export interface AssignableLessonLike {
  id: string;
  category: string;
  /** Title and category, lowercased by the server so filtering is a substring test. */
  search: string;
}

export interface AssignableFilter {
  /** Lessons already set for this class; re-assigning is a different intent. */
  alreadySet: ReadonlySet<string>;
  /** "" means every category, rather than a fourth category value. */
  category: string;
  query: string;
}

export function filterAssignable<T extends AssignableLessonLike>(
  lessons: readonly T[],
  { alreadySet, category, query }: AssignableFilter,
): T[] {
  const q = query.trim().toLowerCase();
  return lessons.filter(
    (l) =>
      !alreadySet.has(l.id) &&
      (category === "" || l.category === category) &&
      (q === "" || l.search.includes(q)),
  );
}
