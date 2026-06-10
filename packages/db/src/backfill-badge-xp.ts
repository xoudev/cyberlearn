// One-shot backfill: credit Badge.xpReward for user_badges rows that were
// awarded BEFORE crediting existed (the award paths now credit at insertion
// time and stamp context.xpCredited).
//
// IDEMPOTENCE: a full "recompute xpTotal from all sources and SET it" is NOT
// safe here — review XP (review-actions awards 10% of a lesson's reward per
// review event) is not reconstructible from stored data, so a recompute would
// destroy it. Instead each credited row is stamped with context.xpCredited in
// the SAME transaction as the user XP update; re-running the script finds no
// unstamped rows and is a no-op. The runtime award helper stamps new rows at
// insertion, so post-deploy rows are never picked up either.
//
// Dry-run by default; pass --apply to write. Credits use the CURRENT
// Badge.xpReward value (no historical snapshot exists).

import { computeLevel } from "@cyberlearn/lib";
import type { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "./prisma.js";

export interface BackfillUserReport {
  userId: string;
  unstampedBadges: number;
  xpDelta: number;
  xpBefore: number;
  xpAfter: number;
  levelBefore: number;
  levelAfter: number;
}

export interface BackfillReport {
  applied: boolean;
  totalUnstampedRows: number;
  users: BackfillUserReport[];
}

function hasCreditStamp(context: unknown): boolean {
  return (
    typeof context === "object" &&
    context !== null &&
    typeof (context as Record<string, unknown>).xpCredited === "number"
  );
}

export async function backfillBadgeXp(
  apply: boolean,
  client: PrismaClient = defaultPrisma,
): Promise<BackfillReport> {
  const rows = await client.userBadge.findMany({
    select: {
      id: true,
      userId: true,
      context: true,
      badge: { select: { xpReward: true } },
    },
  });

  const unstamped = rows.filter((row) => !hasCreditStamp(row.context));

  const byUser = new Map<string, typeof unstamped>();
  for (const row of unstamped) {
    const bucket = byUser.get(row.userId) ?? [];
    bucket.push(row);
    byUser.set(row.userId, bucket);
  }

  const users: BackfillUserReport[] = [];

  for (const [userId, userRows] of byUser) {
    const xpDelta = userRows.reduce((sum, row) => sum + row.badge.xpReward, 0);
    const user = await client.user.findUnique({
      where: { id: userId },
      select: { xpTotal: true, level: true },
    });
    if (!user) continue;

    const xpAfter = user.xpTotal + xpDelta;
    users.push({
      userId,
      unstampedBadges: userRows.length,
      xpDelta,
      xpBefore: user.xpTotal,
      xpAfter,
      levelBefore: user.level,
      levelAfter: computeLevel(xpAfter).level,
    });

    if (!apply) continue;

    await client.$transaction(async (tx) => {
      // Stamp every row (including zero-XP badges) so re-runs are no-ops.
      for (const row of userRows) {
        const base =
          typeof row.context === "object" && row.context !== null
            ? (row.context as Record<string, unknown>)
            : {};
        await tx.userBadge.update({
          where: { id: row.id },
          data: { context: { ...base, xpCredited: row.badge.xpReward } },
        });
      }
      if (xpDelta > 0) {
        // Re-read inside the transaction: activity between the report
        // computation and this write must not be clobbered.
        const fresh = await tx.user.findUniqueOrThrow({
          where: { id: userId },
          select: { xpTotal: true },
        });
        const total = fresh.xpTotal + xpDelta;
        await tx.user.update({
          where: { id: userId },
          data: { xpTotal: total, level: computeLevel(total).level },
        });
      }
    });
  }

  return { applied: apply, totalUnstampedRows: unstamped.length, users };
}
