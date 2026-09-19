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
 *
 * Whether the ticket still takes replies at all is the repository's call, not
 * this one's: the console asks the same question and used not to ask it the
 * same way. What is left here is saying no in the words this page uses.
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

  // Ownership first, and on its own: the repository gate knows about statuses,
  // not about who is allowed to write here.
  const ticket = await prisma.contactTicket.findFirst({
    where: { id: parsed.data.ticketId, userId: user.id },
    select: { id: true },
  });
  if (!ticket) return { error: "Ticket introuvable." };

  const result = await ticketRepository.addMessage({
    ticketId: ticket.id,
    authorId: user.id,
    fromStaff: false,
    body: parsed.data.body,
  });
  if (!result.ok) {
    return {
      error:
        result.reason === "TERMINAL"
          ? "Cette demande est terminée. Ouvres-en une nouvelle si le problème revient."
          : "Ticket introuvable.",
    };
  }

  revalidatePath(`/support/${ticket.id}`);
  revalidatePath("/support");
  return { ok: true };
}
