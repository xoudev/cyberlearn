import { prisma } from "../prisma.js";

/**
 * Write-ups: a learner's solution to a challenge. One per person and
 * challenge. Who may read them (the others who solved it) is the service's
 * rule (apps/web/lib/challenges/writeups.ts); this reads and writes rows.
 */

// The id stays on the server: the service reads it to mark a friend's
// solution and sends only the name.
const AUTHOR = { select: { id: true, displayName: true, username: true } } as const;

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
      select: {
        id: true,
        content: true,
        isHidden: true,
        hiddenByModeration: true,
        createdAt: true,
        updatedAt: true,
      },
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

  /**
   * Writes the reader's write-up, replacing the previous version if any.
   *
   * Null when the console took the previous version down, which is never
   * written over: isHidden comes from the screen alone, and writing it on that
   * row would put back what a moderator hid. The condition sits in the update
   * itself, so a moderator hiding it in between is not undone either.
   */
  async upsert(input: {
    challengeId: string;
    userId: string;
    content: string;
    isHidden: boolean;
  }): Promise<{ id: string } | null> {
    const key = { challengeId: input.challengeId, userId: input.userId };
    const { count } = await prisma.challengeWriteup.updateMany({
      where: { ...key, hiddenByModeration: false },
      data: { content: input.content, isHidden: input.isHidden },
    });
    if (count === 0) {
      // None yet, or one the moderation hid, which the conflict leaves alone.
      await prisma.challengeWriteup.createMany({ data: [input], skipDuplicates: true });
    }
    const row = await prisma.challengeWriteup.findUnique({
      where: { challengeId_userId: key },
      select: { id: true, hiddenByModeration: true },
    });
    return row === null || row.hiddenByModeration ? null : { id: row.id };
  },

  /** Removes the reader's own write-up; how many went (0 or 1). */
  async deleteOwn(userId: string, challengeId: string): Promise<number> {
    const { count } = await prisma.challengeWriteup.deleteMany({ where: { challengeId, userId } });
    return count;
  },
};
