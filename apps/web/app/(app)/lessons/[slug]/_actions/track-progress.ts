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
 */
export async function completeLesson(lessonId: string): Promise<CompleteLessonResult> {
  if (!z.string().uuid().safeParse(lessonId).success) return EMPTY_COMPLETE_RESULT;
  const authUser = await requireRequestUser();
  return completeLessonForUser(authUser.id, lessonId);
}
