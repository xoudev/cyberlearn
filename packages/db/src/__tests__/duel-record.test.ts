/**
 * duelRepository.recordFor and recordBetween: a record counted in the
 * database over every duel, rather than over the twenty a list shows.
 * Prisma is mocked; what is checked is the question asked and how the
 * grouped rows are read back from the player's seat.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { duelRepository } from "../repositories/duel.repository.js";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: { duel: { groupBy: vi.fn(), findMany: vi.fn() } },
}));

vi.mock("../prisma.js", () => ({ prisma: mockPrisma }));

const ME = "11111111-1111-4111-8111-111111111111";
const FRIEND = "22222222-2222-4222-8222-222222222222";
const OTHER = "33333333-3333-4333-8333-333333333333";
const NOW = new Date("2026-10-17T12:00:00Z");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("recordFor", () => {
  it("reads wins, losses, draws and what is open from the player's seat", async () => {
    mockPrisma.duel.groupBy.mockResolvedValue([
      { status: "FINISHED", winnerId: ME, _count: { _all: 4 } },
      { status: "FINISHED", winnerId: FRIEND, _count: { _all: 2 } },
      { status: "FINISHED", winnerId: OTHER, _count: { _all: 1 } },
      { status: "FINISHED", winnerId: null, _count: { _all: 3 } },
      { status: "ACTIVE", winnerId: null, _count: { _all: 1 } },
      { status: "PENDING", winnerId: null, _count: { _all: 2 } },
    ]);

    expect(await duelRepository.recordFor(ME, NOW)).toEqual({
      win: 4,
      loss: 3,
      draw: 3,
      live: 1,
      wait: 2,
    });
  });

  it("asks for the player's duels only, a lapsed invitation left out", async () => {
    mockPrisma.duel.groupBy.mockResolvedValue([]);
    expect(await duelRepository.recordFor(ME, NOW)).toEqual({
      win: 0,
      loss: 0,
      draw: 0,
      live: 0,
      wait: 0,
    });
    expect(mockPrisma.duel.groupBy).toHaveBeenCalledWith({
      by: ["status", "winnerId"],
      where: {
        AND: [
          { OR: [{ challengerId: ME }, { opponentId: ME }] },
          {
            OR: [
              { status: { in: ["FINISHED", "ACTIVE"] } },
              { status: "PENDING", expiresAt: { gt: NOW } },
            ],
          },
        ],
      },
      _count: { _all: true },
    });
  });
});

describe("recordBetween", () => {
  it("counts the finished duels between the two, in either direction", async () => {
    mockPrisma.duel.groupBy.mockResolvedValue([
      { winnerId: ME, _count: { _all: 3 } },
      { winnerId: FRIEND, _count: { _all: 2 } },
      { winnerId: null, _count: { _all: 1 } },
    ]);

    expect(await duelRepository.recordBetween(ME, FRIEND)).toEqual({ win: 3, loss: 2, draw: 1 });
    expect(mockPrisma.duel.groupBy).toHaveBeenCalledWith({
      by: ["winnerId"],
      where: {
        status: "FINISHED",
        OR: [
          { challengerId: ME, opponentId: FRIEND },
          { challengerId: FRIEND, opponentId: ME },
        ],
      },
      _count: { _all: true },
    });
  });
});

describe("listOverdueFor", () => {
  it("finds the player's open duels whose time is over", async () => {
    mockPrisma.duel.findMany.mockResolvedValue([]);
    await duelRepository.listOverdueFor(ME, NOW);
    expect(mockPrisma.duel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [{ challengerId: ME }, { opponentId: ME }],
          status: { in: ["PENDING", "ACTIVE"] },
          expiresAt: { lte: NOW },
        },
      }),
    );
  });
});
