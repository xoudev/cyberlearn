import { acceptFriendship } from "@/lib/friends/friends-service";
import { friendWriteRoute } from "../_lib/write-route";

/** Says yes to a request, through the site's service: the asker is notified. */
export const POST = friendWriteRoute(acceptFriendship);
