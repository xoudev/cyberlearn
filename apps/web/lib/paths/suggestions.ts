import { z } from "zod";
import { prisma } from "@cyberlearn/db";
import {
  LEARNING_GOALS,
  STARTING_LEVELS,
  suggestPaths,
  type LearningGoal,
  type PathSuggestion,
  type StartingLevel,
} from "@cyberlearn/lib";

export interface LearningAnswers {
  goals: LearningGoal[];
  level: StartingLevel;
}

const answersSchema = z.object({
  goals: z.array(z.enum(LEARNING_GOALS)).min(1).max(LEARNING_GOALS.length),
  level: z.enum(STARTING_LEVELS),
});

/**
 * The questionnaire's answers from a query string (`?goals=DEV&goals=CYBERSEC
 * &level=NEW`) or a form. Null until both questions are answered: the page
 * then shows the questions rather than suggestions.
 */
export function parseLearningAnswers(input: {
  goals: unknown;
  level: unknown;
}): LearningAnswers | null {
  const goals = Array.isArray(input.goals)
    ? input.goals
    : input.goals === undefined
      ? []
      : [input.goals];
  const parsed = answersSchema.safeParse({ goals: [...new Set(goals)], level: input.level });
  return parsed.success ? parsed.data : null;
}

/** What a guide page shows for a query string. */
export interface GuideView {
  /** Both questions answered: the page suggests. */
  answers: LearningAnswers | null;
  /** What to tick in the form: the valid part of whatever was sent. */
  draft: Partial<LearningAnswers>;
  error: string | null;
}

const goalSchema = z.enum(LEARNING_GOALS);
const levelSchema = z.enum(STARTING_LEVELS);

/**
 * Reads a guide page's query string. `edit` asks for the form again with the
 * answers ticked, which is how "Modifier mes réponses" works without a script.
 * With nothing sent, `saved` (earlier answers) fills the form.
 */
export function readGuideQuery(
  params: Record<string, string | string[] | undefined>,
  saved: Partial<LearningAnswers> = {},
): GuideView {
  const sent = params.goals !== undefined || params.level !== undefined;
  if (!sent) return { answers: null, draft: saved, error: null };

  const rawGoals = Array.isArray(params.goals)
    ? params.goals
    : params.goals === undefined
      ? []
      : [params.goals];
  const goals = [...new Set(rawGoals)].flatMap((g) => {
    const parsed = goalSchema.safeParse(g);
    return parsed.success ? [parsed.data] : [];
  });
  const level = levelSchema.safeParse(params.level);
  const draft: Partial<LearningAnswers> = {
    goals,
    ...(level.success ? { level: level.data } : {}),
  };

  const answers = parseLearningAnswers({ goals, level: params.level });
  if (answers !== null) {
    return { answers: params.edit === undefined ? answers : null, draft, error: null };
  }
  const error =
    goals.length === 0
      ? "Coche au moins une réponse à la première question."
      : "Choisis ton point de départ, à la deuxième question.";
  return { answers: null, draft, error };
}

/** The query string that shows these answers' suggestions, or edits them. */
export function guideQuery(answers: LearningAnswers, edit = false): string {
  const query = new URLSearchParams();
  for (const goal of answers.goals) query.append("goals", goal);
  query.set("level", answers.level);
  if (edit) query.set("edit", "1");
  return query.toString();
}

export interface SuggestedPath {
  slug: string;
  title: string;
  description: string;
  category: string;
  track: string;
  difficulty: string;
  lessonCount: number;
  estimatedHours: number;
  refCode: string;
  avgRating: number | null;
}

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
  const paths: SuggestedPath[] = rows.map((p) => ({
    slug: p.slug,
    title: p.title,
    description: p.description,
    category: p.category,
    track: p.track,
    difficulty: p.difficulty,
    estimatedHours: p.estimatedHours,
    refCode: p.refCode,
    avgRating: p.avgRating,
    lessonCount: p._count.lessons,
  }));
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
