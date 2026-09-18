"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { banRepository, prisma } from "@cyberlearn/db";
import { getRequestUser } from "@/lib/auth";
import { checkContactForm } from "@/lib/rate-limit";
import { headers } from "next/headers";

/**
 * What somebody can still do while they are banned: close the notice, and
 * answer it.
 *
 * Neither goes through requireRequestUser, which would bounce them back here.
 * Both read the ban themselves, so a request from an account with no ban in
 * force does nothing at all - there is no state to change and nothing to say.
 */

export interface AppealState {
  error?: string;
  ok?: boolean;
}

/** Closing the notice. Shown once, not on every page they land on. */
export async function acknowledgeBanAction(): Promise<{ ok: boolean }> {
  const user = await getRequestUser();
  if (!user) return { ok: false };

  const ban = await banRepository.findActive(user.id);
  if (!ban) return { ok: false };

  await banRepository.acknowledge(ban.id, user.id);
  revalidatePath("/banned");
  return { ok: true };
}

const appealSchema = z.object({
  message: z
    .string()
    .trim()
    .min(30, "Explique en quelques phrases : au moins 30 caractères.")
    .max(4000, "4000 caractères maximum."),
});

/**
 * An appeal, which is a ticket like any other - with its own theme, so it does
 * not queue behind bug reports.
 *
 * One per ban. The second attempt is the same conversation and it already has a
 * thread, so it is sent there rather than opening a second one.
 */
export async function appealBanAction(
  _prev: AppealState,
  formData: FormData,
): Promise<AppealState> {
  const user = await getRequestUser();
  if (!user) return { error: "Session expirée. Reconnecte-toi." };

  const ban = await banRepository.findActive(user.id);
  if (!ban) return { error: "Aucun bannissement en cours sur ce compte." };
  if (ban.appealTicketId !== null) {
    return { error: "Un appel est déjà ouvert pour cette décision." };
  }

  const parsed = appealSchema.safeParse({ message: formData.get("message") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Message invalide." };
  }

  // The same budget the contact form uses. Somebody flooding the queue does not
  // care which form they use, and an appeal is the one form a banned account
  // can still reach - so it is the one that would be used.
  const headerStore = await headers();
  const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = await checkContactForm(ip);
  if (!limit.success) {
    return {
      error: `Trop de demandes. Réessaie dans ${String(limit.retryAfterSeconds)} secondes.`,
    };
  }

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: { email: true },
  });

  const ticket = await prisma.contactTicket.create({
    data: {
      userId: user.id,
      email: profile?.email ?? user.email ?? null,
      subject: "Appel d'une décision de bannissement",
      theme: "BAN_APPEAL",
      // The decision being contested travels with the appeal: whoever picks it
      // up should not have to go and look up why the person was banned.
      message: `Motif du bannissement : ${ban.reason}\n\n---\n\n${parsed.data.message}`,
      status: "OPEN",
    },
    select: { id: true },
  });

  const attached = await banRepository.attachAppeal(ban.id, user.id, ticket.id);
  if (!attached) {
    // Two submissions at once: the first one won. The second ticket would be a
    // duplicate of a conversation that is already open.
    await prisma.contactTicket.deleteMany({ where: { id: ticket.id } });
    return { error: "Un appel est déjà ouvert pour cette décision." };
  }

  revalidatePath("/banned");
  return { ok: true };
}
