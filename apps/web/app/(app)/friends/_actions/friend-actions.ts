"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { friendshipRepository, notificationRepository, prisma } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";

/**
 * Asking, answering and undoing - the four buttons a friendship ever needs.
 *
 * Every one of them takes the other person's id and derives the pair from the
 * caller's own, so none of them can act on a friendship the caller is not in.
 * That is the whole authorisation story here, and it is worth saying once
 * rather than checking four times.
 */

export interface FriendActionResult {
  ok: boolean;
  error?: string;
  /** Set when asking turned out to be agreeing: they had already asked. */
  becameFriends?: boolean;
}

const idSchema = z.string().uuid();

/** The name to put in a notification, without leaking an e-mail address. */
async function nameOf(userId: string): Promise<string> {
  const person = await prisma.user.findUnique({
    where: { id: userId },
    select: { displayName: true, username: true },
  });
  if (!person) return "Quelqu'un";
  // displayName is a string that can be empty, so || is the operator that
  // means what is wanted here: fall through an empty name to the handle.
  return person.displayName || (person.username ?? "Quelqu'un");
}

export async function sendFriendRequestAction(targetId: string): Promise<FriendActionResult> {
  const user = await requireRequestUser();
  if (!idSchema.safeParse(targetId).success) return { ok: false, error: "Compte introuvable." };

  const result = await friendshipRepository.request(user.id, targetId);
  if (!result.ok) {
    return {
      ok: false,
      error:
        result.reason === "SELF"
          ? "Tu ne peux pas t'ajouter toi-même."
          : "Vous êtes déjà en relation.",
    };
  }

  const asker = await nameOf(user.id);
  if (result.status === "ACCEPTED") {
    // They had already asked, so this was an answer. Both of them get the good
    // news rather than one of them getting a request they already sent.
    await notificationRepository.create({
      userId: targetId,
      type: "FRIEND_ACCEPTED",
      title: "Nouvelle relation",
      body: `${asker} et toi êtes maintenant amis.`,
      actionUrl: "/friends",
    });
  } else {
    await notificationRepository.create({
      userId: targetId,
      type: "FRIEND_REQUEST",
      title: "Demande d'ami",
      body: `${asker} souhaite t'ajouter.`,
      actionUrl: "/friends",
    });
  }

  revalidatePath("/friends");
  return { ok: true, becameFriends: result.status === "ACCEPTED" };
}

export async function acceptFriendRequestAction(otherId: string): Promise<FriendActionResult> {
  const user = await requireRequestUser();
  if (!idSchema.safeParse(otherId).success) return { ok: false, error: "Compte introuvable." };

  const accepted = await friendshipRepository.accept(user.id, otherId);
  // Not an error worth showing: they cancelled, or it was already accepted in
  // another tab. Either way the page is about to show the truth.
  if (!accepted) {
    revalidatePath("/friends");
    return { ok: false, error: "Cette demande n'est plus en attente." };
  }

  await notificationRepository.create({
    userId: otherId,
    type: "FRIEND_ACCEPTED",
    title: "Demande acceptée",
    body: `${await nameOf(user.id)} a accepté ta demande.`,
    actionUrl: "/friends",
  });

  revalidatePath("/friends");
  return { ok: true };
}

/**
 * Declining, cancelling and unfriending - one action, because they are one
 * thing: the row goes.
 *
 * Nobody is told. A refusal that sends a notification is a refusal people avoid
 * making, and an unfriending that announces itself is worse.
 */
export async function removeFriendAction(otherId: string): Promise<FriendActionResult> {
  const user = await requireRequestUser();
  if (!idSchema.safeParse(otherId).success) return { ok: false, error: "Compte introuvable." };

  await friendshipRepository.remove(user.id, otherId);
  revalidatePath("/friends");
  return { ok: true };
}
