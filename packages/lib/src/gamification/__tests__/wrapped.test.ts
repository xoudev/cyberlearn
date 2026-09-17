import { describe, expect, it } from "vitest";
import {
  assembleWrapped,
  monthKey,
  shiftMonth,
  shiftYear,
  yearKey,
  type WrappedInputs,
} from "../wrapped";

// Midday UTC keeps the date inside the same Europe/Paris month (avoids the
// tz-boundary case where a late-UTC date rolls into the next Paris day/month).
function at(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`);
}

function baseInputs(overrides: Partial<WrappedInputs> = {}): WrappedInputs {
  return {
    periodKey: "2026",
    xpEntries: [],
    lessons: [],
    badges: [],
    totalBadges: 0,
    longestStreak: 0,
    daysThisYear: 0,
    level: 1,
    season: null,
    ...overrides,
  };
}

describe("monthKey / shiftMonth / yearKey / shiftYear", () => {
  it("derives the Paris month key", () => {
    expect(monthKey(at("2026-03-15"))).toBe("2026-03");
  });

  it("derives the Paris year key", () => {
    expect(yearKey(at("2026-03-15"))).toBe("2026");
    expect(yearKey(at("2026-12-31"))).toBe("2026");
  });

  it("shifts months across year boundaries", () => {
    expect(shiftMonth("2026-03", -1)).toBe("2026-02");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });

  it("shifts years", () => {
    expect(shiftYear("2026", -1)).toBe("2025");
    expect(shiftYear("2026", 1)).toBe("2027");
  });
});

describe("assembleWrapped - XP buckets", () => {
  it("computes this / last year XP and the YoY delta", () => {
    const out = assembleWrapped(
      baseInputs({
        xpEntries: [
          { amount: 6000, createdAt: at("2025-02-10") },
          { amount: 1000, createdAt: at("2025-11-20") }, // 2025 total 7000
          { amount: 9000, createdAt: at("2026-03-05") },
          { amount: 240, createdAt: at("2026-10-25") }, // 2026 total 9240
        ],
      }),
    );
    expect(out.xp.thisYear).toBe(9240);
    expect(out.xp.lastYear).toBe(7000);
    expect(out.xp.deltaPct).toBe(32); // (9240-7000)/7000 = 32%
  });

  it("returns a null delta when last year had no XP", () => {
    const out = assembleWrapped(
      baseInputs({ xpEntries: [{ amount: 500, createdAt: at("2026-03-05") }] }),
    );
    expect(out.xp.lastYear).toBe(0);
    expect(out.xp.deltaPct).toBeNull();
  });

  it("names the best month inside the year, never one from another year", () => {
    // The regression this guards: "ton meilleur mois" in a 2026 recap naming a
    // month in 2024 because the search ran over every month on record.
    const out = assembleWrapped(
      baseInputs({
        xpEntries: [
          { amount: 99000, createdAt: at("2024-07-10") },
          { amount: 12000, createdAt: at("2026-01-10") },
          { amount: 3000, createdAt: at("2026-03-10") },
        ],
      }),
    );
    expect(out.xp.bestMonthKey).toBe("2026-01");
    expect(out.xp.bestMonthXp).toBe(12000);
  });
});

describe("assembleWrapped - lessons + domain", () => {
  it("counts this-year lessons and finds the top domain", () => {
    const out = assembleWrapped(
      baseInputs({
        lessons: [
          ...Array.from({ length: 27 }, () => ({
            completedAt: at("2026-03-08"),
            category: "CYBERSEC" as const,
          })),
          ...Array.from({ length: 6 }, () => ({
            completedAt: at("2026-03-09"),
            category: "DEV" as const,
          })),
          ...Array.from({ length: 5 }, () => ({
            completedAt: at("2026-03-10"),
            category: "NETWORK" as const,
          })),
          // Prior year, excluded. It used to be a prior month, from when this
          // recap covered thirty days; a month of the same year now counts.
          { completedAt: at("2025-12-10"), category: "DEV" as const },
        ],
      }),
    );
    expect(out.lessons.total).toBe(38);
    expect(out.lessons.byDomain).toEqual({ DEV: 6, CYBERSEC: 27, NETWORK: 5 });
    expect(out.lessons.topDomain).toBe("CYBERSEC");
    expect(out.lessons.topDomainPct).toBe(71); // 27/38
  });

  it("has no top domain when no lessons were completed this year", () => {
    const out = assembleWrapped(
      baseInputs({ lessons: [{ completedAt: at("2025-02-10"), category: "DEV" }] }),
    );
    expect(out.lessons.total).toBe(0);
    expect(out.lessons.topDomain).toBeNull();
    expect(out.lessons.topDomainPct).toBe(0);
  });
});

describe("assembleWrapped - badges", () => {
  it("counts this-year badges, groups by rarity, lists the most recent first", () => {
    const out = assembleWrapped(
      baseInputs({
        totalBadges: 27,
        badges: [
          { earnedAt: at("2026-03-01"), rarity: "LEGENDARY", name: "First Blood" },
          { earnedAt: at("2026-03-20"), rarity: "EPIC", name: "Recon Master" },
          { earnedAt: at("2026-03-10"), rarity: "RARE", name: "SQL Survivor" },
          { earnedAt: at("2025-01-05"), rarity: "COMMON", name: "Old Badge" }, // prior year, excluded
        ],
      }),
    );
    expect(out.badges.thisYear).toBe(3);
    expect(out.badges.total).toBe(27);
    expect(out.badges.byRarity).toEqual({ LEGENDARY: 1, EPIC: 1, RARE: 1 });
    // Only the three most recent, sorted desc: Mar 20, Mar 10, Mar 01.
    expect(out.badges.recent.map((b) => b.name)).toEqual([
      "Recon Master",
      "SQL Survivor",
      "First Blood",
    ]);
  });
});

describe("assembleWrapped - streak, tier, season", () => {
  it("passes streak + tier + season through", () => {
    const season = {
      seasonIndex: 6,
      division: "OR",
      globalRank: 342,
      totalMembers: 8000,
      promoted: true,
      relegated: false,
    };
    const out = assembleWrapped(
      baseInputs({ longestStreak: 21, daysThisYear: 84, level: 24, season }),
    );
    expect(out.streak).toEqual({ longest: 21, daysThisYear: 84 });
    expect(out.tier).toBe("DIAMANT"); // level 24 -> Diamant (minLevel 22)
    expect(out.season).toEqual(season);
  });
});
