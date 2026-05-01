"use server";

import { prisma } from "@cyberlearn/db";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  placementSubmissionSchema,
  PLACEMENT_MASTERY_THRESHOLD,
  WAIVED_DIFFICULTIES,
} from "@cyberlearn/types";
import { computePlacementScores, getMasteredCategories } from "@cyberlearn/lib";
import { setOnboardingComplete } from "../../../_actions/finalize-onboarding";
import { redirect } from "next/navigation";

export interface PlacementActionState {
  success: boolean;
  message?: string;
  recommendedPathSlug?: string | null;
  scores?: { devScore: number; cybersecScore: number; networkScore: number };
}

/**
 * Server Action: validates placement test answers, computes scores,
 * stores results, and grants prerequisite skip waivers.
 *
 * Security:
 * - Correct answers are fetched from the DB server-side — NEVER from the client
 * - A user can only submit the placement test once (checked with findUnique)
 * - Scores are validated: 0 ≤ score ≤ 100
 * - No XP awarded, no lessons marked COMPLETED (brief requirement)
 */
export async function submitPlacementTest(
  _prev: PlacementActionState,
  formData: FormData,
): Promise<PlacementActionState> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // ── Prevent double submission ────────────────────────────────────────────
  const existing = await prisma.userPlacementResult.findUnique({
    where: { userId: user.id },
  });

  if (existing) {
    redirect("/dashboard");
  }

  // ── Parse and validate submitted answers ─────────────────────────────────
  const rawAnswers: Array<{ questionId: string; selectedOptionId: string }> = [];

  for (const [key, value] of formData.entries()) {
    if (key.startsWith("answer_")) {
      const questionId = key.replace("answer_", "");
      rawAnswers.push({ questionId, selectedOptionId: value as string });
    }
  }

  const parsed = placementSubmissionSchema.safeParse({ answers: rawAnswers });
  if (!parsed.success) {
    return { success: false, message: "Réponses invalides. Veuillez réessayer." };
  }

  const { answers } = parsed.data;
  const questionIds = answers.map((a) => a.questionId);

  // ── Fetch correct answers server-side ─────────────────────────────────────
  const questions = await prisma.placementQuestion.findMany({
    where: { id: { in: questionIds }, isActive: true },
    select: {
      id: true,
      category: true,
      correctOptionId: true,
    },
  });

  // Build a lookup map
  const questionMap = new Map(questions.map((q) => [q.id, q]));

  // ── Score each answer ────────────────────────────────────────────────────
  const results = answers
    .map((answer) => {
      const question = questionMap.get(answer.questionId);
      if (!question) return null;
      return {
        category: question.category as "DEV" | "CYBERSEC" | "NETWORK",
        isCorrect: answer.selectedOptionId === question.correctOptionId,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const scores = computePlacementScores(results);
  const mastered = getMasteredCategories(scores);

  // ── Determine skip waivers ───────────────────────────────────────────────
  // Fetch all BEGINNER + INTERMEDIATE lessons in mastered categories
  const categoriesToWaive = (
    Object.entries(mastered) as Array<["DEV" | "CYBERSEC" | "NETWORK", boolean]>
  )
    .filter(([, isMastered]) => isMastered)
    .map(([category]) => category);

  const lessonsToWaive =
    categoriesToWaive.length > 0
      ? await prisma.lesson.findMany({
          where: {
            category: { in: categoriesToWaive },
            difficulty: { in: WAIVED_DIFFICULTIES as unknown as ("BEGINNER" | "INTERMEDIATE")[] },
            status: "PUBLISHED",
          },
          select: { id: true },
        })
      : [];

  // ── Persist in a transaction ──────────────────────────────────────────────
  await prisma.$transaction([
    // Store placement result
    prisma.userPlacementResult.create({
      data: {
        userId: user.id,
        devScore: scores.devScore,
        cybersecScore: scores.cybersecScore,
        networkScore: scores.networkScore,
      },
    }),
    // Grant skip waivers
    ...lessonsToWaive.map((lesson) =>
      prisma.userSkipWaiver.upsert({
        where: { userId_lessonId: { userId: user.id, lessonId: lesson.id } },
        create: { userId: user.id, lessonId: lesson.id },
        update: {},
      }),
    ),
  ]);

  // ── Find the recommended path slug ───────────────────────────────────────
  let recommendedPathSlug: string | null = null;

  if (categoriesToWaive.length > 0) {
    // Pick the path in the highest-scoring mastered category
    const topCategory =
      scores.cybersecScore >= PLACEMENT_MASTERY_THRESHOLD &&
      scores.cybersecScore >= scores.devScore &&
      scores.cybersecScore >= scores.networkScore
        ? "CYBERSEC"
        : scores.devScore >= PLACEMENT_MASTERY_THRESHOLD && scores.devScore >= scores.networkScore
          ? "DEV"
          : scores.networkScore >= PLACEMENT_MASTERY_THRESHOLD
            ? "NETWORK"
            : null;

    if (topCategory) {
      const recommendedPath = await prisma.path.findFirst({
        where: { category: topCategory, status: "PUBLISHED" },
        orderBy: { difficulty: "asc" },
        select: { slug: true },
      });
      recommendedPathSlug = recommendedPath?.slug ?? null;
    }
  }

  // Award "Quick Start" badge if any category is mastered — Phase 5 TODO
  // BadgeEvaluator will handle this once implemented

  await setOnboardingComplete(user.id);

  redirect(
    `/onboarding/placement-test/result?dev=${scores.devScore.toString()}&cybersec=${scores.cybersecScore.toString()}&network=${scores.networkScore.toString()}&path=${recommendedPathSlug ?? ""}`,
  );
}
