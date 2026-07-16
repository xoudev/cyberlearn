import type React from "react";
import type { Metadata } from "next";
import { badgeRepository, cosmeticRepository, prisma } from "@cyberlearn/db";
import { buildBadgeCriterionStats, computeBadgeProgress, computeLevel } from "@cyberlearn/lib";
import { requireRequestUser } from "@/lib/auth";
import { evaluateAndUnlockCosmetics } from "@/lib/cosmetics/unlock";
import { LockerClient, type LockerItem } from "./_components/locker-client";

export const metadata: Metadata = { title: "Casier" };

function numField(data: unknown, key: string): number | null {
  if (typeof data !== "object" || data === null) return null;
  const v = (data as Record<string, unknown>)[key];
  return typeof v === "number" ? v : null;
}
function strField(data: unknown, key: string): string | null {
  if (typeof data !== "object" || data === null) return null;
  const v = (data as Record<string, unknown>)[key];
  return typeof v === "string" ? v : null;
}

export default async function LockerPage(): Promise<React.ReactElement> {
  const authUser = await requireRequestUser();

  // Unlock anything newly eligible on visit (idempotent), then read state.
  await evaluateAndUnlockCosmetics(authUser.id);

  const [catalog, user, facts] = await Promise.all([
    cosmeticRepository.findCatalogWithState(authUser.id),
    prisma.user.findUnique({
      where: { id: authUser.id },
      select: { xpTotal: true, streakDays: true, username: true, displayName: true },
    }),
    badgeRepository.findCriterionFacts(authUser.id),
  ]);

  const stats = buildBadgeCriterionStats(facts, {
    xpTotal: user?.xpTotal ?? 0,
    streakDays: user?.streakDays ?? 0,
  });

  // Resolve badge names for BADGE_EARNED unlock conditions.
  const badgeRefs = catalog
    .map((c) =>
      c.criterionType === "BADGE_EARNED" ? strField(c.criterionData, "badgeRefCode") : null,
    )
    .filter((r): r is string => r !== null);
  const badgeRows = badgeRefs.length
    ? await prisma.badge.findMany({
        where: { refCode: { in: badgeRefs } },
        select: { refCode: true, name: true },
      })
    : [];
  const badgeNames = new Map(badgeRows.map((b) => [b.refCode, b.name]));

  function conditionLabel(type: string, data: unknown): string {
    if (type === "LEVEL") {
      const l = numField(data, "level");
      return l !== null ? `Niveau ${String(l)}` : "Niveau requis";
    }
    if (type === "BADGE_EARNED") {
      const r = strField(data, "badgeRefCode");
      return r !== null ? `Badge ${badgeNames.get(r) ?? r}` : "Badge requis";
    }
    return "Condition spéciale";
  }

  const items: LockerItem[] = catalog.map((c) => {
    const progress = c.unlocked
      ? null
      : computeBadgeProgress(c.criterionType, c.criterionData, stats);
    return {
      id: c.id,
      code: c.code,
      // SAFETY: cosmetic.type is the CosmeticType enum; widened to the client union.
      type: c.type,
      label: c.label,
      description: c.description,
      rarity: c.rarity,
      unlocked: c.unlocked,
      equipped: c.equipped,
      condition: conditionLabel(c.criterionType, c.criterionData),
      progressDone: progress?.done ?? 0,
      progressTotal: progress?.total ?? 0,
    };
  });

  const displayName = user?.displayName ?? "";
  return (
    <LockerClient
      items={items}
      profile={{
        username: user?.username ?? null,
        displayName,
        initial: (displayName.charAt(0) || "?").toUpperCase(),
        level: computeLevel(user?.xpTotal ?? 0).level,
        badgesCount: facts.earnedBadgeRefCodes.length,
        streakDays: user?.streakDays ?? 0,
      }}
    />
  );
}
