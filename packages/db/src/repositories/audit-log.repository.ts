import type { Prisma } from "@prisma/client";
import { AUDIT_ACTION, CONSOLE_AUDIT_ACTIONS, type AuditAction } from "../audit-actions.js";
import { prisma } from "../prisma.js";
import { readSlice, type ConsolePage, type ConsoleSlice, type SortDir } from "./console-page.js";
import { WITHOUT_CRON_RUNS } from "./cron-run.repository.js";

/**
 * The audit log: the one entry a console gesture writes, and the log as the
 * console reads it - a page under filters, the names of the actions it holds,
 * and the batches its CSV export streams.
 *
 * The page used to read the last 500 entries and filter them in the browser,
 * so a gesture older than that could not be found at all, even by its date.
 */

/** One entry, as a console gesture writes it. */
export interface AuditEntry {
  actorId: string;
  /** One of the catalogue's names (audit-actions.ts), never a string spelled here. */
  action: AuditAction;
  /** The kind of thing acted on, as the list prints it: "User", "Lesson", "ContactTicket". */
  targetType: string;
  /** Which one; null for a gesture on nothing in particular, such as an export of the log. */
  targetId: string | null;
  /** What the gesture changed or decided. Left out, the column stays null. */
  metadata?: Prisma.InputJsonObject | undefined;
  /**
   * For an entry about an account erased in the same gesture: the hashed id
   * the erasure left in its place, and the flag that says the row is about a
   * person no longer there.
   */
  actorHashedId?: string | undefined;
  anonymized?: boolean | undefined;
}

/** What the console narrows the log by; every part is optional. */
export interface AuditFilter {
  /** An account id, or part of an address, a @pseudo or a display name. */
  actor?: string | undefined;
  /** An id, the first characters of one, or a target type ("User", "Lesson"). */
  target?: string | undefined;
  /** One action, exactly ("admin.user.mfa_reset"). */
  action?: string | undefined;
  /** From this instant, included. */
  from?: Date | undefined;
  /** Up to this instant, excluded. */
  until?: Date | undefined;
  /** Leaves out the scheduled jobs' runs (cron-run.repository.ts), which nobody did. */
  hideCronRuns?: boolean | undefined;
}

