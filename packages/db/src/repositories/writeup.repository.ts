import { prisma } from "../prisma.js";

/**
 * Write-ups: a learner's solution to a challenge. One per person and
 * challenge. Who may read them (the others who solved it) is the service's
 * rule (apps/web/lib/challenges/writeups.ts); this reads and writes rows.
 */

const AUTHOR = { select: { displayName: true, username: true } } as const;

export const writeupRepository = {
  /** Whether this person solved the challenge: the condition to read and to publish. */
  async hasSolved(userId: string, challengeId: string): Promise<boolean> {
    const progress = await prisma.userChallengeProgress.findUnique({
      where: { userId_challengeId: { userId, challengeId } },
      select: { status: true },
    });
    return progress?.status === "COMPLETED";
  },

  /** The reader's own write-up, hidden or not: the author always sees theirs. */
  async findOwn(userId: string, challengeId: string) {
    return prisma.challengeWriteup.findUnique({
      where: { challengeId_userId: { challengeId, userId } },
      select: { id: true, content: true, isHidden: true, createdAt: true, updatedAt: true },
    });
  },

  /**
   * The others' write-ups that are up, newest first; an anonymized author
   * (an erased account) stays, without a name.
   */
  async listOthers(challengeId: string, viewerId: string, take = 50) {
    return prisma.challengeWriteup.findMany({
      where: {
        challengeId,
        isHidden: false,
        OR: [{ userId: null }, { userId: { not: viewerId } }],
      },
      orderBy: { updatedAt: "desc" },
      take,
      select: { id: true, content: true, createdAt: true, updatedAt: true, user: AUTHOR },
    });
  },

  /** How many write-ups are up, for the line a learner still looking reads. */
  async countVisible(challengeId: string): Promise<number> {
    return prisma.challengeWriteup.count({ where: { challengeId, isHidden: false } });
  },

  /** Writes the reader's write-up, replacing the previous version if any. */
  async upsert(input: {
    challengeId: string;
    userId: string;
    content: string;
    isHidden: boolean;
  }): Promise<{ id: string }> {
    return prisma.challengeWriteup.upsert({
      where: { challengeId_userId: { challengeId: input.challengeId, userId: input.userId } },
      create: input,
      update: { content: input.content, isHidden: input.isHidden },
      select: { id: true },
    });
  },

  /** Removes the reader's own write-up; how many went (0 or 1). */
  async deleteOwn(userId: string, challengeId: string): Promise<number> {
    const { count } = await prisma.challengeWriteup.deleteMany({ where: { challengeId, userId } });
    return count;
  },
};
