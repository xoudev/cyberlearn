"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  banRepository,
  prisma,
  ticketRepository,
  type AddNoteResult,
  type AssignTicketResult,
} from "@cyberlearn/db";
import { sendTicketReplyEmail } from "@cyberlearn/email";
import { env } from "@/lib/env";
import { STATUS_META } from "../tickets/ticket-meta";
import { requireAdminAction } from "@/lib/auth";
import { learnerSiteUrl, learnerUrl } from "@/lib/learner-url";

import { logger, errorMessage } from "@cyberlearn/lib/logger";

const updateStatusSchema = z.object({
  ticketId: z.guid(),
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

  // Together or not at all, and a failure said under the control rather than
  // thrown: a thrown error took the administrator off the ticket to the
  // console's error page.
  try {
    await prisma.$transaction([
      prisma.contactTicket.update({
        where: { id: input.data.ticketId },
        data: { status: input.data.status },
      }),
      prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: "ticket.status.update",
          targetType: "ContactTicket",
          targetId: input.data.ticketId,
          metadata: { status: input.data.status },
        },
      }),
    ]);
  } catch (error) {
    logger.error({ scope: "tickets", err: errorMessage(error) }, "status update failed");
    return { ok: false, error: "Le statut n'a pas pu être changé. Rien n'a été modifié." };
  }

  revalidatePath("/tickets");
  revalidatePath(`/tickets/${input.data.ticketId}`);
  return { ok: true };
}

const replySchema = z.object({
  ticketId: z.guid(),
  body: z.string().trim().min(2).max(5000),
});

/** What a reply's e-mail needs to know about the ticket and the person behind it. */
const REPLY_RECIPIENT = {
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
} as const;

interface ReplyRecipient {
  id: string;
  subject: string;
  email: string | null;
  user: {
    email: string;
    displayName: string;
    preferences: { emailNotifications: boolean } | null;
  } | null;
}

/**
 * Tells the requester the team answered, with the answer in the mail.
 *
 * Best effort, and it never throws: the reply is written and on their page
 * whatever happens here, and neither an address that bounces nor a status
 * read that fails may turn a reply already written into an error page. The
 * status is read after the reply landed, so the mail says what the ticket is
 * now - in progress after a first answer, resolved after an appeal was
 * accepted.
 */
async function emailReply(ticket: ReplyRecipient, reply: string): Promise<void> {
  // The account's address when there is an account, the one typed on the form
  // when the ticket came from a guest.
  const to = ticket.user?.email ?? ticket.email;
  const wantsEmail = ticket.user?.preferences?.emailNotifications !== false;
  if (to === null || !wantsEmail) return;

  try {
    const status = await prisma.contactTicket.findUnique({
      where: { id: ticket.id },
      select: { status: true },
    });
    await sendTicketReplyEmail({
      apiKey: env.RESEND_API_KEY,
      from: env.RESEND_FROM_EMAIL,
      to,
      displayName: ticket.user?.displayName ?? "",
      subject: ticket.subject,
      reply,
      statusLabel: STATUS_META[status?.status ?? "IN_PROGRESS"]?.label ?? "En cours",
      ticketUrl: learnerUrl(`/support/${ticket.id}`),
      siteUrl: learnerSiteUrl(),
    });
  } catch (error) {
    // The reply is written and visible on their page either way.
    logger.error({ scope: "tickets", err: errorMessage(error) }, "reply e-mail failed");
  }
}

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
    select: REPLY_RECIPIENT,
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

  await emailReply(ticket, input.data.body);

  revalidatePath("/tickets");
  revalidatePath(`/tickets/${ticket.id}`);
  return { ok: true };
}

// ── An appeal accepted ───────────────────────────────────────────────────────

const liftAppealSchema = z.object({
  ticketId: z.guid(),
  reason: z.string().trim().max(500, "Motif trop long : 500 caractères au plus.").optional(),
  reply: z
    .string()
    .trim()
    .max(5000, "Réponse trop longue : 5000 caractères au plus.")
    .refine((value) => value === "" || value.length >= 2, "Réponse trop courte.")
    .optional(),
});

