"use server";

import { revalidatePath } from "next/cache";
import { requireRequestUser } from "@/lib/auth";
import { gradeReview } from "@/lib/revisions/grade-review";

export interface SubmitReviewResult {
  success: boolean;
  nextReviewAt?: Date;
  /** XP credited by this review (0 when the lesson was forgotten). */
  reviewXp?: number;
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
  if (!result.ok) return { success: false };

  revalidatePath("/revisions");
  revalidatePath("/dashboard");
  return { success: true, nextReviewAt: result.nextReviewAt, reviewXp: result.reviewXp };
}
