import React, { Suspense } from "react";
import type { Metadata } from "next";
import { badgeRepository, prisma } from "@cyberlearn/db";
import { BadgesCollection } from "./_components/badges-collection";
import type { BadgeGroup, SerializedBadge, BadgeProgress } from "./_components/badges-collection";
import { BadgesSkeleton } from "./_components/badges-skeleton";
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
  completedLessonIds: Set<string>;
  completedPaths: number;
  certifiedPaths: number;
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
      if (data.withCertificate === true) {
        return { done: Math.min(stats.certifiedPaths, 1), total: 1, label: "certificat" };
      }
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
    case "LESSON_SPECIFIC": {
      const lessonId = typeof data.lessonId === "string" ? data.lessonId : "";
      if (!lessonId) return null;
      const done = stats.completedLessonIds.has(lessonId) ? 1 : 0;
      return { done, total: 1, label: "leçon spécifique" };
    }
    default:
      return null;
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

  // Parallel data fetch: all active badges + user earned badges + user stats
  const [allBadges, earnedUserBadges, user, completedLessons, completedPaths, certifiedPaths] =
    await Promise.all([
      badgeRepository.findAllActive(),
      badgeRepository.findUserBadges(authUser.id),

      prisma.user.findUnique({
        where: { id: authUser.id },
        select: { xpTotal: true, streakDays: true },
      }),

      // All completed lessons with lessonId + category for CATEGORY_MASTERY and LESSON_SPECIFIC
      prisma.userLessonProgress.findMany({
        where: { userId: authUser.id, status: "COMPLETED" },
        select: { lessonId: true, lesson: { select: { category: true } } },
      }),

      prisma.userPathProgress.count({
        where: { userId: authUser.id, status: "COMPLETED" },
      }),

      prisma.certificate.count({ where: { userId: authUser.id } }),
    ]);

  // Build stats object
  const completedByCategory: Record<string, number> = {};
  const completedLessonIds = new Set<string>();
  for (const row of completedLessons) {
    completedLessonIds.add(row.lessonId);
    const cat = row.lesson.category;
    completedByCategory[cat] = (completedByCategory[cat] ?? 0) + 1;
  }

  const stats: UserStats = {
    xpTotal: user?.xpTotal ?? 0,
    streakDays: user?.streakDays ?? 0,
    completedTotal: completedLessons.length,
    completedByCategory,
    completedLessonIds,
    completedPaths,
    certifiedPaths,
  };

  // Build earned lookup: badgeId → formatted date string
  const fmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  const earnedMap = new Map<string, string>(
    earnedUserBadges.map((ub) => [ub.badgeId, fmt.format(ub.earnedAt)]),
  );

  // Retroactively award badges whose progress is at 100% but were never triggered.
  // Idempotent: skipDuplicates prevents double-awards across page visits.
  const retroactiveIds = allBadges
    .filter((b) => {
      if (earnedMap.has(b.id)) return false;
      const progress = computeProgress(b.criterionType, b.criterionData, stats);
      return progress !== null && progress.total > 0 && progress.done >= progress.total;
    })
    .map((b) => b.id);

  if (retroactiveIds.length > 0) {
    await prisma.userBadge.createMany({
      data: retroactiveIds.map((badgeId) => ({
        userId: authUser.id,
        badgeId,
        context: { source: "retroactive" },
      })),
      skipDuplicates: true,
    });
    const nowStr = fmt.format(new Date());
    for (const id of retroactiveIds) earnedMap.set(id, nowStr);
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
