import { prisma } from "../prisma.js";

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
};
