import { describe, expect, it } from "vitest";
import {
  attemptsLeft,
  matchesFilter,
  siteLink,
  splitWeekly,
  takesFlag,
  tallyOf,
  xpLine,
  type ChallengeItem,
} from "../challenges";

function item(id: string, over: Partial<ChallengeItem> = {}): ChallengeItem {
  return {
    id,
    refCode: `CL-CHG-00${id}`,
    slug: `defi-${id}`,
    title: `Défi ${id}`,
    description: "",
    category: "CYBERSEC",
    difficulty: "BEGINNER",
    type: "CTF",
    xpReward: 50,
    timeLimitMin: 0,
    maxAttempts: 10,
    userAttempts: 0,
    displayStatus: "AVAILABLE",
    lockedByTitle: null,
    ...over,
  };
}

describe("takesFlag", () => {
  it("takes a flag for a CTF and a script, a click for a puzzle or a lab", () => {
    const types = ["CTF", "SCRIPT", "PUZZLE", "LAB"] as const;
    expect(types.map((t) => takesFlag(t))).toEqual([true, true, false, false]);
  });
});

describe("siteLink", () => {
  const SITE = "https://cyberlearn.fr";

  it("opens a file's own address, or its path on the site", () => {
    expect(siteLink("https://files.example.org/dump.pcap", SITE)).toBe(
      "https://files.example.org/dump.pcap",
    );
    expect(siteLink("/files/dump.pcap", SITE)).toBe("https://cyberlearn.fr/files/dump.pcap");
    expect(siteLink("/files/dump.pcap", `${SITE}/`)).toBe("https://cyberlearn.fr/files/dump.pcap");
  });

  it("opens nothing else", () => {
    expect(siteLink("javascript:alert(1)", SITE)).toBeNull();
    expect(siteLink("//evil.example/x", SITE)).toBeNull();
    expect(siteLink("dump.pcap", SITE)).toBeNull();
  });
});

describe("attemptsLeft", () => {
  it("counts what is left, never below zero", () => {
    expect(attemptsLeft({ maxAttempts: 10, userAttempts: 3 })).toBe(7);
    expect(attemptsLeft({ maxAttempts: 3, userAttempts: 5 })).toBe(0);
  });
});

describe("the list's tabs", () => {
  it("keep what is left to do under « À faire », the solved under « Résolus »", () => {
    const states = ["AVAILABLE", "IN_PROGRESS", "COMPLETED", "LOCKED"] as const;
    const items = states.map((displayStatus, i) => item(String(i), { displayStatus }));
    expect(items.filter((i) => matchesFilter(i, "todo")).map((i) => i.displayStatus)).toEqual([
      "AVAILABLE",
      "IN_PROGRESS",
    ]);
    expect(items.filter((i) => matchesFilter(i, "done")).length).toBe(1);
    expect(items.filter((i) => matchesFilter(i, "all")).length).toBe(4);
  });
});

describe("splitWeekly", () => {
  const items = [item("1"), item("2"), item("3")];

  it("sets the week's challenge apart and names next week's", () => {
    const split = splitWeekly({
      items,
      weekly: { id: "2", endsAt: "2026-10-12T00:00:00.000Z", multiplier: 2, nextId: "3" },
    });
    expect(split.weekly?.id).toBe("2");
    expect(split.next?.id).toBe("3");
    expect(split.others.map((i) => i.id)).toEqual(["1", "3"]);
  });

  it("leaves the list whole from a server that names no week's challenge", () => {
    const split = splitWeekly({ items, weekly: null });
    expect(split.weekly).toBeNull();
    expect(split.next).toBeNull();
    expect(split.others.length).toBe(3);
  });
});

describe("xpLine", () => {
  it("says what was earned once solved, the bonus included", () => {
    expect(xpLine(item("1", { displayStatus: "COMPLETED", xpEarned: 100 }))).toBe("100 XP gagnés");
    expect(xpLine(item("1", { displayStatus: "COMPLETED" }))).toBe("50 XP gagnés");
    expect(xpLine(item("1"), 2)).toBe("100 XP");
  });
});

describe("tallyOf", () => {
  it("counts each state, « en cours » only when there is one", () => {
    expect(tallyOf([item("1"), item("2", { displayStatus: "LOCKED" })])).toEqual([
      { status: "COMPLETED", n: 0 },
      { status: "AVAILABLE", n: 1 },
      { status: "LOCKED", n: 1 },
    ]);
  });
});
