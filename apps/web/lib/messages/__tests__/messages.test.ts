import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  findForMember: vi.fn(),
  findDirect: vi.fn(),
  append: vi.fn(),
  startDirect: vi.fn(),
  answerRequest: vi.fn(),
  blockedEither: vi.fn(),
  block: vi.fn(),
  privacyOf: vi.fn(),
  between: vi.fn(),
  findHandle: vi.fn(),
  screen: vi.fn(),
  announceModeration: vi.fn(),
  checkMessageSend: vi.fn(),
  checkMessageRequest: vi.fn(),
  reportContentFor: vi.fn(),
  teamReplyAlert: vi.fn(),
  alertTeamOfReply: vi.fn(),
  thread: vi.fn(),
  markRead: vi.fn(),
  summaryFor: vi.fn(),
  markTeamNoticesRead: vi.fn(),
  inbox: vi.fn(),
  resolveAvatarSrcMany: vi.fn(),
}));

vi.mock("@cyberlearn/db", () => ({
  messageRepository: {
    findForMember: m.findForMember,
    findDirect: m.findDirect,
    append: m.append,
    startDirect: m.startDirect,
    answerRequest: m.answerRequest,
    blockedEither: m.blockedEither,
    block: m.block,
    privacyOf: m.privacyOf,
    teamReplyAlert: m.teamReplyAlert,
    thread: m.thread,
    markRead: m.markRead,
    summaryFor: m.summaryFor,
    markTeamNoticesRead: m.markTeamNoticesRead,
    inbox: m.inbox,
    sideOf: (row: { userAId: string; userBId: string | null }, id: string) =>
      row.userAId === id ? "A" : row.userBId === id ? "B" : null,
  },
  friendshipRepository: { between: m.between, listFriends: vi.fn() },
  userRepository: { findHandle: m.findHandle, findIdByUsername: vi.fn() },
  moderationRepository: { screen: m.screen },
  UNACTIONED_SURFACE: { directMessage: "message.direct" },
}));
vi.mock("@/lib/moderation/announce", () => ({ announceModeration: m.announceModeration }));
vi.mock("@/lib/moderation/content-report", () => ({ reportContentFor: m.reportContentFor }));
vi.mock("../team-alert", () => ({ alertTeamOfReply: m.alertTeamOfReply }));
vi.mock("@/lib/avatar/storage", () => ({ resolveAvatarSrcMany: m.resolveAvatarSrcMany }));
vi.mock("@/lib/rate-limit", () => ({
  checkMessageSend: m.checkMessageSend,
  checkMessageRequest: m.checkMessageRequest,
}));
vi.mock("@cyberlearn/lib/logger", () => ({ logger: { error: vi.fn() }, errorMessage: String }));

const { answerRequestFor, blockFor, inboxFor, reportMessageFor, sendMessageFor, threadFor } =
  await import("../messages");

/**
 * Sending a private message: the rules (@cyberlearn/lib/messages/rules)
 * applied to what the repositories read, the screen before the write, and the
 * write itself. The repositories are mocked.
 */

const ME = "11111111-1111-4111-8111-111111111111";
const YOU = "22222222-2222-4222-8222-222222222222";
const CONV = "33333333-3333-4333-8333-333333333333";
const MSG = "44444444-4444-4444-8444-444444444444";

const allow = { flagged: false, throttled: false, findings: [], eventId: null };

function errorOf(result: { ok: true } | { ok: false; error: string }): string {
  return result.ok ? "" : result.error;
}

beforeEach(() => {
  vi.clearAllMocks();
  m.checkMessageSend.mockResolvedValue({ success: true });
  m.checkMessageRequest.mockResolvedValue({ success: true });
  m.screen.mockResolvedValue(allow);
  m.blockedEither.mockResolvedValue(false);
  m.between.mockResolvedValue(null);
  m.privacyOf.mockResolvedValue("EVERYONE");
  m.findHandle.mockResolvedValue({ username: "ines", displayName: "Inès" });
  m.findDirect.mockResolvedValue(null);
  m.append.mockResolvedValue(MSG);
  m.startDirect.mockResolvedValue({ conversationId: CONV, messageId: MSG });
  m.teamReplyAlert.mockResolvedValue(null);
});

