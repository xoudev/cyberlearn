import { pathsVisibleTo, prisma, ratingRepository } from "@cyberlearn/db";

export type RatePathResult =
  | { ok: true; avgRating: number | null; ratingsCount: number }
  | { ok: false; error: string };

/**
 * Records a learner's rating of a path (1 to 5, and a comment for the team).
 *
 * A path can be rated once one of its lessons is completed. A lesson is rated
 * at its end, but a path of twelve lessons or more would only be rated by the
 * few who finish it, and the ones who stop halfway are exactly the opinion
 * worth having. The rating can be changed at any time; the path's average is
 * recomputed with it.
 *
 * Callers are responsible for AUTHENTICATION: `userId` must be a verified
 * identity (server action session or mobile Bearer JWT). Lives outside any
 * "use server" module so it cannot be invoked with an arbitrary userId.
 */
export async function ratePathForUser(
  userId: string,
  pathId: string,
  score: number,
  feedback?: string,
): Promise<RatePathResult> {
  // Scoped to the reader: a class path is only theirs to rate if it is theirs
  // to see.
  const path = await prisma.path.findFirst({
    where: { id: pathId, ...pathsVisibleTo(userId) },
    select: { lessons: { select: { lessonId: true } } },
  });
  if (!path) return { ok: false, error: "Parcours introuvable." };

  const completed = await prisma.userLessonProgress.count({
    where: {
      userId,
      status: "COMPLETED",
      lessonId: { in: path.lessons.map((l) => l.lessonId) },
    },
  });
  if (completed === 0) {
    return { ok: false, error: "Termine une première mission du parcours pour pouvoir le noter." };
  }

  const comment = feedback?.trim();
  await ratingRepository.upsertPathRating(
    userId,
    pathId,
    score,
    comment !== undefined && comment !== "" ? comment : undefined,
  );
  const stats = await ratingRepository.findPathStats(pathId);
  return { ok: true, avgRating: stats?.avgRating ?? null, ratingsCount: stats?.ratingsCount ?? 0 };
}
