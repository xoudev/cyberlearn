import { z } from "zod";
import { duelRepository, friendshipRepository } from "@cyberlearn/db";
import {
  FRIEND_ACTIVITY_LENGTH,
  type FriendActivityItem,
} from "@cyberlearn/lib/social/friend-activity";
import { resolveAvatarSrcMany } from "@/lib/avatar/storage";

/**
 * "Tes amis", the dashboard's section and the app's home: what the reader's
 * friends did lately (friendshipRepository.recentFriendActivity), each moment
 * with the friend's picture signed, their profile, and whether a duel with
 * them is still open, so "Défier" waits for it to end.
 *
 * Shared by the site (dashboard/page.tsx) and the app
 * (/api/mobile/friends/activity). Callers are responsible for
 * AUTHENTICATION: `userId` must be a verified identity.
 */

export interface FriendsActivity {
  /**
   * Whether the reader has a friend at all. Without one the section is not
   * drawn; with friends who have been quiet, it says so and offers a duel.
   */
  hasFriends: boolean;
  items: FriendActivityItem[];
}

/** How many moments a caller may ask for: the app's `limit`. */
export const activityLimitSchema = z.coerce
  .number()
  .int()
  .min(1)
  .max(20)
  .default(FRIEND_ACTIVITY_LENGTH);

export async function friendsActivityFor(
  userId: string,
  limit: number = FRIEND_ACTIVITY_LENGTH,
): Promise<FriendsActivity> {
  const friendIds = await friendshipRepository.friendIds(userId);
  if (friendIds.size === 0) return { hasFriends: false, items: [] };

  const [rows, inDuel] = await Promise.all([
    friendshipRepository.recentFriendActivity(userId, limit, friendIds),
    duelRepository.openOpponentsOf(userId),
  ]);
  if (rows.length === 0) return { hasFriends: true, items: [] };

  // One signing round-trip for every friend on the list, however many
  // moments each has.
  const people = [...new Map(rows.map((row) => [row.friend.id, row.friend])).values()];
  const signed = await resolveAvatarSrcMany(people.map((person) => person.avatarUrl));
  const avatarOf = new Map(people.map((person, i) => [person.id, signed[i] ?? null]));

  return {
    hasFriends: true,
    items: rows.map((row) => ({
      key: row.key,
      kind: row.kind,
      at: row.at.toISOString(),
      title: row.title,
      friend: {
        id: row.friend.id,
        // displayName can be empty: || falls through it to the handle.
        name: row.friend.displayName || (row.friend.username ?? "Sans nom"),
        username: row.friend.username,
        avatarSrc: avatarOf.get(row.friend.id) ?? null,
        // An accepted friend's profile opens for the reader, private or not
        // (findPublicProfile's rule): only a missing handle leaves no page.
        profileOpen: row.friend.username !== null,
        duelOpen: inDuel.has(row.friend.id),
      },
    })),
  };
}
