import { indexPlacements, isReadable } from "@cyberlearn/lib/paths/unlock";
import { lessonRepository, userRepository } from "@cyberlearn/db";

/**
 * Whether the reader skips the path lock: administrators do, so they can open
 * any lesson of the catalogue to review it without working through its path.
 *
 * The role is read from public.users on every call, never from the access
 * token's claim, for the reason given in packages/lib/src/auth/guards.ts: a
 * role taken away mid-session must stop opening lessons at once.
 */
export async function unlocksEveryLesson(userId: string): Promise<boolean> {
  const user = await userRepository.findRoleById(userId);
  return user?.role === "ADMIN";
}

/** The path a locked lesson waits in, to send the reader to. */
export interface PathLock {
  slug: string;
  title: string;
}

/**
 * The lessons among these that the reader has not earned yet, each with the
 * path it is locked in; a lesson missing from the map may be read. The rule is
 * the path lock (@cyberlearn/lib/paths/unlock), applied as the lesson page
 * applies it: a lesson outside every published path, a completed lesson, a
 * lesson the placement test waived (which also opens the one after it, as a
 * completed lesson does), and any lesson for an administrator, are never
 * locked.
 *
 * This is the one guard behind the app's catalogue and lesson screen
 * (/api/mobile/lesson-access) and behind what records progress (a completion,
 * a quiz answer, through pathLockOf): none of them applies the rule on its
 * own, so a waiver cannot open a lesson in one place and leave it refused in
 * another.
 */
export async function lessonLocks(
  userId: string,
  lessonIds: readonly string[],
): Promise<Map<string, PathLock>> {
  const locks = new Map<string, PathLock>();
  if (lessonIds.length === 0) return locks;
  const [contexts, unlockAll] = await Promise.all([
    lessonRepository.findPathContexts(userId, [...lessonIds]),
    unlocksEveryLesson(userId),
  ]);
  const placements = indexPlacements(contexts.paths, contexts.completedLessonIds, {
    unlockAll,
    waivedLessonIds: contexts.waivedLessonIds,
  });
  for (const lessonId of lessonIds) {
    const placement = placements.get(lessonId);
    if (placement !== undefined && !isReadable(placement)) {
      locks.set(lessonId, { slug: placement.path.slug, title: placement.path.title });
    }
  }
  return locks;
}

/**
 * The path one lesson is locked in for this reader, or null when they may
 * read it. What records progress on a lesson (a completion, a quiz answer)
 * asks this itself: the lesson page is not the only way in, the app's own
 * routes and any client that calls them being others.
 */
export async function pathLockOf(userId: string, lessonId: string): Promise<PathLock | null> {
  return (await lessonLocks(userId, [lessonId])).get(lessonId) ?? null;
}

/**
 * The lessons the placement test waived for the reader: each opens, and opens
 * the one after it, as a completed lesson would
 * (@cyberlearn/lib/paths/unlock). Every one of them, for the app's path
 * screen, which applies the lock path by path; lessonLocks already counts them.
 */
export async function waivedLessonIds(userId: string): Promise<string[]> {
  return lessonRepository.findWaivedLessonIds(userId);
}
