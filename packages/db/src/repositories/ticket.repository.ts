import { AUDIT_ACTION } from "../audit-actions.js";
import { prisma } from "../prisma.js";
import type { Prisma, TicketStatus, TicketTheme } from "@prisma/client";

/**
 * Tickets, and the conversation on them.
 *
 * Every read here is scoped by the caller's own id rather than by a role, like
 * the class reads: Prisma connects as the table owner and bypasses RLS, so the
 * policies on contact_tickets and ticket_messages are a second line of defence
 * over the Data API and these where clauses are the ones doing the work.
 *
 * A ticket's first message is the ticket itself rather than a row in the
 * thread. The thread is what came after.
 */

/**
 * A status a conversation can still be added to, versus one that is the end of
 * it.
 *
 * RESOLVED and CLOSED are both endings. RESOLVED used to be an ending for the
 * requester only - the console could still write into it - which made it two
 * different things depending on who was looking: a finished ticket on one
 * screen and an open one on the other. A ticket that has been answered is
 * answered; what comes after is a new ticket.
 */
export const OPEN_TICKET_STATUSES = ["OPEN", "IN_PROGRESS"] as const;

export function isTicketOpen(status: TicketStatus): boolean {
  // Deliberately a list of what is open rather than of what is not: a fifth
  // status added later is closed to replies until somebody says otherwise,
  // which is the safe way round for a gate.
  return (OPEN_TICKET_STATUSES as readonly TicketStatus[]).includes(status);
}

/** Why a message was refused, so each caller can say so in its own words. */
export type AddMessageResult = { ok: true } | { ok: false; reason: "NOT_FOUND" | "TERMINAL" };

/** The same for an internal note, which follows the same gate. */
export type AddNoteResult =
  | { ok: true; noteId: string }
  | { ok: false; reason: "NOT_FOUND" | "TERMINAL" };

/** What assigning a ticket did, or why it did not. */
export type AssignTicketResult =
  | { ok: true; changed: boolean }
  | { ok: false; reason: "NOT_FOUND" | "NOT_ADMIN" };

/** The audit actions the console's ticket bookkeeping writes. */
export const TICKET_ASSIGN_ACTION = AUDIT_ACTION.ticket.assign;
export const TICKET_NOTE_ACTION = AUDIT_ACTION.ticket.noteAdd;

/**
 * The themes whose tickets the console calls critical while they are open.
 *
 * One definition for every screen that counts them. The overview counted only
 * OPEN ones and the tickets page OPEN and IN_PROGRESS, so a security report
 * taken in hand read "aucun critique" on one and "1" on the other.
 */
export const CRITICAL_TICKET_THEMES = ["BUG", "SECURITY"] as const satisfies readonly TicketTheme[];

/** A bug or a security report that is not over yet. */
export function isCriticalTicket(ticket: { status: TicketStatus; theme: TicketTheme }): boolean {
  return (
    isTicketOpen(ticket.status) && CRITICAL_TICKET_THEMES.some((theme) => theme === ticket.theme)
  );
}

/** The same rule as a filter, for a count. */
export const CRITICAL_TICKET_WHERE = {
  status: { in: [...OPEN_TICKET_STATUSES] },
  theme: { in: [...CRITICAL_TICKET_THEMES] },
} satisfies Prisma.ContactTicketWhereInput;

/**
 * Whether the requester wrote last on a ticket the team has taken in hand.
 *
 * A requester's reply changes no status - only the team's does, OPEN to
 * IN_PROGRESS - so "toujours bloqué" on a ticket in progress used to land in
 * the thread with nothing in the console to say so: same status, same place in
 * the list, no count anywhere. This is that signal. An OPEN ticket is already
 * the team's to answer, follow-up or not, so it is not counted twice.
 *
 * `lastMessageFromStaff` is null for a ticket with no reply in its thread yet.
 */
