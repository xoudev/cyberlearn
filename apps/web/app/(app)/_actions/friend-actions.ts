"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  friendshipRepository,
  notificationRepository,
  prisma,
  type FriendEdge,
} from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";

/**
 * Asking, answering and undoing - the four buttons a friendship ever needs -
 * plus the read the navbar panel opens with.
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

export interface FriendLists {
  incoming: FriendEdge[];
  friends: FriendEdge[];
  outgoing: FriendEdge[];
}

const idSchema = z.string().uuid();

/** Who somebody is, for a notification: a name to show and a page to point at. */
async function subjectOf(userId: string): Promise<{ name: string; href: string | null }> {
  const person = await prisma.user.findUnique({
    where: { id: userId },
    select: { displayName: true, username: true },
  });
  if (!person) return { name: "Quelqu'un", href: null };
  // displayName is a string that can be empty, so || is the operator that means
  // what is wanted here: fall through an empty name to the handle.
  return {
    name: person.displayName || (person.username ?? "Quelqu'un"),
    // Their profile, because that is where the button is. A notification that
    // leads nowhere is a notification that has to be acted on somewhere else.
    href: person.username === null ? null : `/u/${person.username}`,
  };
}

/** The three lists, for the panel. Read on open rather than on every page load. */
export async function getFriendsAction(): Promise<FriendLists> {
  const user = await requireRequestUser();
  const [incoming, friends, outgoing] = await Promise.all([
    friendshipRepository.listIncoming(user.id, 30),
    friendshipRepository.listFriends(user.id, 60),
    friendshipRepository.listOutgoing(user.id, 30),
  ]);
  return { incoming, friends, outgoing };
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

  const asker = await subjectOf(user.id);
  if (result.status === "ACCEPTED") {
    // They had already asked, so this was an answer. Both of them get the good
    // news rather than one of them getting a request they already sent.
    await notificationRepository.create({
      userId: targetId,
      type: "FRIEND_ACCEPTED",
      title: "Nouvelle relation",
      body: `${asker.name} et toi êtes maintenant amis.`,
      ...(asker.href !== null ? { actionUrl: asker.href } : {}),
    });
  } else {
    await notificationRepository.create({
      userId: targetId,
      type: "FRIEND_REQUEST",
      title: "Demande d'ami",
      body: `${asker.name} souhaite t'ajouter.`,
      ...(asker.href !== null ? { actionUrl: asker.href } : {}),
    });
  }

  revalidatePath("/", "layout");
  return { ok: true, becameFriends: result.status === "ACCEPTED" };
}

export async function acceptFriendRequestAction(otherId: string): Promise<FriendActionResult> {
  const user = await requireRequestUser();
  if (!idSchema.safeParse(otherId).success) return { ok: false, error: "Compte introuvable." };

  const accepted = await friendshipRepository.accept(user.id, otherId);
  // Not an error worth showing: they cancelled, or it was already accepted in
  // another tab. Either way the panel is about to show the truth.
  if (!accepted) return { ok: false, error: "Cette demande n'est plus en attente." };

  const accepter = await subjectOf(user.id);
  await notificationRepository.create({
    userId: otherId,
    type: "FRIEND_ACCEPTED",
    title: "Demande acceptée",
    body: `${accepter.name} a accepté ta demande.`,
    ...(accepter.href !== null ? { actionUrl: accepter.href } : {}),
  });

  revalidatePath("/", "layout");
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
  revalidatePath("/", "layout");
  return { ok: true };
}
