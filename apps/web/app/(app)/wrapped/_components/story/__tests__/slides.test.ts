import { describe, expect, it } from "vitest";
import type { WrappedPayload } from "@cyberlearn/lib";
import { buildStorySlides, monthLabel, topPercent } from "../slides";

/**
 * The story's shape, not its styling.
 *
 * A slide that quietly stops appearing, or one that appears with a figure
 * nobody has - "0 badges" phrased as a boast, a rank slide for somebody who
 * never ranked - is the kind of thing that only shows up once a year, in front
 * of everyone, on the one day the recap is open. So the branching is pinned
 * here rather than trusted to a December read-through.
 */

const FULL: WrappedPayload = {
  periodKey: "2026",
  lessons: {
    total: 148,
    byDomain: { DEV: 61, CYBERSEC: 72, NETWORK: 15 },
    topDomain: "CYBERSEC",
    topDomainPct: 49,
  },
  xp: {
    thisYear: 24860,
    lastYear: 11240,
    deltaPct: 121,
    bestMonthKey: "2026-03",
    bestMonthXp: 4120,
  },
  badges: {
    thisYear: 17,
    byRarity: { COMMON: 8, RARE: 5, EPIC: 3, LEGENDARY: 1 },
    recent: [
      { name: "Chasseur de failles", rarity: "LEGENDARY" },
      { name: "Sans filet", rarity: "EPIC" },
      { name: "Sept jours d'affilée", rarity: "RARE" },
    ],
    total: 41,
  },
  streak: { longest: 46, daysThisYear: 212 },
  tier: "PLATINE",
  season: {
    seasonIndex: 4,
    division: "OR",
    globalRank: 37,
    totalMembers: 1840,
    promoted: true,
    relegated: false,
  },
};

/** A first year: nothing done, nothing won, no season behind them. */
const EMPTY: WrappedPayload = {
  periodKey: "2026",
  lessons: {
    total: 0,
    byDomain: { DEV: 0, CYBERSEC: 0, NETWORK: 0 },
    topDomain: null,
    topDomainPct: 0,
  },
  xp: { thisYear: 0, lastYear: 0, deltaPct: null, bestMonthKey: null, bestMonthXp: 0 },
  badges: { thisYear: 0, byRarity: {}, recent: [], total: 0 },
  streak: { longest: 0, daysThisYear: 0 },
  tier: "BRONZE",
  season: null,
};

function ids(payload: WrappedPayload): string[] {
  return buildStorySlides(payload).map((slide) => slide.id);
}

describe("buildStorySlides", () => {
  it("opens on the year and ends on the share card", () => {
    const order = ids(FULL);
    expect(order[0]).toBe("intro");
    expect(order.at(-1)).toBe("share");
    expect(buildStorySlides(FULL).at(-1)?.terminal).toBe(true);
  });

  it("holds the domain back until after the split that shows it", () => {
    const order = ids(FULL);
    // The reveal only works if the breakdown has already gone by.
    expect(order.indexOf("lessons")).toBeLessThan(order.indexOf("domain"));
  });

  it("marks exactly one slide terminal", () => {
    const terminals = buildStorySlides(FULL).filter((slide) => slide.terminal === true);
    expect(terminals).toHaveLength(1);
  });

  it("gives every slide a distinct id and an eyebrow", () => {
    const slides = buildStorySlides(FULL);
    expect(new Set(slides.map((s) => s.id)).size).toBe(slides.length);
    for (const slide of slides) expect(slide.eyebrow.length).toBeGreaterThan(0);
  });

  it("orders the domain split by volume, not by a fixed list", () => {
    // Deliberately against the order the domains are declared in, so that
    // removing the sort changes the answer. The first fixture tried here had
    // cybersec on top anyway, and a sabotaged sort passed it.
    const network = buildStorySlides({
      ...FULL,
      lessons: {
        total: 148,
        byDomain: { DEV: 15, CYBERSEC: 61, NETWORK: 72 },
        topDomain: "NETWORK",
        topDomainPct: 49,
      },
    }).find((slide) => slide.id === "lessons");

    if (network?.extra?.kind !== "bars") throw new Error("expected bars");
    expect(network.extra.rows.map((row) => row.label)).toEqual(["Réseau", "Cybersec", "Dev"]);
    expect(network.extra.rows.map((row) => row.value)).toEqual([72, 61, 15]);
    expect(network.extra.rows.map((row) => row.share)).toEqual([49, 41, 10]);
  });

  it("names the three badges it has and counts the rest", () => {
    const badges = buildStorySlides(FULL).find((slide) => slide.id === "badges");
    if (badges?.extra?.kind !== "list") throw new Error("expected list");
    expect(badges.extra.rows).toHaveLength(3);
    expect(badges.extra.rows[0]).toEqual({ label: "Chasseur de failles", note: "Légendaire" });
    expect(badges.footer).toContain("+ 14 autres");
  });

  it("reads the year-over-year move in the right direction", () => {
    const up = buildStorySlides(FULL).find((slide) => slide.id === "xp");
    expect(up?.lead).toContain("de plus qu'en 2025");

    const down = buildStorySlides({ ...FULL, xp: { ...FULL.xp, deltaPct: -30 } });
    expect(down.find((slide) => slide.id === "xp")?.lead).toContain("de moins qu'en 2025");
    // The sign belongs to the sentence, not to the number read out loud.
    expect(down.find((slide) => slide.id === "xp")?.lead).not.toContain("-30");
  });

  describe("a year with nothing in it", () => {
    it("drops the slides that would have no figure", () => {
      const order = ids(EMPTY);
      expect(order).not.toContain("best-month");
      expect(order).not.toContain("domain");
      expect(order).not.toContain("rank");
    });

    it("still opens and still ends on the card", () => {
      const order = ids(EMPTY);
      expect(order[0]).toBe("intro");
      expect(order.at(-1)).toBe("share");
    });

    it("says nothing that reads as a boast", () => {
      const slides = buildStorySlides(EMPTY);
      const lessons = slides.find((slide) => slide.id === "lessons");
      expect(lessons?.extra).toBeUndefined();
      expect(lessons?.lead).toBe("L'année prochaine est une page blanche.");
      expect(slides.find((slide) => slide.id === "badges")?.lead).toContain("Aucun cette année");
    });

    it("omits the year-over-year line when there is no year before", () => {
      expect(buildStorySlides(EMPTY).find((slide) => slide.id === "xp")?.lead).toBeUndefined();
    });
  });

  it("drops the rank slide for a season somebody never placed in", () => {
    const unranked = { ...FULL, season: { ...FULL.season!, globalRank: null } };
    expect(ids(unranked)).not.toContain("rank");
  });

  it("agrees its singulars with its numbers", () => {
    const one = buildStorySlides({
      ...EMPTY,
      lessons: { ...EMPTY.lessons, total: 1 },
      streak: { longest: 1, daysThisYear: 1 },
      badges: { ...EMPTY.badges, thisYear: 1 },
    });
    expect(one.find((s) => s.id === "lessons")?.figure?.unit).toBe("leçon");
    expect(one.find((s) => s.id === "streak")?.figure?.unit).toBe("jour");
    expect(one.find((s) => s.id === "badges")?.figure?.unit).toBe("badge");
  });
});

describe("helpers", () => {
  it("names a month in French, capitalised", () => {
    expect(monthLabel("2026-03")).toBe("Mars 2026");
  });

  it("never claims a top 0%", () => {
    expect(topPercent(1, 100000)).toBe(1);
    expect(topPercent(37, 1840)).toBe(2);
    expect(topPercent(5, 0)).toBe(100);
  });
});
