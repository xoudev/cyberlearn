import { z } from "zod";
import {
  friendshipRepository,
  notificationRepository,
  prisma,
  type FriendEdge,
} from "@cyberlearn/db";
import { resolveAvatarSrcMany } from "@/lib/avatar/storage";

/**
 * Asking, answering and undoing - the four buttons a friendship ever needs -
 * plus the read the lists open with.
 *
 * Every one of them takes the other person's id and derives the pair from the
 * caller's own, so none of them can act on a friendship the caller is not in.
 * That is the whole authorisation story here, and it is worth saying once
 * rather than checking four times.
 *
 * Shared by the site (friend-actions) and the app (/api/mobile/friends/*), so a
 * request sent from a phone notifies the other person exactly like one sent
 * from the site. Callers are responsible for AUTHENTICATION: `userId` must be a
 * verified identity, of an account that is not banned (requireRequestUser on
 * the site, userFromBearer in the app). Lives outside any "use server" module
 * so it cannot be invoked with an arbitrary userId.
 */

export interface FriendActionResult {
  ok: boolean;
  error?: string;
  /** Set when asking turned out to be agreeing: they had already asked. */
  becameFriends?: boolean;
}

/**
 * A friendship, plus the one thing a list cannot work out for itself.
 *
 * `person.avatarUrl` is a stored value, and turning an upload marker into a
 * URL needs the service_role key - which cannot cross into the browser or the
 * app. So the resolving happens here, on the server side of the call.
 */
export interface FriendEntry extends FriendEdge {
  /** Ready for an `<img src>`, or a glyph marker, or null. */
  avatarSrc: string | null;
}

export interface FriendLists {
  incoming: FriendEntry[];
  friends: FriendEntry[];
  outgoing: FriendEntry[];
}

const idSchema = z.string().uuid();
const NOT_FOUND = "Compte introuvable.";

/**
 * Who somebody is, for a notification: a name to show and a page to point at.
 *
 * The page is their profile, because that is where the button is. It is only
 * offered when the person being told will be let into it: accepting each other
 * opens a private profile, but somebody who has merely sent a request is still
 * a stranger to one, and a notification whose link 404s is worse than a
 * notification with no link.
 */
async function subjectOf(
  userId: string,
  readerIsFriend: boolean,
): Promise<{ name: string; href: string | null }> {
  const person = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      displayName: true,
      username: true,
      preferences: { select: { publicProfile: true } },
    },
  });
  if (!person) return { name: "Quelqu'un", href: null };

  // displayName is a string that can be empty, so || is the operator that means
  // what is wanted here: fall through an empty name to the handle.
  const name = person.displayName || (person.username ?? "Quelqu'un");
  if (person.username === null) return { name, href: null };
  if (!readerIsFriend && person.preferences?.publicProfile === false) return { name, href: null };
  return { name, href: `/u/${person.username}` };
}

/** The three lists. Read on open rather than on every page load. */
export async function listFriendsFor(userId: string): Promise<FriendLists> {
  const [incoming, friends, outgoing] = await Promise.all([
    friendshipRepository.listIncoming(userId, 30),
    friendshipRepository.listFriends(userId, 60),
    friendshipRepository.listOutgoing(userId, 30),
  ]);

  // All three lists in one round-trip, rather than three or - worse - one per
  // row. The lists can hold a hundred and twenty people.
  const all = [...incoming, ...friends, ...outgoing];
  const resolved = await resolveAvatarSrcMany(all.map((e) => e.person.avatarUrl));
  const entries = all.map((edge, i) => ({ ...edge, avatarSrc: resolved[i] ?? null }));

  return {
    incoming: entries.slice(0, incoming.length),
    friends: entries.slice(incoming.length, incoming.length + friends.length),
    outgoing: entries.slice(incoming.length + friends.length),
  };
}

export async function requestFriendship(
  userId: string,
  targetId: unknown,
): Promise<FriendActionResult> {
  const target = idSchema.safeParse(targetId);
  if (!target.success) return { ok: false, error: NOT_FOUND };

  const result = await friendshipRepository.request(userId, target.data);
  if (!result.ok) {
    return {
      ok: false,
      error:
        result.reason === "SELF"
          ? "Tu ne peux pas t'ajouter toi-même."
          : "Vous êtes déjà en relation.",
    };
  }

  // Asking turned into agreeing means the two are friends by the time this
  // notification is read, so the profile it points at will open.
  const asker = await subjectOf(userId, result.status === "ACCEPTED");
  if (result.status === "ACCEPTED") {
    // They had already asked, so this was an answer. Both of them get the good
    // news rather than one of them getting a request they already sent.
    await notificationRepository.create({
      userId: target.data,
      type: "FRIEND_ACCEPTED",
      title: "Nouvelle relation",
      body: `${asker.name} et toi êtes maintenant amis.`,
      ...(asker.href !== null ? { actionUrl: asker.href } : {}),
    });
  } else {
    await notificationRepository.create({
      userId: target.data,
      type: "FRIEND_REQUEST",
      title: "Demande d'ami",
      body: `${asker.name} souhaite t'ajouter.`,
      ...(asker.href !== null ? { actionUrl: asker.href } : {}),
    });
  }

  return { ok: true, becameFriends: result.status === "ACCEPTED" };
}

export async function acceptFriendship(
  userId: string,
  otherId: unknown,
): Promise<FriendActionResult> {
  const other = idSchema.safeParse(otherId);
  if (!other.success) return { ok: false, error: NOT_FOUND };

  const accepted = await friendshipRepository.accept(userId, other.data);
  // Not an error worth showing loudly: they cancelled, or it was already
  // accepted elsewhere. Either way the list is about to show the truth.
  if (!accepted) return { ok: false, error: "Cette demande n'est plus en attente." };

  const accepter = await subjectOf(userId, true);
  await notificationRepository.create({
    userId: other.data,
    type: "FRIEND_ACCEPTED",
    title: "Demande acceptée",
    body: `${accepter.name} a accepté ta demande.`,
    ...(accepter.href !== null ? { actionUrl: accepter.href } : {}),
  });

  return { ok: true };
}

/**
 * Declining, cancelling and unfriending - one call, because they are one
 * thing: the row goes.
 *
 * Nobody is told. A refusal that sends a notification is a refusal people avoid
 * making, and an unfriending that announces itself is worse.
 */
export async function removeFriendship(
  userId: string,
  otherId: unknown,
): Promise<FriendActionResult> {
  const other = idSchema.safeParse(otherId);
  if (!other.success) return { ok: false, error: NOT_FOUND };

  await friendshipRepository.remove(userId, other.data);
  return { ok: true };
}
