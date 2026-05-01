"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.badgeRepository = void 0;
const prisma_js_1 = require("../prisma.js");
exports.badgeRepository = {
  /** All active badges — loaded once per request for badge evaluation. */
  async findAllActive() {
    return prisma_js_1.prisma.badge.findMany({
      where: { isActive: true },
      orderBy: [{ rarity: "asc" }, { name: "asc" }],
    });
  },
  /** Set of badge IDs already earned by a user — used to skip re-evaluation. */
  async findUserBadgeIds(userId) {
    const rows = await prisma_js_1.prisma.userBadge.findMany({
      where: { userId },
      select: { badgeId: true },
    });
    return new Set(rows.map((r) => r.badgeId));
  },
  /** All badges earned by a user, with badge details. */
  async findUserBadges(userId) {
    return prisma_js_1.prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true },
      orderBy: { earnedAt: "desc" },
    });
  },
};
//# sourceMappingURL=badge.repository.js.map
