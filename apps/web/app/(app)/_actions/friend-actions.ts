"use server";

import { revalidatePath } from "next/cache";
import { requireRequestUser } from "@/lib/auth";
import {
  acceptFriendship,
  declineFriendship,
  listFriendsFor,
  removeFriendship,
  requestFriendship,
  requestFriendshipByHandle,
  type FriendActionResult,
  type FriendLists,
} from "@/lib/friends/friends-service";

/**
 * The site's entry points for friendships: the session, then the service the
 * app uses too (@/lib/friends/friends-service), then the layout refreshed so
 * the count next to the bell follows.
 */

export type { FriendActionResult, FriendEntry, FriendLists } from "@/lib/friends/friends-service";

/** The three lists, for the panel. Read on open rather than on every page load. */
export async function getFriendsAction(): Promise<FriendLists> {
  const user = await requireRequestUser();
  return listFriendsFor(user.id);
}

export async function sendFriendRequestAction(targetId: string): Promise<FriendActionResult> {
  const user = await requireRequestUser();
  const result = await requestFriendship(user.id, targetId);
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

/**
 * Asks a player of the public leaderboard, by the handle the row shows: its
 * rows carry no id, and the service finds it only among the players that
 * board names (requestFriendshipByHandle).
 */
export async function sendFriendRequestByHandleAction(
  username: string,
): Promise<FriendActionResult> {
  const user = await requireRequestUser();
  const result = await requestFriendshipByHandle(user.id, username);
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

export async function acceptFriendRequestAction(otherId: string): Promise<FriendActionResult> {
  const user = await requireRequestUser();
  const result = await acceptFriendship(user.id, otherId);
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

/** Refuses a request, and only a request still waiting: the notification's "Refuser". */
export async function declineFriendRequestAction(otherId: string): Promise<FriendActionResult> {
  const user = await requireRequestUser();
  const result = await declineFriendship(user.id, otherId);
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

export async function removeFriendAction(otherId: string): Promise<FriendActionResult> {
  const user = await requireRequestUser();
  const result = await removeFriendship(user.id, otherId);
  if (result.ok) revalidatePath("/", "layout");
  return result;
}
