"use server";

import { revalidatePath } from "next/cache";
import { requireRequestUser } from "@/lib/auth";
import { gradeReview, REVIEW_NOT_DUE } from "@/lib/revisions/grade-review";

export interface SubmitReviewResult {
  success: boolean;
  /** Why nothing was graded, worded for the reader. */
  error?: string;
  /** Null once the lesson is held and leaves the cycle. */
  nextReviewAt?: Date | null;
  /** XP credited by this review (0 when the lesson was forgotten). */
  reviewXp?: number;
  /** The lesson left the cycle on this grade. */
  mastered?: boolean;
}

/**
 * Web entry point: authenticates the session, then grades the review through
 * the service the app uses too (lib/revisions/grade-review.ts).
 */
export async function submitReviewAction(
  scheduleId: string,
  quality: 1 | 3 | 5,
): Promise<SubmitReviewResult> {
  const authUser = await requireRequestUser();
  const result = await gradeReview(authUser.id, { scheduleId, quality });
  if (!result.ok) return { success: false, error: REVIEW_NOT_DUE };

  // The page comes back without the graded review (it is no longer due); the
  // list keeps it for the session, with its outcome (revisions-list.tsx).
  revalidatePath("/revisions");
  revalidatePath("/dashboard");
  return {
    success: true,
    nextReviewAt: result.nextReviewAt,
    reviewXp: result.reviewXp,
    mastered: result.mastered,
  };
}
