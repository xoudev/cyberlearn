import { Prisma, type TournamentTeamScope } from "@prisma/client";
import { prisma } from "../prisma.js";
import { LIVE_CLASS_FILTER } from "./class.repository.js";

/**
 * CTF tournaments between classes: the tournament rows, the classes and the
 * challenges they bring together, and the flags found. The rules (when it is
 * on, how teams and players rank) are @cyberlearn/lib/challenges/tournament;
 * the service is apps/web/lib/tournaments, the composing is the console's.
 *
 * Every read for a learner is scoped by their own classes, in the where
 * clause: Prisma connects as the table owner and bypasses RLS, so the policies
 * of 20261008180000_tournaments are the second line, not the first.
 */

const TEAM_CLASS = {
  select: {
    id: true,
    name: true,
    promotion: { select: { name: true, establishment: { select: { id: true, name: true } } } },
  },
} as const;

/** The challenge as a tournament page shows it: never its flag. */
const PLAYED_CHALLENGE = {
  id: true,
  slug: true,
  title: true,
  description: true,
  instructions: true,
  category: true,
  difficulty: true,
  type: true,
  machine: true,
  starterCode: true,
  attachmentUrl: true,
  resourceUrl: true,
} as const;

/** Where a learner, or a teacher, stands in a tournament's classes. */
function inTournament(tournamentId: string) {
  return { tournaments: { some: { tournamentId } } };
}

