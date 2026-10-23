import { cache } from "react";
import { lessonRepository } from "@cyberlearn/db";
import { getRequestUser } from "@/lib/auth";
import { unlocksEveryLesson } from "@/lib/lessons/access";

/** A lesson as the lesson page reads it. */
export type ReadableLesson = NonNullable<Awaited<ReturnType<typeof lessonRepository.findBySlug>>>;

export interface LessonRead {
  /** Null when this reader has no lesson at that address. */
  lesson: ReadableLesson | null;
  /** An administrator reading a lesson nobody else can yet: nothing is recorded for them on it. */
  reviewing: boolean;
}

/**
 * The lesson at an address, for a reader.
 *
 * Scoped to the reader: a lesson written for a class is published, so
 * looking it up by slug alone would hand it to anyone who guessed one. An
 * administrator may open what nobody else can yet (a draft, to see it as the
 * site renders it before publishing); the catalogue still lists nothing
 * unpublished.
 *
 * Cached for the request. The page and its tab title (generateMetadata) both
 * ask, concurrently, and the database is asked once: the title costs no query.
 * It is also why the title may be the lesson's own. A title read by slug alone
 * would put a class-only lesson's name in the tab of anyone who guessed its
 * address; this one comes from the same reader-scoped read as the page, so it
 * names only what the page would show.
 */
export const readLesson = cache(async (slug: string, userId: string): Promise<LessonRead> => {
  const lesson = await lessonRepository.findBySlug(slug, userId);
  if (lesson) return { lesson, reviewing: false };
  if (await unlocksEveryLesson(userId)) {
    const draft = await lessonRepository.findBySlugForReview(slug);
    if (draft) return { lesson: draft, reviewing: true };
  }
  return { lesson: null, reviewing: false };
});

/** What the tab says when there is no lesson to name, or no reader to name it to. */
export const LESSON_TAB_TITLE = "Leçon";

/**
 * The lesson's title for the tab, or the generic one when the reader has no
 * such lesson (the page is a 404, or a sign-in, and names nothing). Reads
 * through the page's own cached read.
 */
export async function lessonTabTitle(slug: string): Promise<string> {
  const user = await getRequestUser();
  if (!user) return LESSON_TAB_TITLE;
  const { lesson } = await readLesson(slug, user.id);
  return lesson?.title ?? LESSON_TAB_TITLE;
}
