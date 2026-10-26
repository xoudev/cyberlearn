import { z } from "zod";
import { ticketRepository, userRepository } from "@cyberlearn/db";
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
import { checkContactForm, checkNotifyingWrite } from "@/lib/rate-limit";
import { tooManyRequests } from "@/lib/rate-limit-copy";

/**
 * A help request, from the side of the person asking: filing one, and adding
 * to its conversation.
 *
 * Shared by the site (the contact form, the "Nouvelle demande" window and
 * /support) and the app
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
  email: z.email(),
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
      error: tooManyRequests(limit.retryAfterSeconds),
    };
  }

  const ticket = await ticketRepository.create({ ...parsed.data, userId: input.userId });
  return { ok: true, ticketId: ticket.id };
}

/**
 * What a signed-in requester sends: the request alone. Anything else in the
 * input (an address, another account's id) is dropped here, not trusted.
 */
const accountFieldsSchema = z.object({
  subject: z.unknown(),
  theme: z.unknown(),
  message: z.unknown(),
});

export const NO_REPLY_ADDRESS = "Aucune adresse e-mail sur ce compte pour te répondre.";

/**
 * Files a request as a signed-in account, answered at the account's own
 * address: neither the app nor the site's "Nouvelle demande" window asks for
 * one, and a reply sent to an address typed by hand is a reply that may never
 * arrive. The profile's address first, the session's when the profile has
 * none. Then the same validation and rate limit as the contact form.
 */
export async function fileAccountTicket(input: {
  user: { id: string; email?: string | null };
  /** Whoever is asking, for the contact form's rate limit. */
  ip: string;
  fields: unknown;
}): Promise<FileTicketResult> {
  const email = (await userRepository.findEmailById(input.user.id)) ?? input.user.email;
  if (!email) return { ok: false, error: NO_REPLY_ADDRESS };

  // Not an object at all: the request's fields are missing, and fileTicket
  // names each of them.
  const fields = accountFieldsSchema.safeParse(input.fields);
  return fileTicket({
    userId: input.user.id,
    ip: input.ip,
    fields: { ...(fields.success ? fields.data : {}), email },
  });
}

const replySchema = z.object({
  ticketId: z.guid(),
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

  // A reply reaches the team through the console - counted in its sidebar and
  // marked "Réponse en attente" on a ticket in progress (awaitsTeamReply), not
  // by a mail. Filing is capped by the contact form's budget, replying by the
  // same one as the other writes that notify somebody.
  const limit = await checkNotifyingWrite(userId);
  if (!limit.success) {
    return { ok: false, error: "Beaucoup d'envois d'un coup : réessaie dans un moment." };
  }

  // Ownership first, and on its own: the repository gate knows about statuses,
  // not about who is allowed to write here.
  const ticketId = await ticketRepository.findOwnedId(parsed.data.ticketId, userId);
  if (ticketId === null) return { ok: false, error: "Ticket introuvable." };

  const result = await ticketRepository.addMessage({
    ticketId,
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
