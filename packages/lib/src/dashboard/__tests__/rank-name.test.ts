import { describe, expect, it } from "vitest";
import { nextRankName, rankName } from "../rank-name";

describe("rankName / nextRankName", () => {
  it.each([
    [1, "Novice", "Apprenti confirmé"],
    [4, "Novice", "Apprenti confirmé"],
    [5, "Apprenti confirmé", "Technicien"],
    [10, "Technicien", "Analyste"],
    [20, "Analyste", "Expert"],
    [35, "Expert", "Architecte"],
    [50, "Architecte", "Maître Cyber"],
    [69, "Architecte", "Maître Cyber"],
    [70, "Maître Cyber", "Légendaire"],
    [120, "Maître Cyber", "Légendaire"],
  ])("level %i is %s, and next comes %s", (level, current, next) => {
    expect(rankName(level)).toBe(current);
    expect(nextRankName(level)).toBe(next);
  });
});
