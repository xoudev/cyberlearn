/**
 * "Tes amis" on the dashboard: what the reader's friends did lately, in one
 * list, worded the same on the site and in the app.
 *
 * Only what a friend's profile already shows to the reader goes in: lessons
 * of the catalogue finished, badges, certificates, challenges solved, and the
 * duels a friend won on a catalogue path. A class's own lesson or path would
 * say which class somebody is in, and a duel's loser is somebody the reader
 * may not know, so neither is ever named here.
 */

export type FriendActivityKind = "lesson" | "badge" | "certificate" | "challenge" | "duel";

/** One moment, before it is merged with the others. */
export interface FriendActivityMoment {
  kind: FriendActivityKind;
  /** Unique across the whole list, for a list key. */
  key: string;
  at: Date | string;
  /** The lesson, the badge, the certificate's path, the challenge, the duel's path. */
  title: string;
}

/** How many moments the section shows. */
export const FRIEND_ACTIVITY_LENGTH = 6;

/**
 * The most recent moments of every source, most recent first. Each source is
 * read most recent first and bounded at `limit`, so the merge of their heads
 * is the true head of the whole. Two moments at the same instant keep a
 * stable order (by key), so the list does not reshuffle between two reads.
 */
export function mergeFriendActivity<T extends FriendActivityMoment>(
  sources: readonly (readonly T[])[],
  limit: number = FRIEND_ACTIVITY_LENGTH,
): T[] {
  const time = (value: Date | string): number => new Date(value).getTime();
  return sources
    .flat()
    .filter((moment) => !Number.isNaN(time(moment.at)))
    .sort((a, b) => time(b.at) - time(a.at) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
    .slice(0, Math.max(0, limit));
}

/** What the friend did, before the title: "Alex a terminé la leçon « … »". */
export const FRIEND_ACTIVITY_VERB: Record<FriendActivityKind, string> = {
  lesson: "a terminé la leçon",
  badge: "a obtenu le badge",
  certificate: "a obtenu le certificat",
  challenge: "a résolu le défi",
  duel: "a gagné un duel sur",
};

/** The line after the friend's name. */
export function friendActivityText(kind: FriendActivityKind, title: string): string {
  return `${FRIEND_ACTIVITY_VERB[kind]} « ${title} »`;
}

/** The section's title, and what it says when the friends have been quiet. */
export const FRIEND_ACTIVITY_TITLE = "Tes amis";
export const FRIEND_ACTIVITY_EMPTY =
  "Rien de neuf chez tes amis pour l'instant. Défie l'un d'eux sur un parcours.";

/** A moment as the site and the app receive it: who, what, when. */
export interface FriendActivityItem {
  key: string;
  kind: FriendActivityKind;
  /** ISO date. */
  at: string;
  title: string;
  friend: {
    id: string;
    name: string;
    username: string | null;
    /** Ready to draw: a signed URL, a built-in path, a glyph marker, or null. */
    avatarSrc: string | null;
    /** Whether the name may open their profile. */
    profileOpen: boolean;
    /** A duel still open between the reader and this friend: "Défier" waits for it to end. */
    duelOpen: boolean;
  };
}

/**
 * Whether a moment is the friend's most recent one in the list: the row that
 * carries "Défier", so a friend who did three things is offered once.
 */
export function isFriendsLatest(
  items: readonly { friend: { id: string } }[],
  index: number,
): boolean {
  const item = items[index];
  if (item === undefined) return false;
  return items.findIndex((other) => other.friend.id === item.friend.id) === index;
}
