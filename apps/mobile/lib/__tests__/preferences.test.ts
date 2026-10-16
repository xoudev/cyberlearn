import { describe, expect, it } from "vitest";
import { undoSettingChange } from "../preferences";

/**
 * A setting whose write failed goes back to what was shown before the change.
 * It used to be refetched instead: offline, the refetch failed like the write,
 * and the screen showed the defaults, « Anonyme » and a public profile, a
 * privacy setting the reader had never chosen.
 */

interface Settings {
  leaderboardVisibility: "HIDDEN" | "ANONYMOUS" | "PUBLIC";
  publicProfile: boolean;
  friendsLeaderboard: boolean;
}

const BEFORE: Settings = {
  leaderboardVisibility: "PUBLIC",
  publicProfile: false,
  friendsLeaderboard: true,
};

describe("undoSettingChange", () => {
  it("puts back the visibility the reader had, not the default", () => {
    const optimistic: Settings = { ...BEFORE, leaderboardVisibility: "HIDDEN" };
    expect(undoSettingChange(optimistic, BEFORE, "leaderboardVisibility")).toEqual(BEFORE);
  });

  it("puts back a switch and leaves the other settings as they are", () => {
    const optimistic: Settings = { ...BEFORE, publicProfile: true };
    expect(undoSettingChange(optimistic, BEFORE, "publicProfile")).toEqual({
      leaderboardVisibility: "PUBLIC",
      publicProfile: false,
      friendsLeaderboard: true,
    });
  });

  it("keeps a setting changed meanwhile, which has its own write", () => {
    // The profile switch failed; the friends switch, flipped after it, did not.
    const now: Settings = { ...BEFORE, publicProfile: true, friendsLeaderboard: false };
    expect(undoSettingChange(now, BEFORE, "publicProfile")).toEqual({
      leaderboardVisibility: "PUBLIC",
      publicProfile: false,
      friendsLeaderboard: false,
    });
  });

  it("does not change the settings it is given", () => {
    const optimistic: Settings = { ...BEFORE, publicProfile: true };
    undoSettingChange(optimistic, BEFORE, "publicProfile");
    expect(optimistic.publicProfile).toBe(true);
  });
});