export const tournamentRepository = {
  /**
   * The tournaments a user is part of, through a class they belong to or teach
   * (all of them for an admin), the latest first.
   */
  async listVisibleTo(userId: string, isAdmin: boolean, take = 30) {
    return prisma.tournament.findMany({
      where: isAdmin
        ? {}
        : {
            classes: {
              some: {
                class: {
                  OR: [
                    { members: { some: { userId } } },
                    { teachers: { some: { teacherId: userId } } },
                  ],
                },
              },
            },
          },
      orderBy: { startsAt: "desc" },
      take,
      select: {
        id: true,
        title: true,
        startsAt: true,
        endsAt: true,
        teamScope: true,
        _count: { select: { classes: true, challenges: true } },
      },
    });
  },

  /** A tournament with its classes and its challenges, in their order. */
  async findById(id: string) {
    return prisma.tournament.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        startsAt: true,
        endsAt: true,
        teamScope: true,
        classes: { select: { class: TEAM_CLASS } },
        challenges: {
          orderBy: [{ orderIndex: "asc" }, { challengeId: "asc" }],
          select: {
            points: true,
            challenge: {
              select: {
                id: true,
                slug: true,
                title: true,
                category: true,
                difficulty: true,
                type: true,
              },
            },
          },
        },
      },
    });
  },

  /**
   * How a user takes part: the classes of the tournament they belong to (any,
   * to read it; live ones, to play), and whether they teach one of them.
   */
  async accessOf(tournamentId: string, userId: string) {
    const [memberships, liveMemberships, teaches] = await Promise.all([
      prisma.classMember.count({ where: { userId, class: inTournament(tournamentId) } }),
      prisma.classMember.findMany({
        where: { userId, class: { ...LIVE_CLASS_FILTER, ...inTournament(tournamentId) } },
        select: { classId: true, joinedAt: true },
      }),
      prisma.classTeacher.count({
        where: { teacherId: userId, class: inTournament(tournamentId) },
      }),
    ]);
    return { isMember: memberships > 0, liveMemberships, teaches: teaches > 0 };
  },

  /** Every flag found in the tournament, the first first, with who found it. */
  async listSolves(tournamentId: string) {
    return prisma.tournamentSolve.findMany({
      where: { tournamentId },
      orderBy: [{ solvedAt: "asc" }, { id: "asc" }],
      select: {
        challengeId: true,
        userId: true,
        classId: true,
        points: true,
        solvedAt: true,
        user: {
          select: {
            displayName: true,
            username: true,
            preferences: { select: { leaderboardVisibility: true, publicProfile: true } },
          },
        },
      },
    });
  },

  /** One challenge of the tournament, by its slug, as its page shows it. */
  async findChallenge(tournamentId: string, slug: string) {
    return prisma.tournamentChallenge.findFirst({
      where: { tournamentId, challenge: { slug } },
      select: { points: true, challenge: { select: PLAYED_CHALLENGE } },
    });
  },

  /** What checking a flag needs: the expected one, or the machine that makes it. */
  async findChallengeForFlag(tournamentId: string, challengeId: string) {
    return prisma.tournamentChallenge.findUnique({
      where: { tournamentId_challengeId: { tournamentId, challengeId } },
      select: {
        points: true,
        challenge: { select: { id: true, type: true, flag: true, machine: true } },
      },
    });
  },

  /** Whether this player already found this flag here. */
  async hasSolved(tournamentId: string, challengeId: string, userId: string): Promise<boolean> {
    const count = await prisma.tournamentSolve.count({
      where: { tournamentId, challengeId, userId },
    });
    return count > 0;
  },

  /** Records a flag found; false when this player had already found it. */
  async recordSolve(input: {
    tournamentId: string;
    challengeId: string;
    userId: string;
    classId: string;
    points: number;
    solvedAt: Date;
  }): Promise<boolean> {
    try {
      await prisma.tournamentSolve.create({ data: input });
      return true;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return false;
      throw err;
    }
  },

  // ── The console ──────────────────────────────────────────────────────────

  /** Every tournament, the latest first, with what it holds. */
  async listAll() {
    return prisma.tournament.findMany({
      orderBy: { startsAt: "desc" },
      select: {
        id: true,
        title: true,
        startsAt: true,
        endsAt: true,
        teamScope: true,
        _count: { select: { classes: true, challenges: true, solves: true } },
      },
    });
  },

  /** A tournament as the console edits it. */
  async findForConsole(id: string) {
    return prisma.tournament.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        startsAt: true,
        endsAt: true,
        teamScope: true,
        classes: { select: { classId: true } },
        challenges: {
          orderBy: [{ orderIndex: "asc" }, { challengeId: "asc" }],
          select: { challengeId: true, points: true },
        },
        _count: { select: { solves: true } },
      },
    });
  },

  async create(input: {
    title: string;
    description: string;
    startsAt: Date;
    endsAt: Date;
    teamScope: TournamentTeamScope;
    createdById: string;
    classIds: string[];
    challenges: { challengeId: string; points: number }[];
  }) {
    return prisma.tournament.create({
      data: {
        title: input.title,
        description: input.description,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        teamScope: input.teamScope,
        createdById: input.createdById,
        classes: { createMany: { data: input.classIds.map((classId) => ({ classId })) } },
        challenges: {
          createMany: {
            data: input.challenges.map((c, orderIndex) => ({ ...c, orderIndex })),
          },
        },
      },
      select: { id: true },
    });
  },

  /**
   * Edits a tournament. The classes and the challenges are replaced only when
   * given: the console gives them before the start, never after, when the
   * scores already rest on them.
   */
  async update(
    id: string,
    input: {
      title: string;
      description: string;
      startsAt: Date;
      endsAt: Date;
      teamScope?: TournamentTeamScope;
      classIds?: string[];
      challenges?: { challengeId: string; points: number }[];
    },
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.tournament.update({
        where: { id },
        data: {
          title: input.title,
          description: input.description,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          ...(input.teamScope === undefined ? {} : { teamScope: input.teamScope }),
        },
      });
      if (input.classIds !== undefined) {
        await tx.tournamentClass.deleteMany({
          where: { tournamentId: id, classId: { notIn: input.classIds } },
        });
        await tx.tournamentClass.createMany({
          data: input.classIds.map((classId) => ({ tournamentId: id, classId })),
          skipDuplicates: true,
        });
      }
      if (input.challenges !== undefined) {
        await tx.tournamentChallenge.deleteMany({ where: { tournamentId: id } });
        await tx.tournamentChallenge.createMany({
          data: input.challenges.map((c, orderIndex) => ({ ...c, tournamentId: id, orderIndex })),
        });
      }
    });
  },

  /** Deletes a tournament that has not started: false once it has. */
  async deleteUpcoming(id: string, now: Date): Promise<boolean> {
    const { count } = await prisma.tournament.deleteMany({ where: { id, startsAt: { gt: now } } });
    return count === 1;
  },

  /** Ends a running tournament now: false when it is not running. */
  async endNow(id: string, now: Date): Promise<boolean> {
    const { count } = await prisma.tournament.updateMany({
      where: { id, startsAt: { lte: now }, endsAt: { gt: now } },
      data: { endsAt: now },
    });
    return count === 1;
  },

  /** The members of these classes, still live, each once: who a tournament is announced to. */
  async membersOf(classIds: string[]): Promise<string[]> {
    if (classIds.length === 0) return [];
    const rows = await prisma.classMember.findMany({
      where: { classId: { in: classIds }, class: LIVE_CLASS_FILTER },
      distinct: ["userId"],
      select: { userId: true },
    });
    return rows.map((r) => r.userId);
  },

  /**
   * For each challenge, how many members of these classes already solved it in
   * the catalogue: a head start the console shows before the tournament opens.
   */
  async catalogueSolvesAmong(challengeIds: string[], classIds: string[]) {
    if (challengeIds.length === 0 || classIds.length === 0) return new Map<string, number>();
    const rows = await prisma.userChallengeProgress.groupBy({
      by: ["challengeId"],
      where: {
        challengeId: { in: challengeIds },
        status: "COMPLETED",
        user: { classMemberships: { some: { classId: { in: classIds } } } },
      },
      _count: { _all: true },
    });
    return new Map(rows.map((r) => [r.challengeId, r._count._all]));
  },

  /** Whether a challenge served in any tournament: then it cannot be deleted. */
  async isUsed(challengeId: string): Promise<boolean> {
    const count = await prisma.tournamentChallenge.count({ where: { challengeId } });
    return count > 0;
  },
};
