import { describe, expect, it } from "vitest";
import { isoWeekKey, msUntilWeekReset } from "../week.js";

// Anchor: 2026-01-01 is a Thursday, so it falls in ISO week 2026-W01, whose
// Monday is 2025-12-29. Everything below is derived from that fact.
describe("isoWeekKey (Europe/Paris)", () => {
  it("puts Jan 1 2026 (Thursday) in 2026-W01", () => {
    expect(isoWeekKey(new Date("2026-01-01T12:00:00Z"))).toBe("2026-W01");
  });

  it("rolls the ISO year forward across the Jan boundary", () => {
    // Mon 2025-12-29 belongs to 2026-W01; Sun 2025-12-28 is still 2025-W52.
    expect(isoWeekKey(new Date("2025-12-29T12:00:00Z"))).toBe("2026-W01");
    expect(isoWeekKey(new Date("2025-12-28T12:00:00Z"))).toBe("2025-W52");
  });

  it("keeps a whole Mon→Sun span in the same week, next Monday increments", () => {
    expect(isoWeekKey(new Date("2025-12-29T08:00:00Z"))).toBe("2026-W01"); // Mon
    expect(isoWeekKey(new Date("2026-01-04T20:00:00Z"))).toBe("2026-W01"); // Sun (Paris 21:00)
    expect(isoWeekKey(new Date("2026-01-05T08:00:00Z"))).toBe("2026-W02"); // Mon
  });

  it("uses the Paris day boundary, not UTC", () => {
    // 22:30 UTC Sun Jan 4 = 23:30 Paris (CET) → still Sunday → W01.
    expect(isoWeekKey(new Date("2026-01-04T22:30:00Z"))).toBe("2026-W01");
    // 23:30 UTC Sun Jan 4 = 00:30 Paris Mon Jan 5 → W02.
    expect(isoWeekKey(new Date("2026-01-04T23:30:00Z"))).toBe("2026-W02");
  });
});

describe("msUntilWeekReset", () => {
  it("counts a full week on a Monday", () => {
    // Mon 2026-01-05, Paris 11:00 → next Monday is 7 days out, minus 11h elapsed.
    const ms = msUntilWeekReset(new Date("2026-01-05T10:00:00Z"));
    expect(ms).toBe((7 * 86_400 - 11 * 3600) * 1000);
  });

  it("counts under a day on a Sunday", () => {
    // Sun 2026-01-04, Paris 11:00 → next Monday is ~13h away.
    const ms = msUntilWeekReset(new Date("2026-01-04T10:00:00Z"));
    expect(ms).toBe((86_400 - 11 * 3600) * 1000);
  });
});
