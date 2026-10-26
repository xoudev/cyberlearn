/**
 * Whether new prerequisites for a lesson would close a loop.
 *
 * Prerequisites are recorded, carried by the import and the sync, and shown in
 * the console; they gate nothing yet. The site and the app lock a lesson by
 * its place in a path only (lessonLocks in apps/web/lib/lessons/access.ts,
 * behind `/api/mobile/lesson-access`), and nothing on the learner's side reads
 * LessonPrerequisite. A loop still has no meaning: a lesson that requires,
 * through any number of steps, a lesson that requires it could never be opened
 * once prerequisites do gate a lesson. The import and the sync order a batch
 * by its prerequisites and refuse a cycle inside it
 * (orderBatchByPrerequisites); the console's own editor refuses one too,
 * across the whole catalogue rather than one batch, and so does a file
 * written over a lesson already in the database (prerequisiteLoop in
 * lesson-update.service.ts).
 *
 * Pure: the caller reads the links, this walks them.
 */

export interface PrerequisiteEdge {
  /** The lesson that has the prerequisite. */
  lessonId: string;
  /** The lesson it requires. */
  prerequisiteId: string;
}

/**
 * The loop giving `lessonId` these prerequisites would close, as the chain of
 * lesson ids from it back to it - [lesson, required, …, lesson] - or null when
 * there is none. `edges` are the catalogue's links as they stand; the lesson's
 * own are replaced by `prerequisiteIds`.
 */
export function findPrerequisiteCycle(
  lessonId: string,
  prerequisiteIds: readonly string[],
  edges: readonly PrerequisiteEdge[],
): string[] | null {
  const requires = new Map<string, string[]>();
  for (const edge of edges) {
    if (edge.lessonId === lessonId) continue;
    const list = requires.get(edge.lessonId);
    if (list) list.push(edge.prerequisiteId);
    else requires.set(edge.lessonId, [edge.prerequisiteId]);
  }
  requires.set(lessonId, [...prerequisiteIds]);

  // Breadth first from the lesson, remembering how each lesson was reached, so
  // the loop found is the shortest and can be told in full.
  const cameFrom = new Map<string, string>();
  // An array's iterator reads its length at each step, so the lessons pushed
  // while walking are walked too.
  const queue: string[] = [lessonId];
  for (const id of queue) {
    for (const next of requires.get(id) ?? []) {
      if (next === lessonId) return chain(cameFrom, id, lessonId);
      if (cameFrom.has(next)) continue;
      cameFrom.set(next, id);
      queue.push(next);
    }
  }
  return null;
}

/** The ids from the lesson to `last`, then back to the lesson. */
function chain(cameFrom: ReadonlyMap<string, string>, last: string, lessonId: string): string[] {
  const path = [last];
  for (let id = last; id !== lessonId; ) {
    const previous = cameFrom.get(id);
    if (previous === undefined) break;
    path.unshift(previous);
    id = previous;
  }
  return [...path, lessonId];
}
