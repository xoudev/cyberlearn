// Pure assembly of a "Wrapped" monthly recap from raw per-user inputs. No DB, no
// IO - the repository fetches the raw lists and feeds them here, so the entire
// stat computation is unit-testable. All month bucketing uses the Europe/Paris
// calendar (via dayKey), matching the streak/activity day boundaries.

import { dayKey } from "./day.js";
import { computeTier } from "./tier.js";

export type DomainCode = "DEV" | "CYBERSEC" | "NETWORK";

/** The calendar month of `date` in the streak timezone, as "YYYY-MM". */
export function monthKey(date: Date): string {
  return dayKey(date).slice(0, 7);
}

/** The Europe/Paris year a moment falls in, as "YYYY". */
export function yearKey(date: Date): string {
  return dayKey(date).slice(0, 4);
}

/** Shift a "YYYY" key by `delta` years (e.g. "2026" - 1 = "2025"). */
export function shiftYear(key: string, delta: number): string {
  return String(Number(key) + delta);
}

/** Shift a "YYYY-MM" key by `delta` months (e.g. "2026-03" - 1 = "2026-02"). */
export function shiftMonth(key: string, delta: number): string {
  const [year, month] = key.split("-").map(Number);
  const d = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1 + delta, 1));
  return `${String(d.getUTCFullYear())}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export interface WrappedSeasonResult {
  seasonIndex: number;
  division: string;
  /** Global rank by seasonXp across the whole season; null if not ranked. */
  globalRank: number | null;
  totalMembers: number;
  promoted: boolean;
  relegated: boolean;
}

/** Raw, per-user inputs the repository gathers before assembly. */
export interface WrappedInputs {
  /**
   * The year being recapped, "YYYY".
   *
   * It used to be a month, from when this page was open all year round and had
   * to say something about the last thirty days. A Wrapped that opens in
   * December recaps the year, so the window widened and the payload's field
   * names widened with it - a field called thisMonth holding a year's total is
   * the kind of small lie that survives for years.
   */
  periodKey: string;
  /** Every XP credit (all-time), to bucket by month for this/last/best. */
  xpEntries: readonly { amount: number; createdAt: Date }[];
  /** Completed lessons (all-time), to count this year + split by domain. */
  lessons: readonly { completedAt: Date; category: DomainCode }[];
  /** Earned badges (all-time), to count this year + group by rarity. */
  badges: readonly { earnedAt: Date; rarity: string; name: string }[];
  totalBadges: number;
  longestStreak: number;
  daysThisYear: number;
  level: number;
  /** End-of-season standing, when a season closed; null otherwise. */
  season: WrappedSeasonResult | null;
}

export interface WrappedPayload {
  periodKey: string;
  lessons: {
    total: number;
    byDomain: Record<DomainCode, number>;
    topDomain: DomainCode | null;
    topDomainPct: number;
  };
  xp: {
    thisYear: number;
    lastYear: number;
    /** Year-over-year percentage, null when last year was zero. */
    deltaPct: number | null;
    /** The strongest month inside the year, which is the headline worth having. */
    bestMonthKey: string | null;
    bestMonthXp: number;
  };
  badges: {
    thisYear: number;
    byRarity: Record<string, number>;
    recent: { name: string; rarity: string }[];
    total: number;
  };
  streak: { longest: number; daysThisYear: number };
  /** Permanent prestige tier code from the current level (BRONZE..ELITE). */
  tier: string;
  season: WrappedSeasonResult | null;
}

const DOMAINS: readonly DomainCode[] = ["DEV", "CYBERSEC", "NETWORK"];

export function assembleWrapped(inputs: WrappedInputs): WrappedPayload {
  const { periodKey } = inputs;

  // ── XP: this year against last, plus the best month inside this one ────────
  const xpByMonth = new Map<string, number>();
  const xpByYear = new Map<string, number>();
  for (const entry of inputs.xpEntries) {
    const month = monthKey(entry.createdAt);
    xpByMonth.set(month, (xpByMonth.get(month) ?? 0) + entry.amount);
    const year = yearKey(entry.createdAt);
    xpByYear.set(year, (xpByYear.get(year) ?? 0) + entry.amount);
  }
  const thisYearXp = xpByYear.get(periodKey) ?? 0;
  const lastYearXp = xpByYear.get(shiftYear(periodKey, -1)) ?? 0;
  const deltaPct =
    lastYearXp > 0 ? Math.round(((thisYearXp - lastYearXp) / lastYearXp) * 100) : null;

  // The best month is scoped to the year being recapped, not all time: "ton
  // meilleur mois" in a 2026 recap must not name a month in 2024.
  let bestMonthKey: string | null = null;
  let bestMonthXp = 0;
  for (const [key, value] of xpByMonth) {
    if (!key.startsWith(`${periodKey}-`)) continue;
    if (value > bestMonthXp) {
      bestMonthXp = value;
      bestMonthKey = key;
    }
  }

  // ── Lessons this month + domain split ──────────────────────────────────────
  const byDomain: Record<DomainCode, number> = { DEV: 0, CYBERSEC: 0, NETWORK: 0 };
  let lessonTotal = 0;
  for (const lesson of inputs.lessons) {
    if (yearKey(lesson.completedAt) !== periodKey) continue;
    byDomain[lesson.category] += 1;
    lessonTotal += 1;
  }
  let topDomain: DomainCode | null = null;
  if (lessonTotal > 0) {
    let best: DomainCode = "DEV";
    for (const d of DOMAINS) {
      if (byDomain[d] > byDomain[best]) best = d;
    }
    topDomain = best;
  }
  const topDomainPct =
    lessonTotal > 0 && topDomain ? Math.round((byDomain[topDomain] / lessonTotal) * 100) : 0;

  // ── Badges earned this year ────────────────────────────────────────────────
  const yearBadges = inputs.badges
    .filter((b) => yearKey(b.earnedAt) === periodKey)
    .sort((a, b) => b.earnedAt.getTime() - a.earnedAt.getTime());
  const byRarity: Record<string, number> = {};
  for (const badge of yearBadges) {
    byRarity[badge.rarity] = (byRarity[badge.rarity] ?? 0) + 1;
  }
  const recent = yearBadges.slice(0, 3).map((b) => ({ name: b.name, rarity: b.rarity }));

  return {
    periodKey,
    lessons: { total: lessonTotal, byDomain, topDomain, topDomainPct },
    xp: {
      thisYear: thisYearXp,
      lastYear: lastYearXp,
      deltaPct,
      bestMonthKey,
      bestMonthXp,
    },
    badges: {
      thisYear: yearBadges.length,
      byRarity,
      recent,
      total: inputs.totalBadges,
    },
    streak: { longest: inputs.longestStreak, daysThisYear: inputs.daysThisYear },
    tier: computeTier(inputs.level).tier.code,
    season: inputs.season,
  };
}
