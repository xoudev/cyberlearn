"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { computeLevel, evaluateBadges, computeNewStreak } from "@cyberlearn/lib";
import { requireRequestUser } from "@/lib/auth";
import { prisma, lessonRepository, badgeRepository, userRepository } from "@cyberlearn/db";
import { checkAndIssueCertificates } from "@/app/(app)/paths/[slug]/_actions/generate-certificate";

export interface CompleteLessonResult {
  alreadyCompleted: boolean;
  xpGained: number;
  leveledUp: boolean;
  newLevel: number;
  newBadges: { name: string; rarity: string }[];
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

  // Parallel fetch — lesson, user gamification state, existing progress, all active badges
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

  // ── XP + level ─────────────────────────────────────────────────────────────
  const newXpTotal = isFirstCompletion ? user.xpTotal + lesson.xpReward : user.xpTotal;
  const { level: newLevel } = computeLevel(newXpTotal);
  const leveledUp = newLevel > user.level;

  // ── Streak ─────────────────────────────────────────────────────────────────
  const { streakDays, lastActiveAt } = computeNewStreak(user.streakDays, user.lastActiveAt, now);

  // ── Badge evaluation (only on first completion) ────────────────────────────
  let newBadgeIds: string[] = [];
  if (isFirstCompletion && allBadges.length > 0) {
    const [earnedIds, lessonCounts] = await Promise.all([
      badgeRepository.findUserBadgeIds(authUser.id),
      userRepository.countCompletedLessonsByCategory(authUser.id),
    ]);
    const catCounts = { ...lessonCounts.byCategory };
    catCounts[lesson.category] = (catCounts[lesson.category] ?? 0) + 1;

    newBadgeIds = evaluateBadges(allBadges, earnedIds, {
      xpTotal: newXpTotal,
      streakDays,
      totalLessonsCompleted: lessonCounts.total + 1,
      categoryLessonCounts: catCounts,
      completedLessonId: lessonId,
    });
  }

  // ── Build atomic transaction ───────────────────────────────────────────────
  const earnedBadges = allBadges.filter((b) => newBadgeIds.includes(b.id));

  const notifications: {
    userId: string;
    type: "LEVEL_UP" | "BADGE_EARNED";
    title: string;
    body: string;
    actionUrl: string;
    metadata: Record<string, string | number>;
  }[] = [];

  if (leveledUp) {
    notifications.push({
      userId: authUser.id,
      type: "LEVEL_UP",
      title: `Niveau ${String(newLevel)} atteint !`,
      body: `+${String(lesson.xpReward)} XP — tu passes au niveau ${String(newLevel)}.`,
      actionUrl: "/profile",
      metadata: { previousLevel: user.level, newLevel, xpTotal: newXpTotal },
    });
  }

  for (const badge of earnedBadges) {
    notifications.push({
      userId: authUser.id,
      type: "BADGE_EARNED",
      title: `Badge obtenu : ${badge.name}`,
      body: badge.description,
      actionUrl: "/badges",
      metadata: { badgeId: badge.id, rarity: badge.rarity },
    });
  }

  await prisma.$transaction([
    prisma.userLessonProgress.upsert({
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
    }),
    prisma.user.update({
      where: { id: authUser.id },
      data: { xpTotal: newXpTotal, level: newLevel, streakDays, lastActiveAt },
    }),
    ...(newBadgeIds.length > 0
      ? [
          prisma.userBadge.createMany({
            data: newBadgeIds.map((badgeId) => ({
              userId: authUser.id,
              badgeId,
              context: { lessonId },
            })),
            skipDuplicates: true,
          }),
        ]
      : []),
    ...(notifications.length > 0 ? [prisma.notification.createMany({ data: notifications })] : []),
    // Schedule first review for tomorrow — SM-2 starts here
    ...(isFirstCompletion
      ? [
          prisma.reviewSchedule.upsert({
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
          }),
        ]
      : []),
  ]);

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
    xpGained: isFirstCompletion ? lesson.xpReward : 0,
    leveledUp,
    newLevel,
    newBadges: earnedBadges.map((b) => ({ name: b.name, rarity: b.rarity as string })),
  };
}
