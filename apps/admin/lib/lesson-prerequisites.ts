/**
 * Whether new prerequisites for a lesson would close a loop.
 *
 * A lesson that requires, through any number of steps, a lesson that requires
 * it can never be opened by anyone: the site and the app both wait for the
 * prerequisites to be done (`/api/mobile/lesson-access`). The import and the
 * sync order a batch by its prerequisites and refuse a cycle inside it
 * (orderBatchByPrerequisites); the console's own editor has to refuse one too,
 * across the whole catalogue rather than one batch.
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
