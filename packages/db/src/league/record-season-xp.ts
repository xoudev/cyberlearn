import type { Prisma } from "@prisma/client";
import { pickPod } from "@cyberlearn/lib";

/**
 * Records seasonXp for the active season, inside the caller's transaction.
 *
 * No-op until a season is seeded (db:seed-season), so the league is opt-in and
 * creditXp behaves exactly as before until then. On a user's FIRST xp of a
 * season, auto-joins them: their division carries over from the previous season
 * (Bronze for newcomers), placed in the first pod with room. Subsequent credits
 * just increment seasonXp (one cheap update).
 *
 * A negative amount is XP taken back from the console. It comes off the
 * season's figure without taking it below zero, and never makes anybody join
 * a season: a correction is not taking part.
 */
export async function recordSeasonXp(
  tx: Prisma.TransactionClient,
  userId: string,
  amount: number,
): Promise<void> {
  if (amount === 0) return;

  const season = await tx.season.findFirst({
    where: { status: "ACTIVE" },
    select: { id: true, index: true },
  });
  if (!season) return;

  if (amount < 0) {
    await takeBackSeasonXp(tx, userId, season.id, -amount);
    return;
  }

  // Common path: already a member of this season -> just increment.
  const incremented = await tx.leagueMembership.updateMany({
    where: { userId, seasonId: season.id },
    data: { seasonXp: { increment: amount } },
  });
  if (incremented.count > 0) return;

  // First xp of the season: auto-join. Carry the division over from the most
  // recent prior season; place in the first pod that still has room.
  const previous = await tx.leagueMembership.findFirst({
    where: { userId, season: { index: { lt: season.index } } },
    orderBy: { season: { index: "desc" } },
    select: { division: true },
  });
  const division = previous?.division ?? "BRONZE";

  const podCounts = await tx.leagueMembership.groupBy({
    by: ["pod"],
    where: { seasonId: season.id, division },
    _count: { _all: true },
  });
  const pod = pickPod(podCounts.map((p) => ({ pod: p.pod, count: p._count._all })));

  // Upsert is race-safe: a concurrent first-join hits the update branch.
  await tx.leagueMembership.upsert({
    where: { userId_seasonId: { userId, seasonId: season.id } },
    create: { userId, seasonId: season.id, division, pod, seasonXp: amount },
    update: { seasonXp: { increment: amount } },
  });
}

/**
 * Lowers seasonXp by `taken`, stopping at zero. Two guarded statements rather
 * than a read then a write: each one re-checks its condition on the locked
 * row, so a credit landing in between is never overwritten.
 */
async function takeBackSeasonXp(
  tx: Prisma.TransactionClient,
  userId: string,
  seasonId: string,
  taken: number,
): Promise<void> {
  const lowered = await tx.leagueMembership.updateMany({
    where: { userId, seasonId, seasonXp: { gte: taken } },
    data: { seasonXp: { decrement: taken } },
  });
  if (lowered.count > 0) return;
  await tx.leagueMembership.updateMany({
    where: { userId, seasonId, seasonXp: { lt: taken } },
    data: { seasonXp: 0 },
  });
}
