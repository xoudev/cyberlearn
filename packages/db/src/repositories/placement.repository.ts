import { prisma } from "../prisma.js";

/**
 * The placement test, from the console's side.
 *
 * The test is taken once: its pages and the app's screen send anybody with a
 * result elsewhere. A test sat in a hurry, or by somebody who has since
 * learned what it asks, therefore stayed on the account for good, with the
 * lessons it waived. Resetting it is the only way to sit it again.
 */

/** Why the test waives a lesson: the default of UserSkipWaiver.grantReason. */
export const PLACEMENT_WAIVER_REASON = "placement_test";

/** The audit action of a placement test reset from the console. */
export const PLACEMENT_RESET_ACTION = "admin.user.placement.reset";

export type PlacementResetResult =
  | { ok: true; scores: { dev: number; cybersec: number; network: number }; waiversRemoved: number }
  | { ok: false; reason: "NO_RESULT" };

export const placementRepository = {
  /**
   * Removes the account's result and the lessons the test waived, so that it
   * can sit the test again. Lessons it finished stay finished: a waiver only
   * opened them, and the progress is its own. Waivers granted for any other
   * reason stay too.
   *
   * One transaction, with its audit row, which keeps the scores that went.
   */
  async reset(userId: string, by: { actorId: string }): Promise<PlacementResetResult> {
    return prisma.$transaction(async (tx): Promise<PlacementResetResult> => {
      const result = await tx.userPlacementResult.findUnique({
        where: { userId },
        select: { id: true, devScore: true, cybersecScore: true, networkScore: true },
      });
      if (result === null) return { ok: false, reason: "NO_RESULT" };

      await tx.userPlacementResult.delete({ where: { id: result.id } });
      const waivers = await tx.userSkipWaiver.deleteMany({
        where: { userId, grantReason: PLACEMENT_WAIVER_REASON },
      });
      const scores = {
        dev: result.devScore,
        cybersec: result.cybersecScore,
        network: result.networkScore,
      };
      await tx.auditLog.create({
        data: {
          actorId: by.actorId,
          action: PLACEMENT_RESET_ACTION,
          targetType: "User",
          targetId: userId,
          metadata: { ...scores, waiversRemoved: waivers.count },
        },
      });
      return { ok: true, scores, waiversRemoved: waivers.count };
    });
  },
};
