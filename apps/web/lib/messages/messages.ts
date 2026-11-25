import { z } from "zod";
import {
  friendshipRepository,
  messageRepository,
  moderationRepository,
  UNACTIONED_SURFACE,
  userRepository,
  type ConversationSummary,
  type ThreadMessage,
} from "@cyberlearn/db";
import { FLAG_BUDGET_MESSAGE } from "@cyberlearn/lib";
import { labelRules } from "@cyberlearn/lib/moderation/labels";
import {
  effectiveStatus,
  firstMessageOutcome,
  MESSAGE_BODY_MAX,
  MESSAGE_PRIVACIES,
  MESSAGE_REFUSAL,
  nextMessageOutcome,
  type MessageRefusal,
} from "@cyberlearn/lib/messages/rules";
import { errorMessage, logger } from "@cyberlearn/lib/logger";
import { announceModeration } from "@/lib/moderation/announce";
import { reportContentFor, type ContentReportResult } from "@/lib/moderation/content-report";
import { checkMessageRequest, checkMessageSend } from "@/lib/rate-limit";

/**
 * Private messages: the conversations a learner has, the threads, sending,
 * answering a request, blocking, and the setting that says who may write.
 *
 * Shared by the site's actions (app/(app)/_actions/message-actions.ts) and,
 * later, the app's routes. Callers are responsible for AUTHENTICATION: `userId`
 * must be a verified identity of an account that is not banned. Lives outside
 * any "use server" module so it cannot be invoked with an arbitrary userId.
 *
 * The rules are @cyberlearn/lib/messages/rules. Every message is screened
 * before it is written; a flagged one is not sent at all, and its author is
 * told why (UNACTIONED_SURFACE.directMessage).
 */

export type MessageResult<T extends object = object> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

const uuid = z.guid();

const body = z
  .string("Le message manque.")
  .trim()
  .min(1, "Écris un message.")
  .max(MESSAGE_BODY_MAX, `${MESSAGE_BODY_MAX.toLocaleString("fr-FR")} caractères au plus.`);

const sendSchema = z.union([
  z.object({ conversationId: uuid, body }),
  z.object({ recipientId: uuid, body }),
]);

function refused(refusal: MessageRefusal): { ok: false; error: string } {
  return { ok: false, error: MESSAGE_REFUSAL[refusal] };
}

const SEND_FAILED = "Le message n'a pas pu partir. Réessaie.";

/** The account's conversations, and how many of them have something unread. */
export async function inboxFor(
  userId: string,
): Promise<{ conversations: ConversationSummary[]; unread: number }> {
  const conversations = await messageRepository.inbox(userId);
  return { conversations, unread: conversations.filter((c) => c.unread).length };
}

/** How many conversations have something unread: the figure on the button. */
export async function unreadCountFor(userId: string): Promise<number> {
  return (await inboxFor(userId)).unread;
}

/**
 * A page of one of the account's conversations, and the conversation as its
 * list shows it. Reading the latest page marks it read.
 */
export async function threadFor(
  userId: string,
  input: unknown,
): Promise<
  MessageResult<{ conversation: ConversationSummary; messages: ThreadMessage[]; hasMore: boolean }>
> {
  const parsed = z
    .object({ conversationId: uuid, before: z.iso.datetime().optional() })
    .safeParse(input);
  if (!parsed.success) return refused("notFound");
  const { conversationId, before } = parsed.data;

  const page = await messageRepository.thread(
    userId,
    conversationId,
    before === undefined ? undefined : new Date(before),
  );
  if (page === null) return refused("notFound");
  if (before === undefined) await messageRepository.markRead(userId, conversationId);
  const conversation = await messageRepository.summaryFor(userId, conversationId);
  if (conversation === null) return refused("notFound");
  return { ok: true, conversation: { ...conversation, unread: false }, ...page };
}

/** The account's conversation with somebody, if they have one: what a profile's button opens. */
export async function conversationWith(
  userId: string,
  input: unknown,
): Promise<MessageResult<{ conversationId: string | null }>> {
  const parsed = uuid.safeParse(input);
  if (!parsed.success) return refused("notFound");
  const found = await messageRepository.findDirect(userId, parsed.data);
  return { ok: true, conversationId: found?.id ?? null };
}

