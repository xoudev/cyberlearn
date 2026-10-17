"use server";

import { revalidatePath } from "next/cache";
import { requireRequestUser } from "@/lib/auth";
import {
  answerDailyRecall,
  answerModuleReview,
  openDailyRecall,
  openModuleReview,
  type RecallAnswerResult,
  type RecallView,
} from "@/lib/revisions/daily-recall";

/**
 * The "Rappel du jour" window's entry points (components/rappel): the session
 * is authenticated here, then the shared service draws, checks and credits
 * (lib/revisions/daily-recall.ts), as it does for the app's
 * /api/mobile/review-cards. Inputs are checked by the service.
 */

/** The day's recall, drawn on its first opening of the day. */
export async function openDailyRecallAction(): Promise<RecallView> {
  const user = await requireRequestUser();
  return openDailyRecall(user.id);
}

/** One answer to the day's recall; the last one hands it in and credits its XP. */
export async function answerDailyRecallAction(input: unknown): Promise<RecallAnswerResult> {
  const user = await requireRequestUser();
  const result = await answerDailyRecall(user.id, input);
  if (result.ok && result.result !== null) {
    // The dashboard says the recall is done, the profile shows the XP.
    revalidatePath("/dashboard");
    revalidatePath("/profile");
  }
  return result;
}

/** "Réviser ce module": `input` names the path and the module. */
export async function openModuleReviewAction(input: unknown): Promise<RecallView> {
  const user = await requireRequestUser();
  return openModuleReview(user.id, input);
}

/** One answer to a module's review: checked, nothing recorded. */
export async function answerModuleReviewAction(input: unknown): Promise<RecallAnswerResult> {
  const user = await requireRequestUser();
  return answerModuleReview(user.id, input);
}