/** A refusal, or what went through and what did not. */
export interface LiftAppealState {
  error?: string;
  ok?: boolean;
  /** Whether this lift is what resolved the ticket: false for one already finished. */
  resolved?: boolean;
  /** Set when the ban was lifted but a follow-up on the ticket did not happen. */
  warning?: string;
}

/**
 * Lifts the ban a ticket contests, from the ticket.
 *
 * The ban this appeal was filed against, and only while it is in force: the
 * repository lifts by that ban's id under the same "in force" filter as every
 * other read, in one statement, so a ban lifted from the account's page or run
 * out in the meantime is refused, and a newer ban issued since is never the
 * one that goes.
 *
 * The lift and its line in the account's journal are one transaction, the
 * repository's: the same action as a lift from the account's page, so the
 * journal shows it whichever page it came from, and the metadata says which
 * ticket. A failure there changed nothing, and says so.
 *
 * Then the ticket, in this order: the team's reply when one was written, and
 * the ticket resolved - the appeal has its answer. The reply comes first
 * because a resolved ticket takes no message (AGENTS.md, rule 16); its gate is
 * still the repository's, so a ticket closed in between keeps the ban lifted
 * and says the reply did not go. Nothing after the lift can undo it or throw
 * past it: the lift is the decision, every follow-up runs under its own catch,
 * and the warning says what is left to do by hand. A retry would only be told
 * the ban is no longer in force.
 */
export async function liftAppealedBanAction(
  _prev: LiftAppealState,
  formData: FormData,
): Promise<LiftAppealState> {
  const admin = await requireAdminAction();
  const parsed = liftAppealSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  const { ticketId } = parsed.data;
  const reason = parsed.data.reason ?? "";
  const reply = parsed.data.reply ?? "";

  const ticket = await prisma.contactTicket.findUnique({
    where: { id: ticketId },
    select: { ...REPLY_RECIPIENT, appealFor: { select: { id: true, userId: true } } },
  });
  if (!ticket) return { error: "Ticket introuvable." };
  const ban = ticket.appealFor;
  if (ban === null) return { error: "Ce ticket ne conteste aucun bannissement." };

  let lifted: boolean;
  try {
    lifted = await banRepository.lift({
      userId: ban.userId,
      banId: ban.id,
      liftedById: admin.id,
      // exactOptionalPropertyTypes: the key is left out rather than set to nothing.
      ...(reason !== "" ? { reason } : {}),
      auditMetadata: { reason: reason === "" ? null : reason, ticketId, banId: ban.id },
    });
  } catch (error) {
    logger.error({ scope: "tickets", err: errorMessage(error) }, "appeal lift failed");
    return { error: "Le bannissement n'a pas pu être levé. Rien n'a été modifié." };
  }
  if (!lifted) {
    return {
      error:
        "Ce bannissement n'est plus en cours : il a déjà été levé ou il a pris fin. Rien n'a été modifié.",
    };
  }

  const warnings: string[] = [];
  let replied = false;
  // A reply that failed to land keeps the ticket open: resolving it would
  // close the one conversation the answer still has to go into.
  let replyFailed = false;
  if (reply !== "") {
    try {
      const added = await ticketRepository.addMessage({
        ticketId,
        authorId: admin.id,
        fromStaff: true,
        body: reply,
      });
      replied = added.ok;
      if (!added.ok) {
        warnings.push(
          "la réponse n'est pas partie, le ticket ayant été résolu ou clos entre-temps",
        );
      }
    } catch (error) {
      logger.error({ scope: "tickets", err: errorMessage(error) }, "appeal reply failed");
      replyFailed = true;
      warnings.push(
        "la réponse n'a pas pu être enregistrée : le ticket reste ouvert pour la renvoyer",
      );
    }
  }
  if (replied) {
    // The reply is on the requester's page by now: a journal line that fails
    // to land is logged, and the console does not call a sent reply unsent.
    try {
      await prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: "ticket.reply",
          targetType: "ContactTicket",
          targetId: ticketId,
          metadata: {},
        },
      });
    } catch (error) {
      logger.error({ scope: "tickets", err: errorMessage(error) }, "appeal reply audit failed");
    }
  }

  // Whether this lift is what resolved it: a ticket already finished is left
  // as it is, and says nothing more.
  let resolved = false;
  if (!replyFailed) {
    try {
      resolved = await ticketRepository.resolveIfOpen({ ticketId, actorId: admin.id });
    } catch (error) {
      logger.error({ scope: "tickets", err: errorMessage(error) }, "appeal resolution failed");
      warnings.push("le ticket n'a pas pu passer en résolu");
    }
  }

  if (replied) await emailReply(ticket, reply);

  revalidatePath("/tickets");
  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath(`/users/${ban.userId}`);
  return warnings.length === 0
    ? { ok: true, resolved }
    : { ok: true, resolved, warning: `Le bannissement est levé, mais ${warnings.join(", et ")}.` };
}

