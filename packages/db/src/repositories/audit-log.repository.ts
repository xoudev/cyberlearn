import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";
import { readSlice, type ConsolePage, type ConsoleSlice, type SortDir } from "./console-page.js";

/**
 * The audit log as the console reads it: a page under filters, the names of
 * the actions it holds, and the batches its CSV export streams.
 *
 * The page used to read the last 500 entries and filter them in the browser,
 * so a gesture older than that could not be found at all, even by its date.
 */

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
  actor: { select: { username: true, displayName: true, email: true } },
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

export const auditLogRepository = {
  /**
   * Writes one entry, for a gesture whose repository has no transaction of
   * its own to write it in: the change happened elsewhere (Supabase Auth),
   * and this is its trace.
   */
  async record(entry: {
    actorId: string;
    action: string;
    targetType: string;
    targetId: string | null;
    metadata: Prisma.InputJsonObject;
  }): Promise<void> {
    await prisma.auditLog.create({ data: entry });
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

  async count(filter: AuditFilter): Promise<number> {
    return prisma.auditLog.count({ where: auditWhere(filter) });
  },

  /** Every action the log holds, for the filter's list. */
  async actionNames(): Promise<string[]> {
    const rows = await prisma.auditLog.findMany({
      distinct: ["action"],
      select: { action: true },
      orderBy: { action: "asc" },
    });
    return rows.map((row) => row.action);
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
