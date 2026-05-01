import React from "react";
import type { Metadata } from "next";
import { badgeRepository, prisma } from "@cyberlearn/db";
import { BadgesCollection } from "./_components/badges-collection";
import type { BadgeGroup, SerializedBadge, BadgeProgress } from "./_components/badges-collection";
import { requireRequestUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Badges" };

const RARITY_ORDER = ["LEGENDARY", "EPIC", "RARE", "COMMON"] as const;

const RARITY_LABEL: Record<string, string> = {
  LEGENDARY: "Légendaire",
  EPIC: "Épique",
  RARE: "Rare",
  COMMON: "Commun",
};

// ── Progress computation ───────────────────────────────────────────────────────

interface UserStats {
  xpTotal: number;
  streakDays: number;
  completedTotal: number;
  completedByCategory: Record<string, number>;
  completedPaths: number;
}

function computeProgress(
  criterionType: string,
  // SAFETY: criterionData is untyped Json from Prisma — we narrow below
  criterionData: unknown,
  stats: UserStats,
): BadgeProgress | null {
  const data = criterionData as Record<string, unknown>;

  switch (criterionType) {
    case "LESSON_COMPLETED": {
      const count = typeof data.count === "number" ? data.count : 0;
      if (count <= 0) return null;
      return { done: Math.min(stats.completedTotal, count), total: count, label: "leçons" };
    }
    case "PATH_COMPLETED": {
      const count = typeof data.count === "number" ? data.count : 1;
      return { done: Math.min(stats.completedPaths, count), total: count, label: "parcours" };
    }
    case "XP_THRESHOLD": {
      const threshold = typeof data.threshold === "number" ? data.threshold : 0;
      if (threshold <= 0) return null;
      return { done: Math.min(stats.xpTotal, threshold), total: threshold, label: "XP" };
    }
    case "STREAK_DAYS": {
      const days = typeof data.days === "number" ? data.days : 0;
      if (days <= 0) return null;
      return { done: Math.min(stats.streakDays, days), total: days, label: "jours" };
    }
    case "CATEGORY_MASTERY": {
      const category = typeof data.category === "string" ? data.category : "";
      const count = typeof data.count === "number" ? data.count : 0;
      if (!category || count <= 0) return null;
      const done = stats.completedByCategory[category] ?? 0;
      return {
        done: Math.min(done, count),
        total: count,
        label: `leçons ${category.toLowerCase()}`,
      };
    }
    default:
      return null;
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function BadgesPage(): Promise<React.ReactElement> {
  const authUser = await requireRequestUser();

  // Parallel data fetch: all active badges + user earned badges + user stats
  const [allBadges, earnedUserBadges, user, completedLessons, completedPaths] = await Promise.all([
    badgeRepository.findAllActive(),
    badgeRepository.findUserBadges(authUser.id),

    prisma.user.findUnique({
      where: { id: authUser.id },
      select: { xpTotal: true, streakDays: true },
    }),

    // All completed lessons with category for CATEGORY_MASTERY progress
    prisma.userLessonProgress.findMany({
      where: { userId: authUser.id, status: "COMPLETED" },
      select: { lesson: { select: { category: true } } },
    }),

    prisma.userPathProgress.count({
      where: { userId: authUser.id, status: "COMPLETED" },
    }),
  ]);

  // Build stats object
  const completedByCategory: Record<string, number> = {};
  for (const row of completedLessons) {
    const cat = row.lesson.category;
    completedByCategory[cat] = (completedByCategory[cat] ?? 0) + 1;
  }

  const stats: UserStats = {
    xpTotal: user?.xpTotal ?? 0,
    streakDays: user?.streakDays ?? 0,
    completedTotal: completedLessons.length,
    completedByCategory,
    completedPaths,
  };

  // Build earned lookup: badgeId → formatted date string
  const earnedMap = new Map<string, string>(
    earnedUserBadges.map((ub) => [
      ub.badgeId,
      new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(
        ub.earnedAt,
      ),
    ]),
  );

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
        const progress = earned ? null : computeProgress(b.criterionType, b.criterionData, stats);

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

  const earnedCount = earnedUserBadges.length;
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
