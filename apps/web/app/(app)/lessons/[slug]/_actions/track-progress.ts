"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  buildBadgeCriterionStats,
  computeLevel,
  dayKey,
  evaluateBadges,
  registerActivity,
} from "@cyberlearn/lib";
import { requireRequestUser } from "@/lib/auth";
import { prisma, lessonRepository, badgeRepository, userRepository } from "@cyberlearn/db";
import { awardBadges } from "@/lib/badges/award";
import { checkAndIssueCertificates } from "@/app/(app)/paths/[slug]/_actions/generate-certificate";

export interface CompleteLessonResult {
  alreadyCompleted: boolean;
  /** Total XP credited by this completion: lesson reward + earned-badge rewards. */
  xpGained: number;
  leveledUp: boolean;
  newLevel: number;
  newBadges: { name: string; rarity: string; xpReward: number }[];
}

const EMPTY_RESULT: CompleteLessonResult = {
  alreadyCompleted: false,
  xpGained: 0,
  leveledUp: false,
  newLevel: 1,
  newBadges: [],
};

export async function completeLesson(lessonId: string): Promise<CompleteLessonResult> {
  if (!z.string().uuid().safeParse(lessonId).success) return EMPTY_RESULT;
  const authUser = await requireRequestUser();

  // Parallel fetch - lesson, user gamification state, existing progress, all active badges
  const [lesson, user, existing, allBadges] = await Promise.all([
    prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { xpReward: true, slug: true, category: true },
    }),
    userRepository.findForGamification(authUser.id),
    lessonRepository.findProgress(authUser.id, lessonId),
    badgeRepository.findAllActive(),
  ]);

  if (!lesson || !user) return EMPTY_RESULT;

  const isFirstCompletion = existing?.status !== "COMPLETED";
  const now = new Date();

  // ── XP + level (lesson reward only - badge rewards are credited in-tx) ─────
  const newXpTotal = isFirstCompletion ? user.xpTotal + lesson.xpReward : user.xpTotal;
  const { level: newLevel } = computeLevel(newXpTotal);

  // ── Streak (only a brand-new lesson completion is a qualifying activity) ─────
  const streak = registerActivity(
    {
      currentStreak: user.streakDays,
      longestStreak: user.longestStreak,
      lastActiveDay: dayKey(user.lastActiveAt),
      freezes: user.streakFreezes,
    },
    now,
  ).state;

  // ── Badge evaluation (only on first completion) ────────────────────────────
  let newBadgeIds: string[] = [];
  if (isFirstCompletion && allBadges.length > 0) {
    const [earnedIds, facts] = await Promise.all([
      badgeRepository.findUserBadgeIds(authUser.id),
      badgeRepository.findCriterionFacts(authUser.id),
    ]);
    // The triggering lesson is not persisted yet - count it as completed.
    if (!facts.completedLessons.some((l) => l.lessonId === lessonId)) {
      facts.completedLessons.push({ lessonId, category: lesson.category });
    }

    newBadgeIds = evaluateBadges(
      allBadges,
      earnedIds,
      buildBadgeCriterionStats(facts, { xpTotal: newXpTotal, streakDays: streak.currentStreak }),
    );
  }

  // ── Atomic transaction (interactive: the badge credit depends on which
  //    userBadge rows actually get inserted) ─────────────────────────────────
  const earnedBadges = allBadges.filter((b) => newBadgeIds.includes(b.id));

  const { award, finalLevel } = await prisma.$transaction(async (tx) => {
    await tx.userLessonProgress.upsert({
      where: { userId_lessonId: { userId: authUser.id, lessonId } },
      create: {
        userId: authUser.id,
        lessonId,
        status: "COMPLETED",
        attempts: 1,
        completedAt: now,
      },
      update: {
        status: "COMPLETED",
        completedAt: now,
      },
    });

    await tx.user.update({
      where: { id: authUser.id },
      data: isFirstCompletion
        ? {
            xpTotal: newXpTotal,
            level: newLevel,
            streakDays: streak.currentStreak,
            longestStreak: streak.longestStreak,
            streakFreezes: streak.freezes,
            lastActiveAt: now,
          }
        : { xpTotal: newXpTotal, level: newLevel },
    });

    // Record today's activity day (Europe/Paris) - source of the heatmap.
    if (isFirstCompletion) {
      const today = new Date(dayKey(now));
      await tx.userActivityDay.upsert({
        where: { userId_day: { userId: authUser.id, day: today } },
        create: { userId: authUser.id, day: today, count: 1 },
        update: { count: { increment: 1 } },
      });
    }

    // Insert userBadge rows, credit their xpReward on top of the lesson XP,
    // and notify - only for rows actually inserted (idempotent re-awards).
    const awardResult = await awardBadges(tx, authUser.id, earnedBadges, { lessonId });

    const txXpTotal = awardResult.newXpTotal ?? newXpTotal;
    const txLevel = awardResult.newLevel ?? newLevel;

    if (txLevel > user.level) {
      const totalGained = lesson.xpReward + awardResult.xpGained;
      await tx.notification.create({
        data: {
          userId: authUser.id,
          type: "LEVEL_UP",
          title: `Niveau ${String(txLevel)} atteint !`,
          body: `+${String(totalGained)} XP, tu passes au niveau ${String(txLevel)}.`,
          actionUrl: "/profile",
          metadata: { previousLevel: user.level, newLevel: txLevel, xpTotal: txXpTotal },
        },
      });
    }

    // Schedule first review for tomorrow - SM-2 starts here
    if (isFirstCompletion) {
      await tx.reviewSchedule.upsert({
        where: { userId_lessonId: { userId: authUser.id, lessonId } },
        create: {
          userId: authUser.id,
          lessonId,
          nextReviewAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          easeFactor: 2.5,
          intervalDays: 1,
          repetitions: 0,
        },
        update: {},
      });
    }

    return { award: awardResult, finalLevel: txLevel };
  });

  revalidatePath(`/lessons/${lesson.slug}`);
  revalidatePath("/lessons");
  revalidatePath("/dashboard");
  revalidatePath("/profile");

  // Check if completing this lesson finishes any path → issue certificate
  if (isFirstCompletion) {
    await checkAndIssueCertificates(authUser.id, lessonId);
    revalidatePath("/paths");
  }

  return {
    alreadyCompleted: !isFirstCompletion,
    xpGained: isFirstCompletion ? lesson.xpReward + award.xpGained : 0,
    leveledUp: finalLevel > user.level,
    newLevel: finalLevel,
    newBadges: award.awarded.map((b) => ({
      name: b.name,
      rarity: b.rarity,
      xpReward: b.xpReward,
    })),
  };
}
