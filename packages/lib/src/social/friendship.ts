/**
 * What a friendship is between two people, before any database is involved.
 *
 * All of it comes down to one awkward fact: a pair has no natural order, and a
 * row does. Everything here exists to give the pair an order so that "are these
 * two friends" is a single lookup and "they are already friends" is a
 * constraint rather than a check somebody has to remember to write twice.
 */

/** Two ids, smallest first. */
export interface OrderedPair {
  userAId: string;
  userBId: string;
}

/**
 * The pair, in the order it is stored.
 *
 * Null when the two are the same person - nobody is their own friend, and
 * returning null rather than throwing makes the caller say what happens next.
 * Plain string comparison, because the ids are uuids and all that is needed is
 * that the order is the same every time.
 */
export function orderPair(one: string, other: string): OrderedPair | null {
  if (one === other) return null;
  return one < other ? { userAId: one, userBId: other } : { userAId: other, userBId: one };
}

/** The other person in a friendship, seen from one side. */
export function otherSide(pair: OrderedPair, viewerId: string): string {
  return pair.userAId === viewerId ? pair.userBId : pair.userAId;
}

/**
 * Where a friendship stands, from one person's point of view.
 *
 * The same row means four different things depending on who is looking and who
 * asked, and every one of them needs a different button: nothing, cancel, accept
 * or decline, unfriend.
 */
export type FriendshipView = "none" | "outgoing" | "incoming" | "friends";

export interface FriendshipLike {
  status: "PENDING" | "ACCEPTED";
  requestedById: string;
}

export function friendshipView(
  friendship: FriendshipLike | null | undefined,
  viewerId: string,
): FriendshipView {
  if (!friendship) return "none";
  if (friendship.status === "ACCEPTED") return "friends";
  return friendship.requestedById === viewerId ? "outgoing" : "incoming";
}

/** What the button says, for each of the four. */
export const FRIENDSHIP_ACTION_LABEL: Record<FriendshipView, string> = {
  none: "Ajouter en ami",
  outgoing: "Demande envoyée",
  incoming: "Accepter la demande",
  friends: "Retirer des amis",
};
