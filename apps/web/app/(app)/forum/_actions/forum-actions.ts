"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  forumRepository,
  moderationRepository,
  notificationRepository,
  prisma,
} from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";
import { checkQaSubmission } from "@/lib/rate-limit";
import { recordQuestProgress } from "@/lib/quests/progress";

/**
 * Writing on the forum.
 *
 * Every path here does the same four things in the same order: the session,
 * the rate limit, the shape of the input, then the screen. The screen is last
 * because it is the expensive one and there is no point reading text that was
 * never going to be written anyway.
 */

const titleSchema = z.string().trim().min(8).max(160);
const bodySchema = z.string().trim().min(10).max(10_000);
const uuid = z.string().uuid();

export interface ForumActionResult {
  ok: boolean;
  error?: string;
  /** Where to go once it worked. */
  href?: string;
}

/**
 * The message a refusal shows - the same one the lesson Q&A uses.
 *
 * It says what happened and nothing about which rule fired: naming it turns
 * the filter into a puzzle, and people retry until they find the wording that
 * gets through.
 */
const REFUSED =
  "Ce message n'a pas été publié : il contient des propos que la modération refuse. Reformule-le.";
const TOO_FAST = "Trop de messages. Réessaie dans une minute.";

/**
 * Links are ordinary here and count everywhere else.
 *
 * A forum post about a tool is precisely the case the flag exists for: a
 * thread on nmap without a link to nmap.org is a worse thread, and scoring it
 * as spam would teach people to describe URLs in words.
 */
const FORUM_SCREEN = { allowLinks: true } as const;

export async function createTopicAction(input: {
  categorySlug: string;
  title: string;
  content: string;
}): Promise<ForumActionResult> {
  const user = await requireRequestUser();

  // Shared with the lesson Q&A on purpose: somebody flooding the site does not
  // care which surface they use, so the budget should not be per surface.
  const limit = await checkQaSubmission(user.id);
  if (!limit.success) return { ok: false, error: TOO_FAST };

  const parsed = z
    .object({
      categorySlug: z.string().min(1).max(80),
      title: titleSchema,
      content: bodySchema,
    })
    .safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Un titre de 8 caractères et un message de 10, au minimum." };
  }

  // Title and body together: an insult in a title is an insult, and screening
  // only the longer field is the kind of gap that gets found immediately.
  const screen = await moderationRepository.screen({
    text: `${parsed.data.title}\n\n${parsed.data.content}`,
    surface: "forum.topic",
    userId: user.id,
    ...FORUM_SCREEN,
  });
  if (!screen.allowed) return { ok: false, error: REFUSED };

  const topic = await forumRepository.createTopic({
    categorySlug: parsed.data.categorySlug,
    authorId: user.id,
    title: parsed.data.title,
    content: parsed.data.content,
  });
  if (!topic) return { ok: false, error: "Cette section n'existe pas." };

  // A flagged-but-allowed thread exists and a reviewer has to be able to reach
  // it, which is what the content id is for.
  if (screen.eventId !== null) await moderationRepository.attachContent(screen.eventId, topic.id);
  await recordQuestProgress(user.id, "FORUM_POST", new Date(), { amount: 1 });

  revalidatePath("/forum");
  revalidatePath(`/forum/${parsed.data.categorySlug}`);
  return { ok: true, href: `/forum/${parsed.data.categorySlug}/${topic.slug}` };
}

