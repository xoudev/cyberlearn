import React, { Suspense } from "react";
import type { Metadata } from "next";
import { badgeRepository, prisma } from "@cyberlearn/db";
import { buildBadgeCriterionStats, computeBadgeProgress } from "@cyberlearn/lib";
import { BadgesCollection } from "./_components/badges-collection";
import type { BadgeGroup, SerializedBadge, BadgeProgress } from "./_components/badges-collection";
import { BadgesSkeleton } from "./_components/badges-skeleton";
import { requireRequestUser } from "@/lib/auth";
import { retroAwardBadges } from "@/lib/badges/award";

export const metadata: Metadata = { title: "Badges" };

const RARITY_ORDER = ["LEGENDARY", "EPIC", "RARE", "COMMON"] as const;

const RARITY_LABEL: Record<string, string> = {
  LEGENDARY: "Légendaire",
  EPIC: "Épique",
  RARE: "Rare",
  COMMON: "Commun",
};

// ── Progress label (UI only) ───────────────────────────────────────────────────
// The progress LOGIC lives in @cyberlearn/lib (computeBadgeProgress — the single
// source of truth shared with real-time awarding). This maps a criterion to its
// French unit label for the progress bar.

function progressLabel(criterionType: string, criterionData: unknown): string {
  const data =
    typeof criterionData === "object" && criterionData !== null
      ? (criterionData as Record<string, unknown>)
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BadgesPage(): React.ReactElement {
  return (
    <Suspense fallback={<BadgesSkeleton />}>
      <BadgesContent />
    </Suspense>
  );
}

async function BadgesContent(): Promise<React.ReactElement> {
  const authUser = await requireRequestUser();

  // Parallel data fetch: all active badges + user earned badges + criterion facts
  const [allBadges, earnedUserBadges, user, facts] = await Promise.all([
    badgeRepository.findAllActive(),
    badgeRepository.findUserBadges(authUser.id),
    prisma.user.findUnique({
      where: { id: authUser.id },
      select: { xpTotal: true, streakDays: true },
    }),
    badgeRepository.findCriterionFacts(authUser.id),
  ]);

  // Same stats shape as the real-time award sites — single source of truth.
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
  // triggered — atomic (insert + xpReward credit in one transaction) and
  // SILENT: the catch-up sweep never notifies; only real-time triggers do.
  // Idempotent: only rows actually inserted are credited.
  const retroBadges = allBadges.filter((b) => {
    if (earnedMap.has(b.id)) return false;
    const progress = computeBadgeProgress(b.criterionType, b.criterionData, stats);
    return progress !== null && progress.total > 0 && progress.done >= progress.total;
  });

  if (retroBadges.length > 0) {
    const { awarded } = await retroAwardBadges(authUser.id, retroBadges);
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

  // Build groups by rarity order — serialize all data (no Date objects)
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

  // earnedMap includes badges granted retroactively on this very render.
  const earnedCount = earnedMap.size;
  const totalCount = allBadges.length;

  return (
    <BadgesCollection
      groups={groups}
      earnedCount={earnedCount}
      totalCount={totalCount}
      rarityTotals={rarityTotals}
      rarityEarned={rarityEarned}
    />
  );
}