/**
 * Sends a message: in one of the account's conversations (`conversationId`),
 * or to somebody (`recipientId`), in their conversation when they already
 * have one and as the first message otherwise.
 */
export async function sendMessageFor(
  userId: string,
  input: unknown,
): Promise<MessageResult<{ conversationId: string; message: ThreadMessage }>> {
  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Message invalide." };
  }
  const limit = await checkMessageSend(userId);
  if (!limit.success)
    return { ok: false, error: "Beaucoup de messages d'un coup : attends un instant." };

  // Where it goes, and whether it may.
  let conversationId: string | null = null;
  let side: "A" | "B" | null = null;
  let recipientId: string | null = null;
  let firstStatus: "ACCEPTED" | "REQUESTED" | null = null;
  let accepted: boolean;

  const existing =
    "conversationId" in parsed.data
      ? await messageRepository.findForMember(userId, parsed.data.conversationId)
      : await messageRepository.findDirect(userId, parsed.data.recipientId);

  if ("conversationId" in parsed.data && existing === null) return refused("notFound");

  if (existing !== null) {
    const row = existing;
    conversationId = row.id;
    side = messageRepository.sideOf(row, userId);
    if (side === null) return refused("notFound");
    if (row.kind === "TEAM") {
      // The learner's answer to the team: nothing to accept, nobody to block.
      accepted = true;
    } else {
      const other = side === "A" ? row.userBId : row.userAId;
      if (other === null) return refused("notFound");
      const [blocked, friendship] = await Promise.all([
        messageRepository.blockedEither(userId, other),
        friendshipRepository.between(userId, other),
      ]);
      const status = effectiveStatus(row.status, friendship?.status === "ACCEPTED");
      const outcome = nextMessageOutcome({
        status,
        requestedById: row.requestedById,
        senderId: userId,
        blocked,
      });
      if (!outcome.ok) return refused(outcome.refusal);
      accepted = true;
    }
  } else {
    // A first message. "conversationId" input never reaches here.
    if (!("recipientId" in parsed.data)) return refused("notFound");
    recipientId = parsed.data.recipientId;
    const recipient = await userRepository.findHandle(recipientId);
    if (recipient === null) return refused("notFound");
    const [blocked, friendship, privacy] = await Promise.all([
      messageRepository.blockedEither(userId, recipientId),
      friendshipRepository.between(userId, recipientId),
      messageRepository.privacyOf(recipientId),
    ]);
    const outcome = firstMessageOutcome({
      self: recipientId === userId,
      blocked,
      friends: friendship?.status === "ACCEPTED",
      recipientPrivacy: privacy,
    });
    if (!outcome.ok) return refused(outcome.refusal);
    if (outcome.status === "REQUESTED") {
      const requests = await checkMessageRequest(userId);
      if (!requests.success) {
        return { ok: false, error: "Beaucoup de demandes d'un coup : réessaie dans une heure." };
      }
    }
    firstStatus = outcome.status;
    accepted = outcome.status === "ACCEPTED";
  }

  // Screened before it is written. Links pass between people who chose to talk
  // to each other, not in a stranger's first message.
  const text = parsed.data.body;
  const screen = await moderationRepository.screen({
    text,
    surface: UNACTIONED_SURFACE.directMessage,
    userId,
    allowLinks: accepted,
  });
  if (screen.throttled) return { ok: false, error: FLAG_BUDGET_MESSAGE };
  if (screen.flagged) {
    await announceModeration({
      userId,
      surface: UNACTIONED_SURFACE.directMessage,
      stage: "refused",
      excerpt: "",
    });
    const labels = labelRules([...new Set(screen.findings.map((f) => f.rule))]);
    const reason = labels.length > 0 ? ` Motif : ${labels.join(", ")}.` : "";
    return {
      ok: false,
      error: `Message non envoyé : la modération l'a retenu.${reason} Tu peux le reformuler.`,
    };
  }

  try {
    let messageId: string;
    if (conversationId !== null && side !== null) {
      messageId = await messageRepository.append({
        conversationId,
        senderId: userId,
        side,
        body: text,
      });
    } else if (recipientId !== null && firstStatus !== null) {
      const started = await messageRepository.startDirect({
        senderId: userId,
        recipientId,
        body: text,
        status: firstStatus,
      });
      conversationId = started.conversationId;
      messageId = started.messageId;
    } else {
      return { ok: false, error: SEND_FAILED };
    }
    return {
      ok: true,
      conversationId,
      message: { id: messageId, body: text, createdAt: new Date(), mine: true, fromTeam: false },
    };
  } catch (error) {
    logger.error({ scope: "messages", err: errorMessage(error) }, "message send failed");
    return { ok: false, error: SEND_FAILED };
  }
}

