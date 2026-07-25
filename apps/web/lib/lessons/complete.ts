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

  // Optimistic hint, read outside any transaction: it decides whether the
  // (expensive) badge evaluation below is worth running. The authoritative
  // answer is `firstCompletion`, claimed atomically inside the transaction, and
  // nothing is credited unless that claim succeeds.
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

  const { award, finalLevel, firstCompletion } = await prisma.$transaction(async (tx) => {
    // Claim the completion atomically. `isFirstCompletion` above was read
    // outside the transaction, so two concurrent submissions both saw
    // IN_PROGRESS and both credited the XP. The conditional update is
    // row-locked: the loser re-evaluates the predicate after the winner commits
    // and matches nothing, and the ON CONFLICT DO NOTHING insert (createMany +
    // skipDuplicates) settles the case where no row exists yet. Exactly one
    // caller ends up with a non-zero count, so the reward is credited once.
    const claimed = await tx.userLessonProgress.updateMany({
      where: { userId, lessonId, status: { not: "COMPLETED" } },
      data: { status: "COMPLETED", completedAt: now },
    });

    let firstCompletion = claimed.count > 0;
    if (claimed.count === 0) {
      // Either the row is already COMPLETED, or the user has no row at all.
      const created = await tx.userLessonProgress.createMany({
        data: { userId, lessonId, status: "COMPLETED", attempts: 1, completedAt: now },
        skipDuplicates: true,
      });
      firstCompletion = created.count > 0;
    }

    // A brand-new completion advances the streak and logs today's activity day.
    if (firstCompletion) {
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
    const lessonCredit = firstCompletion
      ? await creditXp(tx, userId, lesson.xpReward, "LESSON", { notifyLevelUp: false })
      : null;

    // Insert userBadge rows and credit their xpReward (also via creditXp) -
    // only for rows actually inserted (idempotent re-awards).
    const awardResult = await awardBadges(tx, userId, firstCompletion ? earnedBadges : [], {
      lessonId,
    });

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
    if (firstCompletion) {
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

    return { award: awardResult, finalLevel: txLevel, firstCompletion };
  });

  revalidatePath(`/lessons/${lesson.slug}`);
  revalidatePath("/lessons");
  revalidatePath("/dashboard");
  revalidatePath("/profile");

  // Check if completing this lesson finishes any path → issue certificate
  if (firstCompletion) {
    await checkAndIssueCertificates(userId, lessonId);
    revalidatePath("/paths");

    // Weekly quests: a fresh completion advances the "lessons" and "streak" quests.
    await recordQuestProgress(userId, "LESSON_COMPLETED", now, { amount: 1 });
    await recordQuestProgress(userId, "STREAK_DAYS", now, { setTo: streak.currentStreak });
  }

  return {
    alreadyCompleted: !firstCompletion,
    xpGained: firstCompletion ? lesson.xpReward + award.xpGained : 0,
    leveledUp: finalLevel > user.level,
    newLevel: finalLevel,
    newBadges: award.awarded.map((b) => ({
      name: b.name,
      rarity: b.rarity,
      xpReward: b.xpReward,
    })),
  };
}
