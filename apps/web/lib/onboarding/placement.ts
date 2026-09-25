import { CATALOGUE_LESSON, CATALOGUE_PATH, prisma } from "@cyberlearn/db";
import {
  PLACEMENT_TEST_PASSED_EVENT,
  computePlacementScores,
  getMasteredCategories,
  type CategoryScores,
} from "@cyberlearn/lib";
import {
  isPlacementCategory,
  placementMinutesFor,
  type PlacementCategory,
} from "@cyberlearn/lib/onboarding/placement";
import {
  PLACEMENT_MASTERY_THRESHOLD,
  WAIVED_DIFFICULTIES,
  placementSubmissionSchema,
} from "@cyberlearn/types";
import { evaluateAndAwardBadges } from "@/lib/badges/award";

/**
 * The placement test, for the site's onboarding pages and the app's
 * (/api/mobile/placement/*): the questions without their answers, and the
 * scoring, the waivers and the recommended path, once.
 *
 * Callers are responsible for AUTHENTICATION: `userId` must be a verified
 * identity (the session on the site, userFromBearer in the app). Lives outside
 * any "use server" module so it cannot be invoked with an arbitrary userId.
 * Neither function marks the sign-up complete: the site does it with a cookie
 * refresh, the app without, so each caller does its own.
 */

export interface PlacementOption {
  id: string;
  text: string;
}

export interface PlacementQuestionView {
  id: string;
  category: PlacementCategory;
  difficulty: string;
  question: string;
  options: PlacementOption[];
}

export type PlacementTestState =
  | { status: "open"; questions: PlacementQuestionView[]; estimatedMinutes: number }
  | { status: "taken" }
  | { status: "empty" };

export type PlacementSubmitResult =
  | { ok: true; scores: CategoryScores; recommendedPathSlug: string | null }
  | { ok: false; reason: "taken" }
  | { ok: false; reason: "invalid"; error: string };

export const PLACEMENT_INVALID = "Réponses invalides. Veuillez réessayer.";

/** The stored options, kept only when they are what the schema promises. */
function optionsFrom(value: unknown): PlacementOption[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((option: unknown) =>
    typeof option === "object" &&
    option !== null &&
    "id" in option &&
    "text" in option &&
    typeof option.id === "string" &&
    typeof option.text === "string"
      ? [{ id: option.id, text: option.text }]
      : [],
  );
}

/**
 * The test for somebody about to take it: the active questions by domain, with
 * their options and never the right one, nor the explanation that gives it
 * away. "taken" once they have a result: the test is taken once.
 */
export async function placementTestFor(userId: string): Promise<PlacementTestState> {
  const existing = await prisma.userPlacementResult.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (existing) return { status: "taken" };

  const rows = await prisma.placementQuestion.findMany({
    where: { isActive: true },
    select: { id: true, category: true, difficulty: true, question: true, options: true },
    orderBy: [{ category: "asc" }, { orderIndex: "asc" }],
  });
  const questions = rows.flatMap((row) =>
    isPlacementCategory(row.category)
      ? [
          {
            id: row.id,
            category: row.category,
            difficulty: row.difficulty,
            question: row.question,
            options: optionsFrom(row.options),
          },
        ]
      : [],
  );
  if (questions.length === 0) return { status: "empty" };

  return { status: "open", questions, estimatedMinutes: placementMinutesFor(questions.length) };
}

/** The mastered domain the recommended path comes from: the highest, CYBERSEC then DEV on a tie. */
function topMasteredCategory(scores: CategoryScores): PlacementCategory | null {
  if (
    scores.cybersecScore >= PLACEMENT_MASTERY_THRESHOLD &&
    scores.cybersecScore >= scores.devScore &&
    scores.cybersecScore >= scores.networkScore
  ) {
    return "CYBERSEC";
  }
  if (scores.devScore >= PLACEMENT_MASTERY_THRESHOLD && scores.devScore >= scores.networkScore) {
    return "DEV";
  }
  if (scores.networkScore >= PLACEMENT_MASTERY_THRESHOLD) return "NETWORK";
  return null;
}

/**
 * Scores a submission `{ answers: [{ questionId, selectedOptionId }] }`, keeps
 * the result, waives the beginner and intermediate catalogue lessons of every
 * mastered domain, and awards the placement badge when something was mastered.
 *
 * The right answers are read here, from the database, never from the request.
 * No XP, and no lesson marked completed: the test only orients.
 */
export async function submitPlacementFor(
  userId: string,
  input: unknown,
): Promise<PlacementSubmitResult> {
  const existing = await prisma.userPlacementResult.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (existing) return { ok: false, reason: "taken" };

  const parsed = placementSubmissionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid", error: PLACEMENT_INVALID };

  const { answers } = parsed.data;
  const questions = await prisma.placementQuestion.findMany({
    where: { id: { in: answers.map((a) => a.questionId) }, isActive: true },
    select: { id: true, category: true, correctOptionId: true },
  });
  const byId = new Map(questions.map((q) => [q.id, q]));

  const results = answers.flatMap((answer) => {
    const question = byId.get(answer.questionId);
    if (!question || !isPlacementCategory(question.category)) return [];
    return [
      {
        category: question.category,
        isCorrect: answer.selectedOptionId === question.correctOptionId,
      },
    ];
  });

  const scores = computePlacementScores(results);
  const mastered = getMasteredCategories(scores);
  const masteredCategories = (["DEV", "CYBERSEC", "NETWORK"] as const).filter(
    (category) => mastered[category],
  );

  const lessonsToWaive =
    masteredCategories.length > 0
      ? await prisma.lesson.findMany({
          where: {
            category: { in: masteredCategories },
            difficulty: { in: [...WAIVED_DIFFICULTIES] },
            // The catalogue only. A placement test waives lessons someone has
            // shown they do not need; a class's own material is not something
            // the platform can decide they already know, and this runs at
            // onboarding, before they are in any class.
            ...CATALOGUE_LESSON,
          },
          select: { id: true },
        })
      : [];

  await prisma.$transaction([
    prisma.userPlacementResult.create({
      data: {
        userId,
        devScore: scores.devScore,
        cybersecScore: scores.cybersecScore,
        networkScore: scores.networkScore,
      },
    }),
    ...lessonsToWaive.map((lesson) =>
      prisma.userSkipWaiver.upsert({
        where: { userId_lessonId: { userId, lessonId: lesson.id } },
        create: { userId, lessonId: lesson.id },
        update: {},
      }),
    ),
  ]);

  let recommendedPathSlug: string | null = null;
  const topCategory = masteredCategories.length > 0 ? topMasteredCategory(scores) : null;
  if (topCategory) {
    // A catalogue path: a class's own is not something to recommend to a
    // newcomer who is in no class yet.
    const path = await prisma.path.findFirst({
      where: { category: topCategory, ...CATALOGUE_PATH },
      orderBy: { difficulty: "asc" },
      select: { slug: true },
    });
    recommendedPathSlug = path?.slug ?? null;
  }

  // The badge reads the result just stored, so it comes after the transaction.
  if (masteredCategories.length > 0) {
    await evaluateAndAwardBadges(userId, ["CUSTOM"], { event: PLACEMENT_TEST_PASSED_EVENT });
  }

  return { ok: true, scores, recommendedPathSlug };
}
