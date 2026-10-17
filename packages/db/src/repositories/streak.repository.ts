import { correctStreak, dayKey } from "@cyberlearn/lib";
import { prisma } from "../prisma.js";

/** What the audit log calls a streak corrected from the console. */
export const STREAK_CORRECTION_ACTION = "admin.user.streak.correct";

export interface StreakCounters {
  streakDays: number;
  longestStreak: number;
  streakFreezes: number;
}

export type StreakCorrectionResult =
  | {
      ok: true;
      before: StreakCounters;
      after: StreakCounters;
      /** True when the last active day moved to today to keep the streak alive. */
      movedToToday: boolean;
    }
  | { ok: false; reason: "NO_USER" | "UNCHANGED" };

export interface StreakOverview {
  currentStreak: number;
  longestStreak: number;
  freezes: number;
  active: boolean;
  daysThisYear: number;
  /** Activity count keyed by ISO day "YYYY-MM-DD" (last ~130 days). */
  activity: Record<string, number>;
}

export const streakRepository = {
  /** Streak counters + recent per-day activity, for the dashboard/profile panel. */
  async getOverview(userId: string): Promise<StreakOverview | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { streakDays: true, longestStreak: true, streakFreezes: true },
    });
    if (!user) return null;

    const now = new Date();
    // ~53 weeks back for the GitHub-style year heatmap.
    const since = new Date(now.getTime() - 380 * 86_400_000);
    const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));

    const [rows, daysThisYear] = await Promise.all([
      prisma.userActivityDay.findMany({
        where: { userId, day: { gte: since } },
        select: { day: true, count: true },
      }),
      prisma.userActivityDay.count({ where: { userId, day: { gte: yearStart } } }),
    ]);

    const activity: Record<string, number> = {};
    for (const row of rows) {
      activity[row.day.toISOString().slice(0, 10)] = row.count;
    }

    return {
      currentStreak: user.streakDays,
      longestStreak: user.longestStreak,
      freezes: user.streakFreezes,
      active: user.streakDays > 0,
      daysThisYear,
      activity,
    };
  },

  /**
   * Sets a streak by hand from the console, with its audit row in the same
   * transaction. The rules (the record, the last active day) are
   * correctStreak's, in @cyberlearn/lib.
   *
   * When the last active day has to move to today, lastActiveAt takes the
   * current time. That column is also what the inactivity notice reads: an
   * account given back a streak is, by the same token, an account somebody is
   * looking after.
   *
   * The activity calendar is left alone: it shows the days the learner was
   * active, which a correction does not change. So are the badges and quests
   * a longer streak would unlock: they are granted from the same page.
   */
  async correct(
    userId: string,
    target: { streakDays: number; streakFreezes?: number },
    options: { actorId: string; reason: string; now?: Date },
  ): Promise<StreakCorrectionResult> {
    const now = options.now ?? new Date();
    return prisma.$transaction(async (tx): Promise<StreakCorrectionResult> => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { streakDays: true, longestStreak: true, streakFreezes: true, lastActiveAt: true },
      });
      if (!user) return { ok: false, reason: "NO_USER" };

      const { state, movedToToday } = correctStreak(
        {
          currentStreak: user.streakDays,
          longestStreak: user.longestStreak,
          lastActiveDay: dayKey(user.lastActiveAt),
          freezes: user.streakFreezes,
        },
        {
          currentStreak: target.streakDays,
          ...(target.streakFreezes !== undefined ? { freezes: target.streakFreezes } : {}),
        },
        now,
      );
      const before: StreakCounters = {
        streakDays: user.streakDays,
        longestStreak: user.longestStreak,
        streakFreezes: user.streakFreezes,
      };
      const after: StreakCounters = {
        streakDays: state.currentStreak,
        longestStreak: state.longestStreak,
        streakFreezes: state.freezes,
      };
      // The same figures can still be a correction: a streak about to be
      // broken tonight, kept alive by moving its last day to today.
      if (
        !movedToToday &&
        before.streakDays === after.streakDays &&
        before.longestStreak === after.longestStreak &&
        before.streakFreezes === after.streakFreezes
      ) {
        return { ok: false, reason: "UNCHANGED" };
      }

      await tx.user.update({
        where: { id: userId },
        data: { ...after, ...(movedToToday ? { lastActiveAt: now } : {}) },
      });
      await tx.auditLog.create({
        data: {
          actorId: options.actorId,
          action: STREAK_CORRECTION_ACTION,
          targetType: "User",
          targetId: userId,
          // Spread into plain objects: an interface is not a JSON value to Prisma.
          metadata: {
            reason: options.reason,
            before: { ...before },
            after: { ...after },
            movedToToday,
          },
        },
      });

      return { ok: true, before, after, movedToToday };
    });
  },
};
