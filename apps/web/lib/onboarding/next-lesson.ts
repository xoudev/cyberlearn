import { dashboardRepository, lessonRepository, placementRepository } from "@cyberlearn/db";
import { computeLevel } from "@cyberlearn/lib";
import { rankFeaturedPaths } from "@cyberlearn/lib/dashboard/featured-paths";
import { currentLessonId } from "@cyberlearn/lib/dashboard/module-route";
import { savedLearningAnswers } from "@/lib/paths/suggestions";

/** The lesson an e-mail sends a learner to. */
export interface NextLesson {
  slug: string;
  title: string;
  estimatedMinutes: number;
  xpReward: number;
}

/**
 * The lesson the dashboard's mission card offers this learner, for an e-mail
 * to name it: the lesson left open, else the next one of the path that leads
 * (passing over the ones the placement test waived), else null.
 *
 * The same rules as the card (`rankFeaturedPaths`, `currentLessonId` of
 * @cyberlearn/lib, which the app's home tab reads too), with the same inputs,
 * read here for one account rather than for the page.
 */
export async function nextLessonFor(userId: string, xpTotal: number): Promise<NextLesson | null> {
  const [resume, paths, placement, recentCategories, answers] = await Promise.all([
    dashboardRepository.findLessonInProgress(userId),
    dashboardRepository.listPathsToRank(userId),
    placementRepository.findScoresFor(userId),
    dashboardRepository.recentCompletedCategories(userId),
    savedLearningAnswers(userId),
  ]);
  if (resume !== null) return resume;

  const [lead] = rankFeaturedPaths(
    paths.map((p) => ({ ...p, status: p.progress[0]?.status ?? null })),
    {
      level: computeLevel(xpTotal).level,
      placement: placement
        ? {
            DEV: placement.devScore,
            CYBERSEC: placement.cybersecScore,
            NETWORK: placement.networkScore,
          }
        : null,
      recentCategories,
      goals: answers.goals ?? [],
    },
  );
  if (lead === undefined) return null;

  const detail = await dashboardRepository.findLeadPath(lead.id);
  if (detail === null) return null;
  const lessonIds = detail.lessons.map((pl) => pl.lesson.id);
  const [completed, waived] = await Promise.all([
    dashboardRepository.completedLessonIds(userId, lessonIds).then((ids) => new Set(ids)),
    lessonRepository.findWaivedLessonIds(userId, lessonIds).then((ids) => new Set(ids)),
  ]);
  const route = detail.lessons.map((pl) => ({
    id: pl.lesson.id,
    slug: pl.lesson.slug,
    title: pl.lesson.title,
    moduleId: pl.moduleId,
  }));
  const current = currentLessonId(route, completed, null, waived);
  return detail.lessons.find((pl) => pl.lesson.id === current)?.lesson ?? null;
}
