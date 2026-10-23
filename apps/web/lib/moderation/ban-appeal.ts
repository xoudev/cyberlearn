import { z } from "zod";
import { banRepository, prisma, ticketRepository } from "@cyberlearn/db";
import { appealView, type AppealView } from "@cyberlearn/lib/tickets/appeal";
import { checkContactForm } from "@/lib/rate-limit";
import { tooManyRequests } from "@/lib/rate-limit-copy";

/**
 * What somebody can still do while they are banned: close the notice, and
 * answer it.
 *
 * Shared by the site (/banned and its actions) and the app
 * (/api/mobile/ban/*). Callers are responsible for AUTHENTICATION and must not
 * use the ban-checking gate, which would bounce the very people this is for.
 * Both read the ban themselves, so a request from an account with no ban in
 * force does nothing at all: there is no state to change and nothing to say.
 */

export interface AppealState {
  error?: string;
  ok?: boolean;
}

/** Closing the notice. Shown once, not on every page they land on. */
export async function acknowledgeBan(userId: string): Promise<{ ok: boolean }> {
  const ban = await banRepository.findActive(userId);
  if (!ban) return { ok: false };

  await banRepository.acknowledge(ban.id, userId);
  return { ok: true };
}

/**
 * Where the appeal against the ban in force stands, or null when there is none
 * to show: no appeal filed, or the ticket is gone (retention purges old ones).
 *
 * An appeal's author is shut out of the pages that show a ticket - the ban
 * gate sends them to /banned - so the team's answer is read here, from the
 * ticket's status and its last staff message, rather than left to an e-mail
 * alone. Scoped to the account asking.
 */
export async function appealStanding(input: {
  userId: string;
  /** The ban's `appealTicketId`. */
  appealTicketId: string | null;
}): Promise<AppealView | null> {
  if (input.appealTicketId === null) return null;
  const appeal = await ticketRepository.findAppealFor(input.appealTicketId, input.userId);
  if (appeal === null) return null;
  return appealView({
    status: appeal.status,
    reply:
      appeal.reply === null
        ? null
        : { body: appeal.reply.body, createdAt: appeal.reply.createdAt.toISOString() },
  });
}

/**
 * The same for the app, which does not hold the ban row: it reads the ban in
 * force first. Null for an account with no ban, which has nothing to appeal.
 */
export async function currentAppeal(userId: string): Promise<AppealView | null> {
  const ban = await banRepository.findActive(userId);
  if (!ban) return null;
  return appealStanding({ userId, appealTicketId: ban.appealTicketId });
}

const appealSchema = z.object({
  message: z
    .string()
    .trim()
    .min(30, "Explique en quelques phrases : au moins 30 caractères.")
    .max(4000, "4000 caractères maximum."),
});

/**
 * An appeal, which is a ticket like any other, with its own theme, so it does
 * not queue behind bug reports.
 *
 * One per ban. The second attempt is the same conversation and it already has a
 * thread, so it is sent there rather than opening a second one.
 */
export async function appealBan(input: {
  userId: string;
  /** The session's address, used when the profile has none. */
  fallbackEmail: string | null;
  message: unknown;
  /** Whoever is asking, for the rate limit. */
  ip: string;
}): Promise<AppealState> {
  const ban = await banRepository.findActive(input.userId);
  if (!ban) return { error: "Aucun bannissement en cours sur ce compte." };
  if (ban.appealTicketId !== null) {
    return { error: "Un appel est déjà ouvert pour cette décision." };
  }

  const parsed = appealSchema.safeParse({ message: input.message });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Message invalide." };
  }

  // The same budget the contact form uses. Somebody flooding the queue does not
  // care which form they use, and an appeal is the one form a banned account
  // can still reach, so it is the one that would be used.
  const limit = await checkContactForm(input.ip);
  if (!limit.success) {
    return { error: tooManyRequests(limit.retryAfterSeconds) };
  }

  const profile = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { email: true },
  });

  const ticket = await prisma.contactTicket.create({
    data: {
      userId: input.userId,
      email: profile?.email ?? input.fallbackEmail ?? null,
      subject: "Appel d'une décision de bannissement",
      theme: "BAN_APPEAL",
      // The decision being contested travels with the appeal: whoever picks it
      // up should not have to go and look up why the person was banned.
      message: `Motif du bannissement : ${ban.reason}\n\n---\n\n${parsed.data.message}`,
      status: "OPEN",
    },
    select: { id: true },
  });

  const attached = await banRepository.attachAppeal(ban.id, input.userId, ticket.id);
  if (!attached) {
    // Two submissions at once: the first one won. The second ticket would be a
    // duplicate of a conversation that is already open.
    await prisma.contactTicket.deleteMany({ where: { id: ticket.id } });
    return { error: "Un appel est déjà ouvert pour cette décision." };
  }

  return { ok: true };
}
