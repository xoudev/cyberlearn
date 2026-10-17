import React from "react";
import type { Metadata } from "next";
import { PUBLISHED_PATH_LESSON, lessonRepository, pathsVisibleTo, prisma } from "@cyberlearn/db";
import { nextLesson as pickNextLesson } from "@cyberlearn/lib/dashboard/module-route";
import { PathsCollection } from "./_components/paths-collection";
import type { SerializedPath } from "./_components/paths-collection";
import { requireRequestUser } from "@/lib/auth";
import { savedLearningAnswers, toSuggestedPath } from "@/lib/paths/suggestions";
import { resolvePathCovers } from "@/lib/paths/cover";

export const metadata: Metadata = { title: "Parcours" };

export default async function PathsPage(): Promise<React.ReactElement> {
  const authUser = await requireRequestUser();

  const [paths, userProgress, savedAnswers] = await Promise.all([
    prisma.path.findMany({
      // The catalogue, plus the paths built for this reader's own classes: a
      // CLASS path is published, so status alone would hand every class's
      // work to everyone.
      where: pathsVisibleTo(authUser.id),
      include: {
        lessons: {
          orderBy: { position: "asc" },
          // The missions the path page draws: a draft or an archived lesson
          // still linked to a path is neither counted nor offered as the next.
          where: PUBLISHED_PATH_LESSON,
          include: {
            lesson: {
              select: {
                id: true,
                slug: true,
                title: true,
                estimatedMinutes: true,
                xpReward: true,
              },
            },
          },
        },
        // Whether a final exam waits once every mission is done: the hero's
        // button leads there rather than to the path a second time.
        quiz: { select: { isActive: true } },
      },
      orderBy: { publishedAt: "desc" },
    }),
    prisma.userPathProgress.findMany({
      where: { userId: authUser.id },
      // The certificate's public id, so a certified path's card opens the
      // certificate itself rather than the path again.
      select: { pathId: true, status: true, certificate: { select: { publicId: true } } },
    }),
    savedLearningAnswers(authUser.id),
  ]);

  // What the guide may suggest: the public catalogue, never a class's own
  // path, which a teacher hands out (the onboarding's rule too).
  const guideCatalogue = paths
    .filter((path) => path.audience === "CATALOGUE")
    .map((path) => toSuggestedPath({ ...path, lessonCount: path.lessons.length }));

  // Build progress lookup
  const progressMap = new Map(userProgress.map((up) => [up.pathId, up.status]));
  const certByPath = new Map<string, string>();
  for (const up of userProgress) {
    if (up.certificate !== null) certByPath.set(up.pathId, up.certificate.publicId);
  }

  // The lessons of the paths in progress, the only ones a next mission is
  // picked from.
  const inProgressLessonIds = paths
    .filter((path) => progressMap.get(path.id) === "IN_PROGRESS")
    .flatMap((path) => path.lessons.map((pl) => pl.lessonId));

  const [completedLessonsByPath, waivedLessonIds] = await Promise.all([
    // Count completed lessons per path for progress
    prisma.userLessonProgress.groupBy({
      by: ["lessonId"],
      where: {
        userId: authUser.id,
        status: "COMPLETED",
        lesson: { pathLessons: { some: {} } },
      },
      _count: { lessonId: true },
    }),
    // Those of the paths in progress the placement test waived: open, never
    // completed, so the next mission passes over them as "Continuer" does on
    // the path page.
    lessonRepository
      .findWaivedLessonIds(authUser.id, inProgressLessonIds)
      .then((ids) => new Set(ids)),
  ]);

  // Build lessonId → completed set
  const completedLessonIds = new Set(completedLessonsByPath.map((r) => r.lessonId));

  // Build serialized paths
  const covers = await resolvePathCovers(paths);

  const serialized: SerializedPath[] = paths.map((path, index) => {
    const pathStatus = progressMap.get(path.id);
    let status: SerializedPath["status"] = "idle";
    if (pathStatus === "COMPLETED") status = "done";
    else if (pathStatus === "IN_PROGRESS") status = "inprog";

    const lessonCount = path.lessons.length;
    const xpTotal = path.lessons.reduce((sum, pl) => sum + pl.lesson.xpReward, 0);
    const progressDone = path.lessons.filter((pl) => completedLessonIds.has(pl.lessonId)).length;

    // For in-progress paths: the next mission, by the path page's rule (and
    // the dashboard's): the first lesson, by position, neither completed nor
    // waived; the first waived one when nothing else is left. Drives the hero
    // "Prochaine mission" panel and every in-progress card's "Continuer".
    let nextLesson: SerializedPath["nextLesson"] = null;
    if (status === "inprog") {
      const lessons = path.lessons.map((pl) => pl.lesson);
      const next = pickNextLesson(lessons, completedLessonIds, waivedLessonIds);
      if (next !== null) {
        nextLesson = {
          n: String(lessons.indexOf(next) + 1).padStart(2, "0"),
          title: next.title,
          slug: next.slug,
          xpReward: next.xpReward,
          estimatedMinutes: next.estimatedMinutes,
        };
      }
    }

    return {
      id: path.id,
      slug: path.slug,
      refCode: path.refCode,
      title: path.title,
      description: path.description,
      category: path.category,
      track: path.track,
      difficulty: path.difficulty,
      estimatedHours: path.estimatedHours,
      xpTotal,
      lessonCount,
      hasCert: path.certificateTemplate !== null,
      hasQuiz: path.quiz?.isActive === true,
      coverSrc: covers[index] ?? null,
      status,
      progressDone,
      progressTotal: lessonCount,
      rating:
        path.avgRating !== null && path.ratingsCount > 0
          ? { avg: path.avgRating, count: path.ratingsCount }
          : null,
      nextLesson,
      certPublicId: certByPath.get(path.id) ?? null,
    } satisfies SerializedPath;
  });

  const inProgCount = serialized.filter((p) => p.status === "inprog").length;
  const doneCount = serialized.filter((p) => p.status === "done").length;
  const totalXp = serialized.reduce((sum, p) => sum + p.xpTotal, 0);
  const totalHours = serialized.reduce((sum, p) => sum + p.estimatedHours, 0);

  return (
    <PathsCollection
      paths={serialized}
      inProgCount={inProgCount}
      doneCount={doneCount}
      totalXp={totalXp}
      totalHours={totalHours}
      guide={{ catalogue: guideCatalogue, saved: savedAnswers }}
    />
  );
}
