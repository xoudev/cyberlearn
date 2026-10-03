import { prisma } from "../prisma.js";
import { monthsBefore } from "./retention.js";

/**
 * Erasing the accounts nobody uses any more, as the privacy policy says
 * (apps/web/app/privacy/page.tsx, section 4: 24 months without a sign-in).
 *
 * Never without warning. An account is erased only once a notice went out at
 * least 30 days earlier and nothing has happened on it since; the notice
 * carries a link that keeps the account in one click, and signing in or
 * finishing a lesson keeps it too, by moving lastActiveAt past the notice.
 * The notice is recorded only once its mail has left, so an account whose
 * mail failed is never erased on the strength of a notice nobody received.
 *
 * "Inactive" is lastActiveAt, which a sign-in (userRepository.upsertFromAuth)
 * and every lesson or challenge finished move forward.
 *
 * Administrator accounts are left out: the console must not lose the people
 * who run it to a job that runs at night.
 */
export const INACTIVITY = {
  /** Without activity, then the account goes. */
  eraseAfterMonths: 24,
  /** Between the notice and the erasure, at least. */
  noticeDays: 30,
} as const;

const DAY_MS = 24 * 60 * 60 * 1000;

/** An account the job writes to. */
export interface InactiveAccount {
  id: string;
  email: string;
  displayName: string;
}

/** The day the erasure can come, for a notice sent at `sentAt`. */
export function erasureDate(sentAt: Date): Date {
  return new Date(sentAt.getTime() + INACTIVITY.noticeDays * DAY_MS);
}

/**
 * The accounts to warn: inactive long enough that the erasure falls due within
 * the notice period, and not warned since their last activity. Oldest first.
 */
export async function findAccountsToWarn(now: Date, limit: number): Promise<InactiveAccount[]> {
  const inactiveBefore = new Date(
    monthsBefore(now, INACTIVITY.eraseAfterMonths).getTime() + INACTIVITY.noticeDays * DAY_MS,
  );
  return prisma.user.findMany({
    where: {
      role: { not: "ADMIN" },
      lastActiveAt: { lt: inactiveBefore },
      OR: [
        { inactivityNoticeAt: null },
        // A notice older than the last activity was answered: it no longer counts.
        { inactivityNoticeAt: { lt: prisma.user.fields.lastActiveAt } },
      ],
    },
    select: { id: true, email: true, displayName: true },
    orderBy: { lastActiveAt: "asc" },
    take: limit,
  });
}

/**
 * The accounts to erase: inactive for the full period, warned at least the
 * notice period ago, and silent since the notice. Oldest first.
 */
export async function findAccountsToErase(now: Date, limit: number): Promise<{ id: string }[]> {
  return prisma.user.findMany({
    where: {
      role: { not: "ADMIN" },
      lastActiveAt: { lt: monthsBefore(now, INACTIVITY.eraseAfterMonths) },
      inactivityNoticeAt: {
        not: null,
        lte: new Date(now.getTime() - INACTIVITY.noticeDays * DAY_MS),
        gte: prisma.user.fields.lastActiveAt,
      },
    },
    select: { id: true },
    orderBy: { lastActiveAt: "asc" },
    take: limit,
  });
}

/** Records a notice once its mail has gone, with the hash of the link it carried. */
export async function recordInactivityNotice(
  userId: string,
  sentAt: Date,
  keepTokenHash: string,
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { inactivityNoticeAt: sentAt, inactivityKeepTokenHash: keepTokenHash },
  });
}

/**
 * Keeps the account a notice's link belongs to: counts as activity, voids the
 * notice and the link, and says so in the audit log. The account's id, or null
 * when no account holds that link any more (already used, or the account is
 * gone).
 */
export async function keepAccountByToken(keepTokenHash: string, now: Date): Promise<string | null> {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { inactivityKeepTokenHash: keepTokenHash },
      select: { id: true },
    });
    if (!user) return null;
    await tx.user.update({
      where: { id: user.id },
      data: { lastActiveAt: now, inactivityNoticeAt: null, inactivityKeepTokenHash: null },
    });
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: "user.account.kept",
        targetType: "User",
        targetId: user.id,
      },
    });
    return user.id;
  });
}
