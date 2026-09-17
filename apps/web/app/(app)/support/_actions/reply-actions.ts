"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma, ticketRepository } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";

/**
 * The requester's own side of the conversation.
 *
 * Scoped to tickets this account opened, checked here rather than trusted from
 * the form: the id travels through the browser, and a ticket somebody else
 * opened is somebody else's.
 *
 * A reply from the requester never moves the status. What stage a ticket is at
 * is the team's judgement, and a learner adding "toujours bloqué" should not be
 * able to march it back to OPEN from RESOLVED.
 */

export interface ReplyState {
  error?: string;
  ok?: boolean;
}

const schema = z.object({
  ticketId: z.string().uuid(),
  body: z.string().trim().min(2).max(5000),
});

export async function replyToTicketAction(
  _prev: ReplyState,
  formData: FormData,
): Promise<ReplyState> {
  const user = await requireRequestUser();
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Écris un message avant d'envoyer." };

  const ticket = await prisma.contactTicket.findFirst({
    where: { id: parsed.data.ticketId, userId: user.id },
    select: { id: true, status: true },
  });
  if (!ticket) return { error: "Ticket introuvable." };
  if (ticket.status === "CLOSED") {
    return { error: "Ce ticket est clos. Ouvre-en un nouveau si le problème revient." };
  }

  await ticketRepository.addMessage({
    ticketId: ticket.id,
    authorId: user.id,
    fromStaff: false,
    body: parsed.data.body,
  });

  revalidatePath(`/support/${ticket.id}`);
  revalidatePath("/support");
  return { ok: true };
}
