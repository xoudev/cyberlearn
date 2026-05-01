"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leaderboardRepository = void 0;
const prisma_js_1 = require("../prisma.js");
exports.leaderboardRepository = {
  async findTopUsers(limit = 100) {
    const users = await prisma_js_1.prisma.user.findMany({
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
  async findUserRank(userId) {
    const higherCount = await prisma_js_1.prisma.user.count({
      where: {
        xpTotal: {
          gt:
            (
              await prisma_js_1.prisma.user.findUnique({
                where: { id: userId },
                select: { xpTotal: true },
              })
            )?.xpTotal ?? 0,
        },
      },
    });
    return higherCount + 1;
  },
};
//# sourceMappingURL=leaderboard.repository.js.map
