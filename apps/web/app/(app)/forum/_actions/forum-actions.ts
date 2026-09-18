"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  MODERATION_SURFACE,
  forumRepository,
  moderationRepository,
  notificationRepository,
  prisma,
} from "@cyberlearn/db";
import { FLAG_BUDGET_MESSAGE, excerpt } from "@cyberlearn/lib";
import { announceModeration } from "@/lib/moderation/announce";
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
  /**
   * Written, and out of sight until a moderator has looked at it. Said
   * plainly: a message that appears to post and then is not in the thread
   * reads as a bug, and people post it again.
   */
  heldForReview?: boolean;
}
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
    surface: MODERATION_SURFACE.forumTopic,
    userId: user.id,
    ...FORUM_SCREEN,
  });

  // Over budget: nothing is written at all. The screen already hides each
  // flagged message, so this is not about the content - it is about one account
  // taking up a morning's worth of queue.
  if (screen.throttled) return { ok: false, error: FLAG_BUDGET_MESSAGE };

  // Written either way, hidden when the screen flagged it: the author keeps
  // their thread and can still see it, nobody else can, and a reviewer decides.
  const topic = await forumRepository.createTopic({
    categorySlug: parsed.data.categorySlug,
    authorId: user.id,
    title: parsed.data.title,
    content: parsed.data.content,
    isHidden: screen.flagged,
  });
  if (!topic) return { ok: false, error: "Cette section n'existe pas." };

  // The reviewer's decision is carried through to this row, so the id has to
  // be on the event before anybody can act on it.
  if (screen.eventId !== null) await moderationRepository.attachContent(screen.eventId, topic.id);
  // No quest credit for a thread sitting in the queue: if a reviewer destroys
  // it, the progress it earned would stay behind.
  if (!screen.flagged) {
    await recordQuestProgress(user.id, "FORUM_POST", new Date(), { amount: 1 });
  } else {
    await announceModeration({
      userId: user.id,
      surface: MODERATION_SURFACE.forumTopic,
      stage: "held",
      excerpt: excerpt(`${parsed.data.title}\n\n${parsed.data.content}`, 300),
    });
  }

  revalidatePath("/forum");
  revalidatePath(`/forum/${parsed.data.categorySlug}`);
  return {
    ok: true,
    href: `/forum/${parsed.data.categorySlug}/${topic.slug}`,
    heldForReview: screen.flagged,
  };
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
    surface: MODERATION_SURFACE.forumPost,
    userId: user.id,
    ...FORUM_SCREEN,
  });

  if (screen.throttled) return { ok: false, error: FLAG_BUDGET_MESSAGE };

  const reply = await forumRepository.reply({
    topicId: parsed.data.topicId,
    authorId: user.id,
    content: parsed.data.content,
    isHidden: screen.flagged,
  });
  if (!reply) return { ok: false, error: "Ce sujet est fermé ou n'existe plus." };

  if (screen.eventId !== null)
    await moderationRepository.attachContent(screen.eventId, reply.postId);
  if (!screen.flagged) {
    await recordQuestProgress(user.id, "FORUM_POST", new Date(), { amount: 1 });
  } else {
    await announceModeration({
      userId: user.id,
      surface: MODERATION_SURFACE.forumPost,
      stage: "held",
      excerpt: excerpt(parsed.data.content, 300),
    });
  }
  // reply.notify is empty for a hidden reply, so this tells nobody - but the
  // call stays here rather than behind the flag, because which replies are
  // worth announcing is the repository's decision to make, in one place.
  await notifyParticipants(reply.notify, user.id, reply.topicTitle, reply.url);

  revalidatePath(reply.url);
  revalidatePath("/forum");
  return { ok: true, href: reply.url, heldForReview: screen.flagged };
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
    surface: MODERATION_SURFACE.forumPost,
    userId: user.id,
    ...FORUM_SCREEN,
  });

  // An edit that trips the screen takes the post down with it. Refusing the
  // edit instead would leave the previous text standing, which is the version
  // nobody complained about - but it also hands back a way to probe the filter
  // for free, and the point is that flagged text is out of sight either way.
  if (screen.throttled) return { ok: false, error: FLAG_BUDGET_MESSAGE };

  const done = await forumRepository.editPost(
    user.id,
    parsed.data.postId,
    parsed.data.content,
    screen.flagged,
  );
  if (!done) return { ok: false, error: "Message introuvable." };
  if (screen.eventId !== null) {
    await moderationRepository.attachContent(screen.eventId, parsed.data.postId);
  }
  if (screen.flagged) {
    await announceModeration({
      userId: user.id,
      surface: MODERATION_SURFACE.forumPost,
      stage: "held",
      excerpt: excerpt(parsed.data.content, 300),
    });
  }

  revalidatePath(input.path);
  return { ok: true, heldForReview: screen.flagged };
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
