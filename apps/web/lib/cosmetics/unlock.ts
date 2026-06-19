import { badgeRepository, cosmeticRepository, prisma, userRepository } from "@cyberlearn/db";
import { buildBadgeCriterionStats, isBadgeUnlocked } from "@cyberlearn/lib";

/**
 * Server-side cosmetic unlock sweep: unlocks every active cosmetic whose
 * criterion the user now satisfies. Reuses the badge criterion machine
 * (computeBadgeProgress via isBadgeUnlocked). Idempotent (skipDuplicates), so it
 * is safe to call on every casier visit. Returns the count newly unlocked.
 */
export async function evaluateAndUnlockCosmetics(userId: string): Promise<number> {
  const [catalog, unlocked, user, facts] = await Promise.all([
    cosmeticRepository.listActive(),
    cosmeticRepository.findUnlockedIds(userId),
    userRepository.findForGamification(userId),
    badgeRepository.findCriterionFacts(userId),
  ]);
  if (!user) return 0;

  const stats = buildBadgeCriterionStats(facts, user);
  const toUnlock = catalog.filter((c) => !unlocked.has(c.id) && isBadgeUnlocked(c, stats));
  if (toUnlock.length === 0) return 0;

  const res = await prisma.userCosmetic.createMany({
    data: toUnlock.map((c) => ({ userId, cosmeticId: c.id })),
    skipDuplicates: true,
  });
  return res.count;
}
