import { lessonRepository, userRepository } from "@cyberlearn/db";
import { indexPlacements, isReadable } from "@/lib/lessons/unlock";

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

/**
 * Whether the lesson's path lets this reader open it: the lesson page's gate
 * (isReadable), for a write that does not go through the page. A completion
 * sent straight to the action, or from the app, used to skip it, so a lesson
 * still locked in its path could be finished and paid.
 *
 * Only the path: whether the reader may see the lesson at all (published, the
 * catalogue's or their class's) is the caller's query, lessonsVisibleTo.
 */
export async function pathOpensLesson(userId: string, lessonId: string): Promise<boolean> {
  const [contexts, unlockAll] = await Promise.all([
    lessonRepository.findPathContexts(userId, [lessonId]),
    unlocksEveryLesson(userId),
  ]);
  const placement = indexPlacements(contexts.paths, contexts.completedLessonIds, {
    unlockAll,
  }).get(lessonId);
  return isReadable(placement);
}
