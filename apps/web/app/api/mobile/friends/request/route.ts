import { requestFriendship, requestFriendshipByHandle } from "@/lib/friends/friends-service";
import { friendWriteRoute } from "../_lib/write-route";

/**
 * Asks somebody to be friends, through the site's service: the other person is
 * notified, and asking somebody who already asked is agreeing.
 *
 *   POST { userId }     the other person's id, as always
 *   POST { username }   the handle a public line of the leaderboard shows,
 *                       found only among the players that board names
 */
export const POST = friendWriteRoute(requestFriendship, requestFriendshipByHandle);
