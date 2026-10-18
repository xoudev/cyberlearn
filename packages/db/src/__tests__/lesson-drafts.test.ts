/**
 * The lesson studio's draft, and the one function that publishes a lesson.
 * Prisma is mocked: what this checks is what each call writes and refuses,
 * and in which order. That the conditional writes really hold against a
 * concurrent one is Postgres's part, and lesson-drafts.integration.test.ts
 * runs the same calls on a real database.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  lessonContentHash,
  lessonVersionRepository,
  type LessonContent,
} from "../repositories/lesson-version.repository.js";
import { lessonDraftRepository } from "../repositories/lesson-draft.repository.js";

const { tx, mockPrisma } = vi.hoisted(() => {
  const tx = {
    lesson: { findUnique: vi.fn(), updateMany: vi.fn() },
    lessonVersion: { findUnique: vi.fn(), create: vi.fn() },
    lessonDraft: { findUnique: vi.fn(), delete: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  return {
    tx,
    mockPrisma: {
      $transaction: vi.fn((run: (client: typeof tx) => Promise<unknown>) => run(tx)),
      lesson: { findUnique: vi.fn() },
      lessonDraft: {
        findUnique: vi.fn(),
        updateMany: vi.fn(),
        create: vi.fn(),
        deleteMany: vi.fn(),
      },
    },
  };
});

vi.mock("../prisma.js", () => ({ prisma: mockPrisma }));

const LESSON = "11111111-1111-4111-8111-111111111111";
const ADMIN = "22222222-2222-4222-8222-222222222222";
const READ_AT = new Date("2026-10-01T10:00:00.000Z");
const NOW = new Date("2026-10-18T12:00:00.000Z");

const PUBLISHED: LessonContent = {
  refCode: "CL-LSN-01001-V01",
  slug: "les-ports",
  title: "Les ports",
  description: "Ce qu'est un port, et pourquoi il y en a tant.",
  category: "NETWORK",
  difficulty: "BEGINNER",
  estimatedMinutes: 15,
  xpReward: 50,
  contentMdx: "## Ports\n\nUn port est un numéro.",
  coverImageUrl: null,
};

const EDITED: LessonContent = { ...PUBLISHED, contentMdx: "## Ports\n\nUn port est un nombre." };

function lessonRow(content: LessonContent = PUBLISHED, version = 1): Record<string, unknown> {
  return { ...content, version, updatedAt: READ_AT, publishedAt: READ_AT };
}

beforeEach(() => {
  vi.clearAllMocks();
  tx.lesson.findUnique.mockResolvedValue(lessonRow());
  tx.lesson.updateMany.mockResolvedValue({ count: 1 });
  tx.lessonVersion.findUnique.mockResolvedValue(null);
  tx.lessonVersion.create.mockResolvedValue({});
  tx.auditLog.create.mockResolvedValue({});
  tx.lessonDraft.delete.mockResolvedValue({});
});

describe("lessonVersionRepository.publish", () => {
  const input = {
    lessonId: LESSON,
    changes: { contentMdx: EDITED.contentMdx },
    source: "CONSOLE" as const,
    actorId: ADMIN,
    audit: { action: "lesson.publish", metadata: { title: "Les ports" } },
    now: NOW,
  };

  it("writes the changes and bumps the version, conditional on what it read", async () => {
    const result = await lessonVersionRepository.publish(input);

    expect(result).toEqual({ ok: true, version: 2, content: EDITED, updatedAt: NOW });
    expect(tx.lesson.updateMany).toHaveBeenCalledExactlyOnceWith({
      where: { id: LESSON, version: 1, updatedAt: READ_AT },
      data: { ...EDITED, version: 2, updatedAt: NOW },
    });
  });

  it("keeps what the lesson held as a baseline the first time, then the new version", async () => {
    await lessonVersionRepository.publish(input);

    const created = tx.lessonVersion.create.mock.calls.map(
      ([arg]) => (arg as { data: Record<string, unknown> }).data,
    );
    expect(created).toEqual([
      {
        lessonId: LESSON,
        version: 1,
        source: "BASELINE",
        ...PUBLISHED,
        publishedById: null,
        publishedAt: READ_AT,
      },
      {
        lessonId: LESSON,
        version: 2,
        source: "CONSOLE",
        ...EDITED,
        publishedById: ADMIN,
        publishedAt: NOW,
      },
    ]);
  });

  it("keeps no second baseline once the current version is recorded", async () => {
    tx.lessonVersion.findUnique.mockResolvedValue({ id: "v1" });
    await lessonVersionRepository.publish(input);
    expect(tx.lessonVersion.create).toHaveBeenCalledOnce();
    expect(tx.lessonVersion.create.mock.calls[0]?.[0]).toMatchObject({
      data: { version: 2, source: "CONSOLE" },
    });
  });

  it("writes the audit row with the version it made", async () => {
    await lessonVersionRepository.publish(input);
    expect(tx.auditLog.create).toHaveBeenCalledExactlyOnceWith({
      data: {
        actorId: ADMIN,
        action: "lesson.publish",
        targetType: "Lesson",
        targetId: LESSON,
        metadata: { title: "Les ports", version: 2 },
      },
    });
  });

  it("writes nothing when the lesson moved between the read and the write", async () => {
    tx.lesson.updateMany.mockResolvedValue({ count: 0 });
    expect(await lessonVersionRepository.publish(input)).toEqual({ ok: false, reason: "stale" });
    expect(tx.lessonVersion.create).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("refuses a lesson that changed since the caller read it", async () => {
    const result = await lessonVersionRepository.publish({
      ...input,
      expectedUpdatedAt: new Date("2026-09-01T00:00:00.000Z"),
    });
    expect(result).toEqual({ ok: false, reason: "stale" });
    expect(tx.lesson.updateMany).not.toHaveBeenCalled();
  });

  it("makes no version out of changes that change nothing", async () => {
    const result = await lessonVersionRepository.publish({ ...input, changes: PUBLISHED });
    expect(result).toEqual({ ok: false, reason: "unchanged" });
    expect(tx.lesson.updateMany).not.toHaveBeenCalled();
    expect(tx.lessonVersion.create).not.toHaveBeenCalled();
  });

  it("keeps the lesson's value for every field the changes leave out", async () => {
    await lessonVersionRepository.publish({ ...input, changes: { title: "Les ports TCP" } });
    expect(tx.lesson.updateMany.mock.calls[0]?.[0]).toMatchObject({
      data: { title: "Les ports TCP", contentMdx: PUBLISHED.contentMdx, slug: PUBLISHED.slug },
    });
  });

  it("says so for a lesson that does not exist", async () => {
    tx.lesson.findUnique.mockResolvedValue(null);
    expect(await lessonVersionRepository.publish(input)).toEqual({
      ok: false,
      reason: "not_found",
    });
  });

  it("runs in the caller's transaction when given one, and opens none of its own", async () => {
    await lessonVersionRepository.publish(input, tx as never);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(tx.lesson.updateMany).toHaveBeenCalledOnce();
  });
});

describe("lessonDraftRepository.save", () => {
  it("starts the draft from the lesson as it is, and remembers that state", async () => {
    mockPrisma.lesson.findUnique.mockResolvedValue({ ...PUBLISHED, version: 3 });
    mockPrisma.lessonDraft.create.mockResolvedValue({});

    const result = await lessonDraftRepository.save(LESSON, EDITED, {
      actorId: ADMIN,
      expectedUpdatedAt: null,
      now: NOW,
    });

    expect(result).toEqual({ ok: true, updatedAt: NOW });
    expect(mockPrisma.lessonDraft.create).toHaveBeenCalledExactlyOnceWith({
      data: {
        lessonId: LESSON,
        ...EDITED,
        baseVersion: 3,
        baseContentHash: lessonContentHash(PUBLISHED),
        updatedById: ADMIN,
        createdAt: NOW,
        updatedAt: NOW,
      },
    });
  });

  it("refuses a first save when another tab started the draft already", async () => {
    mockPrisma.lesson.findUnique.mockResolvedValue({ ...PUBLISHED, version: 1 });
    mockPrisma.lessonDraft.create.mockRejectedValue({ code: "P2002" });
    const result = await lessonDraftRepository.save(LESSON, EDITED, {
      actorId: ADMIN,
      expectedUpdatedAt: null,
    });
    expect(result).toEqual({ ok: false, reason: "conflict" });
  });

  it("writes over the draft the editor saw, and only that one", async () => {
    mockPrisma.lessonDraft.updateMany.mockResolvedValue({ count: 1 });
    const result = await lessonDraftRepository.save(LESSON, EDITED, {
      actorId: ADMIN,
      expectedUpdatedAt: READ_AT,
      now: NOW,
    });
    expect(result).toEqual({ ok: true, updatedAt: NOW });
    expect(mockPrisma.lessonDraft.updateMany).toHaveBeenCalledExactlyOnceWith({
      where: { lessonId: LESSON, updatedAt: READ_AT },
      data: { ...EDITED, updatedById: ADMIN, updatedAt: NOW },
    });
    expect(mockPrisma.lesson.findUnique).not.toHaveBeenCalled();
  });

  it("says conflict when the draft moved since the editor saw it", async () => {
    mockPrisma.lessonDraft.updateMany.mockResolvedValue({ count: 0 });
    const result = await lessonDraftRepository.save(LESSON, EDITED, {
      actorId: ADMIN,
      expectedUpdatedAt: READ_AT,
    });
    expect(result).toEqual({ ok: false, reason: "conflict" });
  });

  it("says so for a lesson that does not exist", async () => {
    mockPrisma.lesson.findUnique.mockResolvedValue(null);
    const result = await lessonDraftRepository.save(LESSON, EDITED, {
      actorId: ADMIN,
      expectedUpdatedAt: null,
    });
    expect(result).toEqual({ ok: false, reason: "not_found" });
    expect(mockPrisma.lessonDraft.create).not.toHaveBeenCalled();
  });
});

describe("lessonDraftRepository.publish", () => {
  const DRAFT_AT = new Date("2026-10-18T11:59:00.000Z");

  beforeEach(() => {
    tx.lessonDraft.findUnique.mockResolvedValue({
      updatedAt: DRAFT_AT,
      baseContentHash: lessonContentHash(PUBLISHED),
    });
    // The draft check reads the lesson's content, then publish reads it again.
    tx.lesson.findUnique.mockResolvedValue(lessonRow());
  });

  it("publishes the draft as a console version, then drops it", async () => {
    const result = await lessonDraftRepository.publish(LESSON, EDITED, {
      actorId: ADMIN,
      expectedUpdatedAt: DRAFT_AT,
      now: NOW,
    });

    expect(result).toEqual({ ok: true, version: 2, content: EDITED, updatedAt: NOW });
    expect(tx.lessonVersion.create.mock.calls.at(-1)?.[0]).toMatchObject({
      data: { version: 2, source: "CONSOLE", contentMdx: EDITED.contentMdx },
    });
    expect(tx.auditLog.create.mock.calls[0]?.[0]).toMatchObject({
      data: { action: "lesson.publish", metadata: { refCode: EDITED.refCode, version: 2 } },
    });
    expect(tx.lessonDraft.delete).toHaveBeenCalledExactlyOnceWith({ where: { lessonId: LESSON } });
  });

  it("refuses a draft that is not the one the editor saw", async () => {
    const result = await lessonDraftRepository.publish(LESSON, EDITED, {
      actorId: ADMIN,
      expectedUpdatedAt: new Date("2026-10-18T11:00:00.000Z"),
    });
    expect(result).toEqual({ ok: false, reason: "draft_changed" });
    expect(tx.lesson.updateMany).not.toHaveBeenCalled();
    expect(tx.lessonDraft.delete).not.toHaveBeenCalled();
  });

  it("refuses when there is no draft left to publish", async () => {
    tx.lessonDraft.findUnique.mockResolvedValue(null);
    const result = await lessonDraftRepository.publish(LESSON, EDITED, {
      actorId: ADMIN,
      expectedUpdatedAt: DRAFT_AT,
    });
    expect(result).toEqual({ ok: false, reason: "draft_changed" });
  });

  it("asks before replacing a lesson that changed since the draft was started", async () => {
    tx.lesson.findUnique.mockResolvedValue(
      lessonRow({ ...PUBLISHED, title: "Les ports, synchronisés" }),
    );
    const result = await lessonDraftRepository.publish(LESSON, EDITED, {
      actorId: ADMIN,
      expectedUpdatedAt: DRAFT_AT,
    });
    expect(result).toEqual({ ok: false, reason: "lesson_changed" });
    expect(tx.lesson.updateMany).not.toHaveBeenCalled();
  });

  it("publishes over it once told to", async () => {
    tx.lesson.findUnique.mockResolvedValue(
      lessonRow({ ...PUBLISHED, title: "Les ports, synchronisés" }),
    );
    const result = await lessonDraftRepository.publish(LESSON, EDITED, {
      actorId: ADMIN,
      expectedUpdatedAt: DRAFT_AT,
      force: true,
    });
    expect(result).toMatchObject({ ok: true, version: 2 });
    expect(tx.lessonDraft.delete).toHaveBeenCalledOnce();
  });

  it("drops a draft that holds what the lesson already does", async () => {
    const result = await lessonDraftRepository.publish(LESSON, PUBLISHED, {
      actorId: ADMIN,
      expectedUpdatedAt: DRAFT_AT,
    });
    expect(result).toEqual({ ok: false, reason: "unchanged" });
    expect(tx.lessonDraft.delete).toHaveBeenCalledOnce();
  });

  it("names the field a unique violation is about", async () => {
    mockPrisma.$transaction.mockRejectedValueOnce({
      code: "P2002",
      meta: { target: ["refCode"] },
    });
    const result = await lessonDraftRepository.publish(LESSON, EDITED, {
      actorId: ADMIN,
      expectedUpdatedAt: DRAFT_AT,
    });
    expect(result).toEqual({ ok: false, reason: "taken", field: "refCode" });
  });
});
