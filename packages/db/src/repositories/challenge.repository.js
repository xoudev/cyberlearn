"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.challengeRepository = void 0;
const prisma_js_1 = require("../prisma.js");
exports.challengeRepository = {
  async findAllActive(userId) {
    const challenges = await prisma_js_1.prisma.challenge.findMany({
      where: { isActive: true },
      orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        refCode: true,
        slug: true,
        title: true,
        description: true,
        category: true,
        difficulty: true,
        type: true,
        xpReward: true,
        timeLimitMin: true,
        maxAttempts: true,
        isActive: true,
        orderIndex: true,
        prerequisiteId: true,
        progress: {
          where: { userId },
          select: { status: true, attempts: true, completedAt: true },
          take: 1,
        },
      },
    });
    return challenges.map((c) => ({
      id: c.id,
      refCode: c.refCode,
      slug: c.slug,
      title: c.title,
      description: c.description,
      category: c.category,
      difficulty: c.difficulty,
      type: c.type,
      xpReward: c.xpReward,
      timeLimitMin: c.timeLimitMin,
      maxAttempts: c.maxAttempts,
      isActive: c.isActive,
      orderIndex: c.orderIndex,
      prerequisiteId: c.prerequisiteId,
      userStatus: c.progress[0]?.status ?? null,
      userAttempts: c.progress[0]?.attempts ?? 0,
      userCompletedAt: c.progress[0]?.completedAt ?? null,
    }));
  },
  async findBySlug(slug) {
    return prisma_js_1.prisma.challenge.findFirst({
      where: { slug, isActive: true },
      select: {
        id: true,
        refCode: true,
        slug: true,
        title: true,
        description: true,
        instructions: true,
        category: true,
        difficulty: true,
        type: true,
        xpReward: true,
        timeLimitMin: true,
        maxAttempts: true,
        flag: false, // never expose flag to client
        starterCode: true,
        attachmentUrl: true,
        resourceUrl: true,
        prerequisiteId: true,
        prerequisite: { select: { title: true } },
        hints: {
          orderBy: { orderIndex: "asc" },
          select: { id: true, orderIndex: true, xpCost: true },
          // content is NOT included — fetched per-hint only when revealed
        },
        orderIndex: true,
        _count: { select: { progress: { where: { status: "COMPLETED" } } } },
      },
    });
  },
  async findByIdForAdmin(id) {
    return prisma_js_1.prisma.challenge.findUnique({
      where: { id },
      select: {
        id: true,
        refCode: true,
        slug: true,
        title: true,
        description: true,
        instructions: true,
        category: true,
        difficulty: true,
        type: true,
        xpReward: true,
        timeLimitMin: true,
        maxAttempts: true,
        flag: true, // admin can see flag
        starterCode: true,
        attachmentUrl: true,
        resourceUrl: true,
        isActive: true,
        orderIndex: true,
        prerequisiteId: true,
        hints: {
          orderBy: { orderIndex: "asc" },
          select: { id: true, orderIndex: true, content: true, xpCost: true },
        },
        _count: { select: { progress: { where: { status: "COMPLETED" } } } },
      },
    });
  },
  async getRevealedHintIds(userId, challengeId) {
    const reveals = await prisma_js_1.prisma.challengeHintReveal.findMany({
      where: { userId, hint: { challengeId } },
      select: { hintId: true },
    });
    return reveals.map((r) => r.hintId);
  },
  async revealHint(userId, hintId) {
    const hint = await prisma_js_1.prisma.challengeHint.findUnique({
      where: { id: hintId },
      select: { content: true, xpCost: true },
    });
    if (!hint) return null;
    await prisma_js_1.prisma.challengeHintReveal.upsert({
      where: { userId_hintId: { userId, hintId } },
      create: { userId, hintId },
      update: {},
    });
    return hint;
  },
  async getUserProgress(userId, challengeId) {
    return prisma_js_1.prisma.userChallengeProgress.findUnique({
      where: { userId_challengeId: { userId, challengeId } },
    });
  },
  async startChallenge(userId, challengeId) {
    return prisma_js_1.prisma.userChallengeProgress.upsert({
      where: { userId_challengeId: { userId, challengeId } },
      create: { userId, challengeId, status: "IN_PROGRESS", attempts: 1 },
      update: { attempts: { increment: 1 } },
    });
  },
  async completeChallenge(userId, challengeId) {
    return prisma_js_1.prisma.userChallengeProgress.upsert({
      where: { userId_challengeId: { userId, challengeId } },
      create: {
        userId,
        challengeId,
        status: "COMPLETED",
        attempts: 1,
        completedAt: new Date(),
      },
      update: {
        status: "COMPLETED",
        completedAt: new Date(),
        attempts: { increment: 1 },
      },
    });
  },
  async countCompleted(userId) {
    return prisma_js_1.prisma.userChallengeProgress.count({
      where: { userId, status: "COMPLETED" },
    });
  },
  async getRevealedHintsWithContent(userId, challengeId) {
    const reveals = await prisma_js_1.prisma.challengeHintReveal.findMany({
      where: { userId, hint: { challengeId } },
      select: { hintId: true, hint: { select: { content: true } } },
    });
    return reveals.map((r) => ({ hintId: r.hintId, content: r.hint.content }));
  },
  async findAdjacentChallenges(currentId, currentOrderIndex) {
    const [prev, next] = await Promise.all([
      prisma_js_1.prisma.challenge.findFirst({
        where: { isActive: true, orderIndex: { lt: currentOrderIndex }, id: { not: currentId } },
        orderBy: { orderIndex: "desc" },
        select: { slug: true, title: true },
      }),
      prisma_js_1.prisma.challenge.findFirst({
        where: { isActive: true, orderIndex: { gt: currentOrderIndex }, id: { not: currentId } },
        orderBy: { orderIndex: "asc" },
        select: { slug: true, title: true },
      }),
    ]);
    return { prev: prev ?? null, next: next ?? null };
  },
  async getFirstBlood(challengeId) {
    const first = await prisma_js_1.prisma.userChallengeProgress.findFirst({
      where: { challengeId, status: "COMPLETED" },
      orderBy: { completedAt: "asc" },
      select: { user: { select: { displayName: true } } },
    });
    return first ? { displayName: first.user.displayName } : null;
  },
};
//# sourceMappingURL=challenge.repository.js.map
