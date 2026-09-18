import { describe, expect, it } from "vitest";
import { BAN_DURATIONS, banExpiryFor, banTimeLeft, isBanActive, isBanDurationKey } from "./ban.js";

const NOW = new Date("2026-09-18T12:00:00.000Z");
const ban = (over: Partial<{ expiresAt: Date | null; liftedAt: Date | null }> = {}) => ({
  expiresAt: null,
  liftedAt: null,
  ...over,
});

describe("isBanActive", () => {
  it("holds a permanent ban", () => {
    expect(isBanActive(ban(), NOW)).toBe(true);
  });

  it("holds a ban whose end is still ahead", () => {
    expect(isBanActive(ban({ expiresAt: new Date("2026-09-19T12:00:00.000Z") }), NOW)).toBe(true);
  });

  it("lets a ban go the moment it expires, not a millisecond after", () => {
    // The one moment anybody watches the clock is the moment it ends. Keeping
    // somebody out for one more millisecond reads as a bug.
    expect(isBanActive(ban({ expiresAt: NOW }), NOW)).toBe(false);
    expect(isBanActive(ban({ expiresAt: new Date(NOW.getTime() + 1) }), NOW)).toBe(true);
  });

  it("stops applying once an administrator has lifted it", () => {
    // Lifted wins over an end date still in the future: somebody decided.
    const lifted = ban({
      expiresAt: new Date("2027-01-01T00:00:00.000Z"),
      liftedAt: new Date("2026-09-18T11:00:00.000Z"),
    });
    expect(isBanActive(lifted, NOW)).toBe(false);
  });

  it("stops applying when a permanent ban is lifted", () => {
    expect(isBanActive(ban({ liftedAt: NOW }), NOW)).toBe(false);
  });
});

describe("banExpiryFor", () => {
  it("counts from the moment it is issued", () => {
    expect(banExpiryFor("24h", NOW)?.toISOString()).toBe("2026-09-19T12:00:00.000Z");
    expect(banExpiryFor("7d", NOW)?.toISOString()).toBe("2026-09-25T12:00:00.000Z");
    expect(banExpiryFor("30d", NOW)?.toISOString()).toBe("2026-10-18T12:00:00.000Z");
  });

  it("gives a permanent ban no end at all", () => {
    // Null rather than a far-future date: "forever" and "in the year 3000" read
    // the same to a query and very differently to a person.
    expect(banExpiryFor("permanent", NOW)).toBeNull();
  });

  it("accepts exactly the lengths the console offers", () => {
    for (const duration of BAN_DURATIONS) {
      expect(isBanDurationKey(duration.key)).toBe(true);
    }
    expect(isBanDurationKey("1000y")).toBe(false);
    expect(isBanDurationKey("")).toBe(false);
  });
});

describe("banTimeLeft", () => {
  it("says so plainly when there is no end", () => {
    expect(banTimeLeft(null, NOW)).toBe("Ce bannissement est définitif.");
  });

  it("rounds up rather than saying zero", () => {
    // "Il reste 0 heure" on a ban with fifty minutes left is wrong in the
    // direction that makes people write in.
    expect(banTimeLeft(new Date(NOW.getTime() + 50 * 60_000), NOW)).toBe("Il reste 50 minutes.");
    expect(banTimeLeft(new Date(NOW.getTime() + 90 * 60_000), NOW)).toBe("Il reste 2 heures.");
  });

  it("switches to days past two of them", () => {
    expect(banTimeLeft(new Date(NOW.getTime() + 47 * 3_600_000), NOW)).toBe("Il reste 47 heures.");
    expect(banTimeLeft(new Date(NOW.getTime() + 49 * 3_600_000), NOW)).toBe("Il reste 3 jours.");
  });

  it("agrees with isBanActive about a ban that is over", () => {
    const over = new Date(NOW.getTime() - 1);
    expect(banTimeLeft(over, NOW)).toBe("Ce bannissement est terminé.");
    expect(isBanActive({ expiresAt: over, liftedAt: null }, NOW)).toBe(false);
  });

  it("agrees with the singular", () => {
    expect(banTimeLeft(new Date(NOW.getTime() + 60_000), NOW)).toBe("Il reste 1 minute.");
    expect(banTimeLeft(new Date(NOW.getTime() + 61 * 60_000), NOW)).toBe("Il reste 2 heures.");
  });
});
