/**
 * userRepository.profilesOpenTo: which names on a page may link to a profile.
 * The rule is findPublicProfile's (public, one's own, or an accepted friend's),
 * so a link never lands on the 404 a closed profile gives. Prisma is mocked.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { userRepository } from "../repositories/user.repository.js";

// Hoisted above the import: the repository reads the mocked client.
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    user: { findMany: vi.fn() },
    friendship: { findMany: vi.fn() },
  },
}));

vi.mock("../prisma.js", () => ({ prisma: mockPrisma }));

const ME = "11111111-1111-4111-8111-111111111111";
const OPEN = "22222222-2222-4222-8222-222222222222";
const FRIEND = "33333333-3333-4333-8333-333333333333";
const STRANGER = "44444444-4444-4444-8444-444444444444";
const NO_PREFS = "55555555-5555-4555-8555-555555555555";

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.friendship.findMany.mockResolvedValue([]);
});

describe("profilesOpenTo", () => {
  it("opens public profiles, the reader's own, and a friend's private one", async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      { id: ME, preferences: { publicProfile: false } },
      { id: OPEN, preferences: { publicProfile: true } },
      { id: FRIEND, preferences: { publicProfile: false } },
      { id: STRANGER, preferences: { publicProfile: false } },
      // No preferences row yet: the default, a public profile.
      { id: NO_PREFS, preferences: null },
    ]);
    // Stored as an ordered pair: the friend may sit on either side.
    mockPrisma.friendship.findMany.mockResolvedValue([{ userAId: ME, userBId: FRIEND }]);

    const open = await userRepository.profilesOpenTo(ME, [ME, OPEN, FRIEND, STRANGER, NO_PREFS]);

    expect([...open].sort()).toEqual([ME, OPEN, FRIEND, NO_PREFS].sort());
    // The friendships asked about are the closed profiles' only.
    expect(mockPrisma.friendship.findMany).toHaveBeenCalledWith({
      where: {
        status: "ACCEPTED",
        OR: [
          { userAId: ME, userBId: { in: [FRIEND, STRANGER] } },
          { userBId: ME, userAId: { in: [FRIEND, STRANGER] } },
        ],
      },
      select: { userAId: true, userBId: true },
    });
  });

  it("reads each person once, and skips the friendships when nobody is private", async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      { id: OPEN, preferences: { publicProfile: true } },
    ]);

    const open = await userRepository.profilesOpenTo(ME, [OPEN, OPEN, OPEN]);

    expect([...open]).toEqual([OPEN]);
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
      where: { id: { in: [OPEN] }, username: { not: null } },
      select: { id: true, preferences: { select: { publicProfile: true } } },
    });
    expect(mockPrisma.friendship.findMany).not.toHaveBeenCalled();
  });

  it("asks nothing for a page with nobody on it", async () => {
    const open = await userRepository.profilesOpenTo(ME, []);
    expect(open.size).toBe(0);
    expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
  });
});
