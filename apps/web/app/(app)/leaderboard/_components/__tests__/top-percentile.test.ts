import { describe, expect, it } from "vitest";
import { topPercentile } from "../LeaderboardClient";

describe("topPercentile", () => {
  it("no longer rounds a strong rank down to zero", () => {
    // 1/300 = 0.33%, which Math.round turned into "Top 0%".
    expect(topPercentile(1, 300)).toBe(1);
  });

  it("never announces more than 100%", () => {
    expect(topPercentile(50, 50)).toBe(100);
  });

  it("withholds a percentage on a board too small for one to mean anything", () => {
    // "Top 33%" for the leader of three said less than "1er sur 3".
    expect(topPercentile(1, 3)).toBeNull();
    expect(topPercentile(1, 19)).toBeNull();
  });

  it("starts reporting at the floor", () => {
    expect(topPercentile(1, 20)).toBe(5);
  });

  it("rounds up, so a rank never claims a better bracket than it holds", () => {
    // 11/200 = 5.5% - reporting 5% would overstate it.
    expect(topPercentile(11, 200)).toBe(6);
  });

  it("returns null rather than a nonsense value for an unranked user", () => {
    expect(topPercentile(0, 100)).toBeNull();
  });
});
