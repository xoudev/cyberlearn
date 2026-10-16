import type { PathMission } from "@/lib/queries";

/** A path's link to one lesson, with the lesson's status as PostgREST embeds it. */
export interface LessonLink {
  lessons: { status: string } | { status: string }[] | null | undefined;
}

/**
 * The lesson a path's link points at, when it is one of the path's missions:
 * a published lesson, as the site reads them (PUBLISHED_PATH_LESSON). A draft
 * or an archived lesson still linked to the path is null, like a lesson RLS
 * kept from the reader. The status is read rather than left to RLS, which
 * shows an administrator every lesson.
 */
export function publishedLesson<T extends { status: string }>(
  embed: T | T[] | null | undefined,
): T | null {
  const lesson = Array.isArray(embed) ? embed[0] : embed;
  return lesson?.status === "PUBLISHED" ? lesson : null;
}

/**
 * How many missions a path has: its published lessons, as the site counts
 * them. Counting the links alone counted a draft or an archived lesson.
 */
export function countMissions(links: readonly LessonLink[] | null | undefined): number {
  return (links ?? []).filter((link) => publishedLesson(link.lessons) !== null).length;
}

/**
 * How each mission of a path reads on its screen.
 *
 * "current" is the first one not completed, where the reader picks up; the
 * others wait behind it, "locked". An administrator reviews the catalogue and
 * is not held back by the lock: for them the others are "open" instead,
 * readable without being where they are. The site applies the same exception
 * (apps/web/lib/lessons/unlock.ts).
 *
 * A mission the placement test waived is "open" too, and opens the one after
 * it as a completed mission would: the result screen says those levels are
 * unlocked, and the site unlocks them by the same rule. The reader picks up
 * at the first mission neither completed nor waived; when every mission left
 * was waived, at the first of them.
 */
export type MissionState = "done" | "current" | "open" | "locked";

export function missionStates(
  missions: Pick<PathMission, "status" | "waived">[],
  unlockAll = false,
): MissionState[] {
  const pending = (m: Pick<PathMission, "status">): boolean => m.status !== "COMPLETED";
  const fresh = missions.findIndex((m) => pending(m) && !m.waived);
  const current = fresh >= 0 ? fresh : missions.findIndex(pending);
  // Whether a mission lets the one after it open: completed or waived.
  const opensNext = (m: Pick<PathMission, "status" | "waived"> | undefined): boolean =>
    m !== undefined && (!pending(m) || m.waived);

  return missions.map((m, i) => {
    if (!pending(m)) return "done";
    if (i === current) return "current";
    if (unlockAll || m.waived || opensNext(missions[i - 1])) return "open";
    return "locked";
  });
}
