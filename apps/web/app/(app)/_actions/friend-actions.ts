"use server";

import { revalidatePath } from "next/cache";
import { requireRequestUser } from "@/lib/auth";
import {
  acceptFriendship,
  listFriendsFor,
  removeFriendship,
  requestFriendship,
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

export async function acceptFriendRequestAction(otherId: string): Promise<FriendActionResult> {
  const user = await requireRequestUser();
  const result = await acceptFriendship(user.id, otherId);
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

export async function removeFriendAction(otherId: string): Promise<FriendActionResult> {
  const user = await requireRequestUser();
  const result = await removeFriendship(user.id, otherId);
  if (result.ok) revalidatePath("/", "layout");
  return result;
}
