/**
 * The path lock as the server tells it (/api/mobile/lesson-access): which
 * lessons the reader has not earned yet, each with the path that opens it.
 * The rule is the site's (@cyberlearn/lib/paths/unlock), applied on the
 * server, which also refuses a completion or a quiz answer on a locked lesson:
 * what the app does with it here is lead the reader to the path, as the site
 * does, rather than into a lesson they cannot finish.
 */

/** The path a locked lesson waits in. */
export interface LessonLock {
  slug: string;
  title: string;
}

/** The locks a response holds, by lesson id; anything malformed is left out. */
export function readLessonLocks(body: unknown): Map<string, LessonLock> {
  const locks = new Map<string, LessonLock>();
  if (typeof body !== "object" || body === null) return locks;
  if (!("ok" in body) || body.ok !== true || !("locked" in body)) return locks;
  const { locked } = body;
  if (typeof locked !== "object" || locked === null) return locks;
  for (const [lessonId, lock] of Object.entries(locked)) {
    if (typeof lock !== "object" || lock === null) continue;
    if (!("slug" in lock) || typeof lock.slug !== "string" || lock.slug === "") continue;
    const title = "title" in lock && typeof lock.title === "string" ? lock.title : "";
    locks.set(lessonId, { slug: lock.slug, title });
  }
  return locks;
}

/** What a locked lesson's card says, for a screen reader, as the site's catalogue says it. */
export function lockedLessonLabel(lessonTitle: string, lock: LessonLock): string {
  return lock.title === ""
    ? `${lessonTitle}. Leçon verrouillée, à débloquer dans son parcours`
    : `${lessonTitle}. Leçon verrouillée, à débloquer dans le parcours ${lock.title}`;
}
