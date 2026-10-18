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

/** How many duels somebody won, lost, drew, is playing and is waiting on. */
export interface DuelTally {
  win: number;
  loss: number;
  draw: number;
  live: number;
  wait: number;
}

/** The results between two players, from the first one's seat. */
export interface DuelResults {
  win: number;
  loss: number;
  draw: number;
}

/** Overdue open duels settled per read: more than a reader could leave behind in a day. */
const OVERDUE_BATCH = 50;

/** Invitations listed at most: more than a day's worth, since one lapses after a day. */
const INVITATIONS_LISTED = 10;

function playedBy(userId: string): Prisma.DuelWhereInput {
  return { OR: [{ challengerId: userId }, { opponentId: userId }] };
}

/** An invitation sent to the reader, still waiting on their answer. */
function invitationsTo(userId: string, now: Date): Prisma.DuelWhereInput {
  return { opponentId: userId, status: "PENDING", expiresAt: { gt: now } };
}

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

  /**
   * The reader's duels still open, in either direction: who they cannot
   * challenge again until it is over. Not capped like listFor, whose twenty
   * most recent could leave an older open duel out.
   */
  async listOpenFor(userId: string) {
    return prisma.duel.findMany({
      where: { status: { in: OPEN }, OR: [{ challengerId: userId }, { opponentId: userId }] },
      orderBy: { createdAt: "desc" },
      select: DUEL,
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

  /**
   * How many invitations wait on the reader's answer: the number beside
   * "Duels" in the site's sidebar. One past its time is not counted, as
   * recordFor leaves it out: it lapses when read.
   */
  async countInvitations(userId: string, now: Date): Promise<number> {
    return prisma.duel.count({ where: invitationsTo(userId, now) });
  },

  /**
   * The invitations waiting on the reader's answer, the one lapsing first
   * first: the dashboard's "Défis reçus".
   */
  async listInvitationsFor(userId: string, now: Date, take = INVITATIONS_LISTED) {
    return prisma.duel.findMany({
      where: invitationsTo(userId, now),
      orderBy: { expiresAt: "asc" },
      take,
      select: DUEL,
    });
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

  /**
   * The reader's open duels whose time is over: settled lazily (the service's
   * settle), so one nobody opened again stays PENDING or ACTIVE in the table.
   * The record reads them settled first.
   */
  async listOverdueFor(userId: string, now: Date) {
    return prisma.duel.findMany({
      where: { ...playedBy(userId), status: { in: OPEN }, expiresAt: { lte: now } },
      orderBy: { expiresAt: "asc" },
      take: OVERDUE_BATCH,
      select: DUEL,
    });
  },

  /**
   * Somebody's record over every duel they played, counted in the database:
   * the record used to be counted on the twenty duels a list shows. A pending
   * duel past its time counts for nothing, as it will once settled; an active
   * one past its time still counts as going on until it is settled.
   */
  async recordFor(userId: string, now: Date = new Date()): Promise<DuelTally> {
    const rows = await prisma.duel.groupBy({
      by: ["status", "winnerId"],
      where: {
        AND: [
          playedBy(userId),
          {
            OR: [
              { status: { in: ["FINISHED", "ACTIVE"] } },
              { status: "PENDING", expiresAt: { gt: now } },
            ],
          },
        ],
      },
      _count: { _all: true },
    });
    const tally: DuelTally = { win: 0, loss: 0, draw: 0, live: 0, wait: 0 };
    for (const row of rows) {
      const n = row._count._all;
      if (row.status === "ACTIVE") tally.live += n;
      else if (row.status === "PENDING") tally.wait += n;
      else if (row.status === "FINISHED") {
        if (row.winnerId === null) tally.draw += n;
        else if (row.winnerId === userId) tally.win += n;
        else tally.loss += n;
      }
    }
    return tally;
  },

  /** The finished duels between two players, from `one`'s seat. */
  async recordBetween(one: string, other: string): Promise<DuelResults> {
    const rows = await prisma.duel.groupBy({
      by: ["winnerId"],
      where: {
        status: "FINISHED",
        OR: [
          { challengerId: one, opponentId: other },
          { challengerId: other, opponentId: one },
        ],
      },
      _count: { _all: true },
    });
    const results: DuelResults = { win: 0, loss: 0, draw: 0 };
    for (const row of rows) {
      const n = row._count._all;
      if (row.winnerId === null) results.draw += n;
      else if (row.winnerId === one) results.win += n;
      else results.loss += n;
    }
    return results;
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
