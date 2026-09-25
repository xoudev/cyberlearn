"use server";

import { revalidatePath } from "next/cache";
import { requireRequestUser } from "@/lib/auth";
import {
  acceptLessonAnswer,
  postLessonAnswer,
  postLessonQuestion,
  upvoteLessonAnswer,
  type QaResult,
} from "@/lib/lessons/qa";

/**
 * The site's entry points for a lesson's Q&A: the session, then the service
 * the app uses too (@/lib/lessons/qa).
 */

export interface QaActionResult {
  success: boolean;
  error?: string;
  /**
   * Written, but nobody else can see it yet: the screen flagged it and a
   * moderator has to decide. Said plainly, because a message that appears to
   * post and then is not there reads as a bug.
   */
  heldForReview?: boolean;
}

function toActionResult(result: QaResult): QaActionResult {
  if (!result.ok) return { success: false, error: result.error };
  return result.heldForReview ? { success: true, heldForReview: true } : { success: true };
}

export async function postQuestionAction(
  lessonId: string,
  title: string,
  content: string,
): Promise<QaActionResult> {
  const user = await requireRequestUser();
  return toActionResult(await postLessonQuestion(user.id, { lessonId, title, content }));
}

export async function postAnswerAction(
  questionId: string,
  content: string,
): Promise<QaActionResult> {
  const user = await requireRequestUser();
  return toActionResult(await postLessonAnswer(user.id, { questionId, content }));
}

export async function acceptAnswerAction(
  answerId: string,
  lessonSlug: string,
): Promise<QaActionResult> {
  const user = await requireRequestUser();
  const result = await acceptLessonAnswer(user.id, answerId);
  if (result.ok) revalidatePath(`/lessons/${lessonSlug}`);
  return toActionResult(result);
}

export async function upvoteAnswerAction(
  answerId: string,
  lessonSlug: string,
): Promise<QaActionResult> {
  const user = await requireRequestUser();
  const result = await upvoteLessonAnswer(user.id, answerId);
  if (result.ok) revalidatePath(`/lessons/${lessonSlug}`);
  return toActionResult(result);
}
