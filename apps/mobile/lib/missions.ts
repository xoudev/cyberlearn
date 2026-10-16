import type { PathMission } from "@/lib/queries";

/** A path's link to one lesson, with the lesson's status as PostgREST embeds it. */
export interface LessonLink {
  lessons: { status: string } | { status: string }[] | null | undefined;
}

/**
 * How many missions a path has: its published lessons, as the site counts
 * them (PUBLISHED_PATH_LESSON). A draft or an archived lesson still linked to
 * the path is no mission, and counting the links alone counted it. The status
 * is read rather than left to RLS, which shows an administrator every lesson.
 */
export function countMissions(links: readonly LessonLink[] | null | undefined): number {
  return (links ?? []).filter((link) => {
    const lesson = Array.isArray(link.lessons) ? link.lessons[0] : link.lessons;
    return lesson?.status === "PUBLISHED";
  }).length;
}

/**
 * How each mission of a path reads on its screen.
 *
 * "current" is the first one not completed, where the reader picks up; the
 * others wait behind it, "locked". An administrator reviews the catalogue and
 * is not held back by the lock: for them the others are "open" instead,
 * readable without being where they are. The site applies the same exception
 * (apps/web/lib/lessons/unlock.ts).
 */
export type MissionState = "done" | "current" | "open" | "locked";

export function missionStates(
  missions: Pick<PathMission, "status">[],
  unlockAll = false,
): MissionState[] {
  let currentAssigned = false;
  return missions.map((m) => {
    if (m.status === "COMPLETED") return "done";
    if (!currentAssigned) {
      currentAssigned = true;
      return "current";
    }
    return unlockAll ? "open" : "locked";
  });
}
