import { revalidatePath } from "next/cache";
import {
  buildBadgeCriterionStats,
  dayKey,
  evaluateBadges,
  registerActivity,
} from "@cyberlearn/lib";
import { prisma, lessonRepository, badgeRepository, userRepository } from "@cyberlearn/db";
import { awardBadges } from "@/lib/badges/award";
import { creditXp } from "@/lib/xp/credit";
import { checkAndIssueCertificates } from "@/lib/certificates/check-and-issue";
import { recordQuestProgress } from "@/lib/quests/progress";

export interface CompleteLessonResult {
  alreadyCompleted: boolean;
  /** Total XP credited by this completion: lesson reward + earned-badge rewards. */
  xpGained: number;
  leveledUp: boolean;
  newLevel: number;
  newBadges: { name: string; rarity: string; xpReward: number }[];
}

export const EMPTY_COMPLETE_RESULT: CompleteLessonResult = {
  alreadyCompleted: false,
  xpGained: 0,
  leveledUp: false,
  newLevel: 1,
  newBadges: [],
};

/**
 * The single guarded lesson-completion flow (XP ledger, streak, badges, quests,
 * certificates). Callers are responsible for AUTHENTICATION - `userId` must be
 * a verified identity (server action session or mobile Bearer JWT). Lives
 * outside any "use server" module so it can never be invoked as an action with
 * an arbitrary userId.
 */
export async function completeLessonForUser(
  userId: string,
  lessonId: string,
): Promise<CompleteLessonResult> {
  // Parallel fetch - lesson, user gamification state, existing progress, all active badges
  const [lesson, user, existing, allBadges] = await Promise.all([
    prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { xpReward: true, slug: true, category: true },
    }),
    userRepository.findForGamification(userId),
    lessonRepository.findProgress(userId, lessonId),
    badgeRepository.findAllActive(),
  ]);

  if (!lesson || !user) return EMPTY_COMPLETE_RESULT;

  const isFirstCompletion = existing?.status !== "COMPLETED";
  const now = new Date();

  // Projected XP total after the lesson reward - used ONLY to evaluate
  // XP_THRESHOLD badges below. The actual credit happens via creditXp in-tx.
  const newXpTotal = isFirstCompletion ? user.xpTotal + lesson.xpReward : user.xpTotal;

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
      badgeRepository.findUserBadgeIds(userId),
      badgeRepository.findCriterionFacts(userId),
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
      where: { userId_lessonId: { userId, lessonId } },
      create: {
        userId,
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

    // A brand-new completion advances the streak and logs today's activity day.
    if (isFirstCompletion) {
      await tx.user.update({
        where: { id: userId },
        data: {
          streakDays: streak.currentStreak,
          longestStreak: streak.longestStreak,
          streakFreezes: streak.freezes,
          lastActiveAt: now,
        },
      });
      const today = new Date(dayKey(now));
      await tx.userActivityDay.upsert({
        where: { userId_day: { userId, day: today } },
        create: { userId, day: today, count: 1 },
        update: { count: { increment: 1 } },
      });
    }

    // Credit the lesson reward through the single XP source of truth (level-up
    // notification suppressed: one combined LEVEL_UP is emitted below).
    const lessonCredit = isFirstCompletion
      ? await creditXp(tx, userId, lesson.xpReward, "LESSON", { notifyLevelUp: false })
      : null;

    // Insert userBadge rows and credit their xpReward (also via creditXp) -
    // only for rows actually inserted (idempotent re-awards).
    const awardResult = await awardBadges(tx, userId, earnedBadges, { lessonId });

    const txXpTotal = awardResult.newXpTotal ?? lessonCredit?.newXpTotal ?? user.xpTotal;
    const txLevel = awardResult.newLevel ?? lessonCredit?.newLevel ?? user.level;

    if (txLevel > user.level) {
      const totalGained = lesson.xpReward + awardResult.xpGained;
      await tx.notification.create({
        data: {
          userId,
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
        where: { userId_lessonId: { userId, lessonId } },
        create: {
          userId,
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
    await checkAndIssueCertificates(userId, lessonId);
    revalidatePath("/paths");

    // Weekly quests: a fresh completion advances the "lessons" and "streak" quests.
    await recordQuestProgress(userId, "LESSON_COMPLETED", now, { amount: 1 });
    await recordQuestProgress(userId, "STREAK_DAYS", now, { setTo: streak.currentStreak });
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