describe("a first message", () => {
  it("opens the conversation at once between friends", async () => {
    m.between.mockResolvedValue({ status: "ACCEPTED" });
    const result = await sendMessageFor(ME, { recipientId: YOU, body: "Salut" });
    expect(result.ok).toBe(true);
    expect(m.startDirect).toHaveBeenCalledWith(
      expect.objectContaining({ senderId: ME, recipientId: YOU, status: "ACCEPTED" }),
    );
    expect(m.checkMessageRequest).not.toHaveBeenCalled();
  });

  it("makes a stranger's first message a request, and spends the request budget", async () => {
    await sendMessageFor(ME, { recipientId: YOU, body: "Salut" });
    expect(m.startDirect).toHaveBeenCalledWith(expect.objectContaining({ status: "REQUESTED" }));
    expect(m.checkMessageRequest).toHaveBeenCalledWith(ME);
    // No links in a stranger's first message.
    expect(m.screen).toHaveBeenCalledWith(expect.objectContaining({ allowLinks: false }));
  });

  it("follows the recipient's setting", async () => {
    m.privacyOf.mockResolvedValue("FRIENDS");
    expect(errorOf(await sendMessageFor(ME, { recipientId: YOU, body: "Salut" }))).toMatch(/amis/u);
    m.privacyOf.mockResolvedValue("NOBODY");
    expect(errorOf(await sendMessageFor(ME, { recipientId: YOU, body: "Salut" }))).toMatch(
      /ne reçoit pas/u,
    );
    expect(m.startDirect).not.toHaveBeenCalled();
  });

  it("lets nothing through a block", async () => {
    m.blockedEither.mockResolvedValue(true);
    expect(errorOf(await sendMessageFor(ME, { recipientId: YOU, body: "Salut" }))).toMatch(
      /ne peux pas écrire/u,
    );
    expect(m.screen).not.toHaveBeenCalled();
  });

  it("refuses an empty message and an unknown account", async () => {
    expect(errorOf(await sendMessageFor(ME, { recipientId: YOU, body: "   " }))).not.toBe("");
    m.findHandle.mockResolvedValue(null);
    expect(errorOf(await sendMessageFor(ME, { recipientId: YOU, body: "Salut" }))).toMatch(
      /n'existe plus/u,
    );
  });
});

describe("a message in a conversation", () => {
  const direct = {
    id: CONV,
    kind: "DIRECT",
    userAId: ME,
    userBId: YOU,
    requestedById: ME,
    status: "REQUESTED",
  };

  it("holds the requester to one message until the request is accepted", async () => {
    m.findForMember.mockResolvedValue(direct);
    expect(errorOf(await sendMessageFor(ME, { conversationId: CONV, body: "Tu es là ?" }))).toMatch(
      /attend sa réponse/u,
    );
    expect(m.append).not.toHaveBeenCalled();
  });

  it("goes out once accepted, with links allowed", async () => {
    m.findForMember.mockResolvedValue({ ...direct, status: "ACCEPTED" });
    const result = await sendMessageFor(ME, { conversationId: CONV, body: "https://x.fr" });
    expect(result.ok).toBe(true);
    expect(m.append).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: CONV, senderId: ME, side: "A" }),
    );
    expect(m.screen).toHaveBeenCalledWith(expect.objectContaining({ allowLinks: true }));
  });

  it("tells the team of the first answer it has not read, after writing it", async () => {
    m.findForMember.mockResolvedValue({
      id: CONV,
      kind: "TEAM",
      userAId: ME,
      userBId: null,
      requestedById: null,
      status: "ACCEPTED",
    });
    const alert = {
      learner: { displayName: "Ada", username: "ada" },
      recipients: [{ email: "claire@cyberlearn.test", displayName: "Claire" }],
    };
    m.teamReplyAlert.mockResolvedValue(alert);
    expect((await sendMessageFor(ME, { conversationId: CONV, body: "Merci !" })).ok).toBe(true);
    expect(m.teamReplyAlert).toHaveBeenCalledWith(CONV);
    expect(m.alertTeamOfReply).toHaveBeenCalledWith({
      conversationId: CONV,
      reply: "Merci !",
      ...alert,
    });

    m.alertTeamOfReply.mockClear();
    m.teamReplyAlert.mockResolvedValue(null);
    await sendMessageFor(ME, { conversationId: CONV, body: "Et encore une chose" });
    expect(m.alertTeamOfReply).not.toHaveBeenCalled();
  });

  it("never alerts the team about two learners' conversation", async () => {
    m.findForMember.mockResolvedValue({
      id: CONV,
      kind: "DIRECT",
      userAId: ME,
      userBId: YOU,
      requestedById: ME,
      status: "ACCEPTED",
    });
    await sendMessageFor(ME, { conversationId: CONV, body: "Salut" });
    expect(m.teamReplyAlert).not.toHaveBeenCalled();
    expect(m.alertTeamOfReply).not.toHaveBeenCalled();
  });

  it("lets a learner answer the team without accepting anything", async () => {
    m.findForMember.mockResolvedValue({
      id: CONV,
      kind: "TEAM",
      userAId: ME,
      userBId: null,
      requestedById: null,
      status: "ACCEPTED",
    });
    expect((await sendMessageFor(ME, { conversationId: CONV, body: "Merci !" })).ok).toBe(true);
    expect(m.blockedEither).not.toHaveBeenCalled();
  });

  it("does not reach a conversation the account is not part of", async () => {
    m.findForMember.mockResolvedValue(null);
    expect(errorOf(await sendMessageFor(ME, { conversationId: CONV, body: "Salut" }))).toMatch(
      /n'existe plus/u,
    );
  });
});

