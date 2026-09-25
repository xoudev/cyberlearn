import { z } from "zod";
import { prisma, ticketRepository } from "@cyberlearn/db";
import {
  TICKET_MESSAGE_MAX,
  TICKET_MESSAGE_MIN,
  TICKET_REPLY_MAX,
  TICKET_REPLY_MIN,
  TICKET_SUBJECT_MAX,
  TICKET_SUBJECT_MIN,
  isTicketFormTheme,
  type TicketFormTheme,
} from "@cyberlearn/lib/tickets/tickets";
import { checkContactForm } from "@/lib/rate-limit";

/**
 * A help request, from the side of the person asking: filing one, and adding
 * to its conversation.
 *
 * Shared by the site (the contact form and /support) and the app
 * (/api/mobile/support/*), so a request from a phone is limited, checked and
 * refused exactly like one from the site. Callers are responsible for
 * AUTHENTICATION; `userId` must be a verified identity. Lives outside any
 * "use server" module so it cannot be invoked with an arbitrary userId.
 */

const ticketSchema = z.object({
  subject: z.string().trim().min(TICKET_SUBJECT_MIN).max(TICKET_SUBJECT_MAX),
  theme: z.custom<TicketFormTheme>(
    (value) => typeof value === "string" && isTicketFormTheme(value),
    {
      message: "Choisis un thème.",
    },
  ),
  message: z.string().trim().min(TICKET_MESSAGE_MIN).max(TICKET_MESSAGE_MAX),
  email: z.string().email(),
});

export type TicketField = keyof z.infer<typeof ticketSchema>;

export type FileTicketResult =
  | { ok: true; ticketId: string }
  | { ok: false; error: string; fieldErrors?: Partial<Record<TicketField, string>> };

/**
 * Files a request. The contact form is open to guests too, so `userId` may be
 * null; the app always has one.
 */
export async function fileTicket(input: {
  userId: string | null;
  /** Whoever is asking, for the contact form's rate limit. */
  ip: string;
  fields: unknown;
}): Promise<FileTicketResult> {
  const parsed = ticketSchema.safeParse(input.fields);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<TicketField, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (
        (field === "subject" || field === "theme" || field === "message" || field === "email") &&
        fieldErrors[field] === undefined
      ) {
        fieldErrors[field] = issue.message;
      }
    }
    return { ok: false, error: "Formulaire invalide.", fieldErrors };
  }

  const limit = await checkContactForm(input.ip);
  if (!limit.success) {
    return {
      ok: false,
      error: `Trop de demandes. Réessayez dans ${String(limit.retryAfterSeconds)} secondes.`,
    };
  }

  const { subject, theme, message, email } = parsed.data;
  const ticket = await prisma.contactTicket.create({
    data: { subject, theme, message, email, userId: input.userId, status: "OPEN" },
    select: { id: true },
  });
  return { ok: true, ticketId: ticket.id };
}

const replySchema = z.object({
  ticketId: z.string().uuid(),
  body: z.string().trim().min(TICKET_REPLY_MIN).max(TICKET_REPLY_MAX),
});

/**
 * The requester's own side of the conversation.
 *
 * Scoped to tickets this account opened, checked here rather than trusted from
 * the input: a ticket somebody else opened is somebody else's.
 *
 * A reply from the requester never moves the status. What stage a ticket is at
 * is the team's judgement, and a learner adding "toujours bloqué" should not be
 * able to march it back to OPEN from RESOLVED.
 *
 * Whether the ticket still takes replies at all is the repository's call: the
 * console asks the same question and used not to ask it the same way. What is
 * left here is saying no in the words the requester reads.
 */
export async function replyAsRequester(
  userId: string,
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = replySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Écris un message avant d'envoyer." };

  // Ownership first, and on its own: the repository gate knows about statuses,
  // not about who is allowed to write here.
  const ticket = await prisma.contactTicket.findFirst({
    where: { id: parsed.data.ticketId, userId },
    select: { id: true },
  });
  if (!ticket) return { ok: false, error: "Ticket introuvable." };

  const result = await ticketRepository.addMessage({
    ticketId: ticket.id,
    authorId: userId,
    fromStaff: false,
    body: parsed.data.body,
  });
  if (!result.ok) {
    return {
      ok: false,
      error:
        result.reason === "TERMINAL"
          ? "Cette demande est terminée. Ouvres-en une nouvelle si le problème revient."
          : "Ticket introuvable.",
    };
  }
  return { ok: true };
}
