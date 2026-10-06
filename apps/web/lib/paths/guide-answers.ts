import { z } from "zod";
import {
  LEARNING_GOALS,
  STARTING_LEVELS,
  type LearningGoal,
  type StartingLevel,
} from "@cyberlearn/lib/paths/suggest";

/**
 * The path guide's answers and what they apply to, without a database: read
 * by the server pages (the onboarding) and by the guide's window on the
 * catalogue, which suggests in the browser from paths it already has.
 */

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

export const goalSchema = z.enum(LEARNING_GOALS);
export const levelSchema = z.enum(STARTING_LEVELS);

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

/** The answers sent by the guide's form, read the way a query string is. */
export function readGuideForm(form: FormData): GuideView {
  const params: Record<string, string | string[]> = {
    goals: form.getAll("goals").filter((value): value is string => typeof value === "string"),
  };
  const level = form.get("level");
  if (typeof level === "string") params.level = level;
  return readGuideQuery(params);
}

/** A path row as the guide weighs it: the catalogue's fields, its lesson count. */
export function toSuggestedPath(path: {
  slug: string;
  title: string;
  description: string;
  category: string;
  track: string;
  difficulty: string;
  estimatedHours: number;
  refCode: string;
  avgRating: number | null;
  lessonCount: number;
}): SuggestedPath {
  return {
    slug: path.slug,
    title: path.title,
    description: path.description,
    category: path.category,
    track: path.track,
    difficulty: path.difficulty,
    estimatedHours: path.estimatedHours,
    refCode: path.refCode,
    avgRating: path.avgRating,
    lessonCount: path.lessonCount,
  };
}
