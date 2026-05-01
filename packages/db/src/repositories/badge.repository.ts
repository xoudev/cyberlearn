import { prisma } from "../prisma.js";

export const badgeRepository = {
  /** All active badges — loaded once per request for badge evaluation. */
  async findAllActive() {
    return prisma.badge.findMany({
      where: { isActive: true },
      orderBy: [{ rarity: "asc" }, { name: "asc" }],
    });
  },

  /** Set of badge IDs already earned by a user — used to skip re-evaluation. */
  async findUserBadgeIds(userId: string): Promise<ReadonlySet<string>> {
    const rows = await prisma.userBadge.findMany({
      where: { userId },
      select: { badgeId: true },
    });
    return new Set(rows.map((r) => r.badgeId));
  },

  /** All badges earned by a user, with badge details. */
  async findUserBadges(userId: string) {
    return prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true },
      orderBy: { earnedAt: "desc" },
    });
  },
};
