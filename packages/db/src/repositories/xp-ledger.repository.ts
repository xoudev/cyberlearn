import type { XpSource } from "@prisma/client";
import { prisma } from "../prisma.js";

/** One credit of XP as the ledger keeps it: negative for XP taken back. */
export interface XpLedgerRow {
  id: string;
  amount: number;
  source: XpSource;
  createdAt: Date;
}

export const xpLedgerRepository = {
  /**
   * The latest credits of one account, newest first, for its page in the
   * console: what an XP figure is made of, and the line a correction added.
   */
  async recentForUser(userId: string, limit = 20): Promise<XpLedgerRow[]> {
    return prisma.xpLedger.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit,
      select: { id: true, amount: true, source: true, createdAt: true },
    });
  },

  /** Every credit of the account, newest first, for its GDPR export (rgpd/build-export.ts). */
  async exportFor(userId: string) {
    return prisma.xpLedger.findMany({
      where: { userId },
      select: { amount: true, source: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
  },
};
