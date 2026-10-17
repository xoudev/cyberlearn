/**
 * Where a lesson sits in its path, and whether the reader has earned it.
 *
 * The sequential rule already existed, but only as a drawing: the path page
 * greyed out a node whose predecessor was unfinished, while /lessons listed
 * every lesson and /lessons/[slug] served any of them to anyone. The lock was
 * a picture of a rule nothing enforced. This module is that rule, written once
 * so the catalogue, the lesson page and the path map cannot drift apart.
 *
 * Shared with the app, which kept a rule of its own on its path screen ("the
 * first mission not completed") and none at all on its catalogue and lesson
 * screen: the same rule now draws both apps' path maps, and the server applies
 * it to every completion and quiz answer (apps/web/lib/lessons/access.ts).
 *
 * A lesson is readable when:
 *   - the reader has already completed it - a lesson never re-locks, which
 *     matters because everything was open until now and some readers are
 *     sitting on progress the strict rule would otherwise take away; or
 *   - the placement test waived it; or
 *   - it opens its path; or
 *   - the lesson immediately before it in the same path is completed or
 *     waived.
 *
 * A waiver is what the placement test grants for a domain the reader already
 * masters (apps/web/lib/onboarding/placement.ts writes them): it counts as a
 * completion for the lock, and for nothing else. The lesson is not marked
 * completed and earns nothing; it simply stops standing in the way. The
 * result screens promise exactly that, on the site and in the app.
 *
 * Every one of the 192 lessons belongs to exactly one path, so "the lesson
 * before it" is unambiguous. The shape below still keys by lesson id rather
 * than assuming it: a lesson placed in a second path resolves to whichever
 * placement it is reached through, and the first unlocked one wins.
 */

export type LockState = "completed" | "unlocked" | "locked";

/**
 * Generic over the lesson shape: the catalogue needs a card's worth of fields
 * and the path map needs a different set, and neither should have to widen its
 * query to satisfy the other. Only `id` is load-bearing here - it is what the
 * rule compares against the completed set.
 */
export interface PathWithLessons<L extends { id: string }> {
  id: string;
  slug: string;
  title: string;
  lessons: { position: number; lesson: L }[];
}

export interface LessonPlacement<L> {
  state: LockState;
  /** 1-based rank within the path, for "Leçon 4 / 12". */
  rank: number;
  total: number;
  path: { slug: string; title: string };
  /** The lesson that unlocks this one. Null when this lesson opens the path. */
  previous: L | null;
  /** The next lesson in the path. Null when this lesson closes it. */
  next: L | null;
}

export interface PlacementOptions {
  /**
   * Opens every lesson that is not completed yet. For administrators, who
   * review the catalogue and cannot be asked to work through a path to reach
   * the lesson they are checking. Completed lessons still read as completed.
   */
  unlockAll?: boolean;
  /**
   * The lessons the placement test waived for the reader. Each one is
   * readable, and opens the lesson after it, as a completed one would; it
   * still reads as "unlocked", not "completed", since it was not done.
   */
  waivedLessonIds?: Iterable<string>;
}

/**
 * Index every lesson of the given paths by id.
 *
 * `paths[].lessons` must already be ordered by position; the caller gets that
 * from the database rather than re-sorting here, and `position` is carried
 * through only for display - adjacency is array order, so a gap in the
 * positions (a lesson pulled from a path) shifts neighbours instead of
 * stranding the rest of the path behind a hole that can never be filled.
 */
export function indexPlacements<L extends { id: string }>(
  paths: PathWithLessons<L>[],
  completedLessonIds: Iterable<string>,
  options: PlacementOptions = {},
): Map<string, LessonPlacement<L>> {
  const completed = new Set(completedLessonIds);
  const waived = new Set(options.waivedLessonIds ?? []);
  /** Whether a lesson lets the one after it open. */
  const opensNext = (id: string): boolean => completed.has(id) || waived.has(id);
  const placements = new Map<string, LessonPlacement<L>>();

  for (const path of paths) {
    const total = path.lessons.length;

    path.lessons.forEach((entry, i) => {
      const previous = i > 0 ? (path.lessons[i - 1]?.lesson ?? null) : null;
      const next = path.lessons[i + 1]?.lesson ?? null;

      const state: LockState = completed.has(entry.lesson.id)
        ? "completed"
        : options.unlockAll === true ||
            waived.has(entry.lesson.id) ||
            previous === null ||
            opensNext(previous.id)
          ? "unlocked"
          : "locked";

      const placement: LessonPlacement<L> = {
        state,
        rank: i + 1,
        total,
        path: { slug: path.slug, title: path.title },
        previous,
        next,
      };

      // A lesson shared by two paths is readable as soon as either path opens
      // it: keep the more permissive placement rather than the last one seen.
      const seen = placements.get(entry.lesson.id);
      if (seen === undefined || rankOf(placement.state) > rankOf(seen.state)) {
        placements.set(entry.lesson.id, placement);
      }
    });
  }

  return placements;
}

/** "completed" beats "unlocked" beats "locked" when a lesson sits in two paths. */
function rankOf(state: LockState): number {
  return state === "completed" ? 2 : state === "unlocked" ? 1 : 0;
}

/**
 * Where a path's "Continuer" lands, as an index into the path's lessons: the
 * first one the reader can open and has not finished. That is also the first
 * lesson not completed, since everything before it is done and so opens it.
 *
 * A lesson the placement test waived is open but not where the reader picks
 * up: the first open lesson that was not waived comes first. When every open
 * lesson was waived, the first of them is still the answer, rather than none.
 * -1 when no lesson is open (every one completed, or the path is empty).
 *
 * `states` and `waived` run parallel to the path's lessons.
 */
export function resumeIndex(states: readonly LockState[], waived: readonly boolean[] = []): number {
  const fresh = states.findIndex((state, i) => state === "unlocked" && waived[i] !== true);
  return fresh >= 0 ? fresh : states.indexOf("unlocked");
}

/**
 * The lesson a path's "Continuer" opens (resumeIndex). Once every lesson is
 * completed there is nothing left to resume, and it is the first lesson
 * again, to go back over. Null for a path with no lesson.
 *
 * `states` and `waived` run parallel to `lessons`, as the path page builds them.
 */
export function resumeLesson<L>(
  lessons: readonly L[],
  states: readonly LockState[],
  waived: readonly boolean[] = [],
): L | null {
  const open = resumeIndex(states, waived);
  return lessons[open >= 0 ? open : 0] ?? null;
}

/**
 * A lesson outside every published path has no gate to apply. Treating that as
 * readable is deliberate: a lesson nothing sequences cannot have a predecessor
 * to wait for, and locking it would strand it with no way to ever open it.
 */
export function isReadable(placement: LessonPlacement<unknown> | undefined): boolean {
  return placement?.state !== "locked";
}
