import { mfaPinVerdict, type MfaPinVerdict } from "@cyberlearn/lib/auth/mfa-pin";
import { prisma } from "../prisma.js";

/**
 * The TOTP factors each administrator signs in to the console with, pinned
 * the first time the console sees them (admin_mfa_pins, mfaPinVerdict of
 * @cyberlearn/lib). Read by the console's guard on every page and action.
 */
export const adminMfaPinRepository = {
  /**
   * Compares the account's verified factors with its pins, and pins them when
   * there are none yet. "changed" closes the console.
   */
  async check(userId: string, verifiedFactorIds: readonly string[]): Promise<MfaPinVerdict> {
    const pinned = await prisma.adminMfaPin.findMany({
      where: { userId },
      select: { factorId: true },
    });
    const verdict = mfaPinVerdict(
      pinned.map((p) => p.factorId),
      verifiedFactorIds,
    );
    if (verdict === "pin" && verifiedFactorIds.length > 0) {
      // Two first requests at once pin the same rows: the second is a no-op.
      await prisma.adminMfaPin.createMany({
        data: verifiedFactorIds.map((factorId) => ({ userId, factorId })),
        skipDuplicates: true,
      });
    }
    return verdict;
  },

  /**
   * Forgets the account's pins, when its factors are reset: the next
   * enrolment is pinned in turn. Part of the recovery, never of the site.
   */
  async clear(userId: string): Promise<number> {
    const { count } = await prisma.adminMfaPin.deleteMany({ where: { userId } });
    return count;
  },
};
