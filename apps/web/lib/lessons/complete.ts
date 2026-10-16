import { revalidatePath } from "next/cache";
import {
  buildBadgeCriterionStats,
  dayKey,
  evaluateBadges,
  registerActivity,
} from "@cyberlearn/lib";
import { cardsForCompletion, isReviewableLesson } from "@cyberlearn/lib/revisions/cards";
import {
  prisma,
  lessonRepository,
  badgeRepository,
  reviewCardRepository,
  userRepository,
} from "@cyberlearn/db";
import { pathLockOf } from "@/lib/lessons/access";
import { revisionsEnabled } from "@/lib/lessons/revisions-enabled";
import { awardBadges } from "@/lib/badges/award";
import { creditXp } from "@/lib/xp/credit";
import { checkAndIssueCertificates } from "@/lib/certificates/check-and-issue";
import { recordQuestProgress } from "@/lib/quests/progress";
import { quizScoreOf, readLessonQuizRecord } from "@/lib/lessons/quiz-answer";

export interface CompleteLessonResult {
  alreadyCompleted: boolean;
  /** Total XP credited by this completion: lesson reward + earned-badge rewards. */
  xpGained: number;
  leveledUp: boolean;
  newLevel: number;
  newBadges: { name: string; rarity: string; xpReward: number }[];
  /** Right answers out of the lesson's quizzes; null when it has none. */
  quizScore: { correct: number; total: number } | null;
  /**
   * Why nothing was recorded, in the words the reader is shown; null when the
   * completion went through (or was already on record). A refusal used to
   * come back as an empty result, which the app read as a completion worth
   * 0 XP: it said « enregistrées » and the lesson stayed in progress for good.
   */
  refusal: string | null;
}

/** The lesson is not one this reader may open: unpublished, or another class's. */
export const LESSON_NOT_FOUND = "Leçon introuvable.";
/** The lesson before it in its path is not finished yet. */
export const LESSON_LOCKED = "Termine d'abord la leçon précédente du parcours.";

export const EMPTY_COMPLETE_RESULT: CompleteLessonResult = {
  alreadyCompleted: false,
  xpGained: 0,
  leveledUp: false,
  newLevel: 1,
  newBadges: [],
  quizScore: null,
  refusal: null,
};

function refused(refusal: string): CompleteLessonResult {
  return { ...EMPTY_COMPLETE_RESULT, refusal };
}

/**
 * The single guarded lesson-completion flow (XP ledger, streak, badges, quests,
 * certificates). Callers are responsible for AUTHENTICATION - `userId` must be
 * a verified identity (server action session or mobile Bearer JWT). Lives
 * outside any "use server" module so it can never be invoked as an action with
 * an arbitrary userId.
 *
 * ACCESS is decided here, not by the caller: only a published lesson the
 * reader may open (the catalogue, or a class's lesson for its members), and
 * not one still locked in its path. The lesson page used to be the only gate,
 * and the app's route reached this with any lesson id, so a locked mission
 * opened from the app's catalogue paid its XP, badges and streak.
 */
export async function completeLessonForUser(
  userId: string,
  lessonId: string,
): Promise<CompleteLessonResult> {
  // Parallel fetch - lesson, its path lock, user gamification state, existing
  // progress, all active badges, and whether this account still wants a
  // revision queue.
  //
  // The lesson is read as this reader may open it (findReadableById), like the
  // lesson page reads it: by id alone, a draft an administrator previews, a
  // class's own lesson or a lesson still locked in its path could be completed
  // and paid by anyone who sent its id.
  const [lesson, lock, user, existing, allBadges, wantsRevisions] = await Promise.all([
    lessonRepository.findReadableById(lessonId, userId),
    pathLockOf(userId, lessonId),
    userRepository.findForGamification(userId),
    lessonRepository.findProgress(userId, lessonId),
    badgeRepository.findAllActive(),
    revisionsEnabled(userId),
  ]);

  if (!lesson || !user) return refused(LESSON_NOT_FOUND);
  if (lock !== null) return refused(LESSON_LOCKED);

  // The quiz score is fixed now, with the completion: right answers out of
  // the quizzes the lesson has at this moment. The catalogue shows it.
  const quizRecord = await readLessonQuizRecord(userId, lessonId, lesson.contentMdx);
  const quizScore = quizScoreOf(quizRecord);
  const scoreColumns = {
    quizCorrect: quizScore?.correct ?? null,
    quizTotal: quizScore?.total ?? null,
  };

  // Optimistic hint, read outside any transaction: it decides whether the
  // (expensive) badge evaluation below is worth running. The authoritative
  // answer is `firstCompletion`, claimed atomically inside the transaction, and
  // nothing is credited unless that claim succeeds.
  const isFirstCompletion = existing?.status !== "COMPLETED";
  const now = new Date();

  // The review cards this completion enqueues, from the same answers as the
  // score: the questions missed, and one answered right. Behind the same
  // switch as the lesson-level queue below, and not for a module review, a
  // project or a class lesson (isReviewableLesson says why).
  const reviewCards =
    wantsRevisions && isReviewableLesson(lesson)
      ? cardsForCompletion(
          quizRecord.quizzes.map((quiz) => quiz.id),
          quizRecord.answers,
          now,
        )
      : [];

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
      data: { status: "COMPLETED", completedAt: now, ...scoreColumns },
    });

    let firstCompletion = claimed.count > 0;
    if (claimed.count === 0) {
      // Either the row is already COMPLETED, or the user has no row at all.
      const created = await tx.userLessonProgress.createMany({
        data: {
          userId,
          lessonId,
          status: "COMPLETED",
          attempts: 1,
          completedAt: now,
          ...scoreColumns,
        },
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

    // Schedule first review for tomorrow - SM-2 starts here.
    //
    // Skipped entirely when the reader has turned revisions off: a queue that
    // keeps filling behind a switch that says it is off is the switch lying.
    // Their existing schedules are left alone, so turning it back on resumes
    // where it stopped rather than starting from nothing.
    if (firstCompletion && wantsRevisions) {
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
      // Alongside the lesson-level queue until the cards replace it. In the
      // same transaction, so they are enqueued once, with the completion
      // that claimed it.
      await reviewCardRepository.enqueueForLesson(userId, lessonId, reviewCards, tx);
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
    quizScore,
    refusal: null,
  };
}
