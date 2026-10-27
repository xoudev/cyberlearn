import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The nightly pass that gives the badges of a place on a tournament's board:
 * the players of the tournaments ended in the last seven days, each evaluated
 * on its own, one failure leaving the others their badges.
 */

const m = vi.hoisted(() => ({
  playersOfEndedBetween: vi.fn<(from: Date, to: Date) => Promise<string[]>>(),
  evaluateAndAwardBadges:
    vi.fn<
      (
        userId: string,
        types: readonly string[],
        context: Record<string, string>,
      ) => Promise<{ awarded: { id: string }[]; xpGained: number }>
    >(),
  error: vi.fn(),
}));

vi.mock("@cyberlearn/db", () => ({
  tournamentRepository: { playersOfEndedBetween: m.playersOfEndedBetween },
}));
vi.mock("@cyberlearn/lib/logger", () => ({
  logger: { error: m.error },
  errorMessage: (err: unknown) => (err instanceof Error ? err.message : String(err)),
}));
vi.mock("@/lib/badges/award", () => ({ evaluateAndAwardBadges: m.evaluateAndAwardBadges }));

const { awardTournamentPlaces, TOURNAMENT_BADGE_LOOKBACK_MS } = await import("../badges");

const NOW = new Date("2026-10-27T02:00:00Z");

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
});

describe("awardTournamentPlaces", () => {
  it("looks at the tournaments ended in the last seven days", async () => {
    m.playersOfEndedBetween.mockResolvedValue([]);
    expect(await awardTournamentPlaces(NOW)).toEqual({ players: 0, awarded: 0, failed: 0 });
    expect(m.playersOfEndedBetween).toHaveBeenCalledWith(
      new Date(NOW.getTime() - TOURNAMENT_BADGE_LOOKBACK_MS),
      NOW,
    );
  });

  it("evaluates the place badges of each player, and counts what was given", async () => {
    m.playersOfEndedBetween.mockResolvedValue(["ana", "leo"]);
    m.evaluateAndAwardBadges
      .mockResolvedValueOnce({ awarded: [{ id: "podium" }, { id: "champion" }], xpGained: 300 })
      .mockResolvedValueOnce({ awarded: [], xpGained: 0 });
    expect(await awardTournamentPlaces(NOW)).toEqual({ players: 2, awarded: 2, failed: 0 });
    expect(m.evaluateAndAwardBadges).toHaveBeenCalledWith("ana", ["TOURNAMENT_RANK"], {
      source: "tournament",
    });
    expect(m.evaluateAndAwardBadges).toHaveBeenCalledWith("leo", ["TOURNAMENT_RANK"], {
      source: "tournament",
    });
  });

  it("goes on past a player whose badges could not be given", async () => {
    m.playersOfEndedBetween.mockResolvedValue(["ana", "leo"]);
    m.evaluateAndAwardBadges
      .mockRejectedValueOnce(new Error("connection lost"))
      .mockResolvedValueOnce({ awarded: [{ id: "podium" }], xpGained: 150 });
    expect(await awardTournamentPlaces(NOW)).toEqual({ players: 2, awarded: 1, failed: 1 });
    expect(m.error).toHaveBeenCalledTimes(1);
  });
});
