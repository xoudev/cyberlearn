/**
 * The learner's conversation with the team, as the console reads it: who is
 * told that a learner answered, and when.
 * Prisma is mocked: the reads are checked as written.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { messageRepository } from "../repositories/message.repository.js";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    $transaction: vi.fn(),
    conversation: { findFirst: vi.fn(), updateMany: vi.fn() },
    directMessage: { findFirst: vi.fn(), updateMany: vi.fn() },
    user: { findMany: vi.fn() },
    notification: { updateMany: vi.fn() },
  },
}));

vi.mock("../prisma.js", () => ({ prisma: mockPrisma }));

const CONV = "11111111-1111-4111-8111-111111111111";
const LEARNER = { displayName: "Ada", username: "ada" };
const at = (iso: string): Date => new Date(iso);

function conversation(
  last: { fromTeam: boolean; createdAt: Date } | null,
  teamReadAt: Date | null,
) {
  return {
    teamLastReadAt: teamReadAt,
    userA: LEARNER,
    messages: last === null ? [] : [{ id: "m", body: "x", senderId: "s", ...last }],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.directMessage.findFirst.mockResolvedValue({
    sender: { email: "claire@cyberlearn.test", displayName: "Claire", role: "ADMIN" },
  });
  mockPrisma.user.findMany.mockResolvedValue([
    { email: "a@cyberlearn.test", displayName: "A" },
    { email: "b@cyberlearn.test", displayName: "B" },
  ]);
});

describe("messageRepository.teamReplyAlert", () => {
  it("tells the administrator who wrote last when the learner starts answering", async () => {
    mockPrisma.conversation.findFirst.mockResolvedValue(
      conversation({ fromTeam: true, createdAt: at("2026-11-25T10:00:00Z") }, null),
    );
    expect(await messageRepository.teamReplyAlert(CONV)).toEqual({
      learner: LEARNER,
      recipients: [{ email: "claire@cyberlearn.test", displayName: "Claire" }],
    });
    expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
  });

  it("stays quiet while an earlier answer waits unread", async () => {
    mockPrisma.conversation.findFirst.mockResolvedValue(
      conversation(
        { fromTeam: false, createdAt: at("2026-11-25T10:00:00Z") },
        at("2026-11-25T09:00:00Z"),
      ),
    );
    expect(await messageRepository.teamReplyAlert(CONV)).toBeNull();
  });

  it("tells again once the team has read the last answer", async () => {
    mockPrisma.conversation.findFirst.mockResolvedValue(
      conversation(
        { fromTeam: false, createdAt: at("2026-11-25T10:00:00Z") },
        at("2026-11-25T11:00:00Z"),
      ),
    );
    expect(await messageRepository.teamReplyAlert(CONV)).not.toBeNull();
  });

  it("tells every administrator when the writer is no longer one", async () => {
    mockPrisma.conversation.findFirst.mockResolvedValue(
      conversation({ fromTeam: true, createdAt: at("2026-11-25T10:00:00Z") }, null),
    );
    mockPrisma.directMessage.findFirst.mockResolvedValue({
      sender: { email: "old@cyberlearn.test", displayName: "Old", role: "STUDENT" },
    });
    const alert = await messageRepository.teamReplyAlert(CONV);
    expect(alert?.recipients.map((r) => r.email)).toEqual([
      "a@cyberlearn.test",
      "b@cyberlearn.test",
    ]);
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
      where: { role: "ADMIN" },
      select: { email: true, displayName: true },
    });
  });

  it("is null for a conversation that is not the team's", async () => {
    mockPrisma.conversation.findFirst.mockResolvedValue(null);
    expect(await messageRepository.teamReplyAlert(CONV)).toBeNull();
  });
});

describe("messageRepository.markTeamNoticesRead", () => {
  it("reads the learner's own team notices of that conversation only", async () => {
    await messageRepository.markTeamNoticesRead("learner", CONV);
    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
      where: {
        userId: "learner",
        readAt: null,
        type: "ANNOUNCEMENT",
        title: "Message de l'équipe CyberLearn",
        metadata: { path: ["teamConversationId"], equals: CONV },
      },
      data: { readAt: expect.any(Date) },
    });
  });
});

describe("messageRepository.markRead", () => {
  it("stamps the other side's unseen messages, once, for a side of the conversation", async () => {
    mockPrisma.$transaction.mockResolvedValue([{ count: 1 }, { count: 0 }]);
    expect(await messageRepository.markRead("learner", CONV)).toBe(true);
    expect(mockPrisma.directMessage.updateMany).toHaveBeenCalledWith({
      where: {
        conversationId: CONV,
        seenAt: null,
        OR: [{ fromTeam: true }, { senderId: null }, { senderId: { not: "learner" } }],
      },
      data: { seenAt: expect.any(Date) },
    });
  });

  it("stamps nothing for an account that is not a side of it", async () => {
    mockPrisma.$transaction.mockResolvedValue([{ count: 0 }, { count: 0 }]);
    expect(await messageRepository.markRead("stranger", CONV)).toBe(false);
    expect(mockPrisma.directMessage.updateMany).not.toHaveBeenCalled();
  });
});