export function awaitsTeamReply(ticket: {
  status: TicketStatus;
  lastMessageFromStaff: boolean | null;
}): boolean {
  return ticket.status === "IN_PROGRESS" && ticket.lastMessageFromStaff === false;
}

/** The tickets the team owes something: new ones, and the ones answered back. */
export function needsTeam(ticket: {
  status: TicketStatus;
  lastMessageFromStaff: boolean | null;
}): boolean {
  return ticket.status === "OPEN" || awaitsTeamReply(ticket);
}

/** What the console's queue orders a ticket by. */
export interface QueueTicket {
  status: TicketStatus;
  lastMessageFromStaff: boolean | null;
  updatedAt: Date;
}

/** How the tickets the team owes nothing on are ordered: in progress before finished. */
const QUEUE_STATUS_RANK: Record<TicketStatus, number> = {
  OPEN: 0,
  IN_PROGRESS: 1,
  RESOLVED: 2,
  CLOSED: 3,
};

/**
 * The console's queue order, as a comparator for `sort`.
 *
 * What the team owes first - new tickets, and the ones answered back - the
 * most recently touched on top whatever their status; then the rest by status,
 * in progress before finished; most recent first within a group. A reply moves
 * updatedAt, so a ticket somebody just wrote on rises instead of staying where
 * it was opened.
 */
export function compareTicketsForQueue(a: QueueTicket, b: QueueTicket): number {
  const aOwed = needsTeam(a);
  const bOwed = needsTeam(b);
  if (aOwed !== bOwed) return aOwed ? -1 : 1;
  if (!aOwed) {
    const byStatus = QUEUE_STATUS_RANK[a.status] - QUEUE_STATUS_RANK[b.status];
    if (byStatus !== 0) return byStatus;
  }
  return b.updatedAt.getTime() - a.updatedAt.getTime();
}

/** The latest turn of a thread, which says who spoke last. */
export const LAST_TICKET_MESSAGE = {
  orderBy: { createdAt: "desc" },
  take: 1,
  select: { fromStaff: true, createdAt: true },
} satisfies Prisma.ContactTicket$messagesArgs;

/** What the console's quick search shows of a ticket. */
const CONSOLE_TICKET_HIT = {
  id: true,
  subject: true,
  status: true,
  email: true,
  user: { select: { username: true, displayName: true } },
} as const satisfies Prisma.ContactTicketSelect;

export type ConsoleTicketHit = Prisma.ContactTicketGetPayload<{
  select: typeof CONSOLE_TICKET_HIT;
}>;

/**
 * The tickets a console search matches: the subject, or the requester by the
 * address on the ticket or by their account's address, handle or name. A
 * leading @ is dropped, as in the account search, so "@amelie" finds the
 * handle the list prints that way.
 */
export function consoleTicketWhere(q: string): Prisma.ContactTicketWhereInput {
  const term = q.trim().replace(/^@/u, "");
  const contains = { contains: term, mode: "insensitive" } as const;
  return {
    OR: [
      { subject: contains },
      { email: contains },
      {
        user: {
          is: { OR: [{ email: contains }, { username: contains }, { displayName: contains }] },
        },
      },
    ],
  };
}

async function countAwaitingReply(): Promise<number> {
  // In memory over the tickets in progress, a handful at a time: "the last
  // message is the requester's" is not a filter Prisma can say.
  const inProgress = await prisma.contactTicket.findMany({
    where: { status: "IN_PROGRESS" },
    select: { status: true, messages: LAST_TICKET_MESSAGE },
  });
  return inProgress.filter((ticket) =>
    awaitsTeamReply({
      status: ticket.status,
      lastMessageFromStaff: ticket.messages[0]?.fromStaff ?? null,
    }),
  ).length;
}

