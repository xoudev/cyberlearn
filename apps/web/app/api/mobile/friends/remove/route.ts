import { removeFriendship } from "@/lib/friends/friends-service";
import { friendWriteRoute } from "../_lib/write-route";

/**
 * Declines a request, takes one back, or ends a friendship: the row goes, and
 * nobody is told, as on the site.
 */
export const POST = friendWriteRoute(removeFriendship);
