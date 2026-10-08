import { beforeEach, describe, expect, it, vi } from "vitest";
import { weeklyChallengeId } from "@cyberlearn/lib/challenges/weekly";

/**
 * The challenges as the list shows them: each state, the evidence held back
 * from a locked one, and the week's challenge named the same way the XP
 * credit doubles it. One challenge as the app's screen reads it: what the
 * site's page shows, never the flag.
 */

const m = vi.hoisted(() => ({
  findAllActive: vi.fn(),
  findActiveIdsInOrder: vi.fn(),
  findBySlug: vi.fn(),
  getUserProgress: vi.fn(),
  getRevealedHintsWithContent: vi.fn(),
}));
vi.mock("@cyberlearn/db", () => ({ challengeRepository: m }));

const { challengeCatalogueFor, challengeDetailFor, weeklyStateOf } = await import("../catalogue");

const MACHINE = { title: "web01", files: { "logs/auth.log": "Oct 2 sshd\nflag {{FLAG}}\n" } };

function row(id: string, over: Record<string, unknown> = {}): Record<string, unknown> {
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
    isActive: true,
    orderIndex: Number(id),
    prerequisiteId: null,
    prerequisiteSlug: null,
    machine: MACHINE,
    attachmentUrl: null,
    resourceUrl: null,
    hintCount: 2,
    userStatus: null,
    userAttempts: 0,
    userCompletedAt: null,
    userXpEarned: null,
    ...over,
  };
}

const NOW = new Date("2026-10-06T10:00:00Z");

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.findAllActive.mockResolvedValue([
    row("1", { userStatus: "COMPLETED", userXpEarned: 100 }),
    row("2", { prerequisiteId: "1", prerequisiteSlug: "defi-1" }),
    row("3", { prerequisiteId: "2", prerequisiteSlug: "defi-2", attachmentUrl: null }),
  ]);
});

describe("challengeCatalogueFor", () => {
  it("gives each challenge its state, what it hands over and what was earned", async () => {
    const { items } = await challengeCatalogueFor("user-1", NOW);
    expect(items.map((i) => i.displayStatus)).toEqual(["COMPLETED", "AVAILABLE", "LOCKED"]);
    expect(items[0]?.xpEarned).toBe(100);
    expect(items[1]?.supplied).toBe("La machine « web01 »");
    expect(items[2]?.prerequisiteSlug).toBe("defi-2");
    expect(items[2]?.lockedByTitle).toBe("Défi 2");
  });

  it("shows a glimpse of an open challenge, and nothing of a locked one", async () => {
    const { items } = await challengeCatalogueFor("user-1", NOW);
    expect(items[1]?.evidence?.excerpt?.lines).toEqual(["Oct 2 sshd"]);
    expect(items[2]?.evidence).toBeNull();
  });

  it("names the week's challenge in catalogue order, its end, and next week's", async () => {
    const { weekly } = await challengeCatalogueFor("user-1", NOW);
    expect(weekly).toEqual({
      id: weeklyChallengeId(["1", "2", "3"], NOW),
      endsAt: "2026-10-12T00:00:00.000Z",
      multiplier: 2,
      nextId: weeklyChallengeId(["1", "2", "3"], new Date("2026-10-12T00:00:00Z")),
    });
    expect(weekly?.nextId).not.toBe(weekly?.id);
  });

  it("has no week's challenge without challenges", async () => {
    m.findAllActive.mockResolvedValue([]);
    await expect(challengeCatalogueFor("user-1", NOW)).resolves.toEqual({
      items: [],
      weekly: null,
    });
  });
});

describe("weeklyStateOf", () => {
  it("is set for the week's challenge only", async () => {
    m.findActiveIdsInOrder.mockResolvedValue(["1", "2", "3"]);
    const id = weeklyChallengeId(["1", "2", "3"], NOW) ?? "";
    const other = ["1", "2", "3"].find((c) => c !== id) ?? "";
    expect((await weeklyStateOf(id, NOW))?.endsAt).toBe("2026-10-12T00:00:00.000Z");
    await expect(weeklyStateOf(other, NOW)).resolves.toBeNull();
  });
});

describe("challengeDetailFor", () => {
  function detailRow(over: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      ...row("4", { machine: null }),
      instructions: "## Énoncé",
      starterCode: null,
      prerequisiteId: null,
      prerequisite: null,
      hints: [],
      ...over,
    };
  }

  beforeEach(() => {
    m.getUserProgress.mockResolvedValue(null);
    m.findActiveIdsInOrder.mockResolvedValue([]);
  });

  it("hands over where to connect and the file, as the site's page shows them", async () => {
    m.findBySlug.mockResolvedValue(
      detailRow({
        resourceUrl: "nc host 1337",
        attachmentUrl: "/files/dump.pcap",
        flag: "CL{never_sent}",
      }),
    );
    const detail = await challengeDetailFor("user-1", "defi-4");
    expect(detail?.resourceUrl).toBe("nc host 1337");
    expect(detail?.attachmentUrl).toBe("/files/dump.pcap");
    expect(detail).not.toHaveProperty("flag");
  });

  it("says so when a challenge has neither", async () => {
    m.findBySlug.mockResolvedValue(detailRow());
    const detail = await challengeDetailFor("user-1", "defi-4");
    expect(detail?.resourceUrl).toBeNull();
    expect(detail?.attachmentUrl).toBeNull();
  });
});
