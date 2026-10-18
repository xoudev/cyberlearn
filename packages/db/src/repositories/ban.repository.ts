import type { Prisma } from "@prisma/client";
import { AUDIT_ACTION } from "../audit-actions.js";
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

/** The journal's action for a lift, from whichever page of the console it came. */
const BAN_LIFTED_ACTION = AUDIT_ACTION.user.banLifted;

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
   *
   * `banId` narrows it to one decision, for a caller that is answering that
   * decision rather than the person: an appeal contests the ban it was filed
   * against, and accepting it must not lift a newer one issued since. It is in
   * the same statement as the "in force" filter, so a ban lifted or expired in
   * the meantime is refused rather than read and then written.
   *
   * `auditMetadata` asks for the journal's `admin.user.ban_lifted` row in the
   * same transaction, written only when something was lifted: a lift the
   * journal does not show, or a line for a lift that did not happen, would
   * both leave the account's record saying something untrue. A failure rolls
   * the lift back with it, so the caller can say nothing was changed.
   */
  async lift(input: {
    userId: string;
    liftedById: string;
    reason?: string;
    banId?: string;
    auditMetadata?: Prisma.InputJsonObject;
    now?: Date;
  }): Promise<boolean> {
    const now = input.now ?? new Date();
    return prisma.$transaction(async (tx) => {
      const result = await tx.userBan.updateMany({
        where: {
          userId: input.userId,
          ...(input.banId !== undefined ? { id: input.banId } : {}),
          ...activeBanFilter(now),
        },
        data: {
          liftedAt: now,
          liftedById: input.liftedById,
          liftReason: input.reason ?? null,
        },
      });
      if (result.count === 0) return false;
      if (input.auditMetadata !== undefined) {
        await tx.auditLog.create({
          data: {
            actorId: input.liftedById,
            action: BAN_LIFTED_ACTION,
            targetType: "User",
            targetId: input.userId,
            metadata: input.auditMetadata,
          },
        });
      }
      return true;
    });
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
