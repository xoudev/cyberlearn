import { describe, expect, it } from "vitest";
import {
  challengeXp,
  remainingLabel,
  WEEKLY_XP_MULTIPLIER,
  weekEnd,
  weekIndex,
  weeklyChallengeId,
} from "./weekly";

const IDS = ["journal", "dossier", "sauvegarde"];

describe("the week", () => {
  it("starts on Monday at midnight UTC", () => {
    const sunday = new Date("2026-10-11T23:59:59.999Z");
    const monday = new Date("2026-10-12T00:00:00.000Z");
    expect(weekIndex(monday)).toBe(weekIndex(sunday) + 1);
    expect(weekIndex(new Date("2026-10-06T10:00:00Z"))).toBe(weekIndex(sunday));
  });

  it("ends on the next Monday at midnight UTC", () => {
    expect(weekEnd(new Date("2026-10-06T10:00:00Z")).toISOString()).toBe(
      "2026-10-12T00:00:00.000Z",
    );
    expect(weekEnd(new Date("2026-10-12T00:00:00Z")).toISOString()).toBe(
      "2026-10-19T00:00:00.000Z",
    );
  });
});

describe("weeklyChallengeId", () => {
  it("is the same all week, for everybody", () => {
    const tuesday = weeklyChallengeId(IDS, new Date("2026-10-06T08:00:00Z"));
    const sunday = weeklyChallengeId(IDS, new Date("2026-10-11T22:00:00Z"));
    expect(tuesday).toBe(sunday);
  });

  it("gives each challenge its turn, in catalogue order", () => {
    const weeks = [0, 1, 2, 3].map((n) =>
      weeklyChallengeId(IDS, new Date(Date.UTC(2026, 9, 6 + 7 * n, 12))),
    );
    expect(new Set(weeks.slice(0, 3)).size).toBe(3);
    expect(weeks[3]).toBe(weeks[0]);
    const first = IDS.indexOf(weeks[0] ?? "");
    expect(weeks[1]).toBe(IDS[(first + 1) % 3]);
  });

  it("has nothing to pick from an empty catalogue", () => {
    expect(weeklyChallengeId([], new Date())).toBeNull();
  });
});

describe("challengeXp", () => {
  it("doubles the reward for the week's challenge only", () => {
    expect(WEEKLY_XP_MULTIPLIER).toBe(2);
    expect(challengeXp(75, true)).toBe(150);
    expect(challengeXp(75, false)).toBe(75);
  });
});

describe("remainingLabel", () => {
  it("says what is left in its two largest units", () => {
    const s = 1000;
    expect(remainingLabel(((5 * 24 + 11) * 3600 + 59 * 60) * s)).toBe("5 j 11 h");
    expect(remainingLabel((3 * 3600 + 7 * 60 + 30) * s)).toBe("3 h 07 min");
    expect(remainingLabel((12 * 60 + 4) * s)).toBe("12 min 04 s");
    expect(remainingLabel(9 * s)).toBe("9 s");
    expect(remainingLabel(-5 * s)).toBe("0 s");
  });
});