// ── Assignment and internal notes ────────────────────────────────────────────

const assignSchema = z.object({
  ticketId: z.guid(),
  assigneeId: z.guid().nullable(),
});

/**
 * Gives a ticket to an administrator, or takes it back from everybody.
 *
 * Who may take one is the repository's to say, in the transaction that writes:
 * an administrator, and nobody else. The audit row lands with it.
 */
export async function assignTicketAction(
  ticketId: string,
  assigneeId: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdminAction();
  const input = assignSchema.safeParse({ ticketId, assigneeId });
  if (!input.success) return { ok: false, error: "Paramètres invalides." };

  let result: AssignTicketResult;
  try {
    result = await ticketRepository.assign({
      ticketId: input.data.ticketId,
      assigneeId: input.data.assigneeId,
      actorId: admin.id,
    });
  } catch (error) {
    logger.error({ scope: "tickets", err: errorMessage(error) }, "assignment failed");
    return { ok: false, error: "L'assignation n'a pas pu être changée. Rien n'a été modifié." };
  }
  if (!result.ok) {
    return {
      ok: false,
      error:
        result.reason === "NOT_ADMIN"
          ? "Un ticket ne s'assigne qu'à un administrateur."
          : "Ticket introuvable.",
    };
  }

  if (result.changed) {
    revalidatePath("/tickets");
    revalidatePath(`/tickets/${input.data.ticketId}`);
  }
  return { ok: true };
}

const noteSchema = z.object({
  ticketId: z.guid(),
  body: z.string().trim().min(2).max(5000),
});

/**
 * Adds a note the team leaves itself on a ticket. Never shown to the
 * requester: it is not part of the thread, and no read of theirs selects it.
 * A finished ticket takes none, by the repository's gate, like a reply.
 */
export async function addTicketNoteAction(
  ticketId: string,
  body: string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdminAction();
  const input = noteSchema.safeParse({ ticketId, body });
  if (!input.success) return { ok: false, error: "Note vide ou trop longue." };

  let added: AddNoteResult;
  try {
    added = await ticketRepository.addNote({
      ticketId: input.data.ticketId,
      authorId: admin.id,
      body: input.data.body,
    });
  } catch (error) {
    logger.error({ scope: "tickets", err: errorMessage(error) }, "note failed");
    return { ok: false, error: "La note n'a pas pu être enregistrée." };
  }
  if (!added.ok) {
    return {
      ok: false,
      error:
        added.reason === "TERMINAL"
          ? "Ticket résolu ou clos : rouvre-le pour ajouter une note."
          : "Ticket introuvable.",
    };
  }

  revalidatePath(`/tickets/${input.data.ticketId}`);
  return { ok: true };
}
