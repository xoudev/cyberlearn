/**
 * The filter's queue destroying what it held: the open reports about every
 * row the deletion takes are closed with it, in the reviewer's name, in the
 * same transaction. Prisma is mocked.
 *
 * A report left open on a destroyed row is counted in the console's sidebar,
 * and the report queue says its author or a teacher removed it.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { moderationRepository } from "../repositories/moderation.repository.js";

const { tx, mockPrisma } = vi.hoisted(() => {
  const tx = {
    lessonAnswer: { findMany: vi.fn(), deleteMany: vi.fn() },
    lessonQuestion: { deleteMany: vi.fn() },
    forumPost: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    forumTopic: { updateMany: vi.fn(), deleteMany: vi.fn() },
    challengeWriteup: { deleteMany: vi.fn() },
    contentReport: { updateMany: vi.fn() },
  };
  return {
    tx,
    mockPrisma: {
      $transaction: vi.fn((run: (client: typeof tx) => Promise<unknown>) => run(tx)),
      moderationEvent: { updateMany: vi.fn(), findUnique: vi.fn() },
    },
  };
});

vi.mock("../prisma.js", () => ({ prisma: mockPrisma }));

const EVENT = "11111111-1111-4111-8111-111111111111";
const CONTENT = "22222222-2222-4222-8222-222222222222";
const REVIEWER = "33333333-3333-4333-8333-333333333333";
const AUTHOR = "44444444-4444-4444-8444-444444444444";
const TOPIC = "55555555-5555-4555-8555-555555555555";

function heldOn(surface: string): void {
  mockPrisma.moderationEvent.findUnique.mockResolvedValue({
    surface,
    contentId: CONTENT,
    userId: AUTHOR,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.moderationEvent.updateMany.mockResolvedValue({ count: 1 });
  tx.contentReport.updateMany.mockResolvedValue({ count: 1 });
});

describe("moderationRepository.applyOutcome, UPHELD", () => {
  it("closes the reports of a forum message it destroys", async () => {
    heldOn("forum.post");
    tx.forumPost.findUnique.mockResolvedValue({ topicId: TOPIC });
    tx.forumPost.deleteMany.mockResolvedValue({ count: 1 });
    tx.forumPost.findFirst.mockResolvedValue({ id: "first" });
    tx.forumPost.count.mockResolvedValue(0);

    expect(await moderationRepository.applyOutcome(EVENT, "UPHELD", REVIEWER)).toMatchObject({
      claimed: true,
      contentTouched: true,
    });
    expect(tx.contentReport.updateMany).toHaveBeenCalledWith({
      where: { surface: "FORUM_POST", contentId: { in: [CONTENT] }, status: "OPEN" },
      data: expect.objectContaining({ status: "DELETED", resolvedById: REVIEWER }) as unknown,
    });
  });

  it("closes the reports of a question and of the answers that go with it", async () => {
    heldOn("lesson.question");
    tx.lessonAnswer.findMany.mockResolvedValue([{ id: "a-1" }]);
    tx.lessonQuestion.deleteMany.mockResolvedValue({ count: 1 });

    await moderationRepository.applyOutcome(EVENT, "UPHELD", REVIEWER);
    expect(tx.contentReport.updateMany).toHaveBeenCalledWith({
      where: { surface: "LESSON_QUESTION", contentId: { in: [CONTENT] }, status: "OPEN" },
      data: expect.objectContaining({ status: "DELETED" }) as unknown,
    });
    expect(tx.contentReport.updateMany).toHaveBeenCalledWith({
      where: { surface: "LESSON_ANSWER", contentId: { in: ["a-1"] }, status: "OPEN" },
      data: expect.objectContaining({ status: "DELETED" }) as unknown,
    });
  });

  it("closes the reports of every message of a thread it destroys", async () => {
    heldOn("forum.topic");
    tx.forumPost.findMany.mockResolvedValue([{ id: "p-1" }, { id: "p-2" }]);
    tx.forumTopic.deleteMany.mockResolvedValue({ count: 1 });

    await moderationRepository.applyOutcome(EVENT, "UPHELD", REVIEWER);
    expect(tx.contentReport.updateMany).toHaveBeenCalledWith({
      where: { surface: "FORUM_POST", contentId: { in: ["p-1", "p-2"] }, status: "OPEN" },
      data: expect.objectContaining({ status: "DELETED" }) as unknown,
    });
  });

  it("closes the reports of a solution, and of an answer", async () => {
    heldOn("challenge.writeup");
    tx.challengeWriteup.deleteMany.mockResolvedValue({ count: 1 });
    await moderationRepository.applyOutcome(EVENT, "UPHELD", REVIEWER);
    expect(tx.contentReport.updateMany).toHaveBeenCalledWith({
      where: { surface: "CHALLENGE_WRITEUP", contentId: { in: [CONTENT] }, status: "OPEN" },
      data: expect.objectContaining({ status: "DELETED" }) as unknown,
    });

    vi.clearAllMocks();
    mockPrisma.moderationEvent.updateMany.mockResolvedValue({ count: 1 });
    heldOn("lesson.answer");
    tx.lessonAnswer.deleteMany.mockResolvedValue({ count: 1 });
    await moderationRepository.applyOutcome(EVENT, "UPHELD", REVIEWER);
    expect(tx.contentReport.updateMany).toHaveBeenCalledWith({
      where: { surface: "LESSON_ANSWER", contentId: { in: [CONTENT] }, status: "OPEN" },
      data: expect.objectContaining({ status: "DELETED" }) as unknown,
    });
  });

  it("closes nothing when the row was already gone", async () => {
    heldOn("challenge.writeup");
    tx.challengeWriteup.deleteMany.mockResolvedValue({ count: 0 });
    await moderationRepository.applyOutcome(EVENT, "UPHELD", REVIEWER);
    expect(tx.contentReport.updateMany).not.toHaveBeenCalled();
  });
});
