/**
 * What a path's lesson list becomes when the console saves it.
 *
 * The console used to delete every PathLesson of the path and create them
 * again from the ordered ids: 0-based positions, isRequired forced to true and
 * no moduleId. Saving a path the sync had filed into modules emptied all of
 * them, and the site showed it as one untitled block. A lesson already in the
 * path now keeps its flag, and its module unless it was moved into another;
 * positions are 1-based as the sync writes them (path-sync.ts).
 *
 * Pure, so the rule is tested without a database.
 */

/** A lesson's link to a path, as the path holds it today. */
export interface PathLessonLink {
  lessonId: string;
  moduleId: string | null;
  isRequired: boolean;
}

/** The same link once the path is saved, with its new place. */
export interface PlannedPathLesson extends PathLessonLink {
  /** 1-based. */
  position: number;
}

/**
 * Positions are moved out of the way before a path is rewritten: the unique
 * (pathId, position) refuses a reorder written one row at a time.
 */
export const POSITION_PARKING = 1_000_000;

/**
 * The rows of a path whose lessons are `ordered`, from the rows it has, given
 * in path order.
 *
 * A lesson already linked keeps its module and isRequired. A lesson new to the
 * path joins the module of the lesson before it, so one dropped in the middle
 * of a module lands in that module rather than in a last, untitled group (see
 * groupIntoModules); at the head of the list it joins the first module that
 * follows. In a path without modules every moduleId stays null.
 *
 * The exception is a lesson moved out of its module. The console's editor
 * shows one flat list: an admin who drags a lesson of M1 between two lessons
 * of M2 sees it in M2. Left under M1, the site would still show it in M1,
 * where it groups by module, and unlock it after the M2 lessons before it,
 * which follows the positions. So the lessons that moved (movedLessons) are
 * placed by the lessons that did not, their anchors: a moved lesson between
 * two anchors of one module joins it; one at the edge of its own module stays
 * in it; one that lands among another module's lessons, or past its last,
 * joins the anchor before it (after it, at the head of the path). Two limits:
 * a lesson never leaves a module for "no module", and a module none of whose
 * lessons stayed in place keeps them, rather than be emptied by a reorder.
 */
export function planPathLessons(
  existing: readonly PathLessonLink[],
  ordered: readonly string[],
): PlannedPathLesson[] {
  const linked = new Map(existing.map((link) => [link.lessonId, link]));
  const moved = movedLessons(existing, ordered);

  // The module of the nearest lesson that did not move, on either side.
  const anchors = ordered.map((id) => {
    const link = linked.get(id);
    return link && !moved.has(id) ? link : undefined;
  });
  const anchoredModules = new Set(anchors.flatMap((link) => (link ? [link.moduleId] : [])));
  const nextAnchor: (string | null | undefined)[] = [];
  let following: string | null | undefined;
  for (let index = ordered.length - 1; index >= 0; index--) {
    nextAnchor[index] = following;
    const anchor = anchors[index];
    if (anchor) following = anchor.moduleId;
  }

  const plan: PlannedPathLesson[] = [];
  let previousAnchor: string | null | undefined;
  for (const [index, lessonId] of ordered.entries()) {
    const kept = linked.get(lessonId);
    const after = nextAnchor[index];
    let moduleId: string | null;
    if (!kept) {
      const last = plan.at(-1);
      moduleId = last ? last.moduleId : (after ?? null);
    } else if (!moved.has(lessonId)) {
      moduleId = kept.moduleId;
      previousAnchor = kept.moduleId;
    } else {
      moduleId = movedModule(kept.moduleId, previousAnchor, after, anchoredModules);
    }
    plan.push({ lessonId, position: index + 1, moduleId, isRequired: kept?.isRequired ?? true });
  }
  return plan;
}

/** Where a lesson that moved is filed, from the anchors around it. */
function movedModule(
  own: string | null,
  before: string | null | undefined,
  after: string | null | undefined,
  anchoredModules: ReadonlySet<string | null>,
): string | null {
  let target: string | null | undefined;
  if (before === after) target = before;
  else if (own === before || own === after) target = own;
  else target = before !== undefined ? before : after;

  if (target === undefined || target === null) return own;
  // Every lesson of its module moved: refiling them all would empty it.
  if (own !== null && !anchoredModules.has(own)) return own;
  return target;
}

/**
 * The lessons of `ordered` already in the path that moved: those outside the
 * longest run of them still in their old order. Moving one lesson down past
 * three others is one move, not three moves up, so the three stay anchors.
 */
function movedLessons(
  existing: readonly PathLessonLink[],
  ordered: readonly string[],
): Set<string> {
  const oldIndex = new Map(existing.map((link, index) => [link.lessonId, index]));
  const kept = ordered.filter((id) => oldIndex.has(id));
  const values = kept.map((id) => oldIndex.get(id) ?? -1);

  // Longest increasing subsequence of the old indexes, patience style:
  // tails[k] is where the best run of length k + 1 seen so far ends.
  const tails: number[] = [];
  const previous: number[] = [];
  for (const [i, value] of values.entries()) {
    let low = 0;
    let high = tails.length;
    while (low < high) {
      const mid = (low + high) >> 1;
      if ((values[tails[mid] ?? -1] ?? -1) < value) low = mid + 1;
      else high = mid;
    }
    previous[i] = tails[low - 1] ?? -1;
    tails[low] = i;
  }

  const stayed = new Set<string>();
  for (let i = tails.at(-1) ?? -1; i >= 0; i = previous[i] ?? -1) {
    const id = kept[i];
    if (id !== undefined) stayed.add(id);
  }
  return new Set(kept.filter((id) => !stayed.has(id)));
}
