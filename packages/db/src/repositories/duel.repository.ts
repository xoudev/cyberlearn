import { type DuelStatus, Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";

/**
 * Quiz duels between friends: the duel rows and their answers. The rules (who
 * may challenge whom, what is drawn, how an answer is checked, who wins) are
 * @cyberlearn/lib/social/duel and the service in apps/web/lib/social/duels.ts;
 * this reads and writes rows.
 */

const PLAYER = { select: { id: true, displayName: true, username: true } } as const;

const DUEL = {
  id: true,
  challengerId: true,
  opponentId: true,
  pathId: true,
  status: true,
  questions: true,
  createdAt: true,
  acceptedAt: true,
  finishedAt: true,
  expiresAt: true,
  winnerId: true,
  challenger: PLAYER,
  opponent: PLAYER,
  path: { select: { title: true, slug: true } },
} as const;

const OPEN: DuelStatus[] = ["PENDING", "ACTIVE"];

export const duelRepository = {
  async findById(id: string) {
    return prisma.duel.findUnique({ where: { id }, select: DUEL });
  },

  /** A duel still open between the two, in either direction. */
  async findOpenBetween(one: string, other: string) {
    return prisma.duel.findFirst({
      where: {
        status: { in: OPEN },
        OR: [
          { challengerId: one, opponentId: other },
          { challengerId: other, opponentId: one },
        ],
      },
      select: { id: true },
    });
  },

  async create(input: {
    challengerId: string;
    opponentId: string;
    pathId: string;
    questions: Prisma.InputJsonValue;
    expiresAt: Date;
  }) {
    return prisma.duel.create({ data: input, select: DUEL });
  },

  /**
   * Moves a duel from one status to another, only if it is still in the
   * first: two taps, two tabs or two players settling it at once write once.
   */
  async transition(
    id: string,
    from: DuelStatus,
    data: {
      status: DuelStatus;
      acceptedAt?: Date;
      finishedAt?: Date;
      expiresAt?: Date;
      winnerId?: string | null;
    },
  ): Promise<boolean> {
    const { count } = await prisma.duel.updateMany({ where: { id, status: from }, data });
    return count === 1;
  },

  /** The reader's duels: the open ones, then the last ones settled. */
  async listFor(userId: string, take = 20) {
    return prisma.duel.findMany({
      where: { OR: [{ challengerId: userId }, { opponentId: userId }] },
      orderBy: { createdAt: "desc" },
      take,
      select: DUEL,
    });
  },

  async listAnswers(duelId: string) {
    return prisma.duelAnswer.findMany({
      where: { duelId },
      orderBy: { answeredAt: "asc" },
      select: { userId: true, index: true, selected: true, correct: true, answeredAt: true },
    });
  },

  /** Records an answer; false when this player already answered that question. */
  async recordAnswer(input: {
    duelId: string;
    userId: string;
    index: number;
    selected: number;
    correct: boolean;
  }): Promise<boolean> {
    try {
      await prisma.duelAnswer.create({ data: input });
      return true;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return false;
      throw err;
    }
  },
};
