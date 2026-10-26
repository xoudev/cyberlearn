import { declineFriendship } from "@/lib/friends/friends-service";
import { friendWriteRoute } from "../_lib/write-route";

/**
 * Refuses a request, and only a request still waiting: what a notification's
 * "Refuser" calls in the app, as on the site. A request accepted elsewhere
 * since the notification arrived is a friendship, which this leaves alone
 * where `remove` would end it. Nobody is told.
 */
export const POST = friendWriteRoute(declineFriendship);
