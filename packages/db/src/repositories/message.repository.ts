import type { Prisma } from "@prisma/client";
import {
  directPairKey,
  effectiveStatus,
  MESSAGE_PAGE_SIZE,
  teamPairKey,
  type ConversationStatusValue,
  type MessagePrivacyValue,
} from "@cyberlearn/lib/messages/rules";
import { prisma } from "../prisma.js";

/**
 * Conversations between two learners, and between one learner and the team.
 *
 * Reads are always made for somebody: every function that takes a viewer
 * checks that they are one of the two sides, so an id from the client never
 * reaches a conversation it is not part of. The rules (who may write, when) are
 * @cyberlearn/lib/messages/rules; the service in apps/web/lib/messages applies
 * them to what is read here.
 *
 * The console reaches a learner's conversations with the team only. Two
 * learners' conversations are theirs: a message of one reaches the console
 * only when it is reported, through the moderation queue.
 */

/** How many conversations a list holds. */
export const INBOX_LIMIT = 100;

const PERSON = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  level: true,
} as const satisfies Prisma.UserSelect;

export type MessagePerson = Prisma.UserGetPayload<{ select: typeof PERSON }>;

const LAST_MESSAGE = {
  where: { isHidden: false },
  orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  take: 1,
  select: { id: true, body: true, senderId: true, fromTeam: true, createdAt: true },
} satisfies Prisma.Conversation$messagesArgs;

const CONVERSATION = {
  id: true,
  kind: true,
  userAId: true,
  userBId: true,
  requestedById: true,
  status: true,
  userALastReadAt: true,
  userBLastReadAt: true,
  teamLastReadAt: true,
  lastMessageAt: true,
  userA: { select: PERSON },
  userB: { select: PERSON },
  messages: LAST_MESSAGE,
} satisfies Prisma.ConversationSelect;

type ConversationRow = Prisma.ConversationGetPayload<{ select: typeof CONVERSATION }>;

/** One conversation as a learner's list shows it. */
export interface ConversationSummary {
  id: string;
  kind: "DIRECT" | "TEAM";
  /** The other learner; null in the conversation with the team. */
  other: MessagePerson | null;
  /** As the viewer reads it: two friends' request reads as accepted. */
  status: ConversationStatusValue;
  /** The viewer wrote first and waits for an answer. */
  outgoingRequest: boolean;
  /** A request waiting for the viewer's answer. */
  incomingRequest: boolean;
  lastMessage: { body: string; mine: boolean; createdAt: Date } | null;
  unread: boolean;
  lastMessageAt: Date;
}

/** One message of a thread, as its reader sees it. */
export interface ThreadMessage {
  id: string;
  body: string;
  createdAt: Date;
  mine: boolean;
  fromTeam: boolean;
}

/** Which side of a conversation an account is. */
type Side = "A" | "B";

function sideOf(row: { userAId: string; userBId: string | null }, userId: string): Side | null {
  if (row.userAId === userId) return "A";
  if (row.userBId === userId) return "B";
  return null;
}

/** The conversations this account is one side of. */
const memberOf = (userId: string): Prisma.ConversationWhereInput => ({
  OR: [{ userAId: userId }, { userBId: userId }],
});

async function friendsAmong(userId: string, others: readonly string[]): Promise<Set<string>> {
  if (others.length === 0) return new Set();
  const rows = await prisma.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [
        { userAId: userId, userBId: { in: [...others] } },
        { userBId: userId, userAId: { in: [...others] } },
      ],
    },
    select: { userAId: true, userBId: true },
  });
  return new Set(rows.map((r) => (r.userAId === userId ? r.userBId : r.userAId)));
}

function summarise(
  row: ConversationRow,
  userId: string,
  friends: ReadonlySet<string>,
): ConversationSummary | null {
  const side = sideOf(row, userId);
  if (side === null) return null;
  const other = row.kind === "TEAM" ? null : side === "A" ? row.userB : row.userA;
  const status = other === null ? "ACCEPTED" : effectiveStatus(row.status, friends.has(other.id));
  const requester = row.requestedById === userId;
  const last = row.messages[0];
  const readAt = side === "A" ? row.userALastReadAt : row.userBLastReadAt;
  const mine = last?.senderId === userId && !last.fromTeam;
  return {
    id: row.id,
    kind: row.kind,
    other,
    status,
    outgoingRequest: status !== "ACCEPTED" && requester,
    incomingRequest: status === "REQUESTED" && !requester,
    lastMessage: last === undefined ? null : { body: last.body, mine, createdAt: last.createdAt },
    unread: last !== undefined && !mine && (readAt === null || last.createdAt > readAt),
    lastMessageAt: row.lastMessageAt,
  };
}

