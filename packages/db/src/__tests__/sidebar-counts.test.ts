/**
 * What the site's sidebar and dashboard ask of the duels and the classes:
 * the invitations waiting on the reader, and whether they have a live class.
 * Prisma is mocked; what is checked is the question asked.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { classRepository, LIVE_CLASS_FILTER } from "../repositories/class.repository.js";
import { duelRepository } from "../repositories/duel.repository.js";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    duel: { count: vi.fn(), findMany: vi.fn() },
    class: { count: vi.fn() },
  },
}));

vi.mock("../prisma.js", () => ({ prisma: mockPrisma }));

const ME = "11111111-1111-4111-8111-111111111111";
const NOW = new Date("2026-10-17T12:00:00Z");
const WAITING_ON_ME = { opponentId: ME, status: "PENDING", expiresAt: { gt: NOW } };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("duelRepository.countInvitations", () => {
  it("counts the pending duels sent to the reader, a lapsed one left out", async () => {
    mockPrisma.duel.count.mockResolvedValue(2);
    expect(await duelRepository.countInvitations(ME, NOW)).toBe(2);
    expect(mockPrisma.duel.count).toHaveBeenCalledWith({ where: WAITING_ON_ME });
  });
});

describe("duelRepository.listInvitationsFor", () => {
  it("lists the same invitations, the one lapsing first first, a few at most", async () => {
    mockPrisma.duel.findMany.mockResolvedValue([]);
    await duelRepository.listInvitationsFor(ME, NOW);
    expect(mockPrisma.duel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: WAITING_ON_ME, orderBy: { expiresAt: "asc" }, take: 10 }),
    );
  });
});

describe("classRepository.hasLiveClass", () => {
  it("asks for a live class the reader teaches or is in", async () => {
    mockPrisma.class.count.mockResolvedValue(1);
    expect(await classRepository.hasLiveClass(ME)).toBe(true);
    expect(mockPrisma.class.count).toHaveBeenCalledWith({
      where: {
        ...LIVE_CLASS_FILTER,
        OR: [{ teachers: { some: { teacherId: ME } } }, { members: { some: { userId: ME } } }],
      },
    });
  });

  it("says no when there is none", async () => {
    mockPrisma.class.count.mockResolvedValue(0);
    expect(await classRepository.hasLiveClass(ME)).toBe(false);
  });
});
