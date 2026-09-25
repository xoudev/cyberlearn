import type { FriendEntry, FriendLists } from "@/lib/friends/friends-service";

/**
 * Friends as the app receives them (/api/mobile/friends): who the other person
 * is, which way the request went, and an avatar ready to draw. The stored
 * avatar value is left out: an uploaded one is a storage key, useless without
 * the signature the service already put in `avatarSrc`.
 */

export interface MobileFriend {
  id: string;
  username: string | null;
  name: string;
  level: number;
  xpTotal: number;
  /** Ready to draw: a glyph, a preset path, a signed URL, or null. */
  avatar: string | null;
  since: string;
}

export interface MobileFriendLists {
  incoming: MobileFriend[];
  friends: MobileFriend[];
  outgoing: MobileFriend[];
}

/**
 * The name a friends list shows. displayName is a string that can be empty,
 * so || falls through an empty one to the handle, as the site's panel does.
 */
export function friendName(person: { displayName: string; username: string | null }): string {
  return person.displayName || (person.username ?? "?");
}

export function toMobileFriend(entry: FriendEntry): MobileFriend {
  return {
    id: entry.person.id,
    username: entry.person.username,
    name: friendName(entry.person),
    level: entry.person.level,
    xpTotal: entry.person.xpTotal,
    avatar: entry.avatarSrc,
    since: entry.createdAt.toISOString(),
  };
}

export function toMobileFriendLists(lists: FriendLists): MobileFriendLists {
  return {
    incoming: lists.incoming.map(toMobileFriend),
    friends: lists.friends.map(toMobileFriend),
    outgoing: lists.outgoing.map(toMobileFriend),
  };
}