export const ticketRepository = {
  /** Tickets in progress whose requester wrote last: see awaitsTeamReply. */
  countAwaitingReply,

  /**
   * What the console's sidebar counts: every ticket the team owes something,
   * new ones and the ones answered back, so a reply on a ticket in progress
   * shows up where the team looks first.
   */
  async countNeedingTeam(): Promise<number> {
    const [open, awaiting] = await Promise.all([
      prisma.contactTicket.count({ where: { status: "OPEN" } }),
      countAwaitingReply(),
    ]);
    return open + awaiting;
  },

  /**
   * The few tickets the console's quick search offers for a term. The ones
   * still open come first - the status enum is declared in the order a ticket
   * goes through - then the most recently touched. The console reads every
   * ticket, so nothing here is scoped to a viewer. An empty term matches
   * nothing.
   */
  async searchForConsole(q: string, take: number): Promise<ConsoleTicketHit[]> {
    if (q.trim().replace(/^@/u, "") === "") return [];
    return prisma.contactTicket.findMany({
      where: consoleTicketWhere(q),
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }, { id: "asc" }],
      take,
      select: CONSOLE_TICKET_HIT,
    });
  },

  /** Someone's own tickets, most recently touched first. */
  async findForUser(userId: string) {
    return prisma.contactTicket.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        subject: true,
        theme: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    });
  },

  /**
   * One ticket with its thread, for the person who opened it.
   *
   * viewerId is the entitlement check, not decoration: the query returns
   * nothing for a ticket somebody else opened, so knowing an id is not enough.
   *
   * The columns are named one by one, and the console's own - who has the
   * ticket in hand, the team's notes - are not among them. The site and the
   * app both read through here.
   */
  async findForRequester(ticketId: string, viewerId: string) {
    return prisma.contactTicket.findFirst({
      where: { id: ticketId, userId: viewerId },
      select: {
        id: true,
        subject: true,
        theme: true,
        status: true,
        message: true,
        createdAt: true,
        // A finished ticket takes no message, so this is when it was closed.
        updatedAt: true,
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            body: true,
            fromStaff: true,
            createdAt: true,
            author: { select: { displayName: true } },
          },
        },
      },
    });
  },

  /**
   * Where a ban appeal stands, for the person who filed it: the ticket's
   * status and the team's last written answer, nothing else.
   *
   * The appeal's author is shut out of every page that shows a ticket - the
   * ban gate sends them to /banned - so this is what /banned and the app's
   * banned screen read to say what became of it. Scoped to the viewer and to
   * the appeal theme, like findForRequester: knowing an id is not enough.
   * Null for a ticket that is not theirs, not an appeal, or no longer there.
   */
  async findAppealFor(ticketId: string, viewerId: string) {
    const ticket = await prisma.contactTicket.findFirst({
      where: { id: ticketId, userId: viewerId, theme: "BAN_APPEAL" },
      select: {
        status: true,
        messages: {
          where: { fromStaff: true },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { body: true, createdAt: true },
        },
      },
    });
    if (ticket === null) return null;
    return { status: ticket.status, reply: ticket.messages[0] ?? null };
  },

  /**
   * The same ticket for the console, which reads every one of them: the
   * account behind it, who has it in hand, and the ban it contests when it is
   * an appeal. The team's notes are read apart, by listNotes.
   */
  async findWithThread(ticketId: string) {
    return prisma.contactTicket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        subject: true,
        theme: true,
        status: true,
        message: true,
        email: true,
        jiraIssueKey: true,
        jiraIssueUrl: true,
        userAgent: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, username: true, displayName: true, email: true } },
        assignee: { select: { id: true, username: true, displayName: true } },
        appealFor: {
          select: {
            id: true,
            userId: true,
            reason: true,
            expiresAt: true,
            createdAt: true,
            liftedAt: true,
            liftReason: true,
            issuedBy: { select: { displayName: true } },
            liftedBy: { select: { displayName: true } },
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            body: true,
            fromStaff: true,
            createdAt: true,
            author: { select: { displayName: true } },
          },
        },
      },
    });
  },

  /** The team's notes on a ticket, oldest first, like the thread beside them. */
  async listNotes(ticketId: string) {
    return prisma.ticketNote.findMany({
      where: { ticketId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        body: true,
        createdAt: true,
        author: { select: { displayName: true } },
      },
    });
  },

  /**
   * Gives a ticket to an administrator, or to nobody when assigneeId is null.
   *
   * Only an ADMIN account takes one: the console is theirs, and a ticket
   * handed to an account that cannot open it is a ticket nobody has. The role
   * is read in the transaction that writes, and the audit row lands with the
   * change or not at all, like a status change.
   *
   * The ticket's updatedAt stays where it was, which is why the write is raw:
   * Prisma moves an @updatedAt column on every update it makes. That column is
   * the last turn of the conversation - it orders the requester's own list and
   * the console's queue, and retention counts from it - and taking a ticket in
   * hand is not a turn. Moving it would reorder the requester's list over
   * something they are never shown.
   *
   * Allowed whatever the status: who follows a finished ticket is bookkeeping,
   * not a message on it.
   */
  async assign(input: {
    ticketId: string;
    assigneeId: string | null;
    actorId: string;
  }): Promise<AssignTicketResult> {
    return prisma.$transaction(async (tx): Promise<AssignTicketResult> => {
      if (input.assigneeId !== null) {
        const assignee = await tx.user.findUnique({
          where: { id: input.assigneeId },
          select: { role: true },
        });
        if (assignee?.role !== "ADMIN") return { ok: false, reason: "NOT_ADMIN" };
      }

      const ticket = await tx.contactTicket.findUnique({
        where: { id: input.ticketId },
        select: { assigneeId: true },
      });
      if (ticket === null) return { ok: false, reason: "NOT_FOUND" };
      if (ticket.assigneeId === input.assigneeId) return { ok: true, changed: false };

      await tx.$executeRaw`
        UPDATE "contact_tickets" SET "assigneeId" = ${input.assigneeId}::uuid
        WHERE "id" = ${input.ticketId}::uuid`;
      await tx.auditLog.create({
        data: {
          actorId: input.actorId,
          action: TICKET_ASSIGN_ACTION,
          targetType: "ContactTicket",
          targetId: input.ticketId,
          metadata: { assigneeId: input.assigneeId, previousAssigneeId: ticket.assigneeId },
        },
      });
      return { ok: true, changed: true };
    });
  },

  /**
   * Adds a note the team leaves itself on a ticket.
   *
   * A finished ticket takes no note either (AGENTS.md, rule 16): RESOLVED and
   * CLOSED are the end of the ticket for everyone, the console included, and
   * reopening it is one deliberate control away. The gate is here, like
   * addMessage's, and holds the same way: the ticket's row is locked before
   * its status is read, so a status change waits for the note rather than
   * landing between the check and the insert. Locked rather than bumped,
   * unlike a message: a note is not a turn of the conversation, and moving
   * updatedAt would reorder the requester's list over something they never see.
   *
   * The audit row says a note was added and which one, never what it says: the
   * log outlives the ticket, whose notes go with it when retention purges it.
   */
  async addNote(input: {
    ticketId: string;
    authorId: string;
    body: string;
  }): Promise<AddNoteResult> {
    return prisma.$transaction(async (tx): Promise<AddNoteResult> => {
      const rows = await tx.$queryRaw<{ status: TicketStatus }[]>`
        SELECT "status" FROM "contact_tickets" WHERE "id" = ${input.ticketId}::uuid FOR SHARE`;
      const ticket = rows[0];
      if (ticket === undefined) return { ok: false, reason: "NOT_FOUND" };
      if (!isTicketOpen(ticket.status)) return { ok: false, reason: "TERMINAL" };

      const note = await tx.ticketNote.create({
        data: { ticketId: input.ticketId, authorId: input.authorId, body: input.body },
        select: { id: true },
      });
      await tx.auditLog.create({
        data: {
          actorId: input.authorId,
          action: TICKET_NOTE_ACTION,
          targetType: "ContactTicket",
          targetId: input.ticketId,
          metadata: { noteId: note.id },
        },
      });
      return { ok: true, noteId: note.id };
    });
  },

  /**
   * Resolves a ticket that is still open, or leaves it as it is.
   *
   * For a caller that has just given the ticket its answer some other way - an
   * appeal accepted from the ticket - and must neither reopen nor re-resolve
   * one already finished. The status filter is in the statement that writes,
   * so a ticket closed in between stays closed; the audit row lands with the
   * change or not at all, like a status change from the console's control.
   *
   * Returns whether this call is what resolved it. Prisma moves updatedAt with
   * the status, which is right here: for a finished ticket, updatedAt is when
   * it was resolved, and retention counts from it.
   */
  async resolveIfOpen(input: { ticketId: string; actorId: string }): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const claimed = await tx.contactTicket.updateMany({
        where: { id: input.ticketId, status: { in: [...OPEN_TICKET_STATUSES] } },
        data: { status: "RESOLVED" satisfies TicketStatus },
      });
      if (claimed.count === 0) return false;
      await tx.auditLog.create({
        data: {
          actorId: input.actorId,
          action: AUDIT_ACTION.ticket.statusUpdate,
          targetType: "ContactTicket",
          targetId: input.ticketId,
          metadata: { status: "RESOLVED" },
        },
      });
      return true;
    });
  },

  /**
   * Adds one turn to a ticket's conversation.
   *
   * The ticket's updatedAt moves with it, which is what orders the requester's
   * list and the console's queue: a ticket somebody just replied to is the one
   * worth looking at, and ordering by when it was opened buries it.
   *
   * A staff reply moves an OPEN ticket to IN_PROGRESS, and only an OPEN one.
   * Answering is what "in progress" means, and a status nobody remembers to set
   * is a status that lies.
   *
   * The gate lives here rather than in each caller. There are two of them - the
   * requester's page and the console - and they had two different ideas of what
   * a finished ticket was: one refused CLOSED and took RESOLVED, the other
   * checked nothing at all. A rule enforced at the two ends is a rule with two
   * versions of itself.
   *
   * It is the same statement that bumps the ticket, on purpose. Checking the
   * status and then inserting leaves a gap an administrator can resolve the
   * ticket in, and the message would land in a conversation that had ended
   * between the check and the write.
   */
  async addMessage(input: {
    ticketId: string;
    authorId: string;
    fromStaff: boolean;
    body: string;
  }): Promise<AddMessageResult> {
    return prisma.$transaction(async (tx): Promise<AddMessageResult> => {
      const claimed = await tx.contactTicket.updateMany({
        where: { id: input.ticketId, status: { in: [...OPEN_TICKET_STATUSES] } },
        data: { updatedAt: new Date() },
      });
      if (claimed.count === 0) {
        // Nothing was claimed for one of two reasons, and the caller says
        // something different for each: no such ticket, or one that is over.
        const exists = await tx.contactTicket.findUnique({
          where: { id: input.ticketId },
          select: { id: true },
        });
        return { ok: false, reason: exists === null ? "NOT_FOUND" : "TERMINAL" };
      }

      await tx.ticketMessage.create({
        data: {
          ticketId: input.ticketId,
          authorId: input.authorId,
          fromStaff: input.fromStaff,
          body: input.body,
        },
      });
      if (input.fromStaff) {
        await tx.contactTicket.updateMany({
          where: { id: input.ticketId, status: "OPEN" },
          data: { status: "IN_PROGRESS" satisfies TicketStatus },
        });
      }
      return { ok: true };
    });
  },

  /**
   * Every ticket the account filed, for its GDPR export (rgpd/build-export.ts).
   * The columns are named one by one, like the requester's own reads: the
   * assignee and the internal notes are the team's and never leave.
   */
  async exportFor(userId: string) {
    return prisma.contactTicket.findMany({
      where: { userId },
      select: {
        subject: true,
        theme: true,
        message: true,
        status: true,
        jiraIssueKey: true,
        createdAt: true,
      },
    });
  },
};
