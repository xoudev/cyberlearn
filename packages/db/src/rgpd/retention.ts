import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";

/**
 * What the privacy policy says is kept, kept no longer.
 *
 * apps/web/app/privacy/page.tsx, sections 3 and 4, gives a duration for each
 * kind of record; until this ran daily, nothing enforced them, and a promise
 * the site does not keep is worse than none. A change to a number here is a
 * change to that page, and the other way round.
 *
 * What this does not cover, and why:
 * - Application logs (6 months): Pino writes to the host's log stream, which
 *   keeps them for less than that. Nothing of them is in the database.
 * - Authentication logs (12 months): Supabase Auth keeps its own, in a schema
 *   the application does not own.
 * - Inactive accounts (24 months): erasing an account is deleteAccount, with a
 *   notice first; it is its own job.
 * - Certificates: they outlive their holder by design, and deleteAccount
 *   already replaces the name on them.
 */
export const RETENTION_MONTHS = {
  /** The security journal, from the moment an entry is written. */
  auditLog: 12,
  /** A resolved or closed support ticket, from its resolution. */
  resolvedTicket: 3,
  /** A ticket still open, from its last activity. */
  openTicket: 12,
} as const;

export interface RetentionSummary {
  auditLogs: number;
  resolvedTickets: number;
  openTickets: number;
  /** Editor previews past their half hour (lesson-preview.repository.ts). */
  lessonPreviews: number;
}

/**
 * The same instant, `months` calendar months earlier (UTC). A day the earlier
 * month does not have becomes its last: one month before 31 March is 28 or
 * 29 February, where Date would roll over to 3 March and purge three days
 * early.
 */
export function monthsBefore(now: Date, months: number): Date {
  const date = new Date(now);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() - months);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date;
}

/**
 * A ticket that is not the appeal of a ban still in force. That link is what
 * stops a second appeal against the same ban (ban.repository), so purging it
 * would reopen the door; once the ban is lifted or over, it can go.
 */
function notAppealOfBanInForce(now: Date): Prisma.ContactTicketWhereInput {
  return {
    OR: [
      { appealFor: { is: null } },
      { appealFor: { is: { OR: [{ liftedAt: { not: null } }, { expiresAt: { lte: now } }] } } },
    ],
  };
}

/** The tickets past their keeping time, by state. */
export function expiredTicketFilters(now: Date): {
  resolved: Prisma.ContactTicketWhereInput;
  open: Prisma.ContactTicketWhereInput;
} {
  // updatedAt is the resolution for a terminal ticket, since a resolved or
  // closed ticket takes no new message (AGENTS.md, rule 16), and the last
  // message for an open one, since a reply bumps the row.
  return {
    resolved: {
      AND: [
        { status: { in: ["RESOLVED", "CLOSED"] } },
        { updatedAt: { lt: monthsBefore(now, RETENTION_MONTHS.resolvedTicket) } },
        notAppealOfBanInForce(now),
      ],
    },
    open: {
      AND: [
        { status: { in: ["OPEN", "IN_PROGRESS"] } },
        { updatedAt: { lt: monthsBefore(now, RETENTION_MONTHS.openTicket) } },
        notAppealOfBanInForce(now),
      ],
    },
  };
}

/**
 * Deletes what has outlived its retention: audit entries, and support tickets
 * with their messages (by cascade). Idempotent: a second run the same day
 * finds nothing. Records what it did in the audit log, which this same job
 * empties in turn twelve months later.
 */
export async function purgeExpiredRecords(now: Date): Promise<RetentionSummary> {
  const tickets = expiredTicketFilters(now);
  const [auditLogs, resolvedTickets, openTickets, lessonPreviews] = await prisma.$transaction([
    prisma.auditLog.deleteMany({
      where: { createdAt: { lt: monthsBefore(now, RETENTION_MONTHS.auditLog) } },
    }),
    prisma.contactTicket.deleteMany({ where: tickets.resolved }),
    prisma.contactTicket.deleteMany({ where: tickets.open }),
    prisma.lessonPreview.deleteMany({ where: { expiresAt: { lt: now } } }),
  ]);

  const summary: RetentionSummary = {
    auditLogs: auditLogs.count,
    resolvedTickets: resolvedTickets.count,
    openTickets: openTickets.count,
    lessonPreviews: lessonPreviews.count,
  };
  if (Object.values(summary).some((count) => count > 0)) {
    await prisma.auditLog.create({
      data: {
        actorId: null,
        action: "retention.purge",
        targetType: "Retention",
        metadata: { ...summary },
      },
    });
  }
  return summary;
}
