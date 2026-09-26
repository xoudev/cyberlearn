import { badgeRepository, prisma } from "@cyberlearn/db";
import { buildBadgeCriterionStats, computeBadgeProgress } from "@cyberlearn/lib";
import { retroAwardBadges } from "./award";

/**
 * The badge collection, for the site's /badges page and the app's Collection
 * tab (/api/mobile/badges): every active badge, earned or not, grouped by
 * rarity, with the progress of those still locked.
 *
 * Callers are responsible for AUTHENTICATION: `userId` must be verified.
 */

export interface BadgeProgress {
  done: number;
  total: number;
  label: string;
}

export interface SerializedBadge {
  id: string;
  refCode: string;
  name: string;
  description: string;
  iconUrl: string;
  rarity: string;
  criterionType: string;
  earned: boolean;
  earnedDateStr: string | null;
  progress: BadgeProgress | null;
}

export interface BadgeGroup {
  rarity: string;
  label: string;
  badges: SerializedBadge[];
}

export interface BadgeCollection {
  groups: BadgeGroup[];
  earnedCount: number;
  totalCount: number;
  rarityTotals: Record<string, number>;
  rarityEarned: Record<string, number>;
}

const RARITY_ORDER = ["LEGENDARY", "EPIC", "RARE", "COMMON"] as const;

const RARITY_LABEL: Record<string, string> = {
  LEGENDARY: "Légendaire",
  EPIC: "Épique",
  RARE: "Rare",
  COMMON: "Commun",
};

// ── Progress label (UI only) ───────────────────────────────────────────────────
// The progress LOGIC lives in @cyberlearn/lib (computeBadgeProgress, the single
// source of truth shared with real-time awarding). This maps a criterion to its
// French unit label for the progress bar.

function progressLabel(criterionType: string, criterionData: unknown): string {
  const data =
    typeof criterionData === "object" && criterionData !== null
      ? // SAFETY: narrowed to a non-null object; every field is read as unknown.
        (criterionData as Record<string, unknown>)
      : {};

  switch (criterionType) {
    case "LESSON_COMPLETED":
      return "leçons";
    case "XP_THRESHOLD":
      return "XP";
    case "STREAK_DAYS":
      return "jours";
    case "CATEGORY_MASTERY": {
      if (Array.isArray(data.categories)) return "catégories";
      const category = typeof data.category === "string" ? data.category.toLowerCase() : "";
      return category ? `leçons ${category}` : "leçons";
    }
    case "PATH_COMPLETED":
      return data.withCertificate === true ? "certificat" : "parcours";
    case "LESSON_SPECIFIC":
      return "leçon spécifique";
    default:
      return "";
  }
}

export async function buildBadgeCollection(userId: string): Promise<BadgeCollection> {
  // Parallel data fetch: all active badges + user earned badges + criterion facts
  const [allBadges, earnedUserBadges, user, facts] = await Promise.all([
    badgeRepository.findAllActive(),
    badgeRepository.findUserBadges(userId),
    prisma.user.findUnique({
      where: { id: userId },
      select: { xpTotal: true, streakDays: true },
    }),
    badgeRepository.findCriterionFacts(userId),
  ]);

  // Same stats shape as the real-time award sites: single source of truth.
  const stats = buildBadgeCriterionStats(facts, {
    xpTotal: user?.xpTotal ?? 0,
    streakDays: user?.streakDays ?? 0,
  });

  // Build earned lookup: badgeId → formatted date string
  const fmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  const earnedMap = new Map<string, string>(
    earnedUserBadges.map((ub) => [ub.badgeId, fmt.format(ub.earnedAt)]),
  );

  // Retroactively award badges whose progress is at 100% but were never
  // triggered. Atomic (insert + xpReward credit in one transaction) and
  // SILENT: the catch-up sweep never notifies; only real-time triggers do.
  // Idempotent: only rows actually inserted are credited.
  const retroBadges = allBadges.filter((b) => {
    if (earnedMap.has(b.id)) return false;
    const progress = computeBadgeProgress(b.criterionType, b.criterionData, stats);
    return progress !== null && progress.total > 0 && progress.done >= progress.total;
  });

  if (retroBadges.length > 0) {
    const { awarded } = await retroAwardBadges(userId, retroBadges);
    const nowStr = fmt.format(new Date());
    for (const badge of awarded) earnedMap.set(badge.id, nowStr);
  }

  // Rarity counters
  const rarityTotals: Record<string, number> = {};
  const rarityEarned: Record<string, number> = {};
  for (const b of allBadges) {
    rarityTotals[b.rarity] = (rarityTotals[b.rarity] ?? 0) + 1;
    if (earnedMap.has(b.id)) {
      rarityEarned[b.rarity] = (rarityEarned[b.rarity] ?? 0) + 1;
    }
  }

  // Build groups by rarity order; serialize all data (no Date objects)
  const groups: BadgeGroup[] = RARITY_ORDER.map((rarity) => {
    const badges: SerializedBadge[] = allBadges
      .filter((b) => b.rarity === rarity)
      .map((b) => {
        const earned = earnedMap.has(b.id);
        const earnedDateStr = earnedMap.get(b.id) ?? null;
        const rawProgress = earned
          ? null
          : computeBadgeProgress(b.criterionType, b.criterionData, stats);
        const progress: BadgeProgress | null = rawProgress
          ? { ...rawProgress, label: progressLabel(b.criterionType, b.criterionData) }
          : null;

        return {
          id: b.id,
          refCode: b.refCode,
          name: b.name,
          description: b.description,
          iconUrl: b.iconUrl,
          rarity: b.rarity,
          criterionType: b.criterionType,
          earned,
          earnedDateStr,
          progress,
        } satisfies SerializedBadge;
      });

    return {
      rarity,
      label: RARITY_LABEL[rarity] ?? rarity,
      badges,
    } satisfies BadgeGroup;
  }).filter((g) => g.badges.length > 0);

  return {
    groups,
    // earnedMap includes badges granted retroactively on this very call.
    earnedCount: earnedMap.size,
    totalCount: allBadges.length,
    rarityTotals,
    rarityEarned,
  };
}
