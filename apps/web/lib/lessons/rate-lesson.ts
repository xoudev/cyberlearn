import { z } from "zod";
import { lessonRepository, ratingRepository } from "@cyberlearn/db";

const ratingSchema = z.object({
  lessonId: z.string().uuid(),
  score: z.number().int().min(1).max(5),
  feedback: z.string().max(500).optional(),
});

export type RateLessonOutcome =
  | { ok: true; avgRating: number | null; ratingsCount: number }
  | { ok: false; error: string };

/**
 * Records a learner's rating of a lesson (1 to 5, and a comment for the team),
 * once they have completed it; it can be changed at any time, and the lesson's
 * average is recomputed with it.
 *
 * Shared by the site (rateLessonAction) and the app (/api/mobile/lesson-rating).
 * Callers are responsible for AUTHENTICATION: `userId` must be a verified
 * identity. Lives outside any "use server" module so it cannot be invoked with
 * an arbitrary userId.
 */
export async function rateLessonForUser(
  userId: string,
  input: unknown,
): Promise<RateLessonOutcome> {
  const parsed = ratingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Données invalides." };
  const { lessonId, score, feedback } = parsed.data;

  // Only after completion: an opinion on a lesson nobody finished is an
  // opinion on its first screen.
  const progress = await lessonRepository.findProgress(userId, lessonId);
  if (progress?.status !== "COMPLETED") {
    return { ok: false, error: "Tu dois compléter la leçon avant de la noter." };
  }

  const comment = feedback?.trim();
  await ratingRepository.upsertLessonRating(
    userId,
    lessonId,
    score,
    comment !== undefined && comment !== "" ? comment : undefined,
  );
  const stats = await ratingRepository.findLessonStats(lessonId);
  return { ok: true, avgRating: stats?.avgRating ?? null, ratingsCount: stats?.ratingsCount ?? 0 };
}
