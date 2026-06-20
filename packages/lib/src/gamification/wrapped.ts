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
  /** The month being recapped, "YYYY-MM". */
  periodKey: string;
  /** Every XP credit (all-time), to bucket by month for this/last/best. */
  xpEntries: readonly { amount: number; createdAt: Date }[];
  /** Completed lessons (all-time), to count this month + split by domain. */
  lessons: readonly { completedAt: Date; category: DomainCode }[];
  /** Earned badges (all-time), to count this month + group by rarity. */
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
    thisMonth: number;
    lastMonth: number;
    /** Month-over-month percentage, null when last month was zero. */
    deltaPct: number | null;
    isBestMonth: boolean;
    bestMonthKey: string | null;
    bestMonthXp: number;
  };
  badges: {
    thisMonth: number;
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

  // ── XP: sum per month, then this / last / best ─────────────────────────────
  const xpByMonth = new Map<string, number>();
  for (const entry of inputs.xpEntries) {
    const key = monthKey(entry.createdAt);
    xpByMonth.set(key, (xpByMonth.get(key) ?? 0) + entry.amount);
  }
  const thisMonthXp = xpByMonth.get(periodKey) ?? 0;
  const lastMonthXp = xpByMonth.get(shiftMonth(periodKey, -1)) ?? 0;
  const deltaPct =
    lastMonthXp > 0 ? Math.round(((thisMonthXp - lastMonthXp) / lastMonthXp) * 100) : null;
  let bestMonthKey: string | null = null;
  let bestMonthXp = 0;
  for (const [key, value] of xpByMonth) {
    if (value > bestMonthXp) {
      bestMonthXp = value;
      bestMonthKey = key;
    }
  }

  // ── Lessons this month + domain split ──────────────────────────────────────
  const byDomain: Record<DomainCode, number> = { DEV: 0, CYBERSEC: 0, NETWORK: 0 };
  let lessonTotal = 0;
  for (const lesson of inputs.lessons) {
    if (monthKey(lesson.completedAt) !== periodKey) continue;
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

  // ── Badges this month ──────────────────────────────────────────────────────
  const monthBadges = inputs.badges
    .filter((b) => monthKey(b.earnedAt) === periodKey)
    .sort((a, b) => b.earnedAt.getTime() - a.earnedAt.getTime());
  const byRarity: Record<string, number> = {};
  for (const badge of monthBadges) {
    byRarity[badge.rarity] = (byRarity[badge.rarity] ?? 0) + 1;
  }
  const recent = monthBadges.slice(0, 3).map((b) => ({ name: b.name, rarity: b.rarity }));

  return {
    periodKey,
    lessons: { total: lessonTotal, byDomain, topDomain, topDomainPct },
    xp: {
      thisMonth: thisMonthXp,
      lastMonth: lastMonthXp,
      deltaPct,
      isBestMonth: bestMonthKey === periodKey && thisMonthXp > 0,
      bestMonthKey,
      bestMonthXp,
    },
    badges: {
      thisMonth: monthBadges.length,
      byRarity,
      recent,
      total: inputs.totalBadges,
    },
    streak: { longest: inputs.longestStreak, daysThisYear: inputs.daysThisYear },
    tier: computeTier(inputs.level).tier.code,
    season: inputs.season,
  };
}
