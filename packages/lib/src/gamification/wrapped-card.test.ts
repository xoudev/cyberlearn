import { describe, expect, it } from "vitest";
import type { WrappedPayload } from "./wrapped.js";
import { WRAPPED_CARD_SIZE, fmtCompact, wrappedCardContent } from "./wrapped-card.js";

const YEAR: WrappedPayload = {
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
  badges: { thisYear: 17, byRarity: { COMMON: 17 }, recent: [], total: 41 },
  streak: { longest: 46, daysThisYear: 212 },
  tier: "PLATINE",
  season: null,
};

describe("the Wrapped card", () => {
  it("is story size", () => {
    expect(WRAPPED_CARD_SIZE).toEqual({ width: 1080, height: 1920 });
  });

  it("carries the year, the handle and the four figures, number first", () => {
    expect(wrappedCardContent(YEAR, "alex")).toEqual({
      title: "CYBERLEARN WRAPPED",
      year: "2026",
      handle: "@alex",
      stats: [
        { value: "24,9k", label: "XP gagnés" },
        { value: "148", label: "leçons" },
        { value: "17", label: "badges" },
        { value: "46", label: "jours de série" },
      ],
      domain: "Domaine de l'année : Cybersec",
      site: "cyberlearn.fr",
      fileName: "cyberlearn-wrapped-2026.png",
    });
  });

  it("names no domain for a year without a lesson", () => {
    const empty: WrappedPayload = {
      ...YEAR,
      lessons: {
        total: 0,
        byDomain: { DEV: 0, CYBERSEC: 0, NETWORK: 0 },
        topDomain: null,
        topDomainPct: 0,
      },
    };
    expect(wrappedCardContent(empty, "alex").domain).toBeNull();
  });

  it("shortens big numbers and leaves small ones", () => {
    expect(fmtCompact(999)).toBe("999");
    expect(fmtCompact(1000)).toBe("1k");
    expect(fmtCompact(1250)).toBe("1,3k");
  });
});
