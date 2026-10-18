import { z } from "zod";
import {
  duelRepository,
  friendshipRepository,
  leaderboardRepository,
  notificationRepository,
  prisma,
  userRepository,
  type FriendEdge,
} from "@cyberlearn/db";
import { REQUEST_GONE_LABEL } from "@cyberlearn/lib/social/friendship";
import { usernameSchema } from "@cyberlearn/types";
import { resolveAvatarSrcMany } from "@/lib/avatar/storage";

import { checkNotifyingWrite } from "@/lib/rate-limit";

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
  /**
   * Whether the reader would be let into this person's profile. A pending
   * request opens nothing, so a private profile on the other side of one is a
   * name to show, not a link to a 404.
   */
  profileOpen: boolean;
  /**
   * A duel still open between the reader and this friend, for the panel's
   * "Défier", greyed until it is over. False on a request: a duel is between
   * friends only.
   */
  duelOpen: boolean;
}

export interface FriendLists {
  incoming: FriendEntry[];
  friends: FriendEntry[];
  outgoing: FriendEntry[];
}

const idSchema = z.guid();
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

/**
 * The three lists, whole. Read on open rather than on every page load.
 *
 * They used to stop at sixty friends and thirty requests each way without
 * saying so: the sixty-first friend could not be found, and the count on the
 * menu could announce requests the panel did not show. The panel scrolls.
 */
export async function listFriendsFor(userId: string): Promise<FriendLists> {
  const [incoming, friends, outgoing, inDuel] = await Promise.all([
    friendshipRepository.listIncoming(userId),
    friendshipRepository.listFriends(userId),
    friendshipRepository.listOutgoing(userId),
    duelRepository.openOpponentsOf(userId),
  ]);

  // All three lists in one round-trip, rather than three or - worse - one per
  // row.
  const all = [...incoming, ...friends, ...outgoing];
  const [resolved, open] = await Promise.all([
    resolveAvatarSrcMany(all.map((e) => e.person.avatarUrl)),
    userRepository.profilesOpenTo(
      userId,
      all.map((e) => e.person.id),
    ),
  ]);
  const entries = all.map((edge, i) => ({
    ...edge,
    avatarSrc: resolved[i] ?? null,
    profileOpen: open.has(edge.person.id),
    duelOpen: edge.status === "ACCEPTED" && inDuel.has(edge.person.id),
  }));

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

  // Each request notifies its target: without a budget, one account could
  // bury anybody's notifications.
  const limit = await checkNotifyingWrite(userId);
  if (!limit.success)
    return { ok: false, error: "Beaucoup d'envois d'un coup : réessaie dans un moment." };

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
      // Who asked, so the notification can answer it in place (Accepter,
      // Refuser) on the site and in the app: friendRequestSender reads it.
      metadata: { fromUserId: userId },
    });
  }

  return { ok: true, becameFriends: result.status === "ACCEPTED" };
}

/**
 * Asks somebody named by their handle, from a row of the public leaderboard:
 * its rows carry no id (leaderboard.visibility.ts), only the handle of a
 * PUBLIC player. The id is found on the server among the players that board
 * names, so a handle it does not show - anonymous, hidden, unknown - is
 * refused like an id that is not one, and nobody is reached through it.
 */
export async function requestFriendshipByHandle(
  userId: string,
  username: unknown,
): Promise<FriendActionResult> {
  const handle = usernameSchema.safeParse(
    typeof username === "string" ? username.trim().replace(/^@/, "").toLowerCase() : username,
  );
  if (!handle.success) return { ok: false, error: NOT_FOUND };
  const targetId = await leaderboardRepository.findPublicPlayerId(handle.data);
  if (targetId === null) return { ok: false, error: NOT_FOUND };
  return requestFriendship(userId, targetId);
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
  if (!accepted) return { ok: false, error: REQUEST_GONE_LABEL };

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
 * Refuses a request and nothing else, for the notification's "Refuser": a
 * request accepted elsewhere since the notification arrived is a friendship,
 * which this leaves alone (friendshipRepository.decline) rather than end it.
 * Nobody is told, as for every refusal.
 */
export async function declineFriendship(
  userId: string,
  otherId: unknown,
): Promise<FriendActionResult> {
  const other = idSchema.safeParse(otherId);
  if (!other.success) return { ok: false, error: NOT_FOUND };
  const declined = await friendshipRepository.decline(userId, other.data);
  return declined ? { ok: true } : { ok: false, error: REQUEST_GONE_LABEL };
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
