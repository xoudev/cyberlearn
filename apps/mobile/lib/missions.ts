import { groupIntoModules, type ModuleGroup, type ModuleRef } from "@cyberlearn/lib/paths/modules";
import { indexPlacements, resumeIndex } from "@cyberlearn/lib/paths/unlock";
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
 * How each mission of a path reads on its screen, by the site's rule
 * (@cyberlearn/lib/paths/unlock): a mission opens once the one before it is
 * completed or waived, the first one always, and a completed one never locks
 * again.
 *
 * "current" is the first open one not completed, where "Reprendre" picks up;
 * any other open one is "open", readable without being where the reader is.
 * The app used to lock everything after the first mission not completed,
 * which shut a mission the site opens (one whose predecessor was completed
 * out of order). An administrator reviews the catalogue and is not held back
 * by the lock: for them every mission not completed is open, as on the site.
 *
 * A mission the placement test waived is "open" too, and opens the one after
 * it as a completed mission would: the result screen says those levels are
 * unlocked, and the site unlocks them by the same rule. The reader picks up
 * at the first mission neither completed nor waived; when every mission left
 * was waived, at the first of them (resumeIndex, as the site's path page).
 */
export type MissionState = "done" | "current" | "open" | "locked";

export function missionStates(
  missions: Pick<PathMission, "status" | "waived">[],
  unlockAll = false,
): MissionState[] {
  // The rule keys on ids; the position stands in for one within a path.
  const ids = missions.map((_m, i) => String(i));
  const placements = indexPlacements(
    [
      {
        id: "path",
        slug: "path",
        title: "",
        lessons: ids.map((id, i) => ({ position: i + 1, lesson: { id } })),
      },
    ],
    ids.filter((_id, i) => missions[i]?.status === "COMPLETED"),
    { unlockAll, waivedLessonIds: ids.filter((_id, i) => missions[i]?.waived === true) },
  );
  const states = ids.map((id) => placements.get(id)?.state ?? "locked");
  const current = resumeIndex(
    states,
    missions.map((m) => m.waived),
  );
  return states.map((state, i) => {
    if (state === "completed") return "done";
    if (state === "locked") return "locked";
    return i === current ? "current" : "open";
  });
}

/**
 * Where the path screen draws a module's header: before the first mission of
 * each group, as the site's path page draws a gate before each. Every group
 * has one, the path's own modules and the untitled ones alike (blocks of six
 * for a path without modules, a class's path among them, and the lessons no
 * module claims): the revision sheet and "Réviser ce module" hang there.
 * Keyed by the index of that first mission.
 */
export function moduleStarts(
  missions: readonly { moduleId: string | null }[],
  modules: readonly ModuleRef[],
): Map<number, ModuleGroup> {
  const starts = new Map<number, ModuleGroup>();
  for (const group of groupIntoModules(missions, modules)) {
    const first = group.indices[0];
    if (first !== undefined) starts.set(first, group);
  }
  return starts;
}
