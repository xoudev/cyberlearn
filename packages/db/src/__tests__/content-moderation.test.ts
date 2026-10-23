/**
 * The console's hand on published content: hiding, showing again, deleting,
 * and closing reports. Prisma is mocked: what this checks is that each
 * gesture writes the content, the reports it closes, the journal and the
 * author's notice in one transaction, and writes nothing when it is refused.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONTENT_AUDIT_ACTION,
  contentModerationRepository,
} from "../repositories/content-moderation.repository.js";

const { tx, mockPrisma } = vi.hoisted(() => {
  const tx = {
    moderationEvent: { findMany: vi.fn() },
    forumPost: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    forumTopic: { updateMany: vi.fn(), deleteMany: vi.fn() },
    lessonQuestion: { findMany: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn() },
    lessonAnswer: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      updateManyAndReturn: vi.fn(),
      deleteMany: vi.fn(),
    },
    challengeWriteup: { findMany: vi.fn(), updateMany: vi.fn() },
    contentReport: { updateMany: vi.fn() },
    auditLog: { create: vi.fn() },
    notification: { create: vi.fn() },
  };
  return {
    tx,
    mockPrisma: {
      $transaction: vi.fn((run: (client: typeof tx) => Promise<unknown>) => run(tx)),
      forumPost: { findMany: vi.fn() },
      lessonQuestion: { findMany: vi.fn() },
      lessonAnswer: { findMany: vi.fn() },
      challengeWriteup: { findFirst: vi.fn(), findMany: vi.fn() },
      userChallengeProgress: { findUnique: vi.fn() },
      classResource: { findFirst: vi.fn(), findMany: vi.fn() },
      classMember: { findFirst: vi.fn() },
    },
  };
});

vi.mock("../prisma.js", () => ({ prisma: mockPrisma }));

const ID = "11111111-1111-4111-8111-111111111111";
const TOPIC = "22222222-2222-4222-8222-222222222222";
const ADMIN = "33333333-3333-4333-8333-333333333333";
const AUTHOR = { id: "44444444-4444-4444-8444-444444444444", username: "ada", displayName: "Ada" };
const NOTICE = { title: "Ta réponse n'est plus visible", body: "Après relecture…" };

const ANSWER_ROW = {
  id: ID,
  content: "Une réponse insultante.",
  isHidden: false,
  createdAt: new Date("2026-10-01T10:00:00Z"),
  user: AUTHOR,
  question: { title: "Le masque /26 ?", lesson: { title: "Sous-réseaux", slug: "sous-reseaux" } },
};

function opening(isHidden = false, hiddenByModeration = false): Record<string, unknown> {
  return {
    id: ID,
    content: "Ouverture du sujet.",
    isHidden,
    hiddenByModeration,
    createdAt: new Date("2026-10-01T10:00:00Z"),
    author: AUTHOR,
    topic: {
      id: TOPIC,
      title: "Subnetting",
      slug: "subnetting",
      replyCount: 2,
      category: { slug: "reseau" },
      posts: [{ id: ID }],
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  tx.moderationEvent.findMany.mockResolvedValue([]);
  tx.contentReport.updateMany.mockResolvedValue({ count: 0 });
  tx.auditLog.create.mockResolvedValue({});
  tx.notification.create.mockResolvedValue({});
  tx.lessonAnswer.findMany.mockResolvedValue([ANSWER_ROW]);
  tx.lessonAnswer.updateManyAndReturn.mockResolvedValue([{ questionId: "q-1", isAccepted: false }]);
  tx.lessonQuestion.updateMany.mockResolvedValue({ count: 1 });
});

describe("contentModerationRepository.apply", () => {
  it("hides an answer, closes its reports, journals it and tells its author", async () => {
    tx.contentReport.updateMany.mockResolvedValue({ count: 2 });
    const result = await contentModerationRepository.apply({
      surface: "LESSON_ANSWER",
      id: ID,
      gesture: "hide",
      actorId: ADMIN,
      notice: NOTICE,
    });

    expect(result).toMatchObject({ ok: true, reportsClosed: 2 });
    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
    expect(tx.lessonAnswer.updateManyAndReturn).toHaveBeenCalledWith({
      where: { id: ID, isHidden: false },
      data: { isHidden: true },
      select: { questionId: true, isAccepted: true },
    });
    // Not the accepted answer: its question stays as it was.
    expect(tx.lessonQuestion.updateMany).not.toHaveBeenCalled();
    expect(tx.contentReport.updateMany).toHaveBeenCalledWith({
      where: { surface: "LESSON_ANSWER", contentId: ID, status: "OPEN" },
      data: expect.objectContaining({ status: "HIDDEN", resolvedById: ADMIN }) as unknown,
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: ADMIN,
        action: CONTENT_AUDIT_ACTION.hide,
        targetType: "LESSON_ANSWER",
        targetId: ID,
        metadata: expect.objectContaining({
          authorId: AUTHOR.id,
          excerpt: "Une réponse insultante.",
          reportsClosed: 2,
        }) as unknown,
      }) as unknown,
    });
    expect(tx.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: AUTHOR.id,
        type: "MODERATION_ALERT",
        title: NOTICE.title,
        body: NOTICE.body,
      }) as unknown,
    });
  });

  it("shows it again without touching the reports, which were closed when it was hidden", async () => {
    tx.lessonAnswer.findMany.mockResolvedValue([{ ...ANSWER_ROW, isHidden: true }]);
    await contentModerationRepository.apply({
      surface: "LESSON_ANSWER",
      id: ID,
      gesture: "restore",
      actorId: ADMIN,
      notice: NOTICE,
    });
    expect(tx.lessonAnswer.updateManyAndReturn).toHaveBeenCalledWith({
      where: { id: ID, isHidden: true },
      data: { isHidden: false },
      select: { questionId: true, isAccepted: true },
    });
    expect(tx.contentReport.updateMany).not.toHaveBeenCalled();
    expect(firstAction()).toBe(CONTENT_AUDIT_ACTION.restore);
  });

  it("opens again the question of an accepted answer it hides, and resolves it when shown", async () => {
    tx.lessonAnswer.updateManyAndReturn.mockResolvedValue([
      { questionId: "q-1", isAccepted: true },
    ]);
    await contentModerationRepository.apply({
      surface: "LESSON_ANSWER",
      id: ID,
      gesture: "hide",
      actorId: ADMIN,
      notice: NOTICE,
    });
    expect(tx.lessonQuestion.updateMany).toHaveBeenCalledWith({
      where: { id: "q-1" },
      data: { isResolved: false },
    });

    vi.clearAllMocks();
    tx.moderationEvent.findMany.mockResolvedValue([]);
    tx.lessonAnswer.findMany.mockResolvedValue([{ ...ANSWER_ROW, isHidden: true }]);
    tx.lessonAnswer.updateManyAndReturn.mockResolvedValue([
      { questionId: "q-1", isAccepted: true },
    ]);
    await contentModerationRepository.apply({
      surface: "LESSON_ANSWER",
      id: ID,
      gesture: "restore",
      actorId: ADMIN,
      notice: NOTICE,
    });
    expect(tx.lessonQuestion.updateMany).toHaveBeenCalledWith({
      where: { id: "q-1" },
      data: { isResolved: true },
    });
  });

  it("opens again the question of an accepted answer it deletes", async () => {
    tx.lessonAnswer.findUnique.mockResolvedValue({ questionId: "q-1", isAccepted: true });
    tx.lessonAnswer.deleteMany.mockResolvedValue({ count: 1 });
    const result = await contentModerationRepository.apply({
      surface: "LESSON_ANSWER",
      id: ID,
      gesture: "delete",
      actorId: ADMIN,
      notice: NOTICE,
    });
    expect(result.ok).toBe(true);
    expect(tx.lessonQuestion.updateMany).toHaveBeenCalledWith({
      where: { id: "q-1" },
      data: { isResolved: false },
    });
  });

  it("does not notify a moderator about their own message", async () => {
    await contentModerationRepository.apply({
      surface: "LESSON_ANSWER",
      id: ID,
      gesture: "hide",
      actorId: AUTHOR.id,
      notice: NOTICE,
    });
    expect(tx.notification.create).not.toHaveBeenCalled();
    expect(tx.auditLog.create).toHaveBeenCalledOnce();
  });

  it("changes nothing on a second click: the row is already in that state", async () => {
    tx.lessonAnswer.updateManyAndReturn.mockResolvedValue([]);
    const result = await contentModerationRepository.apply({
      surface: "LESSON_ANSWER",
      id: ID,
      gesture: "hide",
      actorId: ADMIN,
      notice: NOTICE,
    });
    expect(result).toEqual({ ok: false, reason: "UNCHANGED" });
    expect(tx.auditLog.create).not.toHaveBeenCalled();
    expect(tx.notification.create).not.toHaveBeenCalled();
  });

  it("leaves to the filter's queue what it still holds", async () => {
    tx.moderationEvent.findMany.mockResolvedValue([{ contentId: ID }]);
    const result = await contentModerationRepository.apply({
      surface: "LESSON_ANSWER",
      id: ID,
      gesture: "delete",
      actorId: ADMIN,
      notice: NOTICE,
    });
    expect(result).toEqual({ ok: false, reason: "PENDING_REVIEW" });
    expect(tx.lessonAnswer.deleteMany).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("says a content that is gone is gone", async () => {
    tx.lessonAnswer.findMany.mockResolvedValue([]);
    const result = await contentModerationRepository.apply({
      surface: "LESSON_ANSWER",
      id: ID,
      gesture: "hide",
      actorId: ADMIN,
      notice: NOTICE,
    });
    expect(result).toEqual({ ok: false, reason: "NOT_FOUND" });
  });

  it("deletes a question with its answers, and closes the reports of all of them", async () => {
    tx.lessonQuestion.findMany.mockResolvedValue([
      {
        id: ID,
        title: "Pourquoi /26 ?",
        content: "Texte.",
        isHidden: false,
        createdAt: new Date(),
        user: AUTHOR,
        lesson: { title: "Sous-réseaux", slug: "sous-reseaux" },
        _count: { answers: 2 },
      },
    ]);
    tx.lessonAnswer.findMany.mockResolvedValue([{ id: "a-1" }, { id: "a-2" }]);
    tx.lessonQuestion.deleteMany.mockResolvedValue({ count: 1 });
    tx.contentReport.updateMany.mockResolvedValue({ count: 1 });

    const result = await contentModerationRepository.apply({
      surface: "LESSON_QUESTION",
      id: ID,
      gesture: "delete",
      actorId: ADMIN,
      notice: NOTICE,
    });

    expect(result).toMatchObject({ ok: true, reportsClosed: 2 });
    expect(tx.contentReport.updateMany).toHaveBeenCalledWith({
      where: { surface: "LESSON_QUESTION", contentId: { in: [ID] }, status: "OPEN" },
      data: expect.objectContaining({ status: "DELETED" }) as unknown,
    });
    expect(tx.contentReport.updateMany).toHaveBeenCalledWith({
      where: { surface: "LESSON_ANSWER", contentId: { in: ["a-1", "a-2"] }, status: "OPEN" },
      data: expect.objectContaining({ status: "DELETED" }) as unknown,
    });
    expect(firstAction()).toBe(CONTENT_AUDIT_ACTION.delete);
  });

  it("hides the thread with its opening message, and counts its replies again", async () => {
    tx.forumPost.findMany.mockResolvedValue([opening()]);
    tx.forumPost.findUnique.mockResolvedValue({ topicId: TOPIC, isHidden: false });
    tx.forumPost.findFirst.mockResolvedValue({ id: ID });
    tx.forumPost.updateMany.mockResolvedValue({ count: 1 });
    tx.forumPost.count.mockResolvedValue(2);

    const result = await contentModerationRepository.apply({
      surface: "FORUM_POST",
      id: ID,
      gesture: "hide",
      actorId: ADMIN,
      notice: NOTICE,
    });

    expect(result.ok).toBe(true);
    // Marked as the moderation's: the console may show it again later.
    expect(tx.forumPost.updateMany).toHaveBeenCalledWith({
      where: { id: ID, isHidden: false },
      data: { isHidden: true, hiddenByModeration: true },
    });
    // The screen records a held thread against its topic: both are checked.
    expect(tx.moderationEvent.findMany).toHaveBeenCalledWith({
      where: { contentId: { in: [ID, TOPIC] }, outcome: "PENDING" },
      select: { contentId: true },
    });
    expect(tx.forumTopic.updateMany).toHaveBeenCalledWith({
      where: { id: TOPIC },
      data: { isHidden: true },
    });
    expect(tx.forumTopic.updateMany).toHaveBeenCalledWith({
      where: { id: TOPIC },
      data: { replyCount: 2 },
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        metadata: expect.objectContaining({ opensThread: true, replies: 2 }) as unknown,
      }) as unknown,
    });
  });
});

describe("a forum message taken down", () => {
  beforeEach(() => {
    tx.forumPost.findFirst.mockResolvedValue({ id: ID });
    tx.forumPost.count.mockResolvedValue(2);
  });

  it("is never shown again from the console when its author withdrew it", async () => {
    tx.forumPost.findMany.mockResolvedValue([opening(true, false)]);
    const result = await contentModerationRepository.apply({
      surface: "FORUM_POST",
      id: ID,
      gesture: "restore",
      actorId: ADMIN,
      notice: NOTICE,
    });
    expect(result).toEqual({ ok: false, reason: "AUTHOR_WITHDRAWN" });
    expect(tx.forumPost.updateMany).not.toHaveBeenCalled();
    expect(tx.forumTopic.updateMany).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
    expect(tx.notification.create).not.toHaveBeenCalled();
  });

  it("is shown again, with its thread, when the moderation hid it", async () => {
    tx.forumPost.findMany.mockResolvedValue([opening(true, true)]);
    tx.forumPost.findUnique.mockResolvedValue({ topicId: TOPIC, isHidden: true });
    tx.forumPost.updateMany.mockResolvedValue({ count: 1 });
    const result = await contentModerationRepository.apply({
      surface: "FORUM_POST",
      id: ID,
      gesture: "restore",
      actorId: ADMIN,
      notice: NOTICE,
    });
    expect(result.ok).toBe(true);
    // The condition sits in the update: an author withdrawing it in between wins.
    expect(tx.forumPost.updateMany).toHaveBeenCalledWith({
      where: { id: ID, isHidden: true, hiddenByModeration: true },
      data: { isHidden: false, hiddenByModeration: false },
    });
    expect(tx.forumTopic.updateMany).toHaveBeenCalledWith({
      where: { id: TOPIC },
      data: { isHidden: false },
    });
  });
});

describe("a challenge solution hidden by the console", () => {
  it("is marked as the moderation's, so its author cannot publish it back", async () => {
    tx.challengeWriteup.findMany.mockResolvedValue([
      {
        id: ID,
        content: "Ma solution.",
        isHidden: false,
        createdAt: new Date(),
        user: AUTHOR,
        challenge: { title: "Premier flag", slug: "premier-flag" },
      },
    ]);
    tx.challengeWriteup.updateMany.mockResolvedValue({ count: 1 });
    await contentModerationRepository.apply({
      surface: "CHALLENGE_WRITEUP",
      id: ID,
      gesture: "hide",
      actorId: ADMIN,
      notice: NOTICE,
    });
    expect(tx.challengeWriteup.updateMany).toHaveBeenCalledWith({
      where: { id: ID, isHidden: false },
      data: { isHidden: true, hiddenByModeration: true },
    });
  });
});

describe("contentModerationRepository.dismissReports", () => {
  it("closes the open reports and journals how many", async () => {
    tx.contentReport.updateMany.mockResolvedValue({ count: 3 });
    expect(
      await contentModerationRepository.dismissReports({
        surface: "FORUM_POST",
        id: ID,
        actorId: ADMIN,
      }),
    ).toBe(3);
    expect(tx.contentReport.updateMany).toHaveBeenCalledWith({
      where: { surface: "FORUM_POST", contentId: ID, status: "OPEN" },
      data: expect.objectContaining({ status: "DISMISSED", resolvedById: ADMIN }) as unknown,
    });
    expect(firstAction()).toBe(CONTENT_AUDIT_ACTION.dismiss);
  });

  it("journals nothing when nothing was open", async () => {
    expect(
      await contentModerationRepository.dismissReports({
        surface: "FORUM_POST",
        id: ID,
        actorId: ADMIN,
      }),
    ).toBe(0);
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
});

describe("contentModerationRepository.reportable", () => {
  it("lets only those who solved the challenge report a solution", async () => {
    mockPrisma.challengeWriteup.findFirst.mockResolvedValue({
      userId: AUTHOR.id,
      challengeId: "c-1",
    });
    mockPrisma.userChallengeProgress.findUnique.mockResolvedValue({ status: "IN_PROGRESS" });
    expect(await contentModerationRepository.reportable("CHALLENGE_WRITEUP", ID, ADMIN)).toBeNull();

    mockPrisma.userChallengeProgress.findUnique.mockResolvedValue({ status: "COMPLETED" });
    expect(await contentModerationRepository.reportable("CHALLENGE_WRITEUP", ID, ADMIN)).toEqual({
      authorId: AUTHOR.id,
    });
  });

  it("keeps a class resource to the members of its class", async () => {
    mockPrisma.classResource.findFirst.mockResolvedValue({ classId: "k-1", createdById: "t-1" });
    mockPrisma.classMember.findFirst.mockResolvedValue(null);
    expect(await contentModerationRepository.reportable("CLASS_RESOURCE", ID, ADMIN)).toBeNull();
  });
});

describe("contentModerationRepository.authoredBy", () => {
  it("lists what an account wrote on every surface, by the column that names its author", async () => {
    mockPrisma.forumPost.findMany.mockResolvedValue([{ id: "p-1" }, { id: "p-2" }]);
    mockPrisma.lessonQuestion.findMany.mockResolvedValue([]);
    mockPrisma.lessonAnswer.findMany.mockResolvedValue([{ id: "a-1" }]);
    mockPrisma.challengeWriteup.findMany.mockResolvedValue([{ id: "w-1" }]);
    mockPrisma.classResource.findMany.mockResolvedValue([{ id: "c-1" }]);

    expect(await contentModerationRepository.authoredBy(AUTHOR.id)).toEqual([
      { surface: "FORUM_POST", ids: ["p-1", "p-2"] },
      { surface: "LESSON_QUESTION", ids: [] },
      { surface: "LESSON_ANSWER", ids: ["a-1"] },
      { surface: "CHALLENGE_WRITEUP", ids: ["w-1"] },
      { surface: "CLASS_RESOURCE", ids: ["c-1"] },
    ]);
    expect(mockPrisma.forumPost.findMany).toHaveBeenCalledWith({
      where: { authorId: AUTHOR.id },
      select: { id: true },
    });
    expect(mockPrisma.classResource.findMany).toHaveBeenCalledWith({
      where: { createdById: AUTHOR.id },
      select: { id: true },
    });
    // Hidden ones included: a report is filed on a content the console may have hidden since.
    expect(mockPrisma.lessonAnswer.findMany).toHaveBeenCalledWith({
      where: { userId: AUTHOR.id },
      select: { id: true },
    });
  });
});

/** The action of the journal's only row. */
function firstAction(): unknown {
  const call = tx.auditLog.create.mock.calls[0] as [{ data: { action: string } }] | undefined;
  return call?.[0].data.action;
}
