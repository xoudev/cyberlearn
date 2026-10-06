import { prisma } from "@cyberlearn/db";
import { suggestPaths, type PathSuggestion } from "@cyberlearn/lib/paths/suggest";
import {
  goalSchema,
  levelSchema,
  toSuggestedPath,
  type LearningAnswers,
  type SuggestedPath,
} from "./guide-answers";

// The answers and their parsing live in ./guide-answers, without a database,
// so the guide's window can use them in the browser. Re-exported for the
// server pages that have always read them from here.
export * from "./guide-answers";

/** The catalogue's published paths, and three of them for these answers. */
export async function suggestionsFor(
  answers: LearningAnswers,
): Promise<PathSuggestion<SuggestedPath>[]> {
  const rows = await prisma.path.findMany({
    // The catalogue only: a class path is handed out by a teacher, not
    // suggested to a stranger.
    where: { status: "PUBLISHED", audience: "CATALOGUE" },
    select: {
      slug: true,
      title: true,
      description: true,
      category: true,
      track: true,
      difficulty: true,
      estimatedHours: true,
      refCode: true,
      avgRating: true,
      _count: { select: { lessons: true } },
    },
  });
  const paths: SuggestedPath[] = rows.map((p) =>
    toSuggestedPath({ ...p, lessonCount: p._count.lessons }),
  );
  return suggestPaths(paths, answers);
}

/** Keeps the answers, to suggest again later. Never used to restrict anything. */
export async function saveLearningAnswers(userId: string, answers: LearningAnswers): Promise<void> {
  await prisma.userPreferences.upsert({
    where: { userId },
    create: { userId, learningGoals: answers.goals, startingLevel: answers.level },
    update: { learningGoals: answers.goals, startingLevel: answers.level },
  });
}

/** The answers given earlier, to tick them again. Invalid leftovers are dropped. */
export async function savedLearningAnswers(userId: string): Promise<Partial<LearningAnswers>> {
  const prefs = await prisma.userPreferences.findUnique({
    where: { userId },
    select: { learningGoals: true, startingLevel: true },
  });
  if (!prefs) return {};
  const goals = prefs.learningGoals.flatMap((g) => {
    const parsed = goalSchema.safeParse(g);
    return parsed.success ? [parsed.data] : [];
  });
  const level = levelSchema.safeParse(prefs.startingLevel);
  return { goals, ...(level.success ? { level: level.data } : {}) };
}