/** Accepts or declines a request waiting for the account. */
export async function answerRequestFor(userId: string, input: unknown): Promise<MessageResult> {
  const parsed = z
    .object({ conversationId: uuid, answer: z.enum(["accept", "decline"]) })
    .safeParse(input);
  if (!parsed.success) return refused("notFound");
  const done = await messageRepository.answerRequest(
    userId,
    parsed.data.conversationId,
    parsed.data.answer === "accept" ? "ACCEPTED" : "DECLINED",
  );
  return done ? { ok: true } : { ok: false, error: "Cette demande n'attend plus de réponse." };
}

/**
 * Blocks the other side of one of the account's conversations: nothing more
 * passes between them, either way, and a request from them is declined.
 */
export async function blockFor(userId: string, input: unknown): Promise<MessageResult> {
  const parsed = z.object({ conversationId: uuid }).safeParse(input);
  if (!parsed.success) return refused("notFound");
  const row = await messageRepository.findForMember(userId, parsed.data.conversationId);
  if (row?.kind !== "DIRECT") return refused("notFound");
  const other = row.userAId === userId ? row.userBId : row.userAId;
  if (other === null) return refused("notFound");
  await messageRepository.block(userId, other);
  await messageRepository.answerRequest(userId, row.id, "DECLINED");
  return { ok: true };
}

/** Lifts a block the account made. */
export async function unblockFor(userId: string, input: unknown): Promise<MessageResult> {
  const parsed = uuid.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Compte introuvable." };
  await messageRepository.unblock(userId, parsed.data);
  return { ok: true };
}

/** Who may start a conversation with the account. */
export async function setMessagePrivacyFor(userId: string, input: unknown): Promise<MessageResult> {
  const parsed = z.enum(MESSAGE_PRIVACIES).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Réglage invalide." };
  await messageRepository.setPrivacy(userId, parsed.data);
  return { ok: true };
}

/** Reports a message the account received: it reaches the moderation queue, and only it. */
export async function reportMessageFor(
  userId: string,
  input: unknown,
): Promise<ContentReportResult> {
  const parsed = z
    .object({ messageId: uuid, reason: z.string(), comment: z.string().optional() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Signalement invalide." };
  return reportContentFor(userId, {
    surface: "DIRECT_MESSAGE",
    contentId: parsed.data.messageId,
    reason: parsed.data.reason,
    ...(parsed.data.comment !== undefined && { comment: parsed.data.comment }),
  });
}

/**
 * Who the account may start writing to from the panel: its friends, and the
 * account a typed @pseudo names. The rules still decide when it sends.
 */
export async function recipientsFor(
  userId: string,
  input: unknown,
): Promise<
  MessageResult<{
    people: {
      id: string;
      username: string | null;
      displayName: string;
      avatarUrl: string | null;
      friend: boolean;
    }[];
  }>
> {
  const parsed = z.string().trim().max(40).safeParse(input);
  if (!parsed.success) return { ok: true, people: [] };
  const q = parsed.data.replace(/^@/, "").toLowerCase();

  const friends = (await friendshipRepository.listFriends(userId, 200)).map((edge) => ({
    id: edge.person.id,
    username: edge.person.username,
    displayName: edge.person.displayName,
    avatarUrl: edge.person.avatarUrl,
    friend: true,
  }));
  const matching = friends.filter(
    (p) =>
      q === "" ||
      (p.username ?? "").toLowerCase().includes(q) ||
      p.displayName.toLowerCase().includes(q),
  );

  if (q.length >= 2 && !friends.some((p) => p.username?.toLowerCase() === q)) {
    const id = await userRepository.findIdByUsername(q);
    if (id !== null && id !== userId) {
      const handle = await userRepository.findHandle(id);
      if (handle !== null) {
        matching.unshift({
          id,
          username: handle.username,
          displayName: handle.displayName,
          avatarUrl: null,
          friend: false,
        });
      }
    }
  }
  return { ok: true, people: matching.slice(0, 20) };
}
