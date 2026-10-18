import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";

/**
 * A learner's settings, as the pages that change them write them.
 *
 * The row is created at onboarding, so somebody who reached their settings
 * has one. Every write is an upsert all the same: an account whose row went
 * missing saves its settings rather than failing on them.
 */

/** The settings a page changes: any of the row's columns but the account it belongs to. */
export type PreferenceChanges = Omit<Prisma.UserPreferencesUncheckedCreateInput, "userId">;

export const preferencesRepository = {
  /**
   * Writes these settings and only these: a column left out keeps its value,
   * and a row created here takes the defaults for the rest.
   */
  async save(userId: string, changes: PreferenceChanges): Promise<void> {
    await prisma.userPreferences.upsert({
      where: { userId },
      create: { userId, ...changes },
      update: changes,
    });
  },
};
