/**
 * Taking a tournament flag back from the console: the list it is done from,
 * the scoreboards that stop counting it, and the two gestures, written once
 * each with their audit row in the same transaction. Prisma is mocked: what
 * this checks is the query each call turns into.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  consoleSolveWhere,
  TOURNAMENT_SOLVE_AUDIT_ACTION,
  tournamentRepository,
} from "../repositories/tournament.repository.js";

const { tx, mockPrisma } = vi.hoisted(() => {
  const tx = {
    tournamentSolve: { updateMany: vi.fn(), findFirst: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  return {
    tx,
    mockPrisma: {
      $transaction: vi.fn((run: (client: typeof tx) => Promise<unknown>) => run(tx)),
      tournamentSolve: { count: vi.fn(), findMany: vi.fn() },
      tournament: { findMany: vi.fn(), findUnique: vi.fn() },
    },
  };
});

vi.mock("../prisma.js", () => ({ prisma: mockPrisma }));

const T = "11111111-1111-4111-8111-111111111111";
const SOLVE = "22222222-2222-4222-8222-222222222222";
const ADMIN = "33333333-3333-4333-8333-333333333333";
const PLAYER = "44444444-4444-4444-8444-444444444444";
const CHALLENGE = "55555555-5555-4555-8555-555555555555";
const CLASS = "66666666-6666-4666-8666-666666666666";
const NOW = new Date("2026-10-17T09:00:00Z");
const SOLVE_ROW = { challengeId: CHALLENGE, userId: PLAYER, classId: CLASS, points: 200 };

function firstArg(fn: { mock: { calls: unknown[][] } }): Record<string, unknown> {
  const arg = fn.mock.calls[0]?.[0];
  if (typeof arg !== "object" || arg === null) throw new Error("not called with an object");
  return { ...arg };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.tournamentSolve.findMany.mockResolvedValue([]);
  tx.auditLog.create.mockResolvedValue({});
});

describe("consoleSolveWhere", () => {
  const base = { tournamentId: T, q: "", status: undefined, page: 1, pageSize: 25 };

  it("keeps to the tournament with no filter", () => {
    expect(consoleSolveWhere(base)).toEqual({ AND: [{ tournamentId: T }] });
  });

  it("tells the flags that count from the ones taken back", () => {
    expect(consoleSolveWhere({ ...base, status: "valid" })).toEqual({
      AND: [{ tournamentId: T }, { disqualifiedAt: null }],
    });
    expect(consoleSolveWhere({ ...base, status: "disqualified" })).toEqual({
      AND: [{ tournamentId: T }, { disqualifiedAt: { not: null } }],
    });
  });

  it("searches the player and the challenge, without the @", () => {
    expect(consoleSolveWhere({ ...base, q: " @camille " })).toEqual({
      AND: [
        { tournamentId: T },
        {
          OR: [
            { user: { is: { username: { contains: "camille", mode: "insensitive" } } } },
            { user: { is: { displayName: { contains: "camille", mode: "insensitive" } } } },
            { user: { is: { email: { contains: "camille", mode: "insensitive" } } } },
            { challenge: { title: { contains: "camille", mode: "insensitive" } } },
          ],
        },
      ],
    });
  });
});

describe("tournamentRepository.listSolves", () => {
  it("leaves the disqualified flags out of the scoreboards", async () => {
    await tournamentRepository.listSolves(T);
    expect(firstArg(mockPrisma.tournamentSolve.findMany)).toMatchObject({
      where: { tournamentId: T, disqualifiedAt: null },
    });
  });

  it("still counts a disqualified flag as found, so it cannot score twice", async () => {
    mockPrisma.tournamentSolve.count.mockResolvedValue(1);
    expect(await tournamentRepository.hasSolved(T, CHALLENGE, PLAYER)).toBe(true);
    expect(firstArg(mockPrisma.tournamentSolve.count)).toEqual({
      where: { tournamentId: T, challengeId: CHALLENGE, userId: PLAYER },
    });
  });
});

describe("tournamentRepository.listSolvesForConsole", () => {
  it("reads one page, the latest flag first, the disqualified ones included", async () => {
    mockPrisma.tournamentSolve.count.mockResolvedValue(30);
    const slice = await tournamentRepository.listSolvesForConsole({
      tournamentId: T,
      q: "",
      status: undefined,
      page: 2,
      pageSize: 25,
    });
    expect(slice.page).toBe(2);
    expect(firstArg(mockPrisma.tournamentSolve.findMany)).toMatchObject({
      where: { AND: [{ tournamentId: T }] },
      orderBy: [{ solvedAt: "desc" }, { id: "desc" }],
      skip: 25,
      take: 25,
    });
  });
});

describe("tournamentRepository.disqualifySolve", () => {
  const input = {
    tournamentId: T,
    solveId: SOLVE,
    actorId: ADMIN,
    reason: "Flag partagé",
    now: NOW,
  };

  it("marks a flag that counts, and writes the gesture to the audit log", async () => {
    tx.tournamentSolve.updateMany.mockResolvedValue({ count: 1 });
    tx.tournamentSolve.findFirst.mockResolvedValue(SOLVE_ROW);

    expect(await tournamentRepository.disqualifySolve(input)).toEqual({ ok: true });
    expect(firstArg(tx.tournamentSolve.updateMany)).toEqual({
      where: { id: SOLVE, tournamentId: T, disqualifiedAt: null },
      data: { disqualifiedAt: NOW, disqualifiedById: ADMIN, disqualifiedReason: "Flag partagé" },
    });
    expect(firstArg(tx.auditLog.create)).toEqual({
      data: {
        actorId: ADMIN,
        action: TOURNAMENT_SOLVE_AUDIT_ACTION.disqualify,
        targetType: "TournamentSolve",
        targetId: SOLVE,
        metadata: { tournamentId: T, ...SOLVE_ROW, reason: "Flag partagé" },
      },
    });
  });

  it("writes nothing on a flag already taken back, and says so", async () => {
    tx.tournamentSolve.updateMany.mockResolvedValue({ count: 0 });
    tx.tournamentSolve.findFirst.mockResolvedValue(SOLVE_ROW);

    expect(await tournamentRepository.disqualifySolve(input)).toEqual({
      ok: false,
      reason: "ALREADY_DISQUALIFIED",
    });
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("refuses a flag of another tournament as one that does not exist", async () => {
    tx.tournamentSolve.updateMany.mockResolvedValue({ count: 0 });
    tx.tournamentSolve.findFirst.mockResolvedValue(null);

    expect(await tournamentRepository.disqualifySolve(input)).toEqual({
      ok: false,
      reason: "NOT_FOUND",
    });
    expect(firstArg(tx.tournamentSolve.findFirst)).toMatchObject({
      where: { id: SOLVE, tournamentId: T },
    });
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
});

describe("tournamentRepository.requalifySolve", () => {
  const input = { tournamentId: T, solveId: SOLVE, actorId: ADMIN };

  it("puts a disqualified flag back, tracing the reason it clears", async () => {
    tx.tournamentSolve.findFirst.mockResolvedValue({
      ...SOLVE_ROW,
      disqualifiedReason: "Flag partagé",
    });
    tx.tournamentSolve.updateMany.mockResolvedValue({ count: 1 });

    expect(await tournamentRepository.requalifySolve(input)).toEqual({ ok: true });
    expect(firstArg(tx.tournamentSolve.updateMany)).toEqual({
      where: { id: SOLVE, tournamentId: T, disqualifiedAt: { not: null } },
      data: { disqualifiedAt: null, disqualifiedById: null, disqualifiedReason: null },
    });
    expect(firstArg(tx.auditLog.create)).toEqual({
      data: {
        actorId: ADMIN,
        action: TOURNAMENT_SOLVE_AUDIT_ACTION.requalify,
        targetType: "TournamentSolve",
        targetId: SOLVE,
        metadata: { tournamentId: T, ...SOLVE_ROW, clearedReason: "Flag partagé" },
      },
    });
  });

  it("writes nothing on a flag that still counts", async () => {
    tx.tournamentSolve.findFirst.mockResolvedValue({ ...SOLVE_ROW, disqualifiedReason: null });
    tx.tournamentSolve.updateMany.mockResolvedValue({ count: 0 });

    expect(await tournamentRepository.requalifySolve(input)).toEqual({
      ok: false,
      reason: "NOT_DISQUALIFIED",
    });
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("refuses a flag that does not exist", async () => {
    tx.tournamentSolve.findFirst.mockResolvedValue(null);
    expect(await tournamentRepository.requalifySolve(input)).toEqual({
      ok: false,
      reason: "NOT_FOUND",
    });
    expect(tx.tournamentSolve.updateMany).not.toHaveBeenCalled();
  });
});
