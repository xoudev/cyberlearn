import type { PathMission } from "@/lib/queries";

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
