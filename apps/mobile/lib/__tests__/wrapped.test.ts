import { describe, expect, it } from "vitest";
import {
  accentColor,
  buildStorySlides,
  opensLabel,
  stepIndex,
  tapDirection,
  lineTop,
  wrappedCardContent,
  wrappedCardFrame,
  wrappedShareText,
  wrappedWindow,
  type WrappedPayload,
} from "../wrapped";

const PAYLOAD: WrappedPayload = {
  periodKey: "2026",
  lessons: {
    total: 48,
    byDomain: { DEV: 20, CYBERSEC: 22, NETWORK: 6 },
    topDomain: "CYBERSEC",
    topDomainPct: 46,
  },
  xp: { thisYear: 12340, lastYear: 8000, deltaPct: 54, bestMonthKey: "2026-03", bestMonthXp: 2100 },
  streak: { longest: 21, daysThisYear: 140 },
  badges: {
    thisYear: 1,
    total: 9,
    byRarity: { RARE: 1 },
    recent: [{ name: "Premier pas", rarity: "RARE" }],
  },
  tier: "ARGENT",
  season: null,
};

describe("the story in the app", () => {
  it("tells the same slides as the site", () => {
    const ids = buildStorySlides(PAYLOAD).map((s) => s.id);
    expect(ids[0]).toBe("intro");
    expect(ids.at(-1)).toBe("share");
  });

  it("goes back on the left half and on on the right half", () => {
    expect(tapDirection(10, 400)).toBe("previous");
    expect(tapDirection(199, 400)).toBe("previous");
    expect(tapDirection(200, 400)).toBe("next");
  });

  it("stops at both ends instead of wrapping", () => {
    expect(stepIndex(0, 8, "previous")).toBe(0);
    expect(stepIndex(3, 8, "next")).toBe(4);
    expect(stepIndex(7, 8, "next")).toBe(7);
  });

  it("uses the site's colours, and the reader's accent for turquoise", () => {
    expect(accentColor("violet", "#0affd4")).toBe("#b14dff");
    expect(accentColor("turquoise", "#123456")).toBe("#123456");
  });
});

describe("sharing and opening", () => {
  it("puts the year in words, with singulars where they belong", () => {
    const text = wrappedShareText(PAYLOAD, "alex");
    expect(text).toContain("Mon année 2026 sur CyberLearn (@alex)");
    expect(text).toContain("48 leçons");
    expect(text).toContain("21 jours de série");
    expect(text).toContain("1 badge.");
    expect(text).toMatch(/12\s340 XP/u);
  });

  it("counts the days to the opening, and names the date", () => {
    const now = Date.parse("2026-11-29T12:00:00Z");
    expect(opensLabel("2026-12-01", now)).toBe("Ouverture le 1 décembre · 2 jours");
    expect(opensLabel("2026-12-01", Date.parse("2026-12-01T00:00:00Z"))).toBe(
      "Ouverture le 1 décembre",
    );
  });

  it("opens with the site's window", () => {
    expect(wrappedWindow(new Date("2026-12-10T10:00:00Z")).open).toBe(true);
    expect(wrappedWindow(new Date("2026-10-10T10:00:00Z")).open).toBe(false);
  });
});

describe("the story image", () => {
  it("is laid out so the capture comes out at 1080 x 1920 pixels on any phone", () => {
    for (const ratio of [1, 2, 2.625, 3, 3.5]) {
      const frame = wrappedCardFrame(ratio);
      expect(frame.width * ratio).toBeCloseTo(1080);
      expect(frame.height * ratio).toBeCloseTo(1920);
      expect(frame.px(120) * ratio).toBeCloseTo(120);
    }
  });

  it("falls back to one pixel per unit for a ratio it cannot use", () => {
    expect(wrappedCardFrame(0).width).toBe(1080);
  });

  it("turns the canvas's baselines into tops, above the baseline", () => {
    expect(lineTop(400, 210)).toBeCloseTo(200.5);
    expect(lineTop(190, 34)).toBeLessThan(190);
  });

  it("carries the site's figures and words", () => {
    const card = wrappedCardContent(PAYLOAD, "alex");
    expect(card.title).toBe("CYBERLEARN WRAPPED");
    expect(card.handle).toBe("@alex");
    expect(card.stats.map((s) => s.label)).toEqual([
      "XP gagnés",
      "leçons",
      "badges",
      "jours de série",
    ]);
  });
});