export async function replyAction(input: {
  topicId: string;
  content: string;
}): Promise<ForumActionResult> {
  const user = await requireRequestUser();

  const limit = await checkQaSubmission(user.id);
  if (!limit.success) return { ok: false, error: TOO_FAST };

  const parsed = z.object({ topicId: uuid, content: bodySchema }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Message trop court." };

  const screen = await moderationRepository.screen({
    text: parsed.data.content,
    surface: "forum.post",
    userId: user.id,
    ...FORUM_SCREEN,
  });
  if (!screen.allowed) return { ok: false, error: REFUSED };

  const reply = await forumRepository.reply({
    topicId: parsed.data.topicId,
    authorId: user.id,
    content: parsed.data.content,
  });
  if (!reply) return { ok: false, error: "Ce sujet est fermé ou n'existe plus." };

  if (screen.eventId !== null)
    await moderationRepository.attachContent(screen.eventId, reply.postId);
  await recordQuestProgress(user.id, "FORUM_POST", new Date(), { amount: 1 });
  await notifyParticipants(reply.notify, user.id, reply.topicTitle, reply.url);

  revalidatePath(reply.url);
  revalidatePath("/forum");
  return { ok: true, href: reply.url };
}

export async function editPostAction(input: {
  postId: string;
  content: string;
  path: string;
}): Promise<ForumActionResult> {
  const user = await requireRequestUser();
  const parsed = z.object({ postId: uuid, content: bodySchema }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Message trop court." };

  const screen = await moderationRepository.screen({
    text: parsed.data.content,
    surface: "forum.post",
    userId: user.id,
    ...FORUM_SCREEN,
  });
  if (!screen.allowed) return { ok: false, error: REFUSED };

  const done = await forumRepository.editPost(user.id, parsed.data.postId, parsed.data.content);
  if (!done) return { ok: false, error: "Message introuvable." };
  if (screen.eventId !== null) {
    await moderationRepository.attachContent(screen.eventId, parsed.data.postId);
  }

  revalidatePath(input.path);
  return { ok: true };
}

export async function hidePostAction(input: {
  postId: string;
  path: string;
}): Promise<ForumActionResult> {
  const user = await requireRequestUser();
  if (!uuid.safeParse(input.postId).success) return { ok: false, error: "Message introuvable." };

  const done = await forumRepository.hidePost(input.postId, {
    id: user.id,
    isAdmin: await isAdmin(user.id),
  });
  if (!done) return { ok: false, error: "Message introuvable." };

  revalidatePath(input.path);
  revalidatePath("/forum");
  return { ok: true };
}

/** Closing a thread and holding one at the top are administrator's work. */
export async function moderateTopicAction(input: {
  topicId: string;
  locked?: boolean;
  pinned?: boolean;
  path: string;
}): Promise<ForumActionResult> {
  const user = await requireRequestUser();
  if (!(await isAdmin(user.id))) return { ok: false, error: "Action réservée." };
  if (!uuid.safeParse(input.topicId).success) return { ok: false, error: "Sujet introuvable." };

  if (input.locked !== undefined) await forumRepository.setLocked(input.topicId, input.locked);
  if (input.pinned !== undefined) await forumRepository.setPinned(input.topicId, input.pinned);

  revalidatePath(input.path);
  return { ok: true };
}

/**
 * Read from the database rather than from the session claim, so a role taken
 * away stops working at once rather than at the next sign-in.
 */
async function isAdmin(userId: string): Promise<boolean> {
  const row = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return row?.role === "ADMIN";
}

/** Never blocks the reply: the message is posted either way. */
async function notifyParticipants(
  userIds: string[],
  authorId: string,
  topicTitle: string,
  url: string,
): Promise<void> {
  if (userIds.length === 0) return;
  try {
    const author = await prisma.user.findUnique({
      where: { id: authorId },
      select: { displayName: true, username: true },
    });
    const name =
      author && author.displayName.trim() !== ""
        ? author.displayName
        : (author?.username ?? "Quelqu'un");
    await Promise.all(
      userIds.map((userId) =>
        notificationRepository.create({
          userId,
          type: "FORUM_REPLY",
          title: "Nouvelle réponse",
          body: `${name} a répondu dans « ${topicTitle} ».`,
          actionUrl: url,
        }),
      ),
    );
  } catch (error) {
    console.error("[forum] failed to notify participants:", error);
  }
}