export const messageRepository = {
  /**
   * The account's conversations, newest first. Left out: a request it
   * declined, and a conversation with somebody it blocked. A conversation
   * without a visible message (its only one taken down) is left out too.
   */
  async inbox(userId: string): Promise<ConversationSummary[]> {
    const rows = await prisma.conversation.findMany({
      where: memberOf(userId),
      orderBy: [{ lastMessageAt: "desc" }, { id: "asc" }],
      take: INBOX_LIMIT,
      select: CONVERSATION,
    });
    const others = rows
      .filter((r) => r.kind === "DIRECT")
      .map((r) => (r.userAId === userId ? r.userBId : r.userAId))
      .filter((id): id is string => id !== null);
    const [friends, blocked] = await Promise.all([
      friendsAmong(userId, others),
      others.length === 0
        ? Promise.resolve([])
        : prisma.userBlock.findMany({
            where: { blockerId: userId, blockedId: { in: others } },
            select: { blockedId: true },
          }),
    ]);
    const blockedIds = new Set(blocked.map((b) => b.blockedId));
    return rows
      .map((row) => summarise(row, userId, friends))
      .filter((c): c is ConversationSummary => c !== null)
      .filter((c) => c.lastMessage !== null)
      .filter((c) => !(c.other !== null && blockedIds.has(c.other.id)))
      .filter((c) => !(c.status === "DECLINED" && !c.outgoingRequest));
  },

  /** One of the account's conversations, as its list shows it; null when it is not one of its own. */
  async summaryFor(userId: string, conversationId: string): Promise<ConversationSummary | null> {
    const row = await prisma.conversation.findFirst({
      where: { id: conversationId, ...memberOf(userId) },
      select: CONVERSATION,
    });
    if (row === null) return null;
    const otherId = row.userAId === userId ? row.userBId : row.userAId;
    const friends =
      row.kind === "DIRECT" && otherId !== null
        ? await friendsAmong(userId, [otherId])
        : new Set<string>();
    return summarise(row, userId, friends);
  },

  /** The raw row of a conversation the account is one side of, for the service's checks. */
  async findForMember(userId: string, conversationId: string) {
    return prisma.conversation.findFirst({
      where: { id: conversationId, ...memberOf(userId) },
      select: {
        id: true,
        kind: true,
        userAId: true,
        userBId: true,
        requestedById: true,
        status: true,
      },
    });
  },

  /** The two accounts' conversation, if they have one. */
  async findDirect(one: string, other: string) {
    return prisma.conversation.findUnique({
      where: { pairKey: directPairKey(one, other) },
      select: {
        id: true,
        kind: true,
        userAId: true,
        userBId: true,
        requestedById: true,
        status: true,
      },
    });
  },

  /**
   * One page of a conversation, oldest first: the latest MESSAGE_PAGE_SIZE,
   * or those before `before`. Null when the account is not one of its sides.
   */
  async thread(
    userId: string,
    conversationId: string,
    before?: Date,
  ): Promise<{ messages: ThreadMessage[]; hasMore: boolean } | null> {
    const conversation = await this.findForMember(userId, conversationId);
    if (conversation === null) return null;
    const rows = await prisma.directMessage.findMany({
      where: {
        conversationId,
        isHidden: false,
        ...(before !== undefined && { createdAt: { lt: before } }),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: MESSAGE_PAGE_SIZE + 1,
      select: { id: true, body: true, createdAt: true, senderId: true, fromTeam: true },
    });
    const hasMore = rows.length > MESSAGE_PAGE_SIZE;
    return {
      hasMore,
      messages: rows
        .slice(0, MESSAGE_PAGE_SIZE)
        .reverse()
        .map((m) => ({
          id: m.id,
          body: m.body,
          createdAt: m.createdAt,
          mine: m.senderId === userId && !m.fromTeam,
          fromTeam: m.fromTeam,
        })),
    };
  },

  /**
   * The first message between two accounts: their conversation, made with
   * `status` when it does not exist yet, and the message in it. Two first
   * messages crossing land in the same conversation (the pair key is unique).
   */
  async startDirect(input: {
    senderId: string;
    recipientId: string;
    body: string;
    status: "ACCEPTED" | "REQUESTED";
  }): Promise<{ conversationId: string; messageId: string }> {
    const [low, high] =
      input.senderId < input.recipientId
        ? [input.senderId, input.recipientId]
        : [input.recipientId, input.senderId];
    const conversation = await prisma.conversation.upsert({
      where: { pairKey: directPairKey(low, high) },
      create: {
        kind: "DIRECT",
        pairKey: directPairKey(low, high),
        userAId: low,
        userBId: high,
        requestedById: input.senderId,
        status: input.status,
      },
      update: {},
      select: { id: true },
    });
    const messageId = await this.append({
      conversationId: conversation.id,
      senderId: input.senderId,
      side: input.senderId === low ? "A" : "B",
      body: input.body,
    });
    return { conversationId: conversation.id, messageId };
  },

  /**
   * A message added to a conversation: written, the conversation moved to the
   * top, and read up to it by whoever wrote it (one side, or the team).
   */
  async append(input: {
    conversationId: string;
    senderId: string;
    side: Side | "TEAM";
    body: string;
  }): Promise<string> {
    const now = new Date();
    const readField =
      input.side === "TEAM"
        ? { teamLastReadAt: now }
        : input.side === "A"
          ? { userALastReadAt: now }
          : { userBLastReadAt: now };
    const [message] = await prisma.$transaction([
      prisma.directMessage.create({
        data: {
          conversationId: input.conversationId,
          senderId: input.senderId,
          fromTeam: input.side === "TEAM",
          body: input.body,
          createdAt: now,
        },
        select: { id: true },
      }),
      prisma.conversation.update({
        where: { id: input.conversationId },
        data: { lastMessageAt: now, ...readField },
        select: { id: true },
      }),
    ]);
    return message.id;
  },

  /** Which side of the conversation the account is, for append. */
  sideOf,

  /**
   * Answers a request waiting for this account: ACCEPTED or DECLINED. Only the
   * account it was sent to, and only while it waits. False when there was
   * nothing to answer.
   */
  async answerRequest(
    userId: string,
    conversationId: string,
    answer: "ACCEPTED" | "DECLINED",
  ): Promise<boolean> {
    const { count } = await prisma.conversation.updateMany({
      where: {
        id: conversationId,
        kind: "DIRECT",
        status: "REQUESTED",
        requestedById: { not: userId },
        ...memberOf(userId),
      },
      data: { status: answer },
    });
    return count > 0;
  },

  /** Marks the conversation read by this account, up to now. */
  async markRead(userId: string, conversationId: string): Promise<boolean> {
    const now = new Date();
    const [a, b] = await prisma.$transaction([
      prisma.conversation.updateMany({
        where: { id: conversationId, userAId: userId },
        data: { userALastReadAt: now },
      }),
      prisma.conversation.updateMany({
        where: { id: conversationId, userBId: userId },
        data: { userBLastReadAt: now },
      }),
    ]);
    return a.count + b.count > 0;
  },

  // ── Blocks ────────────────────────────────────────────────────────────────

  async block(blockerId: string, blockedId: string): Promise<void> {
    await prisma.userBlock.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      create: { blockerId, blockedId },
      update: {},
    });
  },

  async unblock(blockerId: string, blockedId: string): Promise<boolean> {
    const { count } = await prisma.userBlock.deleteMany({ where: { blockerId, blockedId } });
    return count > 0;
  },

  /** Whether either account blocked the other. */
  async blockedEither(one: string, other: string): Promise<boolean> {
    const row = await prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: one, blockedId: other },
          { blockerId: other, blockedId: one },
        ],
      },
      select: { blockerId: true },
    });
    return row !== null;
  },

  /** The accounts this one blocked, for its settings. */
  async listBlocked(userId: string): Promise<(MessagePerson & { blockedAt: Date })[]> {
    const rows = await prisma.userBlock.findMany({
      where: { blockerId: userId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, blocked: { select: PERSON } },
    });
    return rows.map((r) => ({ ...r.blocked, blockedAt: r.createdAt }));
  },

  // ── Setting ───────────────────────────────────────────────────────────────

  /** Who may start a conversation with this account. No preferences row: everyone. */
  async privacyOf(userId: string): Promise<MessagePrivacyValue> {
    const row = await prisma.userPreferences.findUnique({
      where: { userId },
      select: { messagesFrom: true },
    });
    return row?.messagesFrom ?? "EVERYONE";
  },

  async setPrivacy(userId: string, value: MessagePrivacyValue): Promise<void> {
    await prisma.userPreferences.upsert({
      where: { userId },
      create: { userId, messagesFrom: value },
      update: { messagesFrom: value },
    });
  },

  // ── The team ──────────────────────────────────────────────────────────────

  /**
   * A message from the team to a learner, in their conversation with the team
   * (made the first time). `adminId` is kept on the row for the console; the
   * learner is shown the team.
   */
  async sendFromTeam(input: {
    adminId: string;
    userId: string;
    body: string;
  }): Promise<{ conversationId: string; messageId: string }> {
    const conversation = await prisma.conversation.upsert({
      where: { pairKey: teamPairKey(input.userId) },
      create: { kind: "TEAM", pairKey: teamPairKey(input.userId), userAId: input.userId },
      update: {},
      select: { id: true },
    });
    const messageId = await this.append({
      conversationId: conversation.id,
      senderId: input.adminId,
      side: "TEAM",
      body: input.body,
    });
    return { conversationId: conversation.id, messageId };
  },

  /** The learners' conversations with the team, newest first, for the console's inbox. */
  async teamInbox(page: { skip: number; take: number }) {
    const where: Prisma.ConversationWhereInput = { kind: "TEAM" };
    const [total, rows] = await Promise.all([
      prisma.conversation.count({ where }),
      prisma.conversation.findMany({
        where,
        orderBy: [{ lastMessageAt: "desc" }, { id: "asc" }],
        skip: page.skip,
        take: page.take,
        select: {
          id: true,
          lastMessageAt: true,
          teamLastReadAt: true,
          userA: { select: { ...PERSON, email: true } },
          messages: LAST_MESSAGE,
        },
      }),
    ]);
    return {
      total,
      rows: rows.map((row) => {
        const last = row.messages[0];
        return {
          id: row.id,
          learner: row.userA,
          lastMessage: last ?? null,
          lastMessageAt: row.lastMessageAt,
          unread:
            last !== undefined &&
            !last.fromTeam &&
            (row.teamLastReadAt === null || last.createdAt > row.teamLastReadAt),
        };
      }),
    };
  },

  /** How many learners' replies the team has not read. */
  async teamUnreadCount(): Promise<number> {
    const rows = await prisma.conversation.findMany({
      where: { kind: "TEAM" },
      select: { teamLastReadAt: true, messages: LAST_MESSAGE },
    });
    return rows.filter((row) => {
      const last = row.messages[0];
      return (
        last !== undefined &&
        !last.fromTeam &&
        (row.teamLastReadAt === null || last.createdAt > row.teamLastReadAt)
      );
    }).length;
  },

  /** A learner's conversation with the team, whole, for the console: who wrote each message. */
  async teamThread(conversationId: string) {
    return prisma.conversation.findFirst({
      where: { id: conversationId, kind: "TEAM" },
      select: {
        id: true,
        userA: { select: { ...PERSON, email: true } },
        messages: {
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          take: 500,
          select: {
            id: true,
            body: true,
            fromTeam: true,
            isHidden: true,
            createdAt: true,
            sender: { select: { id: true, displayName: true, username: true } },
          },
        },
      },
    });
  },

  /** A learner's conversation with the team, by the learner. */
  async teamConversationOf(userId: string): Promise<{ id: string } | null> {
    return prisma.conversation.findUnique({
      where: { pairKey: teamPairKey(userId) },
      select: { id: true },
    });
  },

  async markTeamRead(conversationId: string): Promise<void> {
    await prisma.conversation.updateMany({
      where: { id: conversationId, kind: "TEAM" },
      data: { teamLastReadAt: new Date() },
    });
  },

  // ── GDPR ──────────────────────────────────────────────────────────────────

  /**
   * What the GDPR export holds of the messages: the conversations the account
   * is a side of, with the other side's handle, the messages it wrote, and the
   * accounts it blocked. Messages it received are the other person's writing
   * and stay out. Who may write to it is with its preferences.
   */
  async exportFor(userId: string) {
    const [conversations, sent, blocks] = await Promise.all([
      prisma.conversation.findMany({
        where: memberOf(userId),
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          kind: true,
          status: true,
          createdAt: true,
          userAId: true,
          userA: { select: { username: true } },
          userB: { select: { username: true } },
        },
      }),
      prisma.directMessage.findMany({
        where: { senderId: userId, fromTeam: false },
        orderBy: { createdAt: "asc" },
        select: { conversationId: true, body: true, createdAt: true },
      }),
      prisma.userBlock.findMany({
        where: { blockerId: userId },
        select: { createdAt: true, blocked: { select: { username: true } } },
      }),
    ]);
    return {
      conversations: conversations.map((c) => ({
        id: c.id,
        kind: c.kind,
        status: c.status,
        createdAt: c.createdAt,
        with:
          c.kind === "TEAM"
            ? "Équipe CyberLearn"
            : ((c.userAId === userId ? c.userB?.username : c.userA.username) ?? null),
      })),
      messagesSent: sent,
      blocked: blocks.map((b) => ({ username: b.blocked.username, since: b.createdAt })),
    };
  },
};
