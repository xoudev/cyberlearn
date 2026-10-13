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

/**
 * What can be done about a friendship from somebody's profile. A request
 * received is answered either way, so it is two buttons; ending a friendship
 * is the one that cannot be redone alone, so it sits behind the "Ami ✓" the
 * profile shows while two people are friends rather than in plain sight.
 */
export type FriendshipAction = "request" | "cancel" | "accept" | "decline" | "unfriend";

/**
 * What each button says. Shared by the site's profile and the app's, so the
 * same state reads the same way. The label is the action, not the state:
 * somebody who has asked sees how to take it back, not a reminder that they
 * asked.
 */
export const FRIENDSHIP_ACTION_LABEL: Record<FriendshipAction, string> = {
  request: "Ajouter en ami",
  cancel: "Annuler la demande",
  accept: "Accepter",
  decline: "Refuser",
  unfriend: "Retirer des amis",
};

/** What a profile says while two people are friends: a state, with a menu behind it. */
export const FRIENDS_LABEL = "Ami ✓";

/**
 * The buttons a profile offers in each state, the one to press first leading.
 * For friends it is what the menu behind "Ami ✓" holds.
 */
export function friendshipActions(view: FriendshipView): readonly FriendshipAction[] {
  switch (view) {
    case "none":
      return ["request"];
    case "outgoing":
      return ["cancel"];
    case "incoming":
      return ["accept", "decline"];
    case "friends":
      return ["unfriend"];
  }
}

/**
 * The call behind a button. Accepting goes through a request on purpose:
 * asking somebody who already asked is agreeing, so the one call covers both,
 * and a request cancelled in the meantime becomes a fresh ask rather than an
 * error. Declining, cancelling and unfriending all delete the row.
 */
export function friendshipMove(action: FriendshipAction): "request" | "remove" {
  return action === "request" || action === "accept" ? "request" : "remove";
}

/**
 * Whether a profile offers a duel: only between friends, as a duel itself
 * requires. Read from the state the buttons are in, so the offer appears the
 * moment a request is accepted and goes the moment the friendship ends.
 */
export function canChallenge(view: FriendshipView): boolean {
  return view === "friends";
}

/**
 * Where the button stands once the server said yes. A request that turned
 * into agreeing (they had asked too) lands on "friends", not "outgoing".
 */
export function friendshipAfter(
  move: "request" | "remove",
  becameFriends: boolean,
): FriendshipView {
  if (move === "remove") return "none";
  return becameFriends ? "friends" : "outgoing";
}

/**
 * Whether pressing the button asks first. Ending a friendship is one call and
 * nobody is told, so a slipped tap would undo something only the other person
 * can redo. A request, taking one back or refusing one costs one tap to send
 * again.
 */
export function friendshipActionAsksFirst(action: FriendshipAction): boolean {
  return action === "unfriend";
}

/** The question before a friendship ends, the same on the site and in the app. */
export function unfriendQuestion(name: string): string {
  return `Retirer ${name} de tes amis ?`;
}

/** The same question where the name already sits right above it, in a list row. */
export const UNFRIEND_PROMPT = "Retirer de tes amis ?";

/** What follows the question: what ending it does, and what it does not. */
export const UNFRIEND_DETAIL =
  "Aucune notification ne part. Pour redevenir amis, il faudra une nouvelle demande, acceptée.";