export interface AuditQuery extends ConsolePage {
  filter: AuditFilter;
  /** Newest first unless asked otherwise. */
  dir: SortDir;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

const AUDIT_ROW = {
  id: true,
  action: true,
  actorId: true,
  /** Set when the actor's account was deleted: the row stays, without its author. */
  anonymized: true,
  targetType: true,
  targetId: true,
  metadata: true,
  createdAt: true,
  // avatarUrl: the console shows the author's picture beside the name.
  actor: { select: { username: true, displayName: true, email: true, avatarUrl: true } },
} as const satisfies Prisma.AuditLogSelect;

export type AuditRow = Prisma.AuditLogGetPayload<{ select: typeof AUDIT_ROW }>;

/**
 * The entries a filter matches. Each part is its own term of an AND: the
 * actor and the target both say OR, and spread into one object the second
 * would replace the first.
 *
 * An id is matched exactly, through the index on it; anything else is looked
 * for in the people (actor) or as a type or the start of an id (target),
 * which is what the list prints: "Lesson · 2b3c4d5e".
 */
export function auditWhere(filter: AuditFilter): Prisma.AuditLogWhereInput {
  const terms: Prisma.AuditLogWhereInput[] = [];

  const actor = filter.actor?.trim().replace(/^@/u, "") ?? "";
  if (actor !== "") {
    terms.push(
      UUID.test(actor)
        ? { actorId: actor.toLowerCase() }
        : {
            actor: {
              is: {
                OR: [
                  { username: { contains: actor, mode: "insensitive" } },
                  { email: { contains: actor, mode: "insensitive" } },
                  { displayName: { contains: actor, mode: "insensitive" } },
                ],
              },
            },
          },
    );
  }

  const target = filter.target?.trim() ?? "";
  if (target !== "") {
    terms.push(
      UUID.test(target)
        ? { targetId: target.toLowerCase() }
        : {
            OR: [
              { targetType: { equals: target, mode: "insensitive" } },
              { targetId: { startsWith: target, mode: "insensitive" } },
            ],
          },
    );
  }

  if (filter.action !== undefined && filter.action !== "") terms.push({ action: filter.action });

  if (filter.hideCronRuns === true) terms.push(WITHOUT_CRON_RUNS);

  if (filter.from !== undefined || filter.until !== undefined) {
    terms.push({
      createdAt: {
        ...(filter.from !== undefined ? { gte: filter.from } : {}),
        ...(filter.until !== undefined ? { lt: filter.until } : {}),
      },
    });
  }

  return { AND: terms };
}

/** The entries of a hide, a restore or a delete whose content an account wrote. */
function contentGesturesOn(authorId: string): Prisma.AuditLogWhereInput {
  return {
    action: {
      in: [AUDIT_ACTION.content.hide, AUDIT_ACTION.content.restore, AUDIT_ACTION.content.delete],
    },
    metadata: { path: ["authorId"], equals: authorId },
  };
}

export const auditLogRepository = {
  /**
   * Writes one entry.
   *
   * Handed the client of a transaction, it writes in that transaction, so the
   * change and its trace land together or not at all. Without one, it writes
   * on its own, after the change: one with no transaction here to share
   * (Supabase Auth, a mail that went out), or one its caller made outside any.
   */
  async record(entry: AuditEntry, db: Prisma.TransactionClient = prisma): Promise<void> {
    const { metadata, actorHashedId, anonymized, ...row } = entry;
    await db.auditLog.create({
      data: {
        ...row,
        ...(metadata !== undefined ? { metadata } : {}),
        ...(actorHashedId !== undefined ? { actorHashedId } : {}),
        ...(anonymized !== undefined ? { anonymized } : {}),
      },
    });
  },

  /** One page of the log under a filter. */
  async list(query: AuditQuery): Promise<ConsoleSlice<AuditRow>> {
    const where = auditWhere(query.filter);
    return readSlice(
      query,
      () => prisma.auditLog.count({ where }),
      ({ skip, take }) =>
        prisma.auditLog.findMany({
          where,
          // The id settles entries written in the same millisecond, so a row
          // never appears on two pages.
          orderBy: [{ createdAt: query.dir }, { id: query.dir }],
          skip,
          take,
          select: AUDIT_ROW,
        }),
    );
  },

  /**
   * The latest entries about one account, for its page in the console: what
   * was done to it, and what it did as an actor. The page links to the full
   * log under the same id for the rest.
   */
  async recentForUser(userId: string, limit = 10): Promise<AuditRow[]> {
    return prisma.auditLog.findMany({
      where: { OR: [{ targetId: userId }, { actorId: userId }] },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit,
      select: AUDIT_ROW,
    });
  },

  /**
   * The console's gestures on what an account published (hidden, shown again,
   * deleted), newest first, with how many there are in all. They are written
   * against the content, with the author in the metadata: a deleted content
   * leaves nothing else to find its author by, and recentForUser, which reads
   * the target and the actor, never sees them.
   */
  async contentGesturesOnAuthor(
    authorId: string,
    limit = 10,
  ): Promise<{ total: number; rows: AuditRow[] }> {
    const where = contentGesturesOn(authorId);
    const [total, rows] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit,
        select: AUDIT_ROW,
      }),
    ]);
    return { total, rows };
  },

  async count(filter: AuditFilter): Promise<number> {
    return prisma.auditLog.count({ where: auditWhere(filter) });
  },

  /**
   * The actions the filter offers: every one the console writes, from the
   * catalogue, whether or not the log holds one yet, and every other the log
   * holds (the site's, the scheduled jobs', names no longer written). Once
   * each, sorted.
   *
   * The catalogue is what lets a link from another page (the announcements'
   * history) filter on an action nobody has used yet, rather than see it
   * dropped as unknown and land on the whole log.
   */
  async actionNames(): Promise<string[]> {
    const rows = await prisma.auditLog.findMany({
      distinct: ["action"],
      select: { action: true },
      orderBy: { action: "asc" },
    });
    return [
      ...new Set<string>([...CONSOLE_AUDIT_ACTIONS, ...rows.map((row) => row.action)]),
    ].sort();
  },

  /**
   * One batch of an export, newest first, after the entry `after` when given.
   * Keyed on the last entry rather than on an offset, so entries written while
   * the export runs neither shift a batch nor repeat a row.
   */
  async exportBatch(filter: AuditFilter, after: string | null, size: number): Promise<AuditRow[]> {
    return prisma.auditLog.findMany({
      where: auditWhere(filter),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: size,
      ...(after !== null ? { cursor: { id: after }, skip: 1 } : {}),
      select: AUDIT_ROW,
    });
  },
};
