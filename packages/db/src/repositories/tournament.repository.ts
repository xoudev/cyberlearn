import { Prisma, type TournamentTeamScope } from "@prisma/client";
import { prisma } from "../prisma.js";
import { LIVE_CLASS_FILTER } from "./class.repository.js";
import { readSlice, type ConsolePage, type ConsoleSlice } from "./console-page.js";

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

/**
 * A flag that still counts. A disqualified one keeps its row, so that the
 * player cannot score it again, but no scoreboard and no count reads it.
 */
const COUNTED_SOLVE = { disqualifiedAt: null } as const satisfies Prisma.TournamentSolveWhereInput;

/** The audit actions of the console's two gestures on a flag. */
export const TOURNAMENT_SOLVE_AUDIT_ACTION = {
  disqualify: "tournament.solve.disqualify",
  requalify: "tournament.solve.requalify",
} as const;

/** A flag's state in the console's list. */
export type ConsoleSolveStatus = "valid" | "disqualified";

export interface ConsoleSolveQuery extends ConsolePage {
  tournamentId: string;
  /** Part of a player's name, @pseudo or address, or of a challenge's title; empty for none. */
  q: string;
  status: ConsoleSolveStatus | undefined;
}

const CONSOLE_SOLVE_ROW = {
  id: true,
  points: true,
  solvedAt: true,
  disqualifiedAt: true,
  disqualifiedReason: true,
  userId: true,
  user: { select: { username: true, displayName: true } },
  challenge: { select: { title: true } },
  class: { select: { name: true } },
  disqualifiedBy: { select: { username: true, displayName: true } },
} as const satisfies Prisma.TournamentSolveSelect;

export type ConsoleSolveRow = Prisma.TournamentSolveGetPayload<{
  select: typeof CONSOLE_SOLVE_ROW;
}>;

/** Why the console's gesture on a flag wrote nothing. */
export type SolveDecisionResult =
  | { ok: true }
  | { ok: false; reason: "NOT_FOUND" | "ALREADY_DISQUALIFIED" | "NOT_DISQUALIFIED" };

