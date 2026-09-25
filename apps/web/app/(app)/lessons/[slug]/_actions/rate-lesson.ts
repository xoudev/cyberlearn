"use server";

import { revalidatePath } from "next/cache";
import { requireRequestUser } from "@/lib/auth";
import { rateLessonForUser } from "@/lib/lessons/rate-lesson";

export interface RateLessonResult {
  success: boolean;
  error?: string;
  avgRating?: number | undefined;
  ratingsCount?: number | undefined;
}

/** The site's entry point: the session, then the service the app uses too. */
export async function rateLessonAction(
  lessonId: string,
  score: number,
  feedback?: string,
): Promise<RateLessonResult> {
  const user = await requireRequestUser();
  const result = await rateLessonForUser(user.id, { lessonId, score, feedback });
  if (!result.ok) return { success: false, error: result.error };

  revalidatePath(`/lessons`);
  return {
    success: true,
    avgRating: result.avgRating ?? undefined,
    ratingsCount: result.ratingsCount,
  };
}
