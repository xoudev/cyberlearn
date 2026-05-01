"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRequestUser } from "@/lib/auth";
import { ratingRepository, lessonRepository } from "@cyberlearn/db";

const ratingSchema = z.object({
  lessonId: z.string().uuid(),
  score: z.number().int().min(1).max(5),
  feedback: z.string().max(500).optional(),
});

export interface RateLessonResult {
  success: boolean;
  error?: string;
  avgRating?: number | undefined;
  ratingsCount?: number | undefined;
}

export async function rateLessonAction(
  lessonId: string,
  score: number,
  feedback?: string,
): Promise<RateLessonResult> {
  const user = await requireRequestUser();

  const parsed = ratingSchema.safeParse({ lessonId, score, feedback });
  if (!parsed.success) return { success: false, error: "Données invalides." };

  // Only allow rating after completion
  const progress = await lessonRepository.findProgress(user.id, lessonId);
  if (progress?.status !== "COMPLETED") {
    return { success: false, error: "Tu dois compléter la leçon avant de la noter." };
  }

  await ratingRepository.upsertLessonRating(user.id, lessonId, score, feedback);
  const stats = await ratingRepository.findLessonStats(lessonId);

  revalidatePath(`/lessons`);

  return {
    success: true,
    avgRating: stats?.avgRating ?? undefined,
    ratingsCount: stats?.ratingsCount ?? 0,
  };
}
