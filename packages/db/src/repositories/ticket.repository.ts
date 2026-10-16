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
    isTicketOpen(ticket.status) &&
    (CRITICAL_TICKET_THEMES as readonly TicketTheme[]).includes(ticket.theme)
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

/** The latest turn of a thread, which says who spoke last. */
export const LAST_TICKET_MESSAGE = {
  orderBy: { createdAt: "desc" },
  take: 1,
  select: { fromStaff: true, createdAt: true },
} satisfies Prisma.ContactTicket$messagesArgs;

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

  /** The same ticket for the console, which reads every one of them. */
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
        createdAt: true,
        user: { select: { id: true, displayName: true, email: true } },
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
};
