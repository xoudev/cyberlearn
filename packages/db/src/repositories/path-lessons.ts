/**
 * What a path's lesson list becomes when the console saves it.
 *
 * The console used to delete every PathLesson of the path and create them
 * again from the ordered ids: 0-based positions, isRequired forced to true and
 * no moduleId. Saving a path the sync had filed into modules emptied all of
 * them, and the site showed it as one untitled block. A lesson already in the
 * path now keeps its module and its flag; only its position moves, 1-based as
 * the sync writes it (path-sync.ts).
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
 * The rows of a path whose lessons are `ordered`, from the rows it has.
 *
 * A lesson already linked keeps its module and isRequired. A lesson new to the
 * path joins the module of the lesson before it, so one dropped in the middle
 * of a module lands in that module rather than in a last, untitled group (see
 * groupIntoModules); at the head of the list it joins the first module that
 * follows. In a path without modules every moduleId stays null.
 */
export function planPathLessons(
  existing: readonly PathLessonLink[],
  ordered: readonly string[],
): PlannedPathLesson[] {
  const linked = new Map(existing.map((link) => [link.lessonId, link]));
  const firstKept = ordered.map((id) => linked.get(id)).find((link) => link !== undefined);

  const plan: PlannedPathLesson[] = [];
  let previousModule = firstKept?.moduleId ?? null;
  for (const [index, lessonId] of ordered.entries()) {
    const kept = linked.get(lessonId);
    const moduleId = kept ? kept.moduleId : previousModule;
    plan.push({
      lessonId,
      position: index + 1,
      moduleId,
      isRequired: kept?.isRequired ?? true,
    });
    previousModule = moduleId;
  }
  return plan;
}
