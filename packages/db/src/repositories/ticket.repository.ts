import { prisma } from "../prisma.js";
import type { TicketStatus } from "@prisma/client";

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

/** A status a requester can act on, versus one that is the end of it. */
export const OPEN_TICKET_STATUSES = ["OPEN", "IN_PROGRESS"] as const;

export const ticketRepository = {
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
   * is a status that lies - but a reply to a RESOLVED ticket is often the note
   * that closes it, and reopening it on the team's behalf would be the console
   * arguing with the person using it.
   */
  async addMessage(input: {
    ticketId: string;
    authorId: string;
    fromStaff: boolean;
    body: string;
  }): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.ticketMessage.create({
        data: {
          ticketId: input.ticketId,
          authorId: input.authorId,
          fromStaff: input.fromStaff,
          body: input.body,
        },
      });
      await tx.contactTicket.update({
        where: { id: input.ticketId },
        data: { updatedAt: new Date() },
      });
      if (input.fromStaff) {
        await tx.contactTicket.updateMany({
          where: { id: input.ticketId, status: "OPEN" },
          data: { status: "IN_PROGRESS" satisfies TicketStatus },
        });
      }
    });
  },
};
