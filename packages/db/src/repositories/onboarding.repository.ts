import type { OnboardingStep } from "@prisma/client";
import { prisma } from "../prisma.js";
import { activeBanFilter } from "./ban.repository.js";

/** Who a first-week e-mail goes to. */
export interface OnboardingRecipient {
  id: string;
  email: string;
  displayName: string;
}

/** What the learner did in their first days, for the step to say or to skip. */
export interface FirstDays {
  lessonsCompleted: number;
  /** The last lesson finished, null before the first. */
  lastCompletedAt: Date | null;
  xpTotal: number;
  streakDays: number;
}

/**
 * The first week's e-mails (apps/web/lib/onboarding/first-week.ts): who is due
 * for a step, what they did, and the log that keeps a step from going twice.
 */
export const onboardingRepository = {
  /**
   * The learners who signed up between `from` and `to` and have not had this
   * step: not the team's accounts, not banned, not having switched off e-mails
   * (no preferences row keeps the default, on). The window is two of the cron's days: the second is a
   * second chance for an e-mail that could not go, the claim keeps it from
   * going twice. Nobody who signed up before the window gets the step.
   */
  async dueForStep(
    step: OnboardingStep,
    from: Date,
    to: Date,
    now: Date,
  ): Promise<OnboardingRecipient[]> {
    return prisma.user.findMany({
      where: {
        createdAt: { gte: from, lt: to },
        role: { not: "ADMIN" },
        onboardingEmails: { none: { step } },
        bans: { none: activeBanFilter(now) },
        OR: [{ preferences: null }, { preferences: { emailNotifications: true } }],
      },
      select: { id: true, email: true, displayName: true },
      orderBy: { createdAt: "asc" },
    });
  },

  /** Their lessons finished so far, the last one's date, their XP and streak. */
  async firstDays(userId: string): Promise<FirstDays> {
    const [completed, last, user] = await Promise.all([
      prisma.userLessonProgress.count({ where: { userId, status: "COMPLETED" } }),
      prisma.userLessonProgress.findFirst({
        where: { userId, status: "COMPLETED", completedAt: { not: null } },
        orderBy: { completedAt: "desc" },
        select: { completedAt: true },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { xpTotal: true, streakDays: true },
      }),
    ]);
    return {
      lessonsCompleted: completed,
      lastCompletedAt: last?.completedAt ?? null,
      xpTotal: user?.xpTotal ?? 0,
      streakDays: user?.streakDays ?? 0,
    };
  },

  /**
   * Claims the step for the account before it is decided: false when it was
   * already claimed (another run got there first), and nothing goes then. A
   * step claimed and found not needed (a learner already at work) stays
   * claimed: it is handled.
   */
  async claim(userId: string, step: OnboardingStep, now: Date): Promise<boolean> {
    const { count } = await prisma.onboardingEmail.createMany({
      data: [{ userId, step, sentAt: now }],
      skipDuplicates: true,
    });
    return count === 1;
  },

  /** Gives a step back when its e-mail could not go: the next run tries again. */
  async release(userId: string, step: OnboardingStep): Promise<void> {
    await prisma.onboardingEmail.deleteMany({ where: { userId, step } });
  },
};
