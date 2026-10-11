/**
 * friendshipRepository.friendIds: the ids of somebody's accepted friends,
 * which pages turn into a mark beside a name. Prisma is mocked.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { friendshipRepository } from "../repositories/friendship.repository.js";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: { friendship: { findMany: vi.fn() } },
}));

vi.mock("../prisma.js", () => ({ prisma: mockPrisma }));

const ME = "11111111-1111-4111-8111-111111111111";
const LOW = "00000000-0000-4000-8000-000000000000";
const HIGH = "99999999-9999-4999-8999-999999999999";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("friendIds", () => {
  it("reads accepted friendships only, and only the two ids", async () => {
    mockPrisma.friendship.findMany.mockResolvedValue([]);
    await friendshipRepository.friendIds(ME);
    expect(mockPrisma.friendship.findMany).toHaveBeenCalledWith({
      where: { status: "ACCEPTED", OR: [{ userAId: ME }, { userBId: ME }] },
      select: { userAId: true, userBId: true },
    });
  });

  it("returns the other side of each pair, whichever side the reader is stored on", async () => {
    // The pair is stored ordered: the reader is userB with a lower id, userA
    // with a higher one.
    mockPrisma.friendship.findMany.mockResolvedValue([
      { userAId: LOW, userBId: ME },
      { userAId: ME, userBId: HIGH },
    ]);
    const ids = await friendshipRepository.friendIds(ME);
    expect([...ids].sort()).toEqual([LOW, HIGH]);
    expect(ids.has(ME)).toBe(false);
  });

  it("is an empty set for somebody without friends", async () => {
    mockPrisma.friendship.findMany.mockResolvedValue([]);
    expect((await friendshipRepository.friendIds(ME)).size).toBe(0);
  });
});