describe("the screen", () => {
  it("does not send a flagged message, and says why", async () => {
    m.between.mockResolvedValue({ status: "ACCEPTED" });
    m.screen.mockResolvedValue({
      flagged: true,
      throttled: false,
      findings: [{ rule: "contact-details", severity: 1, match: "x" }],
      eventId: "e",
    });
    expect(errorOf(await sendMessageFor(ME, { recipientId: YOU, body: "06 12 34 56 78" }))).toMatch(
      /non envoyé/u,
    );
    expect(m.startDirect).not.toHaveBeenCalled();
    expect(m.announceModeration).toHaveBeenCalledWith(
      expect.objectContaining({ userId: ME, surface: "message.direct", stage: "refused" }),
    );
  });

  it("stops at the rate limit before anything is read", async () => {
    m.checkMessageSend.mockResolvedValue({ success: false });
    expect(errorOf(await sendMessageFor(ME, { recipientId: YOU, body: "Salut" }))).not.toBe("");
    expect(m.findDirect).not.toHaveBeenCalled();
  });
});

describe("requests, blocks and reports", () => {
  it("answers a request for its recipient only", async () => {
    m.answerRequest.mockResolvedValue(true);
    expect((await answerRequestFor(YOU, { conversationId: CONV, answer: "accept" })).ok).toBe(true);
    expect(m.answerRequest).toHaveBeenCalledWith(YOU, CONV, "ACCEPTED");
    m.answerRequest.mockResolvedValue(false);
    expect((await answerRequestFor(ME, { conversationId: CONV, answer: "decline" })).ok).toBe(
      false,
    );
  });

  it("blocks the other side and declines its request", async () => {
    m.findForMember.mockResolvedValue({
      id: CONV,
      kind: "DIRECT",
      userAId: ME,
      userBId: YOU,
      requestedById: YOU,
      status: "REQUESTED",
    });
    expect((await blockFor(ME, { conversationId: CONV })).ok).toBe(true);
    expect(m.block).toHaveBeenCalledWith(ME, YOU);
    expect(m.answerRequest).toHaveBeenCalledWith(ME, CONV, "DECLINED");
  });

  it("reports a message through the moderation queue, as a private message", async () => {
    m.reportContentFor.mockResolvedValue({ ok: true });
    await reportMessageFor(ME, { messageId: MSG, reason: "HATE" });
    expect(m.reportContentFor).toHaveBeenCalledWith(ME, {
      surface: "DIRECT_MESSAGE",
      contentId: MSG,
      reason: "HATE",
    });
  });
});

describe("reading the team's conversation", () => {
  it("marks the same message read in the bell", async () => {
    m.thread.mockResolvedValue({ messages: [], hasMore: false });
    m.summaryFor.mockResolvedValue({ id: CONV, kind: "TEAM", unread: true });
    expect((await threadFor(ME, { conversationId: CONV })).ok).toBe(true);
    expect(m.markRead).toHaveBeenCalledWith(ME, CONV);
    expect(m.markTeamNoticesRead).toHaveBeenCalledWith(ME, CONV);
  });

  it("leaves the bell alone for two learners' conversation", async () => {
    m.thread.mockResolvedValue({ messages: [], hasMore: false });
    m.summaryFor.mockResolvedValue({ id: CONV, kind: "DIRECT", unread: true });
    await threadFor(ME, { conversationId: CONV });
    expect(m.markTeamNoticesRead).not.toHaveBeenCalled();
  });
});

describe("photos in the panel", () => {
  const person = (id: string, avatarUrl: string | null) => ({
    id,
    username: id,
    displayName: id,
    avatarUrl,
    level: 1,
  });
  const conversation = (id: string, other: ReturnType<typeof person> | null) => ({
    id,
    kind: other === null ? "TEAM" : "DIRECT",
    other,
    status: "ACCEPTED",
    outgoingRequest: false,
    incomingRequest: false,
    lastMessage: { body: "x", mine: false, createdAt: new Date() },
    unread: true,
    lastMessageAt: new Date(),
  });

  it("signs the photos people uploaded, and leaves the stock avatars to initials", async () => {
    m.inbox.mockResolvedValue([
      conversation("c-1", person("ada", "__upload:ada/photo.webp")),
      conversation("c-2", person("ines", "/avatars/03.png")),
      conversation("c-3", null),
    ]);
    m.resolveAvatarSrcMany.mockResolvedValue(["https://signed/ada", null, null]);

    const { conversations, unread } = await inboxFor(ME);

    expect(m.resolveAvatarSrcMany).toHaveBeenCalledWith(["__upload:ada/photo.webp", null, null]);
    expect(conversations.map((c) => c.other?.photo ?? null)).toEqual([
      "https://signed/ada",
      null,
      null,
    ]);
    expect(unread).toBe(3);
  });

  it("signs nothing when nobody uploaded a photo", async () => {
    m.inbox.mockResolvedValue([conversation("c-2", person("ines", "/avatars/03.png"))]);
    const { conversations } = await inboxFor(ME);
    expect(m.resolveAvatarSrcMany).not.toHaveBeenCalled();
    expect(conversations[0]?.other?.photo).toBeNull();
  });
});