/** The flags a console search matches: each filter its own term of an AND. */
export function consoleSolveWhere(query: ConsoleSolveQuery): Prisma.TournamentSolveWhereInput {
  const terms: Prisma.TournamentSolveWhereInput[] = [{ tournamentId: query.tournamentId }];
  if (query.status === "valid") terms.push(COUNTED_SOLVE);
  if (query.status === "disqualified") terms.push({ disqualifiedAt: { not: null } });
  const q = query.q.trim().replace(/^@/u, "");
  if (q !== "") {
    terms.push({
      OR: [
        { user: { is: { username: { contains: q, mode: "insensitive" } } } },
        { user: { is: { displayName: { contains: q, mode: "insensitive" } } } },
        { user: { is: { email: { contains: q, mode: "insensitive" } } } },
        { challenge: { title: { contains: q, mode: "insensitive" } } },
      ],
    });
  }
  return { AND: terms };
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

  /**
   * Every flag found in the tournament that still counts, the first first,
   * with who found it. The site and the app build their scoreboards on it, so
   * a flag the console disqualified leaves both at once.
   */
  async listSolves(tournamentId: string) {
    return prisma.tournamentSolve.findMany({
      where: { tournamentId, ...COUNTED_SOLVE },
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

  /**
   * Whether this player already found this flag here. A disqualified flag
   * counts: the console took it back, and submitting it again must not score
   * it again.
   */
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
        _count: { select: { classes: true, challenges: true, solves: { where: COUNTED_SOLVE } } },
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
        _count: { select: { solves: { where: COUNTED_SOLVE } } },
      },
    });
  },

  /**
   * One page of a tournament's flags for the console, the latest first, the
   * disqualified ones included: the list is where they are taken back and
   * put back.
   */
  async listSolvesForConsole(query: ConsoleSolveQuery): Promise<ConsoleSlice<ConsoleSolveRow>> {
    const where = consoleSolveWhere(query);
    return readSlice(
      query,
      () => prisma.tournamentSolve.count({ where }),
      ({ skip, take }) =>
        prisma.tournamentSolve.findMany({
          where,
          // The id settles flags found in the same millisecond, so a row never
          // shows on two pages.
          orderBy: [{ solvedAt: "desc" }, { id: "desc" }],
          skip,
          take,
          select: CONSOLE_SOLVE_ROW,
        }),
    );
  },

  /** How many flags of the tournament the console disqualified. */
  async countDisqualified(tournamentId: string): Promise<number> {
    return prisma.tournamentSolve.count({
      where: { tournamentId, disqualifiedAt: { not: null } },
    });
  },

  /**
   * Takes a flag back: it stays recorded, scores for nobody, and the gesture
   * is written to the audit log in the same transaction. Written only on a
   * flag that still counts, in the statement itself, so a second click, or a
   * second administrator on the same row, changes nothing and says so.
   */
  async disqualifySolve(input: {
    tournamentId: string;
    solveId: string;
    actorId: string;
    reason: string;
    now: Date;
  }): Promise<SolveDecisionResult> {
    return prisma.$transaction(async (tx): Promise<SolveDecisionResult> => {
      const written = await tx.tournamentSolve.updateMany({
        where: { id: input.solveId, tournamentId: input.tournamentId, ...COUNTED_SOLVE },
        data: {
          disqualifiedAt: input.now,
          disqualifiedById: input.actorId,
          disqualifiedReason: input.reason,
        },
      });
      const solve = await tx.tournamentSolve.findFirst({
        where: { id: input.solveId, tournamentId: input.tournamentId },
        select: { challengeId: true, userId: true, classId: true, points: true },
      });
      if (solve === null) return { ok: false, reason: "NOT_FOUND" };
      if (written.count === 0) return { ok: false, reason: "ALREADY_DISQUALIFIED" };
      await tx.auditLog.create({
        data: {
          actorId: input.actorId,
          action: TOURNAMENT_SOLVE_AUDIT_ACTION.disqualify,
          targetType: "TournamentSolve",
          targetId: input.solveId,
          metadata: { tournamentId: input.tournamentId, ...solve, reason: input.reason },
        },
      });
      return { ok: true };
    });
  },

  /**
   * Puts a disqualified flag back, for a disqualification made in error: it
   * counts again, at the time it was found. Traced, with the reason it clears.
   */
  async requalifySolve(input: {
    tournamentId: string;
    solveId: string;
    actorId: string;
  }): Promise<SolveDecisionResult> {
    return prisma.$transaction(async (tx): Promise<SolveDecisionResult> => {
      const before = await tx.tournamentSolve.findFirst({
        where: { id: input.solveId, tournamentId: input.tournamentId },
        select: {
          challengeId: true,
          userId: true,
          classId: true,
          points: true,
          disqualifiedReason: true,
        },
      });
      if (before === null) return { ok: false, reason: "NOT_FOUND" };
      const written = await tx.tournamentSolve.updateMany({
        where: {
          id: input.solveId,
          tournamentId: input.tournamentId,
          disqualifiedAt: { not: null },
        },
        data: { disqualifiedAt: null, disqualifiedById: null, disqualifiedReason: null },
      });
      if (written.count === 0) return { ok: false, reason: "NOT_DISQUALIFIED" };
      const { disqualifiedReason, ...solve } = before;
      await tx.auditLog.create({
        data: {
          actorId: input.actorId,
          action: TOURNAMENT_SOLVE_AUDIT_ACTION.requalify,
          targetType: "TournamentSolve",
          targetId: input.solveId,
          metadata: {
            tournamentId: input.tournamentId,
            ...solve,
            clearedReason: disqualifiedReason,
          },
        },
      });
      return { ok: true };
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
