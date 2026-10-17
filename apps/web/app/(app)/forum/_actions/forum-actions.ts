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

/**
 * The page a write refreshes: a forum page - /forum, a section, a thread -
 * and nothing else. It comes from the browser like the rest of the input, and
 * passed straight to revalidatePath it let any signed-in account have any
 * path of the site's cache revalidated through an edit or a hide. Section and
 * thread slugs are [a-z0-9-] (slugify in the forum repository).
 */
const forumPath = z
  .string()
  .max(200)
  .regex(/^\/forum(?:\/[a-z0-9-]{1,80}){0,2}$/u);

const editSchema = z.object({ postId: z.string(), content: z.string(), path: forumPath });
const hideSchema = z.object({ postId: z.string(), path: forumPath });
const moderateSchema = z.object({
  topicId: z.guid(),
  locked: z.boolean().optional(),
  pinned: z.boolean().optional(),
  path: forumPath,
});

const INVALID: ForumActionResult = { ok: false, error: "Requête invalide." };

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
  // The id and the text are the service's to judge (and to word a refusal
  // for); the shape and the page to refresh are checked here.
  const parsed = editSchema.safeParse(input);
  if (!parsed.success) return INVALID;
  const { postId, content, path } = parsed.data;
  return editForumPost(user.id, { postId, content }, path);
}

export async function hidePostAction(input: {
  postId: string;
  path: string;
}): Promise<ForumActionResult> {
  const user = await requireRequestUser();
  const parsed = hideSchema.safeParse(input);
  if (!parsed.success) return INVALID;
  return hideForumPost(user.id, parsed.data.postId, parsed.data.path);
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
  const parsed = moderateSchema.safeParse(input);
  if (!parsed.success) {
    // A topic id that is not one says what it always said; anything else -
    // a flag that is not a boolean, a page outside the forum - is a forged
    // call, refused before it reaches Prisma as a 500.
    return parsed.error.issues.some((issue) => issue.path[0] === "topicId")
      ? { ok: false, error: "Sujet introuvable." }
      : INVALID;
  }
  const { topicId, locked, pinned, path } = parsed.data;

  if (locked !== undefined) await forumRepository.setLocked(topicId, locked);
  if (pinned !== undefined) await forumRepository.setPinned(topicId, pinned);

  revalidatePath(path);
  return { ok: true };
}
