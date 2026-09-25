import { requestFriendship } from "@/lib/friends/friends-service";
import { friendWriteRoute } from "../_lib/write-route";

/**
 * Asks somebody to be friends, through the site's service: the other person is
 * notified, and asking somebody who already asked is agreeing.
 */
export const POST = friendWriteRoute(requestFriendship);
