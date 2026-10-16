"use server";

import { z } from "zod";
import { requireRequestUser } from "@/lib/auth";
import {
  completeLessonForUser,
  EMPTY_COMPLETE_RESULT,
  type CompleteLessonResult,
} from "@/lib/lessons/complete";

export type { CompleteLessonResult };

/**
 * Web entry point for lesson completion. The guarded flow itself (XP ledger,
 * streak, badges, quests, certificates) lives in @/lib/lessons/complete so the
 * mobile API route can reuse it - this action only authenticates the session.
 *
 * A refusal comes back as the empty result: the lesson page has already
 * turned away a lesson the reader may not open or has not unlocked, so only a
 * page left open while its lesson was locked again, or a forged call, gets it.
 */
export async function completeLesson(lessonId: string): Promise<CompleteLessonResult> {
  if (!z.guid().safeParse(lessonId).success) return EMPTY_COMPLETE_RESULT;
  const authUser = await requireRequestUser();
  const outcome = await completeLessonForUser(authUser.id, lessonId);
  return outcome.ok ? outcome.result : EMPTY_COMPLETE_RESULT;
}
