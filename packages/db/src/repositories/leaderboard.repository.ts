import { prisma } from "../prisma.js";

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  level: number;
  xpTotal: number;
  streakDays: number;
}

export const leaderboardRepository = {
  async findTopUsers(limit = 100): Promise<LeaderboardEntry[]> {
    const users = await prisma.user.findMany({
      orderBy: { xpTotal: "desc" },
      take: limit,
      select: {
        id: true,
        displayName: true,
        username: true,
        avatarUrl: true,
        level: true,
        xpTotal: true,
        streakDays: true,
      },
    });
    return users.map((u, i) => ({
      rank: i + 1,
      userId: u.id,
      displayName: u.displayName,
      username: u.username,
      avatarUrl: u.avatarUrl,
      level: u.level,
      xpTotal: u.xpTotal,
      streakDays: u.streakDays,
    }));
  },

  async findUserRank(userId: string): Promise<number> {
    const higherCount = await prisma.user.count({
      where: {
        xpTotal: {
          gt:
            (await prisma.user.findUnique({ where: { id: userId }, select: { xpTotal: true } }))
              ?.xpTotal ?? 0,
        },
      },
    });
    return higherCount + 1;
  },
};
