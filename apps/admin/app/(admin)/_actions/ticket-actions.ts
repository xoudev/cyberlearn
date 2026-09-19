"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma, ticketRepository } from "@cyberlearn/db";
import { sendTicketReplyEmail } from "@cyberlearn/email";
import { env } from "@/lib/env";
import { STATUS_META } from "../tickets/ticket-meta";
import { requireAdminAction } from "@/lib/auth";
import { learnerSiteUrl, learnerUrl } from "@/lib/learner-url";

const updateStatusSchema = z.object({
  ticketId: z.string().uuid(),
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]),
});

type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

export async function updateTicketStatusAction(
  ticketId: string,
  status: TicketStatus,
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdminAction();

  const input = updateStatusSchema.safeParse({ ticketId, status });
  if (!input.success) {
    return { ok: false, error: "Paramètres invalides." };
  }

  await prisma.contactTicket.update({
    where: { id: input.data.ticketId },
    data: { status: input.data.status },
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "ticket.status.update",
      targetType: "ContactTicket",
      targetId: input.data.ticketId,
      metadata: { status: input.data.status },
    },
  });

  revalidatePath("/tickets");
  revalidatePath(`/tickets/${input.data.ticketId}`);
  return { ok: true };
}

const replySchema = z.object({
  ticketId: z.string().uuid(),
  body: z.string().trim().min(2).max(5000),
});

/**
 * The team answering a ticket.
 *
 * Two things leave here, and only one of them may fail the action. The reply
 * itself is written in a transaction with the ticket's status, so an answered
 * ticket is never left reading as untouched. The e-mail that tells the
 * requester is best effort: an address that bounces must not roll back a reply
 * the console already showed as sent.
 *
 * It honours emailNotifications like every other e-mail the platform sends -
 * with one difference worth naming: a ticket is a conversation the person
 * started, so the reply also lands on their own page whether or not they take
 * e-mail. Nobody is left without the answer.
 */
export async function replyToTicketAction(
  ticketId: string,
  body: string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdminAction();

  const input = replySchema.safeParse({ ticketId, body });
  if (!input.success) return { ok: false, error: "Message vide ou trop long." };

  const ticket = await prisma.contactTicket.findUnique({
    where: { id: input.data.ticketId },
    select: {
      id: true,
      subject: true,
      email: true,
      user: {
        select: {
          email: true,
          displayName: true,
          preferences: { select: { emailNotifications: true } },
        },
      },
    },
  });
  if (!ticket) return { ok: false, error: "Ticket introuvable." };

  // The console used to write into any ticket whatever its status, including
  // ones the queue itself shows as finished. The gate is the repository's, so
  // both sides of the conversation now close at the same moment.
  const added = await ticketRepository.addMessage({
    ticketId: ticket.id,
    authorId: admin.id,
    fromStaff: true,
    body: input.data.body,
  });
  if (!added.ok) {
    return {
      ok: false,
      error:
        added.reason === "TERMINAL"
          ? "Ticket résolu ou clos : rouvre-le pour répondre."
          : "Ticket introuvable.",
    };
  }

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "ticket.reply",
      targetType: "ContactTicket",
      targetId: ticket.id,
      metadata: {},
    },
  });

  // The account's address when there is an account, the one typed on the form
  // when the ticket came from a guest.
  const to = ticket.user?.email ?? ticket.email;
  const wantsEmail = ticket.user?.preferences?.emailNotifications !== false;
  if (to !== null && wantsEmail) {
    const status = await prisma.contactTicket.findUnique({
      where: { id: ticket.id },
      select: { status: true },
    });
    try {
      await sendTicketReplyEmail({
        apiKey: env.RESEND_API_KEY,
        from: env.RESEND_FROM_EMAIL,
        to,
        displayName: ticket.user?.displayName ?? "",
        subject: ticket.subject,
        reply: input.data.body,
        statusLabel: STATUS_META[status?.status ?? "IN_PROGRESS"]?.label ?? "En cours",
        ticketUrl: learnerUrl(`/support/${ticket.id}`),
        siteUrl: learnerSiteUrl(),
      });
    } catch (error) {
      // The reply is written and visible on their page either way.
      console.error("[tickets] reply e-mail failed:", error);
    }
  }

  revalidatePath("/tickets");
  revalidatePath(`/tickets/${ticket.id}`);
  return { ok: true };
}
