"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { forumRepository } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";
import {
  createForumTopic,
  editForumPost,
  hideForumPost,
  isForumAdmin,
  replyInForum,
  type ForumActionResult,
} from "@/lib/forum/forum-service";

/**
 * The site's entry points for writing on the forum: each authenticates the
 * session (requireRequestUser, which also turns a banned account away), then
 * hands over to the service the app uses too (@/lib/forum/forum-service).
 */

export type { ForumActionResult };

export async function createTopicAction(input: {
  categorySlug: string;
  title: string;
  content: string;
}): Promise<ForumActionResult> {
  const user = await requireRequestUser();
  return createForumTopic(user.id, input);
}

export async function replyAction(input: {
  topicId: string;
  content: string;
}): Promise<ForumActionResult> {
  const user = await requireRequestUser();
  return replyInForum(user.id, input);
}

export async function editPostAction(input: {
  postId: string;
  content: string;
  path: string;
}): Promise<ForumActionResult> {
  const user = await requireRequestUser();
  return editForumPost(user.id, { postId: input.postId, content: input.content }, input.path);
}

export async function hidePostAction(input: {
  postId: string;
  path: string;
}): Promise<ForumActionResult> {
  const user = await requireRequestUser();
  return hideForumPost(user.id, input.postId, input.path);
}

/** Closing a thread and holding one at the top are administrator's work. */
export async function moderateTopicAction(input: {
  topicId: string;
  locked?: boolean;
  pinned?: boolean;
  path: string;
}): Promise<ForumActionResult> {
  const user = await requireRequestUser();
  if (!(await isForumAdmin(user.id))) return { ok: false, error: "Action réservée." };
  if (!z.string().uuid().safeParse(input.topicId).success) {
    return { ok: false, error: "Sujet introuvable." };
  }

  if (input.locked !== undefined) await forumRepository.setLocked(input.topicId, input.locked);
  if (input.pinned !== undefined) await forumRepository.setPinned(input.topicId, input.pinned);

  revalidatePath(input.path);
  return { ok: true };
}
