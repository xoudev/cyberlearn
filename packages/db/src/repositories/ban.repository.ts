import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";

/**
 * Bans: issuing one, finding the one in force, and lifting it.
 *
 * The rule for "in force" is written once, as a where-clause, and every read
 * uses it. Two spellings of it - one that forgets `liftedAt`, say - is how
 * somebody stays locked out of a ban an administrator lifted this morning.
 */

/**
 * What "banned right now" means, as a filter.
 *
 * Not lifted, and either permanent or not yet expired. Taking `now` as an
 * argument rather than calling new Date() inside keeps one clock per request:
 * two clauses built a millisecond apart could otherwise disagree about a ban
 * expiring between them.
 */
export function activeBanFilter(now: Date): Prisma.UserBanWhereInput {
  return {
    liftedAt: null,
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  };
}

const BAN_VIEW = {
  id: true,
  reason: true,
  expiresAt: true,
  createdAt: true,
  liftedAt: true,
  acknowledgedAt: true,
  appealTicketId: true,
  issuedBy: { select: { displayName: true, username: true } },
} as const satisfies Prisma.UserBanSelect;

export type BanView = Prisma.UserBanGetPayload<{ select: typeof BAN_VIEW }>;

export const banRepository = {
  /**
   * The ban keeping this account out right now, or null.
   *
   * Asked on every authenticated request, which is why it selects a handful of
   * columns off an index rather than the row.
   */
  async findActive(userId: string, now: Date = new Date()): Promise<BanView | null> {
    return prisma.userBan.findFirst({
      where: { userId, ...activeBanFilter(now) },
      orderBy: { createdAt: "desc" },
      select: BAN_VIEW,
    });
  },

  /**
   * Issues a ban.
   *
   * Refuses when one is already in force: a second ban on top of the first
   * would have two reasons and two end dates for one person, and lifting one of
   * them would look like it had done nothing. Extending or replacing means
   * lifting the first, which is a decision somebody has to make on purpose.
   */
  async issue(input: {
    userId: string;
    reason: string;
    /** Null is permanent. */
    expiresAt: Date | null;
    issuedById: string;
    now?: Date;
  }): Promise<{ ok: true; ban: BanView } | { ok: false; reason: "ALREADY_BANNED" }> {
    const now = input.now ?? new Date();
    const existing = await this.findActive(input.userId, now);
    if (existing) return { ok: false, reason: "ALREADY_BANNED" };

    const ban = await prisma.userBan.create({
      data: {
        userId: input.userId,
        reason: input.reason,
        expiresAt: input.expiresAt,
        issuedById: input.issuedById,
      },
      select: BAN_VIEW,
    });
    return { ok: true, ban };
  },

  /**
   * Lifts the ban in force, if there is one.
   *
   * By user rather than by id, because that is the question being answered:
   * "let this person back in". Returns false when there was nothing to lift,
   * so a caller does not report having done something it did not.
   */
  async lift(input: {
    userId: string;
    liftedById: string;
    reason?: string;
    now?: Date;
  }): Promise<boolean> {
    const now = input.now ?? new Date();
    const result = await prisma.userBan.updateMany({
      where: { userId: input.userId, ...activeBanFilter(now) },
      data: {
        liftedAt: now,
        liftedById: input.liftedById,
        liftReason: input.reason ?? null,
      },
    });
    return result.count > 0;
  },

  /**
   * Marks the notice as seen, so it is shown once rather than on every page.
   *
   * Only ever set, never cleared, and only on a ban that is still in force -
   * closing the notice on an old ban must not mark a new one as read.
   */
  async acknowledge(banId: string, userId: string, now: Date = new Date()): Promise<void> {
    await prisma.userBan.updateMany({
      where: { id: banId, userId, acknowledgedAt: null, ...activeBanFilter(now) },
      data: { acknowledgedAt: now },
    });
  },

  /**
   * Ties an appeal to the ban it contests.
   *
   * The unique index is what stops a second one: a person who files twice on
   * the same decision is having the same conversation, and it already has a
   * thread. Returns false when one is already attached.
   */
  async attachAppeal(banId: string, userId: string, ticketId: string): Promise<boolean> {
    const result = await prisma.userBan.updateMany({
      where: { id: banId, userId, appealTicketId: null },
      data: { appealTicketId: ticketId },
    });
    return result.count > 0;
  },

  /** Every ban this account has had, newest first - the record, not the state. */
  async history(userId: string) {
    return prisma.userBan.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        ...BAN_VIEW,
        liftReason: true,
        liftedBy: { select: { displayName: true, username: true } },
      },
    });
  },
};
