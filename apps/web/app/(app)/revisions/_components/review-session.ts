/**
 * The rows a review session shows, across the page's reloads.
 *
 * Grading revalidates the page, and the reloaded page no longer lists the
 * review just graded: it is not due any more. Taking that list as it came
 * dropped the row before its outcome ("+X XP", "Acquise") could show, and
 * renumbered the rest. The session keeps every row it has shown, in place,
 * and takes in the reviews the reload brings (the next one waiting), after
 * them.
 */
export function extendSession<Row extends { scheduleId: string }>(
  session: readonly Row[],
  reloaded: readonly Row[],
): readonly Row[] {
  const shown = new Set(session.map((row) => row.scheduleId));
  const added = reloaded.filter((row) => !shown.has(row.scheduleId));
  return added.length === 0 ? session : [...session, ...added];
}
