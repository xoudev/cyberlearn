import { prisma } from "../prisma.js";
import type { Category, Difficulty, ChallengeType, ProgressStatus } from "@prisma/client";

export interface ChallengeWithProgress {
  id: string;
  refCode: string;
  slug: string;
  title: string;
  description: string;
  category: Category;
  difficulty: Difficulty;
  type: ChallengeType;
  xpReward: number;
  timeLimitMin: number;
  maxAttempts: number;
  isActive: boolean;
  orderIndex: number;
  prerequisiteId: string | null;
  userStatus: ProgressStatus | null;
  userAttempts: number;
  userCompletedAt: Date | null;
}

export const challengeRepository = {
  async findAllActive(userId: string): Promise<ChallengeWithProgress[]> {
    const challenges = await prisma.challenge.findMany({
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

  async findBySlug(slug: string) {
    return prisma.challenge.findFirst({
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

  async findByIdForAdmin(id: string) {
    return prisma.challenge.findUnique({
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

  async getRevealedHintIds(userId: string, challengeId: string): Promise<string[]> {
    const reveals = await prisma.challengeHintReveal.findMany({
      where: { userId, hint: { challengeId } },
      select: { hintId: true },
    });
    return reveals.map((r) => r.hintId);
  },

  async revealHint(
    userId: string,
    hintId: string,
  ): Promise<{ content: string; xpCost: number } | null> {
    const hint = await prisma.challengeHint.findUnique({
      where: { id: hintId },
      select: { content: true, xpCost: true },
    });
    if (!hint) return null;

    await prisma.challengeHintReveal.upsert({
      where: { userId_hintId: { userId, hintId } },
      create: { userId, hintId },
      update: {},
    });
    return hint;
  },

  async getUserProgress(userId: string, challengeId: string) {
    return prisma.userChallengeProgress.findUnique({
      where: { userId_challengeId: { userId, challengeId } },
    });
  },

  async startChallenge(userId: string, challengeId: string) {
    return prisma.userChallengeProgress.upsert({
      where: { userId_challengeId: { userId, challengeId } },
      create: { userId, challengeId, status: "IN_PROGRESS", attempts: 1 },
      update: { attempts: { increment: 1 } },
    });
  },

  async completeChallenge(userId: string, challengeId: string) {
    return prisma.userChallengeProgress.upsert({
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

  async countCompleted(userId: string): Promise<number> {
    return prisma.userChallengeProgress.count({
      where: { userId, status: "COMPLETED" },
    });
  },

  async getRevealedHintsWithContent(
    userId: string,
    challengeId: string,
  ): Promise<{ hintId: string; content: string }[]> {
    const reveals = await prisma.challengeHintReveal.findMany({
      where: { userId, hint: { challengeId } },
      select: { hintId: true, hint: { select: { content: true } } },
    });
    return reveals.map((r) => ({ hintId: r.hintId, content: r.hint.content }));
  },

  async findAdjacentChallenges(
    currentId: string,
    currentOrderIndex: number,
  ): Promise<{
    prev: { slug: string; title: string } | null;
    next: { slug: string; title: string } | null;
  }> {
    const [prev, next] = await Promise.all([
      prisma.challenge.findFirst({
        where: { isActive: true, orderIndex: { lt: currentOrderIndex }, id: { not: currentId } },
        orderBy: { orderIndex: "desc" },
        select: { slug: true, title: true },
      }),
      prisma.challenge.findFirst({
        where: { isActive: true, orderIndex: { gt: currentOrderIndex }, id: { not: currentId } },
        orderBy: { orderIndex: "asc" },
        select: { slug: true, title: true },
      }),
    ]);
    return { prev: prev ?? null, next: next ?? null };
  },

  async getFirstBlood(challengeId: string): Promise<{ displayName: string } | null> {
    const first = await prisma.userChallengeProgress.findFirst({
      where: { challengeId, status: "COMPLETED" },
      orderBy: { completedAt: "asc" },
      select: { user: { select: { displayName: true } } },
    });
    return first ? { displayName: first.user.displayName } : null;
  },
};
