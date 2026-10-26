/**
 * A learner's settings, saved from the page that changes them. Prisma is
 * mocked: what this checks is that a save writes the columns it was given,
 * only those, and that a missing row is created rather than refused.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { preferencesRepository } from "../repositories/preferences.repository.js";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: { userPreferences: { upsert: vi.fn() } },
}));

vi.mock("../prisma.js", () => ({ prisma: mockPrisma }));

const USER = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.userPreferences.upsert.mockResolvedValue({});
});

describe("preferencesRepository.save", () => {
  it("writes the whole state a form sends, creating the row if it is missing", async () => {
    await preferencesRepository.save(USER, {
      leaderboardVisibility: "HIDDEN",
      publicProfile: false,
      friendsLeaderboard: true,
    });

    expect(mockPrisma.userPreferences.upsert).toHaveBeenCalledExactlyOnceWith({
      where: { userId: USER },
      create: {
        userId: USER,
        leaderboardVisibility: "HIDDEN",
        publicProfile: false,
        friendsLeaderboard: true,
      },
      update: { leaderboardVisibility: "HIDDEN", publicProfile: false, friendsLeaderboard: true },
    });
  });

  it("writes one column and leaves the others as they are", async () => {
    // A switch that sent the whole state it read when the page loaded would
    // put back whatever was changed since in another tab.
    await preferencesRepository.save(USER, { friendsLeaderboard: false });

    expect(mockPrisma.userPreferences.upsert).toHaveBeenCalledExactlyOnceWith({
      where: { userId: USER },
      create: { userId: USER, friendsLeaderboard: false },
      update: { friendsLeaderboard: false },
    });
  });
});
